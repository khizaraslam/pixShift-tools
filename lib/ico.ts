/** Builds a .ico file that holds PNG images (supported by every current browser and Windows). */
export function buildIco(images: { size: number; png: Uint8Array }[]): Uint8Array {
  const head = 6 + images.length * 16;
  const total = images.reduce((t, i) => t + i.png.length, head);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0, true); // reserved
  v.setUint16(2, 1, true); // type: icon
  v.setUint16(4, images.length, true);
  let at = head;
  images.forEach((im, i) => {
    const o = 6 + i * 16;
    out[o] = im.size >= 256 ? 0 : im.size;
    out[o + 1] = im.size >= 256 ? 0 : im.size;
    out[o + 2] = 0; // palette
    out[o + 3] = 0;
    v.setUint16(o + 4, 1, true); // planes
    v.setUint16(o + 6, 32, true); // bits per pixel
    v.setUint32(o + 8, im.png.length, true);
    v.setUint32(o + 12, at, true);
    out.set(im.png, at);
    at += im.png.length;
  });
  return out;
}
