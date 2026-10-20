export type RGB = [number, number, number];

export const toHex = ([r, g, b]: RGB) =>
  "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();

export function toHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

/** Black or white, whichever reads better on this colour. */
export const inkOn = ([r, g, b]: RGB) => (0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#0d2b24" : "#ffffff");

interface Entry {
  rgb: RGB;
  n: number;
}

/**
 * Median-cut palette. `data` is RGBA pixels (already small). Returns up to `n` colours,
 * most common first. Nearly transparent pixels are ignored.
 */
export function palette(data: Uint8ClampedArray, n: number): { rgb: RGB; share: number }[] {
  // Group similar pixels first (5 bits per channel), so one flat colour is never split in two.
  const map = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] <= 128) continue;
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const e = map.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += data[i]; e.g += data[i + 1]; e.b += data[i + 2];
    map.set(key, e);
    total++;
  }
  if (!total) return [];
  const entries: Entry[] = [];
  map.forEach((e) => entries.push({ rgb: [e.r / e.n, e.g / e.n, e.b / e.n], n: e.n }));

  let boxes: Entry[][] = [entries];
  while (boxes.length < n) {
    let bi = -1;
    let best = 0;
    let ch = 0;
    boxes.forEach((b, i) => {
      if (b.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255;
        let hi = 0;
        let w = 0;
        for (const e of b) {
          if (e.rgb[c] < lo) lo = e.rgb[c];
          if (e.rgb[c] > hi) hi = e.rgb[c];
          w += e.n;
        }
        const score = (hi - lo) * Math.sqrt(w);
        if (score > best) {
          best = score;
          bi = i;
          ch = c;
        }
      }
    });
    if (bi < 0) break;
    const b = boxes[bi].slice().sort((a, c) => a.rgb[ch] - c.rgb[ch]);
    const sum = b.reduce((t, e) => t + e.n, 0);
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < b.length - 1; i++) {
      acc += b[i].n;
      cut = i + 1;
      if (acc >= sum / 2) break;
    }
    boxes.splice(bi, 1, b.slice(0, cut), b.slice(cut));
  }
  return boxes
    .map((b) => {
      let r = 0, g = 0, bl = 0, k = 0;
      for (const e of b) { r += e.rgb[0] * e.n; g += e.rgb[1] * e.n; bl += e.rgb[2] * e.n; k += e.n; }
      return { rgb: [Math.round(r / k), Math.round(g / k), Math.round(bl / k)] as RGB, share: k / total };
    })
    .sort((a, c) => c.share - a.share);
}
