import type { OpId } from "./tools";

// Pixel operations for the Editor. Everything works on canvases in the browser, no libraries.
// Sizes inside params are fractions (of the picture), so a small live preview and the
// full-size export look the same.

export type P = Record<string, number | string | boolean>;
export interface Stroke {
  /** Points as fractions of width and height. */
  pts: [number, number][];
  /** Brush radius as a fraction of the shorter side. */
  r: number;
}

export type Src = HTMLCanvasElement | ImageBitmap;

export const MAX_EDGE = 12000;
export const MAX_PIXELS = 64_000_000;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function ctxOf(c: HTMLCanvasElement) {
  const x = c.getContext("2d", { willReadFrequently: true });
  if (!x) throw new Error("Canvas is not available in this browser.");
  return x;
}

export function copyOf(src: Src): HTMLCanvasElement {
  const c = makeCanvas(src.width, src.height);
  ctxOf(c).drawImage(src, 0, 0);
  return c;
}

const clamp = (v: number, a = 0, b = 255) => (v < a ? a : v > b ? b : v);
const num = (p: P, k: string, d: number) => (typeof p[k] === "number" ? (p[k] as number) : d);
const str = (p: P, k: string, d: string) => (typeof p[k] === "string" ? (p[k] as string) : d);

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [255, 255, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/* ───────────── blur (separable box, 3 passes ≈ Gaussian) ───────────── */

function boxPass(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number, horizontal: boolean) {
  const len = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const stepIn = horizontal ? 1 : w;
  const stepLine = horizontal ? w : 1;
  const win = 2 * r + 1;
  for (let l = 0; l < lines; l++) {
    const base = l * stepLine;
    for (let ch = 0; ch < 4; ch++) {
      let sum = 0;
      // Edge pixels repeat, so borders do not darken.
      for (let i = -r; i <= r; i++) sum += src[(base + clamp(i, 0, len - 1) * stepIn) * 4 + ch];
      for (let i = 0; i < len; i++) {
        dst[(base + i * stepIn) * 4 + ch] = sum / win;
        const add = clamp(i + r + 1, 0, len - 1);
        const sub = clamp(i - r, 0, len - 1);
        sum += src[(base + add * stepIn) * 4 + ch] - src[(base + sub * stepIn) * 4 + ch];
      }
    }
  }
}

/** Returns a blurred copy of the RGBA data. `r` is in pixels. */
export function blurData(data: Uint8ClampedArray, w: number, h: number, r: number): Uint8ClampedArray {
  r = Math.round(r);
  if (r < 1) return new Uint8ClampedArray(data);
  const a = new Uint8ClampedArray(data);
  const b = new Uint8ClampedArray(data.length);
  // Three passes of radius r/√3·… keep it simple: use r/2 each time, rounded up.
  const rr = Math.max(1, Math.round(r / 1.7));
  for (let i = 0; i < 3; i++) {
    boxPass(a, b, w, h, rr, true);
    boxPass(b, a, w, h, rr, false);
  }
  return a;
}

/* ───────────── operations ───────────── */

function rotate(src: Src, p: P): HTMLCanvasElement {
  const quarter = ((Math.round(num(p, "quarter", 0)) % 4) + 4) % 4;
  const flipH = p.flipH === true;
  const flipV = p.flipV === true;
  const angle = (num(p, "angle", 0) * Math.PI) / 180;
  const bg = str(p, "bg", "transparent");

  // Step 1: quarter turns and flips (lossless).
  const swap = quarter % 2 === 1;
  const a = makeCanvas(swap ? src.height : src.width, swap ? src.width : src.height);
  const ax = ctxOf(a);
  ax.translate(a.width / 2, a.height / 2);
  ax.rotate((quarter * Math.PI) / 2);
  ax.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ax.drawImage(src, -src.width / 2, -src.height / 2);
  if (!angle) return a;

  // Step 2: free angle, canvas grows to hold the whole picture.
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const w = Math.ceil(a.width * cos + a.height * sin);
  const h = Math.ceil(a.width * sin + a.height * cos);
  const b = makeCanvas(w, h);
  const bx = ctxOf(b);
  if (bg !== "transparent") {
    bx.fillStyle = bg;
    bx.fillRect(0, 0, w, h);
  }
  bx.imageSmoothingQuality = "high";
  bx.translate(w / 2, h / 2);
  bx.rotate(angle);
  bx.drawImage(a, -a.width / 2, -a.height / 2);
  return b;
}

function watermark(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const text = str(p, "text", "").trim();
  if (!text) return c;
  const base = Math.min(c.width, c.height);
  const size = Math.max(8, num(p, "size", 0.06) * base);
  const pos = str(p, "pos", "br");
  const color = str(p, "color", "#ffffff");
  x.globalAlpha = clamp(num(p, "opacity", 0.5), 0, 1);
  x.font = `700 ${size}px "Helvetica Neue", Arial, sans-serif`;
  x.fillStyle = color;
  x.textBaseline = "middle";
  // A thin dark outline keeps light text readable on light photos.
  x.lineWidth = Math.max(1, size / 14);
  x.strokeStyle = color.toLowerCase() === "#ffffff" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.45)";
  const tw = x.measureText(text).width;
  const draw = (px: number, py: number) => {
    x.strokeText(text, px, py);
    x.fillText(text, px, py);
  };
  if (pos === "tile") {
    const ang = (num(p, "angle", -30) * Math.PI) / 180;
    const gapX = tw + size * 2;
    const gapY = size * 3;
    x.save();
    x.translate(c.width / 2, c.height / 2);
    x.rotate(ang);
    const reach = Math.hypot(c.width, c.height);
    let row = 0;
    for (let yy = -reach; yy < reach; yy += gapY, row++) {
      for (let xx = -reach + (row % 2 ? gapX / 2 : 0); xx < reach; xx += gapX) draw(xx, yy);
    }
    x.restore();
  } else {
    const m = size * 0.6;
    const col = pos[1] ?? "r";
    const row = pos[0] ?? "b";
    x.textAlign = col === "l" ? "left" : col === "c" ? "center" : "right";
    const px = col === "l" ? m : col === "c" ? c.width / 2 : c.width - m;
    const py = row === "t" ? m + size / 2 : row === "m" ? c.height / 2 : c.height - m - size / 2;
    draw(px, py);
  }
  x.globalAlpha = 1;
  return c;
}

