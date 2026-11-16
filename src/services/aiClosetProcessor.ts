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
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const categories: ClothingCategory[] = ["shorts", "pants", "joggers", "longsleeves", "t-shirts", "outerwear", "footwear"];
const families: ColorFamily[] = ["neutral", "warm", "cool", "earth"];
const vibes: OutfitVibe[] = ["casual", "streetwear", "smart/formal", "lounge/home"];

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

  const directory = await mkdtemp(path.join(os.tmpdir(), "rerack-"));
  const inputPath = path.join(directory, `${randomUUID()}.upload`);
  const outputPath = path.join(directory, `${randomUUID()}.png`);
  const scriptPath = path.join(process.cwd(), "python", "process_image.py");

  try {
    await writeFile(inputPath, image);
    const python = process.env.PYTHON_BIN || (process.platform === "win32" ? "python" : "python3");
    try {
      await executeFile(python, [scriptPath, inputPath, outputPath], { timeout: 300_000, maxBuffer: 1024 * 1024 });
    } catch (error) {
      console.error("Rembg image normalization failed.", error);
      throw new Error("Background removal failed. Install python/requirements.txt, verify Python is available, and try a different photo.");
    }

    return await readFile(outputPath);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function describeImage(image: Buffer): Promise<ClosetImageMetadata> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Set GEMINI_API_KEY in .env.local to enable clothing recognition.");

  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: `Identify the single clothing item in this image. Return only JSON with category (one of ${categories.join(", ")}), dominant_color (short plain color name), color_family (one of ${families.join(", ")}), vibe_tag (one of ${vibes.join(", ")}), and ai_description (one concise factual sentence). Do not infer a brand, fabric, size, or detail that is not visible.` },
          { inline_data: { mime_type: "image/png", data: image.toString("base64") } },
        ],
      }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini item recognition failed (HTTP ${response.status}).`);
  const result = await response.json() as GeminiResponse;
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
  const normalizedImage = await normalizeImage(image, mimeType);
  const metadata = await describeImage(normalizedImage);
  return { normalizedImage, metadata };
}
