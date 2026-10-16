import type { Format } from "./tools";

export const MIME: Record<Format, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const EXT: Record<Format, string> = { jpeg: "jpg", png: "png", webp: "webp" };

export function formatFromMime(mime: string): Format {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpeg";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export async function loadBitmap(file: File): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding failed. This format may not be supported by your browser."))),
      mime,
      quality,
    );
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