function exifStrip(src: Src): HTMLCanvasElement {
  return copyOf(src);
}

/** Percentile levels from a luminance histogram. */
function autoLevels(d: Uint8ClampedArray): [number, number] {
  const hist = new Uint32Array(256);
  const n = d.length / 4;
  for (let i = 0; i < d.length; i += 4) hist[Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2])]++;
  const clip = n * 0.005;
  let lo = 0;
  let hi = 255;
  let acc = 0;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc > clip) {
      lo = i;
      break;
    }
  }
  acc = 0;
  for (let i = 255; i >= 0; i--) {
    acc += hist[i];
    if (acc > clip) {
      hi = i;
      break;
    }
  }
  if (hi - lo < 16) return [0, 255];
  return [lo, hi];
}

function enhance(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const [lo, hi] = p.auto === true ? autoLevels(d) : [0, 255];
  const gain = 255 / (hi - lo);
  const bright = num(p, "brightness", 0) * 1.5;
  const ct = num(p, "contrast", 0) * 2;
  const cf = (259 * (ct + 255)) / (255 * (259 - ct));
  const sat = 1 + num(p, "saturation", 0) / 100;
  const warm = num(p, "warmth", 0) * 0.35;
  for (let i = 0; i < d.length; i += 4) {
    let r = (d[i] - lo) * gain + bright;
    let g = (d[i + 1] - lo) * gain + bright;
    let b = (d[i + 2] - lo) * gain + bright;
    r = cf * (r - 128) + 128;
    g = cf * (g - 128) + 128;
    b = cf * (b - 128) + 128;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    r = l + (r - l) * sat + warm;
    g = l + (g - l) * sat;
    b = l + (b - l) * sat - warm;
    d[i] = clamp(r);
    d[i + 1] = clamp(g);
    d[i + 2] = clamp(b);
  }
  x.putImageData(img, 0, 0);
  return c;
}

export function unsharp(c: HTMLCanvasElement, amount: number, radius: number) {
  const x = ctxOf(c);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const bl = blurData(d, c.width, c.height, radius);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp(d[i] + amount * (d[i] - bl[i]));
    d[i + 1] = clamp(d[i + 1] + amount * (d[i + 1] - bl[i + 1]));
    d[i + 2] = clamp(d[i + 2] + amount * (d[i + 2] - bl[i + 2]));
  }
  x.putImageData(img, 0, 0);
  return c;
}

function sharpen(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const scale = Math.max(1, Math.min(c.width, c.height) / 900);
  return unsharp(c, num(p, "amount", 1), Math.max(1, Math.round(num(p, "radius", 2) * scale)));
}

function bw(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const ct = num(p, "contrast", 0) * 2;
  const cf = (259 * (ct + 255)) / (255 * (259 - ct));
  const thr = p.threshold === true;
  const t = num(p, "level", 128);
  for (let i = 0; i < d.length; i += 4) {
    let l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    l = cf * (l - 128) + 128;
    if (thr) l = l >= t ? 255 : 0;
    l = clamp(l);
    d[i] = d[i + 1] = d[i + 2] = l;
  }
  x.putImageData(img, 0, 0);
  return c;
}

/** Largest scale factor that keeps the result inside what browsers can allocate. */
export function safeFactor(w: number, h: number, factor: number) {
  let f = factor;
  while (f > 1 && (w * f > MAX_EDGE || h * f > MAX_EDGE || w * f * h * f > MAX_PIXELS)) f -= 0.5;
  return Math.max(1, f);
}

function upscale(src: Src, p: P): HTMLCanvasElement {
  const target = safeFactor(src.width, src.height, num(p, "factor", 2));
  let cur: HTMLCanvasElement = copyOf(src);
  let done = 1;
  // Grow in steps of at most 2×, which keeps edges smoother than one big jump.
  while (done < target - 0.001) {
    const step = Math.min(2, target / done);
    const next = makeCanvas(cur.width * step, cur.height * step);
    const nx = ctxOf(next);
    nx.imageSmoothingEnabled = true;
    nx.imageSmoothingQuality = "high";
    nx.drawImage(cur, 0, 0, next.width, next.height);
    cur = next;
    done *= step;
  }
  if (target > 1) unsharp(cur, num(p, "sharp", 0.6), Math.max(1, Math.round(target / 2)));
  return cur;
}

function blurBg(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const w = c.width;
  const h = c.height;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  const radius = num(p, "blur", 0.02) * Math.min(w, h);
  const bl = blurData(d, w, h, radius);
  const cx = num(p, "cx", 0.5) * w;
  const cy = num(p, "cy", 0.5) * h;
  const rx = Math.max(1, num(p, "size", 0.5) * w * 0.5);
  const ry = Math.max(1, num(p, "size", 0.5) * h * 0.5);
  const feather = Math.max(0.01, num(p, "feather", 0.4));
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const dist = Math.hypot((xx - cx) / rx, (yy - cy) / ry);
      let t = (dist - 1) / feather; // 0 inside the oval, 1 fully blurred
      t = t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
      if (t === 0) continue;
      const i = (yy * w + xx) * 4;
      d[i] = d[i] + (bl[i] - d[i]) * t;
      d[i + 1] = d[i + 1] + (bl[i + 1] - d[i + 1]) * t;
      d[i + 2] = d[i + 2] + (bl[i + 2] - d[i + 2]) * t;
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

/** Paints strokes into a 0/255 mask the size of the picture. */
export function strokeMask(strokes: Stroke[], w: number, h: number): Uint8Array {
  const m = makeCanvas(w, h);
  const x = ctxOf(m);
  x.lineCap = "round";
  x.lineJoin = "round";
  x.strokeStyle = "#fff";
  x.fillStyle = "#fff";
  const base = Math.min(w, h);
  for (const s of strokes) {
    const r = Math.max(1, s.r * base);
    x.lineWidth = r * 2;
    if (s.pts.length === 1) {
      x.beginPath();
      x.arc(s.pts[0][0] * w, s.pts[0][1] * h, r, 0, Math.PI * 2);
      x.fill();
    } else {
      x.beginPath();
      s.pts.forEach(([px, py], i) => (i ? x.lineTo(px * w, py * h) : x.moveTo(px * w, py * h)));
      x.stroke();
    }
  }
  const d = x.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] > 127 ? 255 : 0;
  return out;
}

