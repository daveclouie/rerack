import "server-only";

import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { ClothingCategory, ColorFamily, OutfitVibe } from "@/lib/supabase/database.types";

const executeFile = promisify(execFile);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const LOCAL_PROCESS_TIMEOUT_MS = 300_000;
const REMOTE_WORKER_TIMEOUT_MS = 180_000;
const GEMINI_MODEL = "gemini-3.5-flash-lite";
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const categories: ClothingCategory[] = ["shorts", "pants", "joggers", "longsleeves", "t-shirts", "outerwear", "footwear"];
const families: ColorFamily[] = ["neutral", "warm", "cool", "earth"];
const vibes: OutfitVibe[] = [
  "casual",
  "streetwear",
  "smart/formal",
  "lounge/home",
  "y2k",
  "old money",
  "semi-formal",
  "smart casual",
  "sporty",
  "preppy",
  "minimalist",
  "vintage",
];

export type ClosetImageMetadata = {
  category: ClothingCategory;
  dominant_color: string;
  color_family: ColorFamily;
  vibe_tag: OutfitVibe;
  ai_description: string;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

type GeminiErrorResponse = {
  error?: {
    message?: string;
    status?: string;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCategory(value: unknown): ClothingCategory | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const aliases: Record<string, ClothingCategory> = {
    shorts: "shorts",
    pants: "pants",
    trousers: "pants",
    joggers: "joggers",
    sweatpants: "joggers",
    longsleeves: "longsleeves",
    longsleeve: "longsleeves",
    "t-shirts": "t-shirts",
    "t-shirt": "t-shirts",
    tshirt: "t-shirts",
    tshirts: "t-shirts",
    tee: "t-shirts",
    tees: "t-shirts",
    outerwear: "outerwear",
    jacket: "outerwear",
    coat: "outerwear",
    footwear: "footwear",
    shoes: "footwear",
  };
  return aliases[value.trim().toLowerCase()] ?? aliases[normalized] ?? (categories.includes(value.trim().toLowerCase() as ClothingCategory) ? value.trim().toLowerCase() as ClothingCategory : null);
}

function normalizeMetadata(value: unknown): ClosetImageMetadata {
  if (!isRecord(value)) throw new Error("Gemini returned an invalid item description.");

  const category = normalizeCategory(value.category);
  const colorFamily = typeof value.color_family === "string" ? value.color_family.trim().toLowerCase() : "";
  const vibe = typeof value.vibe_tag === "string" ? value.vibe_tag.trim().toLowerCase() : "";
  const dominantColor = typeof value.dominant_color === "string" ? value.dominant_color.trim() : "";
  const description = typeof value.ai_description === "string" ? value.ai_description.trim() : "";

  if (!category || !families.includes(colorFamily as ColorFamily) || !vibes.includes(vibe as OutfitVibe) || !dominantColor || dominantColor.length > 60 || !description || description.length > 500) {
    throw new Error("Gemini could not identify this clothing item. Try a clearer, well-lit photo.");
  }

  return {
    category,
    dominant_color: dominantColor,
    color_family: colorFamily as ColorFamily,
    vibe_tag: vibe as OutfitVibe,
    ai_description: description,
  };
}

async function normalizeImage(image: Buffer, mimeType: string): Promise<Buffer> {
  if (!allowedMimeTypes.has(mimeType)) throw new Error("Choose a JPEG, PNG, WebP or HEIC image.");
  if (image.byteLength === 0 || image.byteLength > MAX_IMAGE_BYTES) throw new Error("Images must be smaller than 10 MB.");

  const workerUrl = process.env.REMBG_WORKER_URL?.trim();
  const workerToken = process.env.REMBG_WORKER_TOKEN;
  if (workerUrl || workerToken) {
    if (!workerUrl || !workerToken) throw new Error("Set both REMBG_WORKER_URL and REMBG_WORKER_TOKEN to use the image worker.");
    let workerEndpoint: URL;
    try {
      workerEndpoint = new URL(workerUrl);
    } catch {
      throw new Error("REMBG_WORKER_URL must be a valid absolute URL.");
    }
    const isLocalWorker = ["localhost", "127.0.0.1", "[::1]"].includes(workerEndpoint.hostname);
    if (workerEndpoint.protocol !== "https:" && !(workerEndpoint.protocol === "http:" && isLocalWorker)) {
      throw new Error("REMBG_WORKER_URL must use HTTPS except for a local development worker.");
    }
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await fetch(workerEndpoint, {
        method: "POST",
        redirect: "error",
        headers: {
          authorization: `Bearer ${workerToken}`,
          "content-type": mimeType,
        },
        body: new Uint8Array(image),
        signal: AbortSignal.timeout(REMOTE_WORKER_TIMEOUT_MS),
      });
    } catch (error) {
      console.error("Rembg worker request failed.", error);
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error("Background removal timed out. Try a smaller photo or try again later.");
      }
      throw new Error("Could not reach the background-removal worker. Try again later.");
    }

    if (!response.ok) {
      const details = (await response.text()).slice(0, 1000);
      console.error("Rembg worker rejected an image.", { status: response.status, details });
      if (response.status === 503 && details.includes("model is loading")) {
        throw new Error("The background-removal model is still loading. Wait for the worker health check to return 'ok', then try again.");
      }
      throw new Error(`Background-removal worker failed (HTTP ${response.status}). Try another photo or try again later.`);
    }

    const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "image/jpeg") {
      console.error("Rembg worker returned an unexpected response type.", { contentType });
      throw new Error("Background-removal worker returned an invalid image. Please try again.");
    }

    const normalized = Buffer.from(await response.arrayBuffer());
    if (normalized.byteLength === 0 || normalized.byteLength > MAX_IMAGE_BYTES) {
      throw new Error("Background-removal worker returned an image with an invalid size.");
    }
    console.info("Closet image processing stage completed.", { stage: "background-removal", durationMs: Date.now() - startedAt, mode: "worker" });
    return normalized;
  }

  const directory = await mkdtemp(path.join(os.tmpdir(), "rerack-"));
  const inputPath = path.join(directory, `${randomUUID()}.upload`);
  const outputPath = path.join(directory, `${randomUUID()}.jpg`);
  const scriptPath = path.join(process.cwd(), "python", "process_image.py");

  try {
    await writeFile(inputPath, image);
    const python = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
    const startedAt = Date.now();
    try {
      await executeFile(python, [scriptPath, inputPath, outputPath], { timeout: LOCAL_PROCESS_TIMEOUT_MS, maxBuffer: 1024 * 1024 });
    } catch (error) {
      const details = isRecord(error) ? error : {};
      const stderr = typeof details.stderr === "string" ? details.stderr.slice(0, 4000) : "";
      console.error("Rembg subprocess failed.", {
        message: error instanceof Error ? error.message : "Unknown process error",
        code: details.code,
        signal: details.signal,
        killed: details.killed,
        stderr,
      });
      if (details.code === "ENOENT") {
        throw new Error("Python could not be started. Install python/requirements.txt and set PYTHON_BIN to the correct Python executable.");
      }
      if (details.killed === true || typeof details.signal === "string") {
        throw new Error("Background removal timed out. Try a smaller photo or try again later.");
      }
      throw new Error("Background removal failed. Check the Python worker logs, then try another photo.");
    }

    const normalized = await readFile(outputPath);
    console.info("Closet image processing stage completed.", { stage: "background-removal", durationMs: Date.now() - startedAt, mode: "local" });
    return normalized;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function describeImage(image: Buffer): Promise<ClosetImageMetadata> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Set GEMINI_API_KEY in .env.local to enable clothing recognition.");

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Identify the single clothing item in this image. Return only JSON with category (one of ${categories.join(", ")}), dominant_color (short plain color name), color_family (one of ${families.join(", ")}), vibe_tag (one of ${vibes.join(", ")}), and ai_description (one concise factual sentence). Do not infer a brand, fabric, size, or detail that is not visible.` },
            { inline_data: { mime_type: "image/jpeg", data: image.toString("base64") } },
          ],
        }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
      }),
    });
  } catch (error) {
    console.error("Gemini image recognition request failed.", error);
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Clothing identification timed out. Please try again.");
    }
    throw new Error("Could not reach Gemini for clothing identification. Please try again.");
  }
  console.info("Closet image processing stage completed.", { stage: "gemini-identification", durationMs: Date.now() - startedAt, status: response.status });

  if (!response.ok) {
    let apiError: GeminiErrorResponse | null = null;
    try {
      apiError = await response.json() as GeminiErrorResponse;
    } catch {
      console.error("Gemini returned an unreadable error response.", { status: response.status });
    }

    console.error("Gemini item recognition failed.", {
      status: response.status,
      apiStatus: apiError?.error?.status,
      message: apiError?.error?.message,
      model: GEMINI_MODEL,
    });
    if (response.status === 404) {
      throw new Error(`Gemini could not find model '${GEMINI_MODEL}'. Confirm your API key has Gemini API access, then restart the app and try again.`);
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Gemini rejected the API key. Check GEMINI_API_KEY in .env.local, then restart the app.");
    }
    throw new Error(`Gemini item recognition failed (HTTP ${response.status}).`);
  }
  let result: GeminiResponse;
  try {
    result = await response.json() as GeminiResponse;
  } catch {
    throw new Error("Gemini returned an unreadable response. Please try again.");
  }
  const text = result.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
  if (!text) throw new Error("Gemini did not return an item description.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned an unreadable item description.");
  }
  return normalizeMetadata(parsed);
}

export async function processClosetImage(image: Buffer, mimeType: string) {
  const startedAt = Date.now();
  const normalizedImage = await normalizeImage(image, mimeType);
  const metadata = await describeImage(normalizedImage);
  console.info("Closet image processing completed.", { durationMs: Date.now() - startedAt });
  return { normalizedImage, metadata };
}
