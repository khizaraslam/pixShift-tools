import { zipSync } from "fflate";

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Makes names unique inside one ZIP: photo.jpg, photo-1.jpg, ... */
export function uniqueName(name: string, used: Set<string>) {
  let out = name;
  let n = 1;
  while (used.has(out)) out = name.replace(/(\.[^.]+)$/, `-${n++}$1`);
  used.add(out);
  return out;
}

export async function zipBlobs(entries: { name: string; blob: Blob }[], zipName = "pixshift-images.zip") {
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const e of entries) files[uniqueName(e.name, used)] = new Uint8Array(await e.blob.arrayBuffer());
  const zip = zipSync(files, { level: 0 });
  downloadBlob(new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" }), zipName);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Draws a canvas on white (JPEG has no transparency). */
export function flatten(src: HTMLCanvasElement, color = "#ffffff"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(src, 0, 0);
  return c;
}