/* ───────────── mask helpers ───────────── */

/** Bounding box [x0, y0, x1, y1] of the non-zero pixels, or null when the mask is empty. */
function maskBox(m: Uint8Array, w: number, h: number): [number, number, number, number] | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++)
      if (m[row + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}

/** Grows a mask by r pixels (square window, two fast passes). */
function dilateMask(m: Uint8Array, w: number, h: number, r: number): Uint8Array {
  r = Math.round(r);
  if (r < 1) return m;
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const dst = new Uint8Array(src.length);
    const len = horizontal ? w : h;
    const lines = horizontal ? h : w;
    const ps = new Int32Array(len + 1);
    for (let l = 0; l < lines; l++) {
      for (let i = 0; i < len; i++) ps[i + 1] = ps[i] + (src[horizontal ? l * w + i : i * w + l] ? 1 : 0);
      for (let i = 0; i < len; i++) {
        const a = Math.max(0, i - r);
        const b = Math.min(len - 1, i + r);
        if (ps[b + 1] - ps[a] > 0) dst[horizontal ? l * w + i : i * w + l] = 255;
      }
    }
    return dst;
  };
  return pass(pass(m, true), false);
}

/** Turns a 0/255 mask into a soft 0..1 mask by blurring it. */
function softMask(m: Uint8Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(m.length);
  if (r < 1) {
    for (let i = 0; i < m.length; i++) out[i] = m[i] ? 1 : 0;
    return out;
  }
  const buf = new Uint8ClampedArray(m.length * 4);
  for (let i = 0; i < m.length; i++) buf[i * 4] = m[i] ? 255 : 0;
  const bl = blurData(buf, w, h, r);
  for (let i = 0; i < m.length; i++) out[i] = bl[i * 4] / 255;
  return out;
}

/* ───────────── remove object (inpainting) ───────────── */

interface Level {
  w: number;
  h: number;
  col: Float32Array; // r, g, b per pixel
  known: Uint8Array;
  unk: Int32Array; // indices of unknown pixels
}

function makeLevel(w: number, h: number, col: Float32Array, known: Uint8Array): Level {
  let n = 0;
  for (let i = 0; i < known.length; i++) if (!known[i]) n++;
  const unk = new Int32Array(n);
  let k = 0;
  for (let i = 0; i < known.length; i++) if (!known[i]) unk[k++] = i;
  return { w, h, col, known, unk };
}

/**
 * Fills unknown pixels by smooth interpolation of the known ones (a multi-resolution
 * "harmonic" fill): solve coarse first, then refine. No streaks, colours flow in from all sides.
 */
