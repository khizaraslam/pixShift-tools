"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OpId, Tool } from "@/lib/tools";
import { FILTER_NAMES, copyOf, makeCanvas, needsAlpha, render, safeFactor, type P, type Stroke } from "@/lib/ops";
import { EXT, MIME, baseName, canvasToBlob, formatBytes, formatFromMime, loadBitmap } from "@/lib/image";
import { downloadBlob, flatten, zipBlobs } from "@/lib/files";
import { formatCoords, formatTaken, parseExif, type Exif } from "@/lib/exif";
import Drop from "./Drop";
import { cutOut, applyCut } from "@/lib/mlbg";
import { Btn, ColorField, Panel, Seg, Slider, fieldCls } from "./ui";

interface Item {
  id: string;
  file: File;
  bitmap: ImageBitmap;
  /** Small copy used for the live preview. */
  prev: HTMLCanvasElement;
  /** Brush edits already applied (replayed at full size on export). */
  applied: Stroke[][];
  thumb: string;
}

const DEFAULTS: Record<OpId, P> = {
  rotate: { quarter: 0, flipH: false, flipV: false, angle: 0, bg: "transparent" },
  watermark: { text: "© Your name", size: 0.06, opacity: 0.5, pos: "br", color: "#ffffff", angle: -30 },
  exif: {},
  enhance: { auto: true, brightness: 0, contrast: 0, saturation: 0, warmth: 0 },
  sharpen: { amount: 1, radius: 2 },
  bw: { contrast: 0, threshold: false, level: 128 },
  upscale: { factor: 2, sharp: 0.6 },
  blurbg: { cx: 0.5, cy: 0.5, size: 0.5, blur: 0.03, feather: 0.4 },
  inpaint: {},
  redact: { style: "pixelate", strength: 0.03 },
  bgremove: { tolerance: 30, softness: 1 },
  bgchange: { tolerance: 30, softness: 1, fill: "#ffffff" },
  transparent: { tolerance: 30, px: 0, py: 0, hasPick: false, contiguous: false },
  border: { width: 0.03, color: "#ffffff", radius: 0 },
  filter: { preset: "sepia", strength: 1 },
  invert: { strength: 1 },
  blur: { amount: 0.02 },
  sketch: { detail: 0.02, darkness: 1 },
  pixel: { size: 0.02, levels: 0 },
  vignette: { strength: 0.6, size: 0.55, tone: "dark" },
  text: { text: "Your text", size: 0.08, color: "#ffffff", pos: "bc", font: "impact", outline: true, bar: false },
  pad: { ratio: "1:1", fill: "blur", color: "#ffffff", margin: 0 },
};

/** Starting values for tool pages that share an engine but open in a different state (e.g. Flip Image). */
const MODE_INIT: Record<string, P> = {
  flipH: { flipH: true },
  flipV: { flipV: true },
  manual: { auto: false },
  sepia: { preset: "sepia" },
  vintage: { preset: "vintage" },
  noir: { preset: "noir" },
  ratio45: { ratio: "4:5" },
  ratio916: { ratio: "9:16" },
  ratio169: { ratio: "16:9" },
};

const SUFFIX: Record<OpId, string> = {
  rotate: "rotated", watermark: "watermarked", exif: "clean", enhance: "enhanced", sharpen: "sharp", bw: "bw",
  upscale: "upscaled", blurbg: "blur-bg", inpaint: "cleaned", redact: "redacted", bgremove: "no-bg",
  bgchange: "new-bg", transparent: "transparent", border: "framed",
  filter: "filtered", invert: "inverted", blur: "blurred", sketch: "sketch", pixel: "pixelated", vignette: "vignette", text: "text", pad: "padded",
};

const BRUSH: OpId[] = ["inpaint", "redact"];
/** Tools that depend on a position or paint on one picture, so they work on one image at a time. */
const SINGLE: OpId[] = ["inpaint", "redact", "blurbg", "transparent"];
const PREVIEW_EDGE = 900;

let counter = 0;

function shrink(bitmap: ImageBitmap): HTMLCanvasElement {
  const s = Math.min(1, PREVIEW_EDGE / Math.max(bitmap.width, bitmap.height));
  const c = makeCanvas(bitmap.width * s, bitmap.height * s);
  const x = c.getContext("2d")!;
  x.imageSmoothingQuality = "high";
  x.drawImage(bitmap, 0, 0, c.width, c.height);
  return c;
}

