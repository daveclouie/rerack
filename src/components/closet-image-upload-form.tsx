"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { addClosetItem } from "@/app/actions/closet";

const maxImageBytes = 10 * 1024 * 1024;
const maxImageDimension = 1600;

async function optimizeImage(file: File) {
  if (file.type === "image/heic" || file.type === "image/heif" || file.size < 700 * 1024 || typeof createImageBitmap === "undefined") {
    return { file, optimized: false };
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxImageDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return { file, optimized: false };
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return { file, optimized: false };

    return {
      file: new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }),
      optimized: true,
    };
  } catch {
    return { file, optimized: false };
  } finally {
    bitmap?.close();
  }
}

export function ClosetImageUploadForm() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewUnavailable, setPreviewUnavailable] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = file ? URL.createObjectURL(file) : null;
    setSelectedFile(file);
    setPreviewUrl(previewUrlRef.current);
    setPreviewUnavailable(false);
    setError("");
    setStatus("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setError("Choose a clothing photo.");
      return;
    }
    if (selectedFile.size > maxImageBytes) {
      setError("Images must be smaller than 10 MB.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      setStatus("Preparing photo…");
      const { file, optimized } = await optimizeImage(selectedFile);
      formData.set("image", file);
      setStatus(optimized
        ? "Photo optimized. Removing background and identifying item. The first upload may take longer while the model starts."
        : "Removing background and identifying item. The first upload may take longer while the model starts.");
      await addClosetItem(formData);
    });
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="image">Clothing photo</label>
        <input
          id="image"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          capture="environment"
          onChange={chooseFile}
          required
        />
        <p className="form-hint">JPEG, PNG, WebP or HEIC, up to 10 MB. Large photos are resized on your device before processing.</p>
      </div>
      {previewUrl && (
        <div className="upload-preview">
          {!previewUnavailable ? (
            <Image
              src={previewUrl}
              alt="Preview of selected clothing photo"
              fill
              sizes="(max-width: 760px) 140px, 180px"
              unoptimized
              onError={() => setPreviewUnavailable(true)}
            />
          ) : <span className="form-hint">Preview unavailable for this image format.</span>}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {status && <p className="form-hint" role="status" aria-live="polite">{status}</p>}
      <button className="button button-dark" type="submit" disabled={isPending || !selectedFile}>
        {isPending ? "Processing photo…" : "Optimize & add item"}
      </button>
    </form>
  );
}