function harmonicFill(d: Uint8ClampedArray, m: Uint8Array, w: number, h: number): Float32Array | null {
  const col0 = new Float32Array(w * h * 3);
  const known0 = new Uint8Array(w * h);
  let anyKnown = false;
  for (let i = 0; i < w * h; i++) {
    col0[i * 3] = d[i * 4];
    col0[i * 3 + 1] = d[i * 4 + 1];
    col0[i * 3 + 2] = d[i * 4 + 2];
    if (!m[i]) {
      known0[i] = 1;
      anyKnown = true;
    }
  }
  if (!anyKnown) return null;
  const levels: Level[] = [makeLevel(w, h, col0, known0)];
  while (levels[levels.length - 1].unk.length > 0) {
    const L = levels[levels.length - 1];
    const nw = Math.max(1, Math.ceil(L.w / 2));
    const nh = Math.max(1, Math.ceil(L.h / 2));
    const col = new Float32Array(nw * nh * 3);
    const wt = new Float32Array(nw * nh);
    for (let y = 0; y < L.h; y++)
      for (let x = 0; x < L.w; x++) {
        const i = y * L.w + x;
        if (!L.known[i]) continue;
        const j = (y >> 1) * nw + (x >> 1);
        col[j * 3] += L.col[i * 3];
        col[j * 3 + 1] += L.col[i * 3 + 1];
        col[j * 3 + 2] += L.col[i * 3 + 2];
        wt[j]++;
      }
    const known = new Uint8Array(nw * nh);
    for (let j = 0; j < wt.length; j++)
      if (wt[j] > 0) {
        col[j * 3] /= wt[j];
        col[j * 3 + 1] /= wt[j];
        col[j * 3 + 2] /= wt[j];
        known[j] = 1;
      }
    levels.push(makeLevel(nw, nh, col, known));
    if (nw === 1 && nh === 1) break;
  }
  const top = levels[levels.length - 1];
  if (top.unk.length) return null;
  for (let l = levels.length - 2; l >= 0; l--) {
    const L = levels[l];
    const P = levels[l + 1];
    // Start from the smoother coarse answer…
    for (let k = 0; k < L.unk.length; k++) {
      const i = L.unk[k];
      const x = i % L.w;
      const y = (i - x) / L.w;
      const fx = Math.min(P.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
      const fy = Math.min(P.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const x1 = Math.min(P.w - 1, x0 + 1), y1 = Math.min(P.h - 1, y0 + 1);
      const ax = fx - x0, ay = fy - y0;
      for (let c = 0; c < 3; c++) {
        const top2 = P.col[(y0 * P.w + x0) * 3 + c] * (1 - ax) + P.col[(y0 * P.w + x1) * 3 + c] * ax;
        const bot = P.col[(y1 * P.w + x0) * 3 + c] * (1 - ax) + P.col[(y1 * P.w + x1) * 3 + c] * ax;
        L.col[i * 3 + c] = top2 * (1 - ay) + bot * ay;
      }
    }
    // …then relax: every unknown pixel moves to the average of its neighbours.
    const iters = l === 0 ? 10 : 14;
    for (let it = 0; it < iters; it++) {
      const fwd = it % 2 === 0;
      for (let k = 0; k < L.unk.length; k++) {
        const i = L.unk[fwd ? k : L.unk.length - 1 - k];
        const x = i % L.w;
        const y = (i - x) / L.w;
        let r = 0, g = 0, b = 0, n = 0;
        if (x > 0) { const j = (i - 1) * 3; r += L.col[j]; g += L.col[j + 1]; b += L.col[j + 2]; n++; }
        if (x < L.w - 1) { const j = (i + 1) * 3; r += L.col[j]; g += L.col[j + 1]; b += L.col[j + 2]; n++; }
        if (y > 0) { const j = (i - L.w) * 3; r += L.col[j]; g += L.col[j + 1]; b += L.col[j + 2]; n++; }
        if (y < L.h - 1) { const j = (i + L.w) * 3; r += L.col[j]; g += L.col[j + 1]; b += L.col[j + 2]; n++; }
        L.col[i * 3] = r / n;
        L.col[i * 3 + 1] = g / n;
        L.col[i * 3 + 2] = b / n;
      }
    }
  }
  return levels[0].col;
}

/** Removes the painted area and rebuilds it from the surroundings, with matching grain. */
function inpaint(src: Src, p: P, strokes: Stroke[]): HTMLCanvasElement {
  void p;
  const c = copyOf(src);
  if (!strokes.length) return c;
  const w = c.width;
  const h = c.height;
  const full = strokeMask(strokes, w, h);
  const box = maskBox(full, w, h);
  if (!box) return c;
  const grow = Math.max(2, Math.round(Math.min(w, h) * 0.004)); // paint is never exact, so reach a bit further
  const bw = box[2] - box[0] + 1;
  const bh = box[3] - box[1] + 1;
  const margin = Math.round(Math.min(500, Math.max(40, Math.max(bw, bh) * 0.6))) + grow + 4;
  const cx0 = Math.max(0, box[0] - margin);
  const cy0 = Math.max(0, box[1] - margin);
  const cx1 = Math.min(w - 1, box[2] + margin);
  const cy1 = Math.min(h - 1, box[3] + margin);
  const cw = cx1 - cx0 + 1;
  const ch = cy1 - cy0 + 1;
  const cx = ctxOf(c);
  const img = cx.getImageData(cx0, cy0, cw, ch);
  const d = img.data;
  let m: Uint8Array = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) m[y * cw + x] = full[(y + cy0) * w + x + cx0];
  m = dilateMask(m, cw, ch, grow);

  const filled = harmonicFill(d, m, cw, ch);
  if (!filled) return c;

  // Grain: borrow the fine detail (pixel minus its blur) of random nearby known pixels.
  const smooth = blurData(d, cw, ch, 2);
  const knownIdx: number[] = [];
  for (let i = 0; i < m.length; i++) if (!m[i]) knownIdx.push(i);
  let seed = 987654321;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const out = new Uint8ClampedArray(d.length);
  for (let i = 0; i < m.length; i++) {
    const k = i * 4;
    if (m[i]) {
      const j = knownIdx[Math.floor(rnd() * knownIdx.length)] * 4;
      for (let ch2 = 0; ch2 < 3; ch2++) {
        const hp = Math.max(-18, Math.min(18, d[j + ch2] - smooth[j + ch2]));
        out[k + ch2] = clamp(filled[i * 3 + ch2] + hp * 0.9);
      }
      out[k + 3] = 255;
    } else {
      out[k] = d[k]; out[k + 1] = d[k + 1]; out[k + 2] = d[k + 2]; out[k + 3] = d[k + 3];
    }
  }
  // Feather the seam so there is no visible edge.
  const a = softMask(m, cw, ch, Math.max(1, grow * 0.8));
  for (let i = 0; i < m.length; i++) {
    if (a[i] <= 0) continue;
    const k = i * 4;
    const t = m[i] ? Math.max(a[i], 0.999) : a[i];
    d[k] = d[k] * (1 - t) + out[k] * t;
    d[k + 1] = d[k + 1] * (1 - t) + out[k + 1] * t;
    d[k + 2] = d[k + 2] * (1 - t) + out[k + 2] * t;
    d[k + 3] = 255;
  }
  cx.putImageData(img, cx0, cy0);
  return c;
}

/* ───────────── blur / pixelate / cover part of a picture ───────────── */

function redact(src: Src, p: P, strokes: Stroke[]): HTMLCanvasElement {
  const c = copyOf(src);
  if (!strokes.length) return c;
  const w = c.width;
  const h = c.height;
  const full = strokeMask(strokes, w, h);
  const box = maskBox(full, w, h);
  if (!box) return c;
  const style = str(p, "style", "pixelate");
  const strength = num(p, "strength", 0.03);
  const base = Math.min(w, h);
  const cx = ctxOf(c);

  // Work on a crop around the painted area only, so big photos stay fast.
  const blurR = Math.max(4, strength * 3 * base);
  const block = Math.max(4, Math.round(strength * 1.6 * base));
  let cx0: number, cy0: number, cx1: number, cy1: number;
  if (style === "pixelate") {
    cx0 = Math.floor(box[0] / block) * block;
    cy0 = Math.floor(box[1] / block) * block;
    cx1 = Math.min(w, Math.ceil((box[2] + 1) / block) * block) - 1;
    cy1 = Math.min(h, Math.ceil((box[3] + 1) / block) * block) - 1;
  } else {
    const mg = Math.ceil(blurR * 2) + 2;
    cx0 = Math.max(0, box[0] - mg);
    cy0 = Math.max(0, box[1] - mg);
    cx1 = Math.min(w - 1, box[2] + mg);
    cy1 = Math.min(h - 1, box[3] + mg);
  }
  const cw = cx1 - cx0 + 1;
  const ch = cy1 - cy0 + 1;
  const img = cx.getImageData(cx0, cy0, cw, ch);
  const d = img.data;
  const m = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) m[y * cw + x] = full[(y + cy0) * w + x + cx0];

  let eff: Uint8ClampedArray;
  if (style === "blur") {
    eff = blurData(d, cw, ch, blurR);
  } else if (style === "cover") {
    eff = new Uint8ClampedArray(d.length);
    for (let i = 0; i < eff.length; i += 4) eff[i + 3] = 255;
  } else {
    eff = new Uint8ClampedArray(d.length);
    for (let by = 0; by < ch; by += block)
      for (let bx = 0; bx < cw; bx += block) {
        let r = 0, g = 0, b = 0, n = 0;
        const ye = Math.min(ch, by + block);
        const xe = Math.min(cw, bx + block);
        for (let yy = by; yy < ye; yy++)
          for (let xx = bx; xx < xe; xx++) {
            const k = (yy * cw + xx) * 4;
            r += d[k]; g += d[k + 1]; b += d[k + 2]; n++;
          }
        for (let yy = by; yy < ye; yy++)
          for (let xx = bx; xx < xe; xx++) {
            const k = (yy * cw + xx) * 4;
            eff[k] = r / n; eff[k + 1] = g / n; eff[k + 2] = b / n; eff[k + 3] = 255;
          }
      }
  }
  // Soft edge for blur only; pixelate and cover keep a crisp edge so nothing shows through.
  const a = style === "blur" ? softMask(m, cw, ch, Math.max(1, base * 0.004)) : null;
  for (let i = 0; i < m.length; i++) {
    const t = a ? (m[i] ? Math.max(a[i], 0.999) : a[i]) : m[i] ? 1 : 0;
    if (t <= 0) continue;
    const k = i * 4;
    d[k] = d[k] * (1 - t) + eff[k] * t;
    d[k + 1] = d[k + 1] * (1 - t) + eff[k + 1] * t;
    d[k + 2] = d[k + 2] * (1 - t) + eff[k + 2] * t;
  }
  cx.putImageData(img, cx0, cy0);
  return c;
}

