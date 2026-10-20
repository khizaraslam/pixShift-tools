"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/tools";
import { EXT, MIME, baseName, canvasToBlob, formatBytes, formatFromMime, loadBitmap } from "@/lib/image";
import { downloadBlob, flatten } from "@/lib/files";
import { makeCanvas } from "@/lib/ops";
import Drop from "./Drop";
import { Btn, Seg } from "./ui";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Corner = "nw" | "ne" | "sw" | "se";

const RATIOS: { value: string; label: string; r: number | null }[] = [
  { value: "free", label: "Free", r: null },
  { value: "1:1", label: "1:1", r: 1 },
  { value: "4:5", label: "4:5", r: 4 / 5 },
  { value: "3:4", label: "3:4", r: 3 / 4 },
  { value: "4:3", label: "4:3", r: 4 / 3 },
  { value: "3:2", label: "3:2", r: 3 / 2 },
  { value: "16:9", label: "16:9", r: 16 / 9 },
  { value: "9:16", label: "9:16", r: 9 / 16 },
];

const MIN = 0.04;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function CropTool({ tool }: { tool: Tool }) {
  const circle = tool.mode === "circle";
  const [file, setFile] = useState<File | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [url, setUrl] = useState("");
  const [ratio, setRatio] = useState(circle ? "1:1" : "free");
  const [rect, setRect] = useState<Rect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | Corner; start: Rect; px: number; py: number } | null>(null);

  const r = RATIOS.find((x) => x.value === ratio)?.r ?? null;
  const W = bitmap?.width ?? 1;
  const H = bitmap?.height ?? 1;

  const fitRatio = useCallback(
    (ratioNum: number | null): Rect => {
      if (!ratioNum) return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
      let w = 0.9;
      let h = (w * W) / (ratioNum * H);
      if (h > 0.9) {
        h = 0.9;
        w = (h * ratioNum * H) / W;
      }
      return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
    },
    [W, H],
  );

  const load = useCallback(
    async (files: File[]) => {
      const f = files[0];
      setError("");
      setMessage("");
      try {
        const bm = await loadBitmap(f);
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(f);
        });
        setFile(f);
        setBitmap(bm);
        const rr = RATIOS.find((x) => x.value === ratio)?.r ?? null;
        if (rr) {
          let w = 0.9;
          let h = (w * bm.width) / (rr * bm.height);
          if (h > 0.9) {
            h = 0.9;
            w = (h * rr * bm.height) / bm.width;
          }
          setRect({ x: (1 - w) / 2, y: (1 - h) / 2, w, h });
        } else setRect({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
      } catch {
        setError("Could not read this image.");
      }
    },
    [ratio],
  );

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pickRatio = (v: string) => {
    setRatio(v);
    setRect(fitRatio(RATIOS.find((x) => x.value === v)?.r ?? null));
  };

  const pointer = (e: React.PointerEvent) => {
    const b = boxRef.current!.getBoundingClientRect();
    return { px: (e.clientX - b.left) / b.width, py: (e.clientY - b.top) / b.height };
  };

  const begin = (mode: "move" | Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, start: rect, ...pointer(e) };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const { px, py } = pointer(e);
    const s = d.start;
    if (d.mode === "move") {
      setRect({ ...s, x: clamp(s.x + (px - d.px), 0, 1 - s.w), y: clamp(s.y + (py - d.py), 0, 1 - s.h) });
      return;
    }
    const left = d.mode.includes("w");
    const top = d.mode.includes("n");
    const ax = left ? s.x + s.w : s.x;
    const ay = top ? s.y + s.h : s.y;
    const cx = clamp(px, 0, 1);
    const cy = clamp(py, 0, 1);
    let w = Math.max(MIN, left ? ax - cx : cx - ax);
    let h = Math.max(MIN, top ? ay - cy : cy - ay);
    const availW = left ? ax : 1 - ax;
    const availH = top ? ay : 1 - ay;
    if (r) {
      // Width leads, height follows the ratio. Shrink if either side would leave the picture.
      w = Math.min(w, availW, (availH * r * H) / W);
      h = (w * W) / (r * H);
    } else {
      w = Math.min(w, availW);
      h = Math.min(h, availH);
    }
    setRect({ x: left ? ax - w : ax, y: top ? ay - h : ay, w, h });
  };

  const end = () => {
    drag.current = null;
  };

  const nudge = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    setRect((s) => ({ ...s, x: clamp(s.x + m[0], 0, 1 - s.w), y: clamp(s.y + m[1], 0, 1 - s.h) }));
  };

  const outW = Math.max(1, Math.round(rect.w * W));
  const outH = circle ? outW : Math.max(1, Math.round(rect.h * H));

  const save = async () => {
    if (!bitmap || !file) return;
    setBusy(true);
    setError("");
    try {
      const sx = Math.round(rect.x * W);
      const sy = Math.round(rect.y * H);
      const sw = Math.min(W - sx, outW);
      const sh = Math.min(H - sy, circle ? outW : outH);
      const c = makeCanvas(sw, sh);
      const x = c.getContext("2d")!;
      if (circle) {
        x.beginPath();
        x.ellipse(sw / 2, sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
        x.clip();
      }
      x.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
      let fmt = circle ? "png" : formatFromMime(file.type);
      if (fmt === "avif") fmt = "jpeg";
      const blob = await canvasToBlob(fmt === "jpeg" ? flatten(c) : c, MIME[fmt as "png" | "jpeg" | "webp"], fmt === "png" ? undefined : 0.92);
      const name = `${baseName(file.name)}-${circle ? "circle" : "cropped"}.${EXT[fmt as "png" | "jpeg" | "webp"]}`;
      downloadBlob(blob, name);
      setMessage(`${name} · ${sw}×${sh} · ${formatBytes(blob.size)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handle = "absolute h-5 w-5 rounded-sm border-2 border-pine bg-white touch-none";

  return (
    <div className="space-y-6">
      <Drop accept={tool.accept} acceptLabel={tool.acceptLabel} icon={tool.icon} name={tool.name} multiple={false} count={file ? 1 : 0} onFiles={load} />
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {bitmap && url && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <div className="checker flex items-center justify-center rounded-2xl p-2">
              <div ref={boxRef} className="relative inline-block max-w-full select-none overflow-hidden leading-[0]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Your picture, ready to crop" draggable={false} className="block h-auto max-h-[68vh] max-w-full" />
                <div
                  role="group"
                  tabIndex={0}
                  aria-label="Crop area. Use arrow keys to move it."
                  onPointerDown={begin("move")}
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                  onKeyDown={nudge}
                  className={`absolute cursor-move touch-none border-2 border-white outline-none focus-visible:ring-4 focus-visible:ring-zest ${circle ? "rounded-full" : ""}`}
                  style={{
                    left: `${rect.x * 100}%`,
                    top: `${rect.y * 100}%`,
                    width: `${rect.w * 100}%`,
                    height: `${rect.h * 100}%`,
                    boxShadow: "0 0 0 9999px rgba(13,43,36,0.55)",
                  }}
                >
                  {!circle && (
                    <>
                      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/50" />
                      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/50" />
                      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/50" />
                      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/50" />
                    </>
                  )}
                  {(["nw", "ne", "sw", "se"] as Corner[]).map((c) => (
                    <span
                      key={c}
                      onPointerDown={begin(c)}
                      onPointerMove={move}
                      onPointerUp={end}
                      onPointerCancel={end}
                      className={`${handle} ${c.includes("n") ? "top-0" : "bottom-0"} ${c.includes("w") ? "left-0" : "right-0"} ${
                        c === "nw" || c === "se" ? "cursor-nwse-resize" : "cursor-nesw-resize"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            {!circle && <Seg label="Shape" value={ratio} options={RATIOS.map((x) => ({ value: x.value, label: x.label }))} onChange={pickRatio} />}
            <p className="rounded-xl bg-pith p-3 text-sm text-slate-700">
              Crop size: <strong>{outW}×{outH} px</strong>
              <span className="block text-xs text-slate-500">Original {W}×{H} px</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Btn onClick={save} disabled={busy}>{busy ? "Working…" : "Download"}</Btn>
              <Btn kind="line" onClick={() => setRect(fitRatio(r))}>Reset</Btn>
            </div>
            {circle && <p className="text-xs text-slate-500">Saved as a PNG. The corners outside the circle are transparent.</p>}
            {message && <p role="status" className="text-xs text-slate-500">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
