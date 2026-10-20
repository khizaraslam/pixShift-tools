"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Tool } from "@/lib/tools";
import { EXT, MIME, canvasToBlob, formatBytes } from "@/lib/image";
import { downloadBlob, flatten } from "@/lib/files";
import { makeCanvas } from "@/lib/ops";
import Drop from "./Drop";
import ImageList from "./ImageList";
import { useImages, type Img } from "./useImages";
import { Btn, ColorField, Panel, Seg, Slider } from "./ui";

type Layout = "grid" | "left" | "top" | "cols" | "rows";
type Rect = [number, number, number, number]; // x, y, w, h as fractions of the collage area

const MAX_PICS = 12;
const SHAPES: Record<string, [number, number]> = { "1:1": [1, 1], "4:5": [4, 5], "9:16": [9, 16], "16:9": [16, 9], "3:2": [3, 2] };
const LONG_EDGE = 2000;

/** Splits n pictures into rows of (nearly) equal count; the last row stretches so there are no holes. */
function gridRects(n: number, cols: number): Rect[] {
  const rows = Math.ceil(n / cols);
  const out: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    const inRow = r === rows - 1 ? n - cols * (rows - 1) : cols;
    for (let c = 0; c < inRow; c++) out.push([c / inRow, r / rows, 1 / inRow, 1 / rows]);
  }
  return out;
}

function layoutRects(layout: Layout, n: number, aspect: number): Rect[] {
  if (n === 1) return [[0, 0, 1, 1]];
  switch (layout) {
    case "cols":
      return Array.from({ length: n }, (_, i): Rect => [i / n, 0, 1 / n, 1]);
    case "rows":
      return Array.from({ length: n }, (_, i): Rect => [0, i / n, 1, 1 / n]);
    case "left": {
      const rest = n - 1;
      return [[0, 0, 0.62, 1], ...Array.from({ length: rest }, (_, i): Rect => [0.62, i / rest, 0.38, 1 / rest])];
    }
    case "top": {
      const rest = n - 1;
      return [[0, 0, 1, 0.62], ...Array.from({ length: rest }, (_, i): Rect => [i / rest, 0.62, 1 / rest, 0.38])];
    }
    default: {
      // More columns for wide canvases, more rows for tall ones.
      const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt(n * aspect))));
      return gridRects(n, cols);
    }
  }
}

function paint(
  canvas: HTMLCanvasElement,
  W: number,
  H: number,
  items: Img[],
  o: { layout: Layout; gap: number; pad: number; radius: number; bg: string; transparent: boolean },
) {
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext("2d")!;
  x.imageSmoothingQuality = "high";
  if (!o.transparent) {
    x.fillStyle = o.bg;
    x.fillRect(0, 0, W, H);
  }
  const base = Math.min(W, H);
  const gap = o.gap * base;
  const pad = o.pad * base;
  const area = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 };
  const rects = layoutRects(o.layout, items.length, W / H);
  rects.forEach((r, i) => {
    // Each cell shrinks by half a gap on every inner side, so gaps are even.
    const left = area.x + r[0] * area.w + (r[0] > 0.0001 ? gap / 2 : 0);
    const top = area.y + r[1] * area.h + (r[1] > 0.0001 ? gap / 2 : 0);
    const right = area.x + (r[0] + r[2]) * area.w - (r[0] + r[2] < 0.9999 ? gap / 2 : 0);
    const bottom = area.y + (r[1] + r[3]) * area.h - (r[1] + r[3] < 0.9999 ? gap / 2 : 0);
    const w = right - left;
    const h = bottom - top;
    if (w < 2 || h < 2) return;
    const bmp = items[i].bitmap;
    // "Cover" fit: fill the cell and crop the overflow from the middle.
    const s = Math.max(w / bmp.width, h / bmp.height);
    const sw = w / s;
    const sh = h / s;
    x.save();
    const rad = Math.min(o.radius * base, w / 2, h / 2);
    x.beginPath();
    if (rad > 0 && "roundRect" in x) (x as CanvasRenderingContext2D).roundRect(left, top, w, h, rad);
    else x.rect(left, top, w, h);
    x.clip();
    x.drawImage(bmp, (bmp.width - sw) / 2, (bmp.height - sh) / 2, sw, sh, left, top, w, h);
    x.restore();
  });
}

const LAYOUTS: { value: Layout; label: string }[] = [
  { value: "grid", label: "Grid" },
  { value: "left", label: "Big left" },
  { value: "top", label: "Big top" },
  { value: "cols", label: "Columns" },
  { value: "rows", label: "Rows" },
];