/* ───────────── background remover / changer / transparent colour ───────────── */

export function edgeColor(d: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  return edgeColors(d, w, h, 1)[0];
}

/** The main colours along the picture's border, most common first (up to `max`). */
function edgeColors(d: Uint8ClampedArray, w: number, h: number, max = 4): RGB[] {
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let total = 0;
  const add = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    const key = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
    buckets.set(key, e);
    total++;
  };
  for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1); }
  for (let y = 1; y < h - 1; y++) { add(0, y); add(w - 1, y); }
  const list = Array.from(buckets.values()).sort((a, b) => b.n - a.n);
  const out: RGB[] = [];
  for (const e of list) {
    if (out.length >= max) break;
    if (out.length && e.n < total * 0.06) break;
    const col: RGB = [e.r / e.n, e.g / e.n, e.b / e.n];
    // Skip colours that are almost the same as one already taken.
    if (out.some((o) => Math.hypot(o[0] - col[0], o[1] - col[1], o[2] - col[2]) < 36)) continue;
    out.push(col);
  }
  return out.length ? out : [[255, 255, 255]];
}

const dist = (d: Uint8ClampedArray, i: number, c: ArrayLike<number>) => {
  const a = d[i] - c[0], b = d[i + 1] - c[1], e = d[i + 2] - c[2];
  return Math.sqrt(a * a + b * b + e * e);
};

/**
 * Removes the background that is connected to the picture's edges. It follows smooth gradients
 * (studio walls, skies), cleans up specks, and removes the old background colour from the edge.
 * Returns a canvas with transparency, or the picture on a solid colour when `fill` is given.
 */
