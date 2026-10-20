"use client";

import { useState } from "react";
import type { Tool } from "@/lib/tools";
import { EXT, MIME, baseName, canvasToBlob, formatFromMime } from "@/lib/image";
import { flatten, zipBlobs } from "@/lib/files";
import { makeCanvas } from "@/lib/ops";
import Drop from "./Drop";
import { Btn, Panel, Slider } from "./ui";
import { useImages } from "./useImages";

export default function SplitTool({ tool }: { tool: Tool }) {
  const { items, add, error, setError } = useImages(false);
  const [rows, setRows] = useState(1);
  const [cols, setCols] = useState(3);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const it = items[0];

  const save = async () => {
    if (!it) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let fmt = formatFromMime(it.file.type);
      if (fmt === "avif") fmt = "jpeg";
      const W = it.bitmap.width;
      const H = it.bitmap.height;
      const out: { name: string; blob: Blob }[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          await new Promise((res) => setTimeout(res, 0));
          const x0 = Math.round((c * W) / cols);
          const x1 = Math.round(((c + 1) * W) / cols);
          const y0 = Math.round((r * H) / rows);
          const y1 = Math.round(((r + 1) * H) / rows);
          const cv = makeCanvas(x1 - x0, y1 - y0);
          cv.getContext("2d")!.drawImage(it.bitmap, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
          const blob = await canvasToBlob(fmt === "jpeg" ? flatten(cv) : cv, MIME[fmt], fmt === "png" ? undefined : 0.92);
          out.push({ name: `${baseName(it.file.name)}-r${r + 1}c${c + 1}.${EXT[fmt]}`, blob });
        }
      }
      await zipBlobs(out, `${baseName(it.file.name)}-split.zip`);
      setMessage(`${out.length} pieces saved in a ZIP.`);
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
      {it && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="checker flex items-center justify-center rounded-2xl p-2">
              <div className="relative inline-block max-w-full leading-[0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.thumb} alt="Your picture with the cut lines" className="block h-auto max-h-[66vh] max-w-full" />
                {Array.from({ length: cols - 1 }, (_, i) => (
                  <span key={`c${i}`} aria-hidden className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(13,43,36,0.6)]" style={{ left: `${((i + 1) / cols) * 100}%` }} />
                ))}
                {Array.from({ length: rows - 1 }, (_, i) => (
                  <span key={`r${i}`} aria-hidden className="absolute inset-x-0 h-0.5 bg-white shadow-[0_0_0_1px_rgba(13,43,36,0.6)]" style={{ top: `${((i + 1) / rows) * 100}%` }} />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <Panel className="sm:grid-cols-1">
              <Slider label="Columns" value={cols} min={1} max={10} onChange={setCols} />
              <Slider label="Rows" value={rows} min={1} max={10} onChange={setRows} />
              <p className="rounded-xl bg-pith p-3 text-sm text-slate-700">
                {rows * cols} pieces of about {Math.round(it.bitmap.width / cols)}×{Math.round(it.bitmap.height / rows)} px.
                <span className="mt-1 block text-xs text-slate-500">Tip: Instagram shows the newest post first, so upload the last piece first.</span>
              </p>
            </Panel>
            <Btn onClick={save} disabled={busy || rows * cols < 2}>{busy ? "Working…" : "Download ZIP"}</Btn>
            {message && <p role="status" className="text-xs text-slate-500">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
