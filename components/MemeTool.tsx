"use client";

import { useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/tools";
import { EXT, MIME, canvasToBlob, formatBytes } from "@/lib/image";
import { downloadBlob, flatten } from "@/lib/files";
import { MAX_EDGE, MAX_PIXELS, makeCanvas } from "@/lib/ops";
import Drop from "./Drop";
import { useImages } from "./useImages";
import { Btn, ColorField, Panel, Seg, Slider, fieldCls } from "./ui";

/** Breaks text into lines that fit the width. */
function wrap(x: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const test = line ? `${line} ${word}` : word;
      if (line && x.measureText(test).width > maxW) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out.filter((l, i, a) => l || a.length === 1);
}

function draw(canvas: HTMLCanvasElement, bmp: ImageBitmap, scale: number, o: { top: string; bottom: string; size: number; color: string; caps: boolean }) {
  const W = Math.max(1, Math.round(bmp.width * scale));
  const H = Math.max(1, Math.round(bmp.height * scale));
  canvas.width = W;
  canvas.height = H;
  const x = canvas.getContext("2d")!;
  x.imageSmoothingQuality = "high";
  x.drawImage(bmp, 0, 0, W, H);
  const size = Math.max(10, o.size * Math.min(W, H));
  x.font = `400 ${size}px Impact, "Arial Black", "Helvetica Neue", sans-serif`;
  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  x.lineJoin = "round";
  x.lineWidth = Math.max(2, size / 7);
  x.strokeStyle = o.color.toLowerCase() === "#000000" ? "#ffffff" : "#000000";
  x.fillStyle = o.color;
  const margin = size * 0.35;
  const lh = size * 1.08;
  const put = (t: string, fromTop: boolean) => {
    const text = o.caps ? t.toUpperCase() : t;
    if (!text.trim()) return;
    const lines = wrap(x, text, W - margin * 2);
    const startY = fromTop ? margin + size * 0.85 : H - margin - lh * (lines.length - 1) - size * 0.1;
    lines.forEach((l, i) => {
      const y = startY + i * lh;
      x.strokeText(l, W / 2, y, W - margin * 2);
      x.fillText(l, W / 2, y, W - margin * 2);
    });
  };
  put(o.top, true);
  put(o.bottom, false);
}

export default function MemeTool({ tool }: { tool: Tool }) {
  const { items, add, clear, error, setError } = useImages(false);
  const [top, setTop] = useState("WHEN THE WIFI FINALLY WORKS");
  const [bottom, setBottom] = useState("AND YOU FORGOT WHY YOU NEEDED IT");
  const [size, setSize] = useState(0.1);
  const [color, setColor] = useState("#ffffff");
  const [caps, setCaps] = useState(true);
  const [fmt, setFmt] = useState<"jpeg" | "png">("jpeg");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const preview = useRef<HTMLCanvasElement>(null);
  const img = items[0];

  useEffect(() => {
    if (!img || !preview.current) return;
    const k = Math.min(1, 800 / Math.max(img.bitmap.width, img.bitmap.height));
    draw(preview.current, img.bitmap, k, { top, bottom, size, color, caps });
  }, [img, top, bottom, size, color, caps]);

  const save = async () => {
    if (!img) return;
    setBusy(true);
    setError("");
    try {
      let k = 1;
      const { width: w, height: h } = img.bitmap;
      while ((w * k > MAX_EDGE || h * k > MAX_EDGE || w * h * k * k > MAX_PIXELS) && k > 0.05) k *= 0.9;
      const c = makeCanvas(1, 1);
      draw(c, img.bitmap, k, { top, bottom, size, color, caps });
      const out = fmt === "jpeg" ? flatten(c) : c;
      const blob = await canvasToBlob(out, MIME[fmt], fmt === "png" ? undefined : 0.92);
      downloadBlob(blob, `pixshift-meme.${EXT[fmt]}`);
      setMessage(`${c.width}×${c.height} px · ${formatBytes(blob.size)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Drop accept={tool.accept} acceptLabel={tool.acceptLabel} icon={tool.icon} name={tool.name} multiple={false} count={items.length} onFiles={add} />
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {img && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="checker flex max-h-[72vh] items-center justify-center overflow-auto rounded-2xl p-2">
              <canvas ref={preview} aria-label="Preview of your meme" className="block h-auto max-h-[68vh] max-w-full" />
            </div>
          </div>
          <div className="space-y-5">
            <Panel className="sm:grid-cols-1">
              <label className="block text-sm font-medium text-slate-700">
                Top text
                <textarea value={top} onChange={(e) => setTop(e.target.value)} rows={2} maxLength={140} className={fieldCls} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Bottom text
                <textarea value={bottom} onChange={(e) => setBottom(e.target.value)} rows={2} maxLength={140} className={fieldCls} />
              </label>
              <Slider label="Text size" value={size} min={0.04} max={0.2} step={0.005} display={`${Math.round(size * 100)}%`} onChange={setSize} />
              <ColorField label="Text colour" value={color} onChange={setColor} />
              <Btn kind={caps ? "zest" : "line"} onClick={() => setCaps(!caps)}>{caps ? "✓ ALL CAPS" : "ALL CAPS"}</Btn>
              <Seg label="Save as" value={fmt} options={[{ value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }]} onChange={setFmt} />
            </Panel>
            <div className="flex flex-wrap items-center gap-3">
              <Btn onClick={save} disabled={busy}>{busy ? "Working…" : "Download meme"}</Btn>
              <Btn kind="line" onClick={clear}>Change picture</Btn>
            </div>
            {message && <p role="status" className="text-xs text-slate-500">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