function bgRemove(src: Src, p: P, fill?: string): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const w = c.width;
  const h = c.height;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  const sm = blurData(d, w, h, 1); // a lightly denoised copy decides what is background
  const refs = edgeColors(sm, w, h, 4);
  const tol = num(p, "tolerance", 30);
  const thr = tol * 2.2;
  const drift = thr * 2;
  const step = 5 + tol * 0.15;
  const nearest = (i: number) => {
    let best = Infinity;
    for (const r of refs) {
      const v = dist(sm, i, r);
      if (v < best) best = v;
    }
    return best;
  };

  let bg: Uint8Array = new Uint8Array(w * h); // 255 = background
  const stack: number[] = [];
  const seed = (px: number, py: number) => {
    const idx = py * w + px;
    if (!bg[idx] && nearest(idx * 4) <= thr) {
      bg[idx] = 255;
      stack.push(idx);
    }
  };
  for (let xx = 0; xx < w; xx++) { seed(xx, 0); seed(xx, h - 1); }
  for (let yy = 0; yy < h; yy++) { seed(0, yy); seed(w - 1, yy); }
  const stepDiff = (a: number, b: number) => {
    const x1 = sm[a] - sm[b], y1 = sm[a + 1] - sm[b + 1], z1 = sm[a + 2] - sm[b + 2];
    return Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
  };
  const tryAdd = (from: number, to: number) => {
    if (bg[to]) return;
    const dn = nearest(to * 4);
    // Either close to the background colour, or only a small step from a pixel already
    // known to be background (so a soft gradient is followed, but a sharp edge is not).
    if (dn <= thr || (dn <= drift && stepDiff(to * 4, from * 4) <= step)) {
      bg[to] = 255;
      stack.push(to);
    }
  };
  while (stack.length) {
    const idx = stack.pop()!;
    const px = idx % w;
    const py = (idx - px) / w;
    if (px > 0) tryAdd(idx, idx - 1);
    if (px < w - 1) tryAdd(idx, idx + 1);
    if (py > 0) tryAdd(idx, idx - w);
    if (py < h - 1) tryAdd(idx, idx + w);
  }

  // Drop leftover specks of "foreground": keep the main subject(s), not dust on the wall.
  const label = new Int32Array(w * h);
  const sizes: number[] = [0];
  let nLabels = 0;
  for (let i = 0; i < label.length; i++) {
    if (bg[i] || label[i]) continue;
    nLabels++;
    let size = 0;
    const st = [i];
    label[i] = nLabels;
    while (st.length) {
      const j = st.pop()!;
      size++;
      const jx = j % w;
      if (jx > 0 && !bg[j - 1] && !label[j - 1]) { label[j - 1] = nLabels; st.push(j - 1); }
      if (jx < w - 1 && !bg[j + 1] && !label[j + 1]) { label[j + 1] = nLabels; st.push(j + 1); }
      if (j >= w && !bg[j - w] && !label[j - w]) { label[j - w] = nLabels; st.push(j - w); }
      if (j < label.length - w && !bg[j + w] && !label[j + w]) { label[j + w] = nLabels; st.push(j + w); }
    }
    sizes.push(size);
  }
  const biggest = Math.max(0, ...sizes);
  for (let i = 0; i < label.length; i++) if (label[i] && sizes[label[i]] < biggest * 0.04) bg[i] = 255;

  // Pull the edge in a touch (anti-aliased edge pixels still carry background colour).
  const pull = Math.round(Math.min(w, h) / 900);
  if (pull > 0) bg = dilateMask(bg, w, h, pull);

  // Soft edge.
  const soft = Math.round(num(p, "softness", 1) * Math.max(1, Math.min(w, h) / 600));
  const t = softMask(bg, w, h, soft); // 1 = background
  const smoothed = soft > 0 ? t : null;

  // What colour was the background right next to each edge pixel? (blurred average of bg pixels only)
  const near = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < bg.length; i++)
    if (bg[i]) {
      near[i * 4] = d[i * 4]; near[i * 4 + 1] = d[i * 4 + 1]; near[i * 4 + 2] = d[i * 4 + 2]; near[i * 4 + 3] = 255;
    }
  const nb = blurData(near, w, h, Math.max(3, soft * 2 + 3));
  const fillRgb = fill ? hexToRgb(fill) : null;
  for (let i = 0; i < bg.length; i++) {
    const tt = smoothed ? smoothed[i] : bg[i] ? 1 : 0;
    const k = i * 4;
    if (tt <= 0) continue;
    if (tt < 0.995 && nb[k + 3] > 8) {
      // Remove the old background from semi-transparent edge pixels: C = F·(1-t) + B·t.
      const bw_ = nb[k + 3] / 255;
      const bR = nb[k] / bw_, bG = nb[k + 1] / bw_, bB = nb[k + 2] / bw_;
      const keep = Math.max(0.05, 1 - tt);
      d[k] = clamp((d[k] - bR * tt) / keep);
      d[k + 1] = clamp((d[k + 1] - bG * tt) / keep);
      d[k + 2] = clamp((d[k + 2] - bB * tt) / keep);
    }
    if (fillRgb) {
      d[k] = d[k] * (1 - tt) + fillRgb[0] * tt;
      d[k + 1] = d[k + 1] * (1 - tt) + fillRgb[1] * tt;
      d[k + 2] = d[k + 2] * (1 - tt) + fillRgb[2] * tt;
      d[k + 3] = 255;
    } else {
      d[k + 3] = tt >= 0.995 ? 0 : Math.round(d[k + 3] * (1 - tt));
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

/** Makes the clicked colour transparent (everywhere, or only the connected area). */
function transparent(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const w = c.width;
  const h = c.height;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  const sm = blurData(d, w, h, Math.max(2, Math.round(Math.min(w, h) / 400))); // smooths noise so the cut-out edge is clean
  const px = Math.min(w - 1, Math.max(0, Math.round(num(p, "px", 0) * (w - 1))));
  const py = Math.min(h - 1, Math.max(0, Math.round(num(p, "py", 0) * (h - 1))));
  let ref: RGB;
  if (p.hasPick === false) {
    ref = edgeColors(sm, w, h, 1)[0];
  } else {
    // Average a small patch around the click instead of trusting one noisy pixel.
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = Math.max(0, py - 2); yy <= Math.min(h - 1, py + 2); yy++)
      for (let xx = Math.max(0, px - 2); xx <= Math.min(w - 1, px + 2); xx++) {
        const k = (yy * w + xx) * 4;
        r += sm[k]; g += sm[k + 1]; b += sm[k + 2]; n++;
      }
    ref = [r / n, g / n, b / n];
  }
  const thr = Math.max(1, num(p, "tolerance", 30) * 2.2);
  const lo = thr * 0.7;

  let allowed: Uint8Array | null = null;
  if (p.contiguous === true) {
    // Only the area connected to the click (or the edges), so the same colour inside the subject stays.
    const reg = new Uint8Array(w * h);
    const st: number[] = [];
    const go = (i: number) => {
      if (!reg[i] && dist(sm, i * 4, ref) <= thr) {
        reg[i] = 255;
        st.push(i);
      }
    };
    if (p.hasPick === false) {
      for (let xx = 0; xx < w; xx++) { go(xx); go((h - 1) * w + xx); }
      for (let yy = 0; yy < h; yy++) { go(yy * w); go(yy * w + w - 1); }
    } else go(py * w + px);
    while (st.length) {
      const i = st.pop()!;
      const ix = i % w;
      if (ix > 0) go(i - 1);
      if (ix < w - 1) go(i + 1);
      if (i >= w) go(i - w);
      if (i < reg.length - w) go(i + w);
    }
    allowed = dilateMask(reg, w, h, 1);
  }

  for (let i = 0; i < w * h; i++) {
    if (allowed && !allowed[i]) continue;
    const dd = dist(sm, i * 4, ref);
    if (dd >= thr) continue;
    const t = dd <= lo ? 1 : (thr - dd) / (thr - lo); // 1 = fully removed
    const k = i * 4;
    if (t < 0.995) {
      const keep = Math.max(0.05, 1 - t);
      d[k] = clamp((d[k] - ref[0] * t) / keep);
      d[k + 1] = clamp((d[k + 1] - ref[1] * t) / keep);
      d[k + 2] = clamp((d[k + 2] - ref[2] * t) / keep);
      d[k + 3] = Math.round(d[k + 3] * (1 - t));
    } else d[k + 3] = 0;
  }
  x.putImageData(img, 0, 0);
  return c;
}

function roundRectPath(x: CanvasRenderingContext2D, l: number, t: number, w: number, h: number, r: number) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  x.beginPath();
  x.moveTo(l + r, t);
  x.arcTo(l + w, t, l + w, t + h, r);
  x.arcTo(l + w, t + h, l, t + h, r);
  x.arcTo(l, t + h, l, t, r);
  x.arcTo(l, t, l + w, t, r);
  x.closePath();
}

