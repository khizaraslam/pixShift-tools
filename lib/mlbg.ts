import { makeCanvas, type Src } from "./ops";

const MODEL_EDGE = 2048; // the model gets a downscaled copy; the mask is scaled back up on export

/** Runs the AI model in the browser and returns a canvas whose alpha channel is the subject mask. */
export async function cutOut(src: Src, onProgress?: (fraction: number) => void): Promise<HTMLCanvasElement> {
  const s = Math.min(1, MODEL_EDGE / Math.max(src.width, src.height));
  const input = makeCanvas(src.width * s, src.height * s);
  input.getContext("2d")!.drawImage(src, 0, 0, input.width, input.height);
  const blob: Blob = await new Promise((res, rej) =>
    input.toBlob((b) => (b ? res(b) : rej(new Error("Could not prepare the picture."))), "image/png"),
  );
  // Loaded on demand so the model code is not part of the normal page bundle.
  const { removeBackground } = await import("@imgly/background-removal");
  const out = await removeBackground(blob, {
    model: "isnet_fp16",
    output: { format: "image/png" },
    progress: (_key: string, current: number, total: number) => onProgress?.(total ? current / total : 0),
  });
  const bmp = await createImageBitmap(out);
  const c = makeCanvas(bmp.width, bmp.height);
  c.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  return c;
}

/**
 * Applies the mask to the ORIGINAL pixels (so full-size export stays sharp).
 * With `fill` the subject is placed on that solid colour, otherwise the background is transparent.
 */
export function applyCut(src: Src, cut: HTMLCanvasElement, fill?: string): HTMLCanvasElement {
  const subject = makeCanvas(src.width, src.height);
  const sx = subject.getContext("2d")!;
  sx.drawImage(src, 0, 0);
  sx.globalCompositeOperation = "destination-in";
  sx.imageSmoothingQuality = "high";
  sx.drawImage(cut, 0, 0, subject.width, subject.height);
  if (!fill) return subject;
  const c = makeCanvas(src.width, src.height);
  const x = c.getContext("2d")!;
  x.fillStyle = fill;
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(subject, 0, 0);
  return c;
}