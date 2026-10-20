import type { Format } from "./tools";

export const MIME: Record<Format, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

export const EXT: Record<Format, string> = { jpeg: "jpg", png: "png", webp: "webp", avif: "avif" };

export function formatFromMime(mime: string): Format {
  if (mime === "image/png" || mime === "image/svg+xml" || mime === "image/gif") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/avif") return "avif";
  return "jpeg";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Opens an image file. SVGs go through an <img> element because they have no fixed pixel size. */
export async function loadBitmap(file: Blob & { name?: string }, svgWidth = 1024): Promise<ImageBitmap> {
  if (file.type === "image/svg+xml" || (file.name ?? "").toLowerCase().endsWith(".svg")) {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      const w = img.naturalWidth || svgWidth;
      const h = img.naturalHeight || Math.round(svgWidth * 0.75);
      // Draw the vector at a useful size so the bitmap is not tiny.
      const scale = w < 600 ? 1024 / w : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      return await createImageBitmap(canvas);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return await createImageBitmap(file);
}

export function canvasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const done = (b: Blob | null) => {
      if (!b) return reject(new Error("Encoding failed. This format may not be supported by your browser."));
      // Browsers silently fall back to PNG for formats they cannot encode.
      if (b.type && b.type !== mime) {
        return reject(
          new Error(
            mime === "image/avif"
              ? "Your browser cannot create AVIF files. Try Chrome or Edge, or use the WebP tools."
              : "Your browser cannot create this format.",
          ),
        );
      }
      resolve(b);
    };
    if (canvas instanceof HTMLCanvasElement) canvas.toBlob(done, mime, quality);
    else canvas.convertToBlob({ type: mime, quality }).then(done, reject);
  });
}

export type FitMode = "fill" | "fit" | "stretch";

export interface ProcessOptions {
  format: Format;
  /** 1–100 */
  quality: number;
  width?: number;
  height?: number;
  fit?: FitMode;
  background?: string;
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
}

/** Draws the bitmap to a canvas and encodes it. */
export async function processImage(bitmap: ImageBitmap, opts: ProcessOptions): Promise<ProcessResult> {
  const tw = Math.max(1, Math.round(opts.width ?? bitmap.width));
  const th = Math.max(1, Math.round(opts.height ?? bitmap.height));
  const fit = opts.fit ?? "stretch";

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // JPEG has no alpha: paint a background first. Social presets also use it for "fit".
  if (opts.format === "jpeg" || fit === "fit") {
    ctx.fillStyle = opts.background ?? "#ffffff";
    ctx.fillRect(0, 0, tw, th);
  }

  if (fit === "stretch") {
    ctx.drawImage(bitmap, 0, 0, tw, th);
  } else {
    const scale = fit === "fill" ? Math.max(tw / bitmap.width, th / bitmap.height) : Math.min(tw / bitmap.width, th / bitmap.height);
    const dw = bitmap.width * scale;
    const dh = bitmap.height * scale;
    ctx.drawImage(bitmap, (tw - dw) / 2, (th - dh) / 2, dw, dh);
  }

  if (opts.format === "png") {
    // Lossless PNG by default; quantize when quality < 100 to actually shrink it.
    if (opts.quality >= 100) {
      return { blob: await canvasToBlob(canvas, "image/png"), width: tw, height: th };
    }
    const UPNG = (await import("upng-js")).default;
    const data = ctx.getImageData(0, 0, tw, th);
    // Map quality 1–99 onto 16–256 colours.
    const colours = Math.max(16, Math.min(256, Math.round(16 + (opts.quality / 99) * 240)));
    const buf = UPNG.encode([data.data.buffer as ArrayBuffer], tw, th, colours);
    return { blob: new Blob([buf], { type: "image/png" }), width: tw, height: th };
  }

  const blob = await canvasToBlob(canvas, MIME[opts.format], opts.quality / 100);
  return { blob, width: tw, height: th };
}

export function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

/**
 * Finds a JPEG/WebP that stays under `maxBytes`. It searches for the best quality; when that
 * quality would look poor (below ~50) it shrinks the picture a little and tries again, because a
 * slightly smaller sharp picture beats a full-size smeared one.
 */
export async function fitUnder(
  bitmap: ImageBitmap,
  maxBytes: number,
  format: Format = "jpeg",
  background = "#ffffff",
): Promise<ProcessResult & { quality: number; scaled: boolean }> {
  const GOOD = 50;
  let scale = 1;
  let found: (ProcessResult & { quality: number; scaled: boolean }) | null = null;
  for (let round = 0; round < 30; round++) {
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const enc = (q: number) => processImage(bitmap, { format, quality: q, width: w, height: h, background });
    // The lowest quality must fit, otherwise nothing at this size will.
    const floor = await enc(5);
    if (floor.blob.size <= maxBytes) {
      let best = floor;
      let bestQ = 5;
      let lo = 6;
      let hi = 95;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const r = await enc(mid);
        if (r.blob.size <= maxBytes) {
          best = r;
          bestQ = mid;
          lo = mid + 1;
        } else hi = mid - 1;
      }
      found = { ...best, quality: bestQ, scaled: scale < 1 };
      if (bestQ >= GOOD) return found;
    }
    if (w <= 16 && h <= 16) break;
    scale *= 0.85;
  }
  if (found) return found;
  throw new Error("Could not reach that size. Try a simpler or smaller picture.");
}