function drawStrokes(c: HTMLCanvasElement, strokes: Stroke[], color = "rgba(255,70,120,0.55)") {
  const x = c.getContext("2d")!;
  x.save();
  x.lineCap = "round";
  x.lineJoin = "round";
  x.strokeStyle = color;
  x.fillStyle = color;
  const base = Math.min(c.width, c.height);
  for (const s of strokes) {
    const r = Math.max(1, s.r * base);
    x.lineWidth = r * 2;
    if (s.pts.length === 1) {
      x.beginPath();
      x.arc(s.pts[0][0] * c.width, s.pts[0][1] * c.height, r, 0, Math.PI * 2);
      x.fill();
    } else {
      x.beginPath();
      s.pts.forEach(([px, py], i) => (i ? x.lineTo(px * c.width, py * c.height) : x.moveTo(px * c.width, py * c.height)));
      x.stroke();
    }
  }
  x.restore();
}

export default function Editor({ tool }: { tool: Tool }) {
  const op = tool.op as OpId;
  const brush = BRUSH.includes(op);
  const single = SINGLE.includes(op);

  const [items, setItems] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [params, setParams] = useState<P>({ ...DEFAULTS[op], ...(tool.mode ? MODE_INIT[tool.mode] : {}) });
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [brushR, setBrushR] = useState(0.035);
  const [fmtPick, setFmtPick] = useState<"same" | "jpeg" | "png" | "webp">("same");
  const [quality, setQuality] = useState(op === "exif" ? 95 : 92);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [exif, setExif] = useState<Exif | null | "none">(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const drawing = useRef(false);
  const [painting, setPainting] = useState(false);
  const committed = useRef<{ key: string; canvas: HTMLCanvasElement } | null>(null);

  const cuts = useRef(new Map<string, HTMLCanvasElement>());
  const pending = useRef(new Map<string, Promise<HTMLCanvasElement>>());
  const [cutTick, setCutTick] = useState(0);
  const [mlBusy, setMlBusy] = useState(false);
  const [mlPct, setMlPct] = useState(0);
  const [classic, setClassic] = useState(false);
  const mlOp = (op === "bgremove" || op === "bgchange") && !classic;

  const active = items.find((i) => i.id === activeId) ?? items[0];
  const set = useCallback((k: string, v: number | string | boolean) => setParams((p) => ({ ...p, [k]: v }) as P), []);
  const alpha = needsAlpha(op, params);

  const ensureCut = useCallback((item: Item) => {
    const have = cuts.current.get(item.id);
    if (have) return Promise.resolve(have);
    let p = pending.current.get(item.id);
    if (!p) {
      p = cutOut(item.bitmap, setMlPct)
        .then((c) => {
          cuts.current.set(item.id, c);
          pending.current.delete(item.id);
          setCutTick((t) => t + 1);
          return c;
        })
        .catch((e) => {
          pending.current.delete(item.id);
          throw e;
        });
      pending.current.set(item.id, p);
    }
    return p;
  }, []);

  /* ───── loading ───── */
  const addFiles = useCallback(
    async (files: File[]) => {
      setError("");
      const made: Item[] = [];
      for (const file of files) {
        try {
          const bitmap = await loadBitmap(file);
          made.push({ id: `e${++counter}`, file, bitmap, prev: shrink(bitmap), applied: [], thumb: URL.createObjectURL(file) });
        } catch {
          setError(`Could not read ${file.name}.`);
        }
      }
      if (!made.length) return;
      setItems((prev) => (single ? made.slice(0, 1) : [...prev, ...made]));
      setActiveId((cur) => (single || !cur ? made[0].id : cur));
      setStrokes([]);
      setMessage("");
    },
    [single],
  );

  useEffect(() => {
    const el = workRef.current;
    if (el && items.length > prevCount.current) {
      const top = el.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.45) {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    }
    prevCount.current = items.length;
  }, [items.length]);

  useEffect(() => () => items.forEach((i) => URL.revokeObjectURL(i.thumb)), []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── EXIF panel ───── */
  useEffect(() => {
    if (op !== "exif" || !active) return;
    let gone = false;
    setExif(null);
    if (active.file.type !== "image/jpeg") {
      setExif("none");
      return;
    }
    active.file
      .slice(0, 256 * 1024)
      .arrayBuffer()
      .then((buf) => {
        if (!gone) setExif(parseExif(buf) ?? "none");
      })
      .catch(() => !gone && setExif("none"));
    return () => {
      gone = true;
    };
  }, [op, active]);

  useEffect(() => {
    if (!mlOp || !active) return;
    setMlBusy(true);
    setMlPct(0);
    ensureCut(active)
      .catch(() => {
        setError("AI model load nahi hua, Classic mode on kar diya.");
        setClassic(true);
      })
      .finally(() => setMlBusy(false));
  }, [mlOp, active, ensureCut]);

  /* ───── live preview ───── */
  const baseFor = useCallback(
    (item: Item) => {
      if (!brush) return item.prev;
      const key = `${item.id}:${item.applied.length}:${params.style}:${params.strength}`;
      if (committed.current?.key === key) return committed.current.canvas;
      let cur: HTMLCanvasElement = item.prev;
      for (const batch of item.applied) cur = render(op, cur, params, batch);
      committed.current = { key, canvas: cur };
      return cur;
    },
    [brush, op, params],
  );

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const t = setTimeout(() => {
      try {
        const base = baseFor(active);
        // While a stroke is being drawn show the pink brush; once released show the real result.
        const live = brush && !painting && strokes.length > 0;
        const cut = mlOp ? cuts.current.get(active.id) : undefined;
        const out = mlOp
          ? cut
            ? applyCut(base, cut, op === "bgchange" ? String(params.fill) : undefined)
            : copyOf(base)
          : brush
            ? live ? render(op, base, params, strokes) : copyOf(base)
            : render(op, base, params);
        const cv = canvasRef.current;
        if (!cv) return;
        cv.width = out.width;
        cv.height = out.height;
        const x = cv.getContext("2d")!;
        x.clearRect(0, 0, cv.width, cv.height);
        x.drawImage(out, 0, 0);
        if (brush && !live) drawStrokes(cv, strokes);
        if (op === "blurbg") {
          const cx = Number(params.cx) * cv.width;
          const cy = Number(params.cy) * cv.height;
          x.save();
          x.strokeStyle = "rgba(255,255,255,0.9)";
          x.lineWidth = 2;
          x.setLineDash([6, 5]);
          x.beginPath();
          x.ellipse(cx, cy, (Number(params.size) * cv.width) / 2, (Number(params.size) * cv.height) / 2, 0, 0, Math.PI * 2);
          x.stroke();
          x.restore();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not render the preview.");
      }
    }, 40);
    return () => clearTimeout(t);
  }, [active, params, strokes, op, brush, baseFor, painting]);

  /* ───── pointer: brush and click tools ───── */
  const frac = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!brush && op !== "blurbg" && op !== "transparent") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    if (brush) setPainting(true);
    const [x, y] = frac(e);
    if (brush) setStrokes((s) => [...s, { pts: [[x, y]], r: brushR }]);
    else if (op === "blurbg") setParams((p) => ({ ...p, cx: x, cy: y }));
    else setParams((p) => ({ ...p, px: x, py: y, hasPick: true }));
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const [x, y] = frac(e);
    if (brush) {
      setStrokes((s) => {
        if (!s.length) return s;
        const last = s[s.length - 1];
        return [...s.slice(0, -1), { ...last, pts: [...last.pts, [x, y]] }];
      });
    } else if (op === "blurbg") setParams((p) => ({ ...p, cx: x, cy: y }));
  };
  const onUp = () => {
    drawing.current = false;
    setPainting(false);
  };

  const commit = useCallback(() => {
    if (!active || !strokes.length) return;
    const batch = strokes;
    setItems((prev) => prev.map((i) => (i.id === active.id ? { ...i, applied: [...i.applied, batch] } : i)));
    committed.current = null;
    setStrokes([]);
  }, [active, strokes]);

  const undo = () => {
    if (strokes.length) setStrokes((s) => s.slice(0, -1));
    else if (active?.applied.length) {
      setItems((prev) => prev.map((i) => (i.id === active.id ? { ...i, applied: i.applied.slice(0, -1) } : i)));
      committed.current = null;
    }
  };

  /* ───── export ───── */
  const exportItem = async (item: Item) => {
    const batches = brush && strokes.length && item.id === active?.id ? [...item.applied, strokes] : item.applied;
    let out: HTMLCanvasElement;
    if (brush) {
      let cur: HTMLCanvasElement = copyOf(item.bitmap);
      for (const b of batches) cur = render(op, cur, params, b);
      out = cur;
    } else if (mlOp) {
      const cut = await ensureCut(item);
      out = applyCut(item.bitmap, cut, op === "bgchange" ? String(params.fill) : undefined);
    } else {
      out = render(op, item.bitmap, params);
    }
    let fmt = alpha ? "png" : fmtPick === "same" ? formatFromMime(item.file.type) : fmtPick;
    if (fmt === "avif") fmt = "jpeg";
    const canvas = fmt === "jpeg" ? flatten(out) : out;
    const blob = await canvasToBlob(canvas, MIME[fmt as "jpeg" | "png" | "webp"], fmt === "png" ? undefined : quality / 100);
    return { blob, w: out.width, h: out.height, name: `${baseName(item.file.name)}-${SUFFIX[op]}.${EXT[fmt as "jpeg" | "png" | "webp"]}` };
  };

  const download = async () => {
    if (!items.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const done = [];
      for (const it of items) {
        // yield so the button can repaint between large images
        await new Promise((r) => setTimeout(r, 0));
        done.push(await exportItem(it));
      }
      if (done.length === 1) {
        downloadBlob(done[0].blob, done[0].name);
        setMessage(`${done[0].name} · ${done[0].w}×${done[0].h} · ${formatBytes(done[0].blob.size)}`);
      } else {
        await zipBlobs(done.map((d) => ({ name: d.name, blob: d.blob })));
        setMessage(`${done.length} images saved in a ZIP.`);
      }
      if (brush) commit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const upDims = useMemo(() => {
    if (op !== "upscale" || !active) return null;
    const f = safeFactor(active.bitmap.width, active.bitmap.height, Number(params.factor));
    return { f, w: Math.round(active.bitmap.width * f), h: Math.round(active.bitmap.height * f), capped: f < Number(params.factor) };
  }, [op, active, params.factor]);

  const interactive = brush || op === "blurbg" || op === "transparent";
  const canUndo = strokes.length > 0 || (active?.applied.length ?? 0) > 0;

  /* ───── UI ───── */
  const POS = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];

  return (
    <div className="space-y-6">
      <Drop accept={tool.accept} acceptLabel={tool.acceptLabel} icon={tool.icon} name={tool.name} multiple={!single} count={items.length} onFiles={addFiles} />
      {error && (
        <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      )}
      <div ref={workRef} className="scroll-mt-20" aria-hidden />

      {active && (
        <>
          {items.length > 1 && (
            <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Your images">
              {items.map((i) => (
                <li key={i.id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveId(i.id)}
                    aria-pressed={i.id === active.id}
                    aria-label={`Preview ${i.file.name}`}
                    className={`block h-16 w-16 overflow-hidden rounded-xl border-2 ${i.id === active.id ? "border-pine" : "border-slate-200"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.thumb} alt="" className="h-full w-full object-cover" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${i.file.name}`}
                    onClick={() => {
                      setItems((prev) => prev.filter((p) => p.id !== i.id));
                      if (i.id === activeId) setActiveId("");
                    }}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-pine text-xs text-white"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Preview */}
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="checker flex max-h-[70vh] items-center justify-center overflow-auto rounded-2xl p-2">
                <canvas
                  ref={canvasRef}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  aria-label="Preview of your edited image"
                  className={`block h-auto max-h-[66vh] max-w-full ${interactive ? "cursor-crosshair touch-none" : ""}`}
                />
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">
                {active.bitmap.width}×{active.bitmap.height} px · {formatBytes(active.file.size)}
                {interactive && (brush ? " · paint on the picture" : op === "blurbg" ? " · tap or drag to place the sharp area" : " · tap the colour to remove")}
              </p>
            </div>

            {/* Controls */}
            <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              {op === "rotate" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Btn kind="line" onClick={() => set("quarter", (Number(params.quarter) + 3) % 4)}>⟲ 90° left</Btn>
                    <Btn kind="line" onClick={() => set("quarter", (Number(params.quarter) + 1) % 4)}>⟳ 90° right</Btn>
                    <Btn kind="line" onClick={() => set("flipH", !params.flipH)}>⇋ Flip horizontal</Btn>
                    <Btn kind="line" onClick={() => set("flipV", !params.flipV)}>⇅ Flip vertical</Btn>
                  </div>
                  <Slider label="Straighten" value={Number(params.angle)} min={-45} max={45} step={0.5} display={`${params.angle}°`} onChange={(v) => set("angle", v)} />
                  <Seg
                    label="Empty corners"
                    value={String(params.bg === "transparent" ? "transparent" : "white")}
                    options={[{ value: "transparent", label: "Transparent (PNG)" }, { value: "white", label: "White" }]}
                    onChange={(v) => set("bg", v === "white" ? "#ffffff" : "transparent")}
                  />
                </>
              )}

              {op === "watermark" && (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    Watermark text
                    <input value={String(params.text)} onChange={(e) => set("text", e.target.value)} maxLength={80} className={fieldCls} />
                  </label>
                  <Slider label="Size" value={Number(params.size)} min={0.02} max={0.2} step={0.005} display={`${Math.round(Number(params.size) * 100)}%`} onChange={(v) => set("size", v)} />
                  <Slider label="Opacity" value={Number(params.opacity)} min={0.1} max={1} step={0.05} display={`${Math.round(Number(params.opacity) * 100)}%`} onChange={(v) => set("opacity", v)} />
                  <ColorField label="Text colour" value={String(params.color)} onChange={(v) => set("color", v)} />
                  <fieldset>
                    <legend className="text-sm font-medium text-slate-700">Position</legend>
                    <div className="mt-2 grid w-36 grid-cols-3 gap-1.5">
                      {POS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          aria-label={`Position ${p}`}
                          aria-pressed={params.pos === p}
                          onClick={() => set("pos", p)}
                          className={`h-9 rounded-lg border text-lg leading-none ${params.pos === p ? "border-pine bg-zest" : "border-slate-300 bg-white hover:border-slate-400"}`}
                        >
                          {params.pos === p ? "●" : "·"}
                        </button>
                      ))}
                    </div>
                    <Btn kind={params.pos === "tile" ? "zest" : "line"} className="mt-2" onClick={() => set("pos", params.pos === "tile" ? "br" : "tile")}>
                      {params.pos === "tile" ? "✓ Tiled across the picture" : "Tile across the picture"}
                    </Btn>
                  </fieldset>
                </>
              )}

              {op === "exif" && (
                <div>
                  <p className="text-sm font-semibold text-slate-900">Hidden data found in this photo</p>
                  {exif === null && <p className="mt-2 text-sm text-slate-500">Reading…</p>}
                  {exif === "none" && (
                    <p className="mt-2 text-sm text-slate-600">
                      Nothing readable found. It may already be clean, or it is not a JPG. The clean copy is still saved without any metadata.
                    </p>
                  )}
                  {exif && exif !== "none" && (
                    <dl className="mt-2 space-y-1.5 text-sm">
                      {[
                        ["Camera", [exif.make, exif.model].filter(Boolean).join(" ")],
                        ["Taken", formatTaken(exif.taken)],
                        ["Lens", exif.lens],
                        ["Software", exif.software],
                        ["Location", exif.lat !== undefined && exif.lon !== undefined ? formatCoords(exif.lat, exif.lon) : ""],
                      ]
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k as string} className="flex justify-between gap-3">
                            <dt className="text-slate-500">{k}</dt>
                            <dd className="text-right font-medium text-slate-900">{v}</dd>
                          </div>
                        ))}
                    </dl>
                  )}
                  <p className="mt-3 text-xs text-slate-500">The saved copy has all of this removed.</p>
                </div>
              )}

              {op === "enhance" && (
                <>
                  <Btn kind={params.auto ? "zest" : "line"} onClick={() => set("auto", !params.auto)}>
                    {params.auto ? "✓ Auto levels on" : "Auto levels off"}
                  </Btn>
                  <Slider label="Brightness" value={Number(params.brightness)} min={-60} max={60} onChange={(v) => set("brightness", v)} />
                  <Slider label="Contrast" value={Number(params.contrast)} min={-60} max={60} onChange={(v) => set("contrast", v)} />
                  <Slider label="Saturation" value={Number(params.saturation)} min={-100} max={100} onChange={(v) => set("saturation", v)} />
                  <Slider label="Warmth" value={Number(params.warmth)} min={-60} max={60} onChange={(v) => set("warmth", v)} hint="Positive is warmer (orange), negative is cooler (blue)." />
                </>
              )}

              {op === "sharpen" && (
                <>
                  <Slider label="Amount" value={Number(params.amount)} min={0} max={3} step={0.1} onChange={(v) => set("amount", v)} />
                  <Slider label="Radius" value={Number(params.radius)} min={1} max={6} onChange={(v) => set("radius", v)} hint="Small radius sharpens fine detail, large radius sharpens broad edges." />
                </>
              )}

              {op === "bw" && (
                <>
                  <Slider label="Contrast" value={Number(params.contrast)} min={-60} max={60} onChange={(v) => set("contrast", v)} />
                  <Btn kind={params.threshold ? "zest" : "line"} onClick={() => set("threshold", !params.threshold)}>
                    {params.threshold ? "✓ Pure black and white" : "Pure black and white (threshold)"}
                  </Btn>
                  {params.threshold && <Slider label="Threshold" value={Number(params.level)} min={20} max={235} onChange={(v) => set("level", v)} />}
                </>
              )}

              {op === "upscale" && (
                <>
                  <Seg
                    label="Enlarge by"
                    value={Number(params.factor)}
                    options={[{ value: 2, label: "2×" }, { value: 3, label: "3×" }, { value: 4, label: "4×" }]}
                    onChange={(v) => set("factor", v)}
                  />
                  <Slider label="Sharpening" value={Number(params.sharp)} min={0} max={1.5} step={0.1} onChange={(v) => set("sharp", v)} />
                  {upDims && (
                    <p className="rounded-xl bg-pith p-3 text-sm text-slate-700">
                      Result: <strong>{upDims.w}×{upDims.h} px</strong>
                      {upDims.capped && <span className="block text-xs text-slate-500">Reduced to {upDims.f}× so your browser can handle it.</span>}
                      <span className="mt-1 block text-xs text-slate-500">The preview is shown smaller than the real result.</span>
                    </p>
                  )}
                </>
              )}

              {op === "blurbg" && (
                <>
                  <Slider label="Sharp area size" value={Number(params.size)} min={0.1} max={1} step={0.02} display={`${Math.round(Number(params.size) * 100)}%`} onChange={(v) => set("size", v)} />
                  <Slider label="Blur strength" value={Number(params.blur)} min={0.005} max={0.08} step={0.005} display={`${Math.round(Number(params.blur) * 1000) / 10}`} onChange={(v) => set("blur", v)} />
                  <Slider label="Soft edge" value={Number(params.feather)} min={0.05} max={1} step={0.05} display={`${Math.round(Number(params.feather) * 100)}%`} onChange={(v) => set("feather", v)} />
                </>
              )}

              {brush && (
                <>
                  {op === "redact" && (
                    <>
                      <Seg label="Hide with" value={String(params.style)} options={[{ value: "blur", label: "Blur" }, { value: "pixelate", label: "Pixelate" }, { value: "cover", label: "Black box" }]} onChange={(v) => set("style", v)} />
                      {params.style !== "cover" && <Slider label="Strength" value={Number(params.strength)} min={0.01} max={0.1} step={0.005} display={`${Math.round(Number(params.strength) * 1000) / 10}`} onChange={(v) => set("strength", v)} />}
                    </>
                  )}
                  <Slider label="Brush size" value={brushR} min={0.01} max={0.12} step={0.005} display={`${Math.round(brushR * 200)}%`} onChange={setBrushR} />
                  <div className="flex flex-wrap gap-2">
                    <Btn kind="zest" onClick={commit} disabled={!strokes.length}>{op === "inpaint" ? "Remove painted area" : "Apply to painted area"}</Btn>
                    <Btn kind="line" onClick={undo} disabled={!canUndo}>Undo</Btn>
                    <Btn kind="line" onClick={() => setStrokes([])} disabled={!strokes.length}>Clear paint</Btn>
                  </div>
                  <p className="text-xs text-slate-500">
                    Paint over the area. The result shows as soon as you lift your finger or mouse. Press the button to lock it in, then paint the next spot.
                  </p>
                </>
              )}

              {(op === "bgremove" || op === "bgchange" || op === "transparent") && (
                <>
                  {op !== "transparent" && (
                    <>
                      <p className="rounded-xl bg-pith p-3 text-sm text-slate-700">
                        {classic
                          ? "Classic mode (colour based)."
                          : mlBusy
                            ? `AI model chal raha hai… ${Math.round(mlPct * 100)}% (pehli baar model download hota hai)`
                            : "AI cut-out ready."}
                      </p>
                      <Btn kind={classic ? "zest" : "line"} onClick={() => setClassic(!classic)}>
                        {classic ? "✓ Classic mode" : "Use classic mode instead"}
                      </Btn>
                    </>
                  )}
                  {op === "transparent" && (
                    <p className="rounded-xl bg-pith p-3 text-sm text-slate-700">
                      {params.hasPick ? "Clicked colour is now transparent. Click another spot to change it." : "Click the colour on the picture you want to remove. Until then the colour at the edges is used."}
                    </p>
                  )}
                  <Slider label="Tolerance" value={Number(params.tolerance)} min={1} max={100} onChange={(v) => set("tolerance", v)} hint="Raise until the background is gone, lower if your subject starts to disappear." />
                  {op === "transparent" && (
                    <Btn kind={params.contiguous ? "zest" : "line"} onClick={() => set("contiguous", !params.contiguous)}>
                      {params.contiguous ? "✓ Only the connected area" : "Only the connected area"}
                    </Btn>
                  )}
                  {op !== "transparent" && <Slider label="Edge softness" value={Number(params.softness)} min={0} max={5} onChange={(v) => set("softness", v)} />}
                  {op === "bgchange" && <ColorField label="New background colour" value={String(params.fill)} onChange={(v) => set("fill", v)} />}
                </>
              )}

              {op === "border" && (
                <>
                  <Slider label="Border width" value={Number(params.width)} min={0} max={0.15} step={0.005} display={`${Math.round(Number(params.width) * 200)}%`} onChange={(v) => set("width", v)} />
                  <ColorField label="Border colour" value={String(params.color)} onChange={(v) => set("color", v)} />
                  <Slider label="Round the corners" value={Number(params.radius)} min={0} max={0.5} step={0.01} display={`${Math.round(Number(params.radius) * 200)}%`} onChange={(v) => set("radius", v)} hint="Rounded corners are saved as PNG so they stay transparent." />
                </>
              )}

              {op === "filter" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {FILTER_NAMES.map(([id, label]) => (
                      <Btn key={id} kind={params.preset === id ? "zest" : "line"} onClick={() => set("preset", id)}>{params.preset === id ? `✓ ${label}` : label}</Btn>
                    ))}
                  </div>
                  <Slider label="Strength" value={Number(params.strength)} min={0.1} max={1} step={0.05} display={`${Math.round(Number(params.strength) * 100)}%`} onChange={(v) => set("strength", v)} />
                </>
              )}

              {op === "invert" && (
                <Slider label="Amount" value={Number(params.strength)} min={0.1} max={1} step={0.05} display={`${Math.round(Number(params.strength) * 100)}%`} onChange={(v) => set("strength", v)} hint="100% is a full negative." />
              )}

              {op === "blur" && (
                <Slider label="Blur strength" value={Number(params.amount)} min={0.002} max={0.1} step={0.002} display={`${Math.round(Number(params.amount) * 1000) / 10}`} onChange={(v) => set("amount", v)} />
              )}

              {op === "sketch" && (
                <>
                  <Slider label="Line softness" value={Number(params.detail)} min={0.005} max={0.06} step={0.005} display={`${Math.round(Number(params.detail) * 1000) / 10}`} onChange={(v) => set("detail", v)} hint="Smaller values give finer pencil lines." />
                  <Slider label="Darkness" value={Number(params.darkness)} min={0.4} max={2} step={0.1} display={`${Math.round(Number(params.darkness) * 100)}%`} onChange={(v) => set("darkness", v)} />
                </>
              )}

              {op === "pixel" && (
                <>
                  <Slider label="Pixel size" value={Number(params.size)} min={0.005} max={0.08} step={0.005} display={`${Math.round(Number(params.size) * 1000) / 10}`} onChange={(v) => set("size", v)} />
                  <Slider label="Colours per channel" value={Number(params.levels)} min={0} max={16} display={Number(params.levels) < 2 ? "All" : String(params.levels)} onChange={(v) => set("levels", v)} hint="Lower numbers give a retro, limited-colour look. 0 keeps every colour." />
                </>
              )}

              {op === "vignette" && (
                <>
                  <Seg label="Edges" value={String(params.tone)} options={[{ value: "dark", label: "Darken" }, { value: "light", label: "Lighten" }]} onChange={(v) => set("tone", v)} />
                  <Slider label="Strength" value={Number(params.strength)} min={0.1} max={1} step={0.05} display={`${Math.round(Number(params.strength) * 100)}%`} onChange={(v) => set("strength", v)} />
                  <Slider label="Clear centre" value={Number(params.size)} min={0.1} max={1} step={0.05} display={`${Math.round(Number(params.size) * 100)}%`} onChange={(v) => set("size", v)} />
                </>
              )}

              {op === "text" && (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    Text (press Enter for a new line)
                    <textarea value={String(params.text)} onChange={(e) => set("text", e.target.value)} maxLength={200} rows={3} className={fieldCls} />
                  </label>
                  <Seg label="Font" value={String(params.font)} options={[{ value: "impact", label: "Bold" }, { value: "sans", label: "Clean" }, { value: "serif", label: "Serif" }, { value: "mono", label: "Mono" }]} onChange={(v) => set("font", v)} />
                  <Slider label="Size" value={Number(params.size)} min={0.02} max={0.25} step={0.005} display={`${Math.round(Number(params.size) * 100)}%`} onChange={(v) => set("size", v)} />
                  <ColorField label="Text colour" value={String(params.color)} onChange={(v) => set("color", v)} />
                  <fieldset>
                    <legend className="text-sm font-medium text-slate-700">Position</legend>
                    <div className="mt-2 grid w-36 grid-cols-3 gap-1.5">
                      {POS.map((pp) => (
                        <button key={pp} type="button" aria-label={`Position ${pp}`} aria-pressed={params.pos === pp} onClick={() => set("pos", pp)} className={`h-9 rounded-lg border text-lg leading-none ${params.pos === pp ? "border-pine bg-zest" : "border-slate-300 bg-white hover:border-slate-400"}`}>
                          {params.pos === pp ? "●" : "·"}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-2">
                    <Btn kind={params.outline ? "zest" : "line"} onClick={() => set("outline", !params.outline)}>{params.outline ? "✓ Outline" : "Outline"}</Btn>
                    <Btn kind={params.bar ? "zest" : "line"} onClick={() => set("bar", !params.bar)}>{params.bar ? "✓ Dark box" : "Dark box"}</Btn>
                  </div>
                </>
              )}

              {op === "pad" && (
                <>
                  <Seg label="Shape" value={String(params.ratio)} options={[{ value: "1:1", label: "1:1" }, { value: "4:5", label: "4:5" }, { value: "9:16", label: "9:16" }, { value: "16:9", label: "16:9" }]} onChange={(v) => set("ratio", v)} />
                  <Seg label="Fill with" value={String(params.fill)} options={[{ value: "blur", label: "Blurred photo" }, { value: "color", label: "Colour" }, { value: "transparent", label: "Clear" }]} onChange={(v) => set("fill", v)} />
                  {params.fill === "color" && <ColorField label="Colour" value={String(params.color)} onChange={(v) => set("color", v)} />}
                  <Slider label="Extra space" value={Number(params.margin)} min={0} max={0.4} step={0.02} display={`${Math.round(Number(params.margin) * 100)}%`} onChange={(v) => set("margin", v)} />
                  <p className="text-xs text-slate-500">Nothing is cropped. The picture is placed in the middle of a new canvas.</p>
                </>
              )}

              {/* Output */}
              <div className="space-y-4 border-t border-slate-100 pt-4">
                {alpha ? (
                  <p className="text-sm text-slate-600">Saved as <strong>PNG</strong> to keep transparency.</p>
                ) : (
                  <>
                    <Seg
                      label="Save as"
                      value={fmtPick}
                      options={[{ value: "same", label: "Same" }, { value: "jpeg", label: "JPG" }, { value: "png", label: "PNG" }, { value: "webp", label: "WebP" }]}
                      onChange={setFmtPick}
                    />
                    {(fmtPick === "jpeg" || fmtPick === "webp" || (fmtPick === "same" && active.file.type !== "image/png")) && (
                      <Slider label="Quality" value={quality} min={40} max={100} display={`${quality}%`} onChange={setQuality} />
                    )}
                  </>
                )}
                <Btn onClick={download} disabled={busy} className="w-full">
                  {busy ? "Working…" : items.length > 1 ? `Download ${items.length} images (ZIP)` : "Download"}
                </Btn>
                {message && <p role="status" className="text-xs text-slate-500">{message}</p>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}