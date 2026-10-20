"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Tool } from "@/lib/tools";
import { EXT, MIME, canvasToBlob, formatBytes } from "@/lib/image";
import { downloadBlob, flatten } from "@/lib/files";
import { MAX_EDGE, MAX_PIXELS, makeCanvas } from "@/lib/ops";
import Drop from "./Drop";
import ImageList from "./ImageList";
import { useImages, type Img } from "./useImages";
import { Btn, ColorField, Panel, Seg, Slider } from "./ui";

type Layout = "row" | "column" | "grid";

interface Cell {
  img: Img;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Works out where every picture goes, in output pixels. No drawing yet. */
function plan(items: Img[], layout: Layout, cols: number, gap: number) {
  const cells: Cell[] = [];
  if (!items.length) return { cells, W: 1, H: 1 };
  if (layout === "row") {
    const H = Math.min(...items.map((i) => i.bitmap.height));
    let x = 0;
    for (const img of items) {
      const w = Math.round((img.bitmap.width * H) / img.bitmap.height);
      cells.push({ img, x, y: 0, w, h: H });
      x += w + gap;
    }
    return { cells, W: x - gap, H };
  }
  if (layout === "column") {
    const W = Math.min(...items.map((i) => i.bitmap.width));
    let y = 0;
    for (const img of items) {
      const h = Math.round((img.bitmap.height * W) / img.bitmap.width);
      cells.push({ img, x: 0, y, w: W, h });
      y += h + gap;
    }
    return { cells, W, H: y - gap };
  }
  const c = Math.max(1, Math.min(cols, items.length));
  const rows = Math.ceil(items.length / c);
  const cw = Math.min(...items.map((i) => i.bitmap.width));
  const ch = Math.min(...items.map((i) => i.bitmap.height));
  items.forEach((img, i) => {
    const col = i % c;
    const row = Math.floor(i / c);
    // Fit each picture inside its cell, centred.
    const s = Math.min(cw / img.bitmap.width, ch / img.bitmap.height);
    const w = Math.round(img.bitmap.width * s);
    const h = Math.round(img.bitmap.height * s);
    cells.push({ img, x: col * (cw + gap) + (cw - w) / 2, y: row * (ch + gap) + (ch - h) / 2, w, h });
  });
  return { cells, W: c * cw + (c - 1) * gap, H: rows * ch + (rows - 1) * gap };
}

function paint(canvas: HTMLCanvasElement, p: ReturnType<typeof plan>, scale: number, bg: string) {
  canvas.width = Math.max(1, Math.round(p.W * scale));
  canvas.height = Math.max(1, Math.round(p.H * scale));
  const x = canvas.getContext("2d")!;
  x.imageSmoothingQuality = "high";
  if (bg !== "transparent") {
    x.fillStyle = bg;
    x.fillRect(0, 0, canvas.width, canvas.height);
  }
  for (const c of p.cells) x.drawImage(c.img.bitmap, c.x * scale, c.y * scale, c.w * scale, c.h * scale);
}

export default function CombineTool({ tool }: { tool: Tool }) {
  const { items, add, remove, move, clear, error, setError } = useImages();
  const [layout, setLayout] = useState<Layout>("row");
  const [cols, setCols] = useState(2);
  const [gapPct, setGapPct] = useState(2);
  const [bg, setBg] = useState("#ffffff");
  const [clear_, setClear_] = useState(false);
  const [fmt, setFmt] = useState<"png" | "jpeg">("jpeg");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const preview = useRef<HTMLCanvasElement>(null);

  const gapPx = (p: number) => Math.round((p / 100) * Math.min(...items.map((i) => Math.min(i.bitmap.width, i.bitmap.height)), 99999));
  const geometry = useMemo(() => (items.length ? plan(items, layout, cols, gapPx(gapPct)) : null), [items, layout, cols, gapPct]); // eslint-disable-line react-hooks/exhaustive-deps
  const background = clear_ ? "transparent" : bg;

  useEffect(() => {
    if (!geometry || !preview.current) return;
    paint(preview.current, geometry, Math.min(1, 900 / Math.max(geometry.W, geometry.H)), background);
  }, [geometry, background]);

  const save = async () => {
    if (!geometry) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      // Keep inside what browsers can draw.
      let scale = 1;
      while ((geometry.W * scale > MAX_EDGE || geometry.H * scale > MAX_EDGE || geometry.W * geometry.H * scale * scale > MAX_PIXELS) && scale > 0.05) scale *= 0.9;
      const c = makeCanvas(1, 1);
      paint(c, geometry, scale, background);
      const out = fmt === "jpeg" ? flatten(c) : c;
      const blob = await canvasToBlob(out, MIME[fmt], fmt === "png" ? undefined : 0.92);
      downloadBlob(blob, `pixshift-combined.${EXT[fmt]}`);
      setMessage(`${c.width}×${c.height} · ${formatBytes(blob.size)}${scale < 1 ? " · reduced to fit your browser's limit" : ""}`);
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
          {items.length < 2 && <p className="rounded-2xl bg-zest/50 p-3 text-sm font-medium text-pine">Add at least one more picture to combine.</p>}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="checker flex max-h-[70vh] items-center justify-center overflow-auto rounded-2xl p-2">
                <canvas ref={preview} aria-label="Preview of the combined image" className="block h-auto max-h-[66vh] max-w-full" />
              </div>
              {geometry && <p className="mt-2 text-center text-xs text-slate-500">Result: {geometry.W}×{geometry.H} px</p>}
            </div>
            <div className="space-y-5">
              <Panel className="sm:grid-cols-1">
                <Seg label="Layout" value={layout} options={[{ value: "row", label: "Side by side" }, { value: "column", label: "Stacked" }, { value: "grid", label: "Grid" }]} onChange={setLayout} />
                {layout === "grid" && <Slider label="Columns" value={cols} min={2} max={6} onChange={setCols} />}
                <Slider label="Gap" value={gapPct} min={0} max={10} display={`${gapPct}%`} onChange={setGapPct} />
                <ColorField label="Background" value={bg} onChange={(v) => { setBg(v); setClear_(false); }} />
                <Seg label="Save as" value={fmt} options={[{ value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }]} onChange={(v) => { setFmt(v); if (v === "jpeg") setClear_(false); }} />
                {fmt === "png" && (
                  <Btn kind={clear_ ? "zest" : "line"} onClick={() => setClear_(!clear_)}>{clear_ ? "✓ Transparent background" : "Transparent background"}</Btn>
                )}
              </Panel>
              <div className="flex flex-wrap items-center gap-3">
                <Btn onClick={save} disabled={busy || items.length < 2}>{busy ? "Working…" : "Download"}</Btn>
                <Btn kind="line" onClick={clear}>Clear</Btn>
              </div>
              {message && <p role="status" className="text-xs text-slate-500">{message}</p>}
            </div>
          </div>
          <ImageList items={items} onMove={move} onRemove={remove} label="Pictures, in order" />
        </>
      )}
    </div>
  );
}