function border(src: Src, p: P): HTMLCanvasElement {
  const base = Math.min(src.width, src.height);
  const bwid = Math.round(num(p, "width", 0.03) * base);
  const W = src.width + bwid * 2;
  const H = src.height + bwid * 2;
  const radius = num(p, "radius", 0) * Math.min(W, H);
  const c = makeCanvas(W, H);
  const x = ctxOf(c);
  if (bwid > 0) {
    roundRectPath(x, 0, 0, W, H, radius);
    x.fillStyle = str(p, "color", "#ffffff");
    x.fill();
  }
  x.save();
  roundRectPath(x, bwid, bwid, src.width, src.height, Math.max(0, radius - bwid));
  x.clip();
  x.drawImage(src, bwid, bwid);
  x.restore();
  return c;
}

/** Runs one operation. Always returns a new canvas. */

/* ───────────── photo filters, invert, blur, sketch, pixel art, vignette, text, padding ───────────── */

type RGB = [number, number, number];

/** Colour transforms for the filter presets. Each takes a pixel and returns the new one. */
const FILTERS: Record<string, (r: number, g: number, b: number) => RGB> = {
  sepia: (r, g, b) => [r * 0.393 + g * 0.769 + b * 0.189, r * 0.349 + g * 0.686 + b * 0.168, r * 0.272 + g * 0.534 + b * 0.131],
  vintage: (r, g, b) => {
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    // Lifted blacks, softened contrast and a warm, slightly green cast.
    return [l * 0.35 + r * 0.65 + 18, l * 0.3 + g * 0.7 + 8, l * 0.4 + b * 0.6 - 6].map((v) => 0.82 * v + 22) as RGB;
  },
  cool: (r, g, b) => [r * 0.9, g * 1.0, b * 1.15 + 8],
  warm: (r, g, b) => [r * 1.12 + 6, g * 1.03, b * 0.88],
  vivid: (r, g, b) => {
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    return [l + (r - l) * 1.45, l + (g - l) * 1.45, l + (b - l) * 1.45].map((v) => (v - 128) * 1.08 + 128) as RGB;
  },
  fade: (r, g, b) => [r * 0.8 + 40, g * 0.8 + 40, b * 0.8 + 44],
  noir: (r, g, b) => {
    const l = (0.299 * r + 0.587 * g + 0.114 * b - 128) * 1.3 + 128;
    return [l, l, l];
  },
  cyan: (r, g, b) => {
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    return [l * 0.55 + r * 0.45 - 10, l * 0.9 + g * 0.1 + 10, l * 0.9 + b * 0.1 + 24];
  },
};
export const FILTER_NAMES: [string, string][] = [
  ["sepia", "Sepia"], ["vintage", "Vintage"], ["warm", "Warm"], ["cool", "Cool"],
  ["vivid", "Vivid"], ["fade", "Faded"], ["noir", "Noir"], ["cyan", "Teal"],
];

function filter(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const fn = FILTERS[str(p, "preset", "sepia")] ?? FILTERS.sepia;
  const a = clamp(num(p, "strength", 1), 0, 1);
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = fn(d[i], d[i + 1], d[i + 2]);
    d[i] = clamp(d[i] + (r - d[i]) * a);
    d[i + 1] = clamp(d[i + 1] + (g - d[i + 1]) * a);
    d[i + 2] = clamp(d[i + 2] + (b - d[i + 2]) * a);
  }
  x.putImageData(img, 0, 0);
  return c;
}

function invert(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const img = x.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const a = clamp(num(p, "strength", 1), 0, 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i] + (255 - 2 * d[i]) * a;
    d[i + 1] = d[i + 1] + (255 - 2 * d[i + 1]) * a;
    d[i + 2] = d[i + 2] + (255 - 2 * d[i + 2]) * a;
  }
  x.putImageData(img, 0, 0);
  return c;
}

function blurAll(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const img = x.getImageData(0, 0, c.width, c.height);
  const r = Math.max(0, num(p, "amount", 0.02) * Math.min(c.width, c.height));
  img.data.set(blurData(img.data, c.width, c.height, r));
  x.putImageData(img, 0, 0);
  return c;
}

