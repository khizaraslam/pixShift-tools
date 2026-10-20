// A tiny PDF writer: one JPEG picture per page. No libraries, nothing uploaded.

export interface PdfPage {
  jpeg: Uint8Array;
  /** Picture size in pixels. */
  w: number;
  h: number;
  /** Page size in points (1 pt = 1/72 inch). */
  pageW: number;
  pageH: number;
  /** Where the picture goes on the page, in points (origin top left). */
  x: number;
  y: number;
  dw: number;
  dh: number;
}

export const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const;

const enc = new TextEncoder();
const num = (n: number) => (Math.round(n * 100) / 100).toString();

export function buildPdf(pages: PdfPage[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let size = 0;
  const push = (b: Uint8Array | string) => {
    const u = typeof b === "string" ? enc.encode(b) : b;
    chunks.push(u);
    size += u.length;
  };
  const obj = (id: number, body: () => void) => {
    offsets[id] = size;
    push(`${id} 0 obj\n`);
    body();
    push("\nendobj\n");
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  // Object numbers: 1 catalog, 2 pages, then per page 3 objects (page, content, image).
  const pageId = (i: number) => 3 + i * 3;
  obj(1, () => push("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => push(`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(" ")}] >>`));
  pages.forEach((p, i) => {
    const id = pageId(i);
    obj(id, () =>
      push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(p.pageW)} ${num(p.pageH)}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`),
    );
    // PDF's origin is bottom left.
    const y = p.pageH - p.y - p.dh;
    const content = `q ${num(p.dw)} 0 0 ${num(p.dh)} ${num(p.x)} ${num(y)} cm /Im0 Do Q`;
    obj(id + 1, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
    obj(id + 2, () => {
      push(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`);
      push(p.jpeg);
      push("\nendstream");
    });
  });

  const count = 3 + pages.length * 3;
  const xref = size;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let i = 1; i < count; i++) push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Places a picture on a page. `margin` is in points. */
export function placeOnPage(
  w: number,
  h: number,
  size: "a4" | "letter" | "fit",
  orientation: "auto" | "portrait" | "landscape",
  margin: number,
): Pick<PdfPage, "pageW" | "pageH" | "x" | "y" | "dw" | "dh"> {
  if (size === "fit") {
    const pw = Math.max(1, w * 0.75);
    const ph = Math.max(1, h * 0.75);
    const m = Math.min(margin, pw / 4, ph / 4);
    return { pageW: pw + m * 2, pageH: ph + m * 2, x: m, y: m, dw: pw, dh: ph };
  }
  let pw: number = PAGE_SIZES[size][0];
  let ph: number = PAGE_SIZES[size][1];
  const landscape = orientation === "landscape" || (orientation === "auto" && w > h);
  if (landscape) [pw, ph] = [ph, pw];
  const aw = pw - margin * 2;
  const ah = ph - margin * 2;
  const s = Math.min(aw / w, ah / h);
  const dw = w * s;
  const dh = h * s;
  return { pageW: pw, pageH: ph, x: (pw - dw) / 2, y: (ph - dh) / 2, dw, dh };
}
