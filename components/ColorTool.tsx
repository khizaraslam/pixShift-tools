"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/tools";
import { loadBitmap } from "@/lib/image";
import { copyText } from "@/lib/files";
import { inkOn, palette, toHex, toHsl, type RGB } from "@/lib/colors";
import Drop from "./Drop";
import { Btn, Slider } from "./ui";

const MAX_EDGE = 2400;

function Swatch({ rgb, label, onCopy, copied }: { rgb: RGB; label?: string; onCopy: (text: string) => void; copied: string }) {
  const hex = toHex(rgb);
  return (
    <button
      type="button"
      onClick={() => onCopy(hex)}
      className="group flex min-h-24 flex-col justify-end rounded-2xl border-2 border-pine p-3 text-left shadow-[3px_3px_0_0_#0d2b24] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
      style={{ background: hex, color: inkOn(rgb) }}
      aria-label={`Copy ${hex}`}
    >
      <span className="text-base font-extrabold tracking-tight">{copied === hex ? "Copied ✓" : hex}</span>
      {label && <span className="text-xs opacity-80">{label}</span>}
    </button>
  );
}

export default function ColorTool({ tool }: { tool: Tool }) {
  const pickMode = tool.mode === "pick";
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<RGB | null>(null);
  const [saved, setSaved] = useState<RGB[]>([]);
  const [count, setCount] = useState(6);
  const [colors, setColors] = useState<{ rgb: RGB; share: number }[]>([]);
  const [copied, setCopied] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<HTMLCanvasElement>(null);
  const dataRef = useRef<ImageData | null>(null);

  const load = useCallback(async (files: File[]) => {
    setError("");
    try {
      const bm = await loadBitmap(files[0]);
      const s = Math.min(1, MAX_EDGE / Math.max(bm.width, bm.height));
      const cv = canvasRef.current;
      if (!cv) return;
      cv.width = Math.round(bm.width * s);
      cv.height = Math.round(bm.height * s);
      const x = cv.getContext("2d", { willReadFrequently: true })!;
      x.drawImage(bm, 0, 0, cv.width, cv.height);
      dataRef.current = x.getImageData(0, 0, cv.width, cv.height);
      setFile(files[0]);
      setSaved([]);
      setHover(null);
    } catch {
      setError("Could not read this image.");
    }
  }, []);

  // Palette: shrink the picture, then group its colours.
  useEffect(() => {
    if (pickMode || !file || !dataRef.current) return;
    const src = canvasRef.current!;
    const s = Math.min(1, 220 / Math.max(src.width, src.height));
    const small = document.createElement("canvas");
    small.width = Math.max(1, Math.round(src.width * s));
    small.height = Math.max(1, Math.round(src.height * s));
    const x = small.getContext("2d", { willReadFrequently: true })!;
    x.drawImage(src, 0, 0, small.width, small.height);
    setColors(palette(x.getImageData(0, 0, small.width, small.height).data, count));
  }, [pickMode, file, count]);

  const at = (e: React.PointerEvent<HTMLCanvasElement>): { rgb: RGB; px: number; py: number } | null => {
    const d = dataRef.current;
    if (!d) return null;
    const r = e.currentTarget.getBoundingClientRect();
    const px = Math.min(d.width - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * d.width)));
    const py = Math.min(d.height - 1, Math.max(0, Math.floor(((e.clientY - r.top) / r.height) * d.height)));
    const i = (py * d.width + px) * 4;
    return { rgb: [d.data[i], d.data[i + 1], d.data[i + 2]], px, py };
  };

  const zoom = (px: number, py: number) => {
    const z = zoomRef.current;
    const src = canvasRef.current;
    if (!z || !src) return;
    const x = z.getContext("2d")!;
    x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, z.width, z.height);
    x.drawImage(src, px - 5, py - 5, 11, 11, 0, 0, z.width, z.height);
    x.strokeStyle = "#fff";
    x.lineWidth = 3;
    const c = z.width / 11;
    x.strokeRect(c * 5, c * 5, c, c);
    x.strokeStyle = "#0d2b24";
    x.lineWidth = 1.5;
    x.strokeRect(c * 5 + 1, c * 5 + 1, c - 2, c - 2);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = at(e);
    if (!p) return;
    setHover(p.rgb);
    zoom(p.px, p.py);
  };
  const onClick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = at(e);
    if (!p) return;
    setHover(p.rgb);
    zoom(p.px, p.py);
    setSaved((s) => (s.some((c) => toHex(c) === toHex(p.rgb)) ? s : [p.rgb, ...s].slice(0, 12)));
  };

  const copy = async (t: string) => {
    if (await copyText(t)) {
      setCopied(t);
      setTimeout(() => setCopied((c) => (c === t ? "" : c)), 1400);
    }
  };

  const current = hover ?? saved[0] ?? null;

  return (
    <div className="space-y-6">
      <Drop accept={tool.accept} acceptLabel={tool.acceptLabel} icon={tool.icon} name={tool.name} multiple={false} count={file ? 1 : 0} onFiles={load} />
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      <div className={`grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] ${file ? "" : "hidden"}`}>
        <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="checker flex items-center justify-center rounded-2xl p-2">
            <canvas
              ref={canvasRef}
              aria-label={pickMode ? "Your picture. Click to pick a colour." : "Your picture"}
              onPointerMove={pickMode ? onMove : undefined}
              onPointerDown={pickMode ? onClick : undefined}
              className={`block h-auto max-h-[68vh] max-w-full ${pickMode ? "cursor-crosshair touch-none" : ""}`}
            />
          </div>
          {pickMode && <p className="mt-2 text-center text-xs text-slate-500">Move over the picture, click to save a colour.</p>}
        </div>

        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {pickMode ? (
            <>
              <div className="flex gap-4">
                <canvas ref={zoomRef} width={99} height={99} aria-hidden className="h-24 w-24 shrink-0 rounded-xl border-2 border-pine bg-pith [image-rendering:pixelated]" />
                <div className="min-w-0 flex-1">
                  {current ? (
                    <>
                      <div className="h-10 rounded-lg border-2 border-pine" style={{ background: toHex(current) }} aria-hidden />
                      <p className="mt-2 text-lg font-extrabold">{toHex(current)}</p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">Move over the picture to see a colour.</p>
                  )}
                </div>
              </div>
              {current && (
                <dl className="space-y-2 text-sm">
                  {[
                    ["HEX", toHex(current)],
                    ["RGB", `rgb(${current.map(Math.round).join(", ")})`],
                    ["HSL", `hsl(${toHsl(current)[0]}, ${toHsl(current)[1]}%, ${toHsl(current)[2]}%)`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <dt className="w-10 text-slate-500">{k}</dt>
                      <dd className="min-w-0 flex-1 truncate font-mono text-slate-900">{v}</dd>
                      <button type="button" onClick={() => copy(v)} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold hover:bg-slate-100">
                        {copied === v ? "Copied ✓" : "Copy"}
                      </button>
                    </div>
                  ))}
                </dl>
              )}
              {saved.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-900">Saved colours</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {saved.map((c) => (
                      <Swatch key={toHex(c)} rgb={c} onCopy={copy} copied={copied} />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <Slider label="Number of colours" value={count} min={3} max={12} onChange={setCount} />
              <div className="grid grid-cols-2 gap-2">
                {colors.map((c) => (
                  <Swatch key={toHex(c.rgb)} rgb={c.rgb} label={`${Math.round(c.share * 100)}% of the picture`} onCopy={copy} copied={copied} />
                ))}
              </div>
              {colors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Btn kind="line" onClick={() => copy(colors.map((c) => toHex(c.rgb)).join(", "))}>{copied.includes(",") ? "Copied ✓" : "Copy all HEX"}</Btn>
                  <Btn kind="line" onClick={() => copy(colors.map((c, i) => `--color-${i + 1}: ${toHex(c.rgb)};`).join("\n"))}>
                    {copied.startsWith("--") ? "Copied ✓" : "Copy as CSS"}
                  </Btn>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