function sketch(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const w = c.width;
  const h = c.height;
  const img = x.getImageData(0, 0, w, h);
  const d = img.data;
  const gray = new Uint8ClampedArray(d.length);
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    gray[i] = gray[i + 1] = gray[i + 2] = 255 - l; // inverted grey
    gray[i + 3] = 255;
  }
  const bl = blurData(gray, w, h, Math.max(1, num(p, "detail", 0.02) * Math.min(w, h)));
  const mix = clamp(num(p, "darkness", 1), 0.3, 2);
  for (let i = 0; i < d.length; i += 4) {
    const base = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    // Colour dodge: the classic pencil-sketch recipe.
    let v = bl[i] >= 255 ? 255 : Math.min(255, (base * 255) / (255 - bl[i]));
    v = 255 - (255 - v) * mix;
    d[i] = d[i + 1] = d[i + 2] = clamp(v);
    d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

function pixelArt(src: Src, p: P): HTMLCanvasElement {
  const w = src.width;
  const h = src.height;
  const b = Math.max(2, Math.round(num(p, "size", 0.02) * Math.min(w, h)));
  const sw = Math.max(1, Math.round(w / b));
  const sh = Math.max(1, Math.round(h / b));
  const small = makeCanvas(sw, sh);
  const sx = ctxOf(small);
  sx.imageSmoothingQuality = "high";
  sx.drawImage(src, 0, 0, sw, sh);
  const levels = Math.round(num(p, "levels", 0));
  if (levels >= 2) {
    const img = sx.getImageData(0, 0, sw, sh);
    const step = 255 / (levels - 1);
    for (let i = 0; i < img.data.length; i += 4)
      for (let k = 0; k < 3; k++) img.data[i + k] = Math.round(img.data[i + k] / step) * step;
    sx.putImageData(img, 0, 0);
  }
  const c = makeCanvas(w, h);
  const x = ctxOf(c);
  x.imageSmoothingEnabled = false;
  x.drawImage(small, 0, 0, w, h);
  return c;
}

function vignette(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const w = c.width;
  const h = c.height;
  const strength = clamp(num(p, "strength", 0.6), 0, 1);
  const size = clamp(num(p, "size", 0.55), 0.1, 1);
  const rad = Math.hypot(w, h) / 2;
  const g = x.createRadialGradient(w / 2, h / 2, rad * size * 0.6, w / 2, h / 2, rad);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(${str(p, "tone", "dark") === "light" ? "255,255,255" : "0,0,0"},${strength})`);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  return c;
}

function addText(src: Src, p: P): HTMLCanvasElement {
  const c = copyOf(src);
  const x = ctxOf(c);
  const lines = str(p, "text", "").split("\n").map((l) => l.trimEnd()).filter((l) => l.length);
  if (!lines.length) return c;
  const base = Math.min(c.width, c.height);
  const size = Math.max(8, num(p, "size", 0.08) * base);
  const family = str(p, "font", "sans");
  const stack = family === "serif" ? 'Georgia, "Times New Roman", serif' : family === "mono" ? '"Courier New", monospace' : family === "impact" ? 'Impact, "Arial Black", sans-serif' : '"Helvetica Neue", Arial, sans-serif';
  x.font = `${family === "impact" ? 400 : 700} ${size}px ${stack}`;
  x.textBaseline = "middle";
  const pos = str(p, "pos", "bc");
  const col = pos[1] ?? "c";
  const row = pos[0] ?? "b";
  x.textAlign = col === "l" ? "left" : col === "r" ? "right" : "center";
  const m = size * 0.7;
  const lh = size * 1.18;
  const total = lh * lines.length;
  const px = col === "l" ? m : col === "r" ? c.width - m : c.width / 2;
  const top = row === "t" ? m : row === "m" ? (c.height - total) / 2 : c.height - m - total;
  const color = str(p, "color", "#ffffff");
  const bar = p.bar === true;
  const outline = p.outline !== false;
  if (bar) {
    const widest = Math.max(...lines.map((l) => x.measureText(l).width));
    const bx = col === "l" ? px - size * 0.4 : col === "r" ? px - widest - size * 0.4 : px - widest / 2 - size * 0.4;
    x.fillStyle = "rgba(0,0,0,0.55)";
    roundRectPath(x, bx, top - size * 0.2, widest + size * 0.8, total + size * 0.4, size * 0.25);
    x.fill();
  }
  x.lineJoin = "round";
  lines.forEach((line, i) => {
    const py = top + lh * i + lh / 2;
    if (outline && !bar) {
      x.lineWidth = Math.max(2, size / 7);
      x.strokeStyle = color.toLowerCase() === "#000000" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)";
      x.strokeText(line, px, py);
    }
    x.fillStyle = color;
    x.fillText(line, px, py);
  });
  return c;
}

export function parseRatio(r: string): [number, number] {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(r);
  return m ? [Number(m[1]), Number(m[2])] : [1, 1];
}

function pad(src: Src, p: P): HTMLCanvasElement {
  const [rw, rh] = parseRatio(str(p, "ratio", "1:1"));
  const target = rw / rh;
  const cur = src.width / src.height;
  let W = src.width;
  let H = src.height;
  if (cur > target) H = Math.round(src.width / target);
  else W = Math.round(src.height * target);
  const extra = Math.max(0, num(p, "margin", 0));
  W = Math.round(W * (1 + extra));
  H = Math.round(H * (1 + extra));
  const c = makeCanvas(W, H);
  const x = ctxOf(c);
  const fill = str(p, "fill", "color");
  if (fill === "blur") {
    // Cover the canvas with an enlarged copy, blur it, then place the sharp picture on top.
    const s = Math.max(W / src.width, H / src.height);
    const small = makeCanvas(Math.max(8, W / 8), Math.max(8, H / 8));
    const sx = ctxOf(small);
    sx.drawImage(src, (small.width - src.width * s / 8) / 2, (small.height - src.height * s / 8) / 2, (src.width * s) / 8, (src.height * s) / 8);
    const img = sx.getImageData(0, 0, small.width, small.height);
    img.data.set(blurData(img.data, small.width, small.height, Math.max(2, Math.min(small.width, small.height) * 0.06)));
    sx.putImageData(img, 0, 0);
    x.imageSmoothingQuality = "high";
    x.drawImage(small, 0, 0, W, H);
  } else if (fill !== "transparent") {
    x.fillStyle = str(p, "color", "#ffffff");
    x.fillRect(0, 0, W, H);
  }
  x.imageSmoothingQuality = "high";
  x.drawImage(src, Math.round((W - src.width) / 2), Math.round((H - src.height) / 2));
  return c;
}

export function render(op: OpId, src: Src, p: P, strokes: Stroke[] = []): HTMLCanvasElement {
  switch (op) {
    case "rotate": return rotate(src, p);
    case "watermark": return watermark(src, p);
    case "exif": return exifStrip(src);
    case "enhance": return enhance(src, p);
    case "sharpen": return sharpen(src, p);
    case "bw": return bw(src, p);
    case "upscale": return upscale(src, p);
    case "blurbg": return blurBg(src, p);
    case "inpaint": return inpaint(src, p, strokes);
    case "redact": return redact(src, p, strokes);
    case "bgremove": return bgRemove(src, p);
    case "bgchange": return bgRemove(src, p, str(p, "fill", "#ffffff"));
    case "transparent": return transparent(src, p);
    case "border": return border(src, p);
    case "filter": return filter(src, p);
    case "invert": return invert(src, p);
    case "blur": return blurAll(src, p);
    case "sketch": return sketch(src, p);
    case "pixel": return pixelArt(src, p);
    case "vignette": return vignette(src, p);
    case "text": return addText(src, p);
    case "pad": return pad(src, p);
  }
}

/** True when the result can have transparent pixels, so PNG (or WebP) must be used. */
export function needsAlpha(op: OpId, p: P): boolean {
  if (op === "bgremove" || op === "transparent") return true;
  if (op === "border") return num(p, "radius", 0) > 0;
  if (op === "pad") return str(p, "fill", "color") === "transparent";
  if (op === "rotate") return num(p, "angle", 0) !== 0 && str(p, "bg", "transparent") === "transparent";
  return false;
}