export default function CollageTool({ tool }: { tool: Tool }) {
  const { items, add, remove, move, clear, error, setError } = useImages();
  const [layout, setLayout] = useState<Layout>(tool.mode === "left" ? "left" : "grid");
  const [shape, setShape] = useState(tool.mode === "story" ? "9:16" : "1:1");
  const [gapPct, setGapPct] = useState(2);
  const [padPct, setPadPct] = useState(2);
  const [radPct, setRadPct] = useState(0);
  const [bg, setBg] = useState("#ffffff");
  const [clearBg, setClearBg] = useState(false);
  const [fmt, setFmt] = useState<"png" | "jpeg">("jpeg");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const preview = useRef<HTMLCanvasElement>(null);

  const used = useMemo(() => items.slice(0, MAX_PICS), [items]);
  const [sw, sh] = SHAPES[shape];
  const W = sw >= sh ? LONG_EDGE : Math.round((LONG_EDGE * sw) / sh);
  const H = sw >= sh ? Math.round((LONG_EDGE * sh) / sw) : LONG_EDGE;
  const opts = { layout, gap: gapPct / 100, pad: padPct / 100, radius: radPct / 100, bg, transparent: clearBg && fmt === "png" };

  useEffect(() => {
    if (!used.length || !preview.current) return;
    const k = 720 / Math.max(W, H);
    // Draw small for the live preview; the download redraws at full size.
    paint(preview.current, Math.round(W * k), Math.round(H * k), used, opts);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!used.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const c = makeCanvas(1, 1);
      paint(c, W, H, used, opts);
      const out = fmt === "jpeg" ? flatten(c, bg) : c;
      const blob = await canvasToBlob(out, MIME[fmt], fmt === "png" ? undefined : 0.92);
      downloadBlob(blob, `pixshift-collage.${EXT[fmt]}`);
      setMessage(`${W}×${H} px · ${formatBytes(blob.size)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Drop accept={tool.accept} acceptLabel={tool.acceptLabel} icon={tool.icon} name={tool.name} count={items.length} onFiles={add} />
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {items.length > 0 && (
        <>
          {items.length > MAX_PICS && <p className="rounded-2xl bg-zest/50 p-3 text-sm font-medium text-pine">A collage uses up to {MAX_PICS} pictures. The first {MAX_PICS} are shown.</p>}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="checker flex max-h-[72vh] items-center justify-center overflow-auto rounded-2xl p-2">
                <canvas ref={preview} aria-label="Preview of your collage" className="block h-auto max-h-[68vh] max-w-full" />
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">Result: {W}×{H} px</p>
            </div>
            <div className="space-y-5">
              <Panel className="sm:grid-cols-1">
                <Seg label="Layout" value={layout} options={LAYOUTS} onChange={setLayout} />
                <Seg label="Shape" value={shape} options={Object.keys(SHAPES).map((k) => ({ value: k, label: k }))} onChange={setShape} />
                <Slider label="Space between" value={gapPct} min={0} max={8} display={`${gapPct}%`} onChange={setGapPct} />
                <Slider label="Outer margin" value={padPct} min={0} max={10} display={`${padPct}%`} onChange={setPadPct} />
                <Slider label="Round corners" value={radPct} min={0} max={10} display={`${radPct}%`} onChange={setRadPct} />
                <ColorField label="Background" value={bg} onChange={(v) => { setBg(v); setClearBg(false); }} />
                <Seg label="Save as" value={fmt} options={[{ value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }]} onChange={(v) => { setFmt(v); if (v === "jpeg") setClearBg(false); }} />
                {fmt === "png" && <Btn kind={clearBg ? "zest" : "line"} onClick={() => setClearBg(!clearBg)}>{clearBg ? "✓ Transparent background" : "Transparent background"}</Btn>}
              </Panel>
              <div className="flex flex-wrap items-center gap-3">
                <Btn onClick={save} disabled={busy}>{busy ? "Working…" : "Download collage"}</Btn>
                <Btn kind="line" onClick={clear}>Clear</Btn>
              </div>
              {message && <p role="status" className="text-xs text-slate-500">{message}</p>}
              <p className="text-xs text-slate-500">Pictures fill their box and are cropped from the middle. Change the order below to move them around.</p>
            </div>
          </div>
          <ImageList items={items} onMove={move} onRemove={remove} label="Pictures, in order" />
        </>
      )}
    </div>
  );
}
