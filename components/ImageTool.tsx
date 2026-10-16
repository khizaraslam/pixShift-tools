"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zipSync } from "fflate";
import type { Format, Tool } from "@/lib/tools";
import {
  EXT,
  baseName,
  formatBytes,
  formatFromMime,
  loadBitmap,
  processImage,
  type FitMode,
} from "@/lib/image";
import { takePending } from "@/lib/pending";
import ThemedSelect from "./ThemedSelect";

interface Item {
  id: string;
  file: File;
  bitmap?: ImageBitmap;
  status: "loading" | "working" | "done" | "error";
  error?: string;
  outBlob?: Blob;
  outUrl?: string;
  outName?: string;
  outW?: number;
  outH?: number;
}

let counter = 0;

export default function ImageTool({ tool }: { tool: Tool }) {
  const [items, setItems] = useState<Item[]>([]);
  const [quality, setQuality] = useState(tool.kind === "compress" ? 75 : 90);
  const [dragging, setDragging] = useState(false);

  // resize mode
  const [mode, setMode] = useState<"pixels" | "percent">("pixels");
  const [width, setWidth] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [percent, setPercent] = useState(50);
  const [lock, setLock] = useState(true);

  // social mode
  const [presetId, setPresetId] = useState(tool.presets?.[0]?.id ?? "");
  const [fit, setFit] = useState<FitMode>("fill");
  const [bg, setBg] = useState("#ffffff");

  // convert target for the "same" kind of tools
  const inputRef = useRef<HTMLInputElement>(null);
  const workRef = useRef<HTMLDivElement>(null);
  const prevCount = useRef(0);
  const urlsRef = useRef<string[]>([]);

  const preset = tool.presets?.find((p) => p.id === presetId);
  const first = items.find((i) => i.bitmap)?.bitmap;

  // Seed width/height from the first image (resizer).
  useEffect(() => {
    if (tool.kind === "resize" && first && width === "" && height === "") {
      setWidth(first.width);
      setHeight(first.height);
    }
  }, [first, tool.kind, width, height]);

  useEffect(() => {
    const urls = urlsRef.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const resolveFormat = useCallback(
    (file: File): Format => (tool.output === "same" ? formatFromMime(file.type) : tool.output),
    [tool.output],
  );

  const run = useCallback(
    async (item: Item) => {
      if (!item.bitmap) return;
      try {
        const format = resolveFormat(item.file);
        let w: number | undefined;
        let h: number | undefined;
        let fitMode: FitMode = "stretch";
        if (tool.kind === "resize") {
          if (mode === "percent") {
            w = (item.bitmap.width * percent) / 100;
            h = (item.bitmap.height * percent) / 100;
          } else if (width && height) {
            // With the lock on, treat the typed width as the driver for every image in the batch.
            if (lock) {
              w = Number(width);
              h = (item.bitmap.height * Number(width)) / item.bitmap.width;
            } else {
              w = Number(width);
              h = Number(height);
            }
          }
        } else if (tool.kind === "social" && preset) {
          w = preset.w;
          h = preset.h;
          fitMode = fit;
        }
        const res = await processImage(item.bitmap, {
          format,
          // Only the PNG compressor quantizes; other PNG outputs stay lossless.
          quality: format === "png" && tool.kind !== "compress" ? 100 : quality,
          width: w,
          height: h,
          fit: fitMode,
          background: bg,
        });
        const url = URL.createObjectURL(res.blob);
        urlsRef.current.push(url);
        const suffix = tool.kind === "social" && preset ? `-${preset.w}x${preset.h}` : tool.kind === "resize" ? `-${res.width}x${res.height}` : "-pixshift";
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? {
                  ...p,
                  status: "done",
                  outBlob: res.blob,
                  outUrl: url,
                  outName: `${baseName(item.file.name)}${suffix}.${EXT[format]}`,
                  outW: res.width,
                  outH: res.height,
                }
              : p,
          ),
        );
      } catch (e) {
        setItems((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, status: "error", error: e instanceof Error ? e.message : "Something went wrong" } : p,
          ),
        );
      }
    },
    [bg, fit, height, lock, mode, percent, preset, quality, resolveFormat, tool.kind, width],
  );

  // Re-process whenever settings change (debounced).
  const itemsKey = items.map((i) => i.id + (i.bitmap ? "1" : "0")).join(",");
  useEffect(() => {
    if (!items.some((i) => i.bitmap)) return;
    const t = setTimeout(() => {
      setItems((prev) => prev.map((p) => (p.bitmap ? { ...p, status: "working" } : p)));
      items.forEach((i) => void run(i));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, itemsKey]);

  const addFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const fresh: Item[] = files.map((file) => ({ id: `f${++counter}`, file, status: "loading" }));
    if (!fresh.length) return;
    setItems((prev) => [...prev, ...fresh]);
    for (const it of fresh) {
      try {
        const bitmap = await loadBitmap(it.file);
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, bitmap, status: "working" } : p)));
      } catch {
        setItems((prev) =>
          prev.map((p) => (p.id === it.id ? { ...p, status: "error", error: "Could not read this image." } : p)),
        );
      }
    }
  }, []);

  // When images are added, bring the settings and results into view if they are off screen.
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

  // Pick up a photo dropped on the homepage.
  useEffect(() => {
    const files = takePending();
    if (files.length) void addFiles(files);
  }, [addFiles]);

  const downloadAll = async () => {
    const done = items.filter((i) => i.status === "done" && i.outBlob && i.outName);
    if (!done.length) return;
    const files: Record<string, Uint8Array> = {};
    const used = new Set<string>();
    for (const i of done) {
      let name = i.outName!;
      let n = 1;
      while (used.has(name)) name = i.outName!.replace(/(\.[^.]+)$/, `-${n++}$1`);
      used.add(name);
      files[name] = new Uint8Array(await i.outBlob!.arrayBuffer());
    }
    const zip = zipSync(files, { level: 0 });
    const blob = new Blob([zip.buffer as ArrayBuffer], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pixshift-images.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const totals = useMemo(() => {
    const done = items.filter((i) => i.status === "done" && i.outBlob);
    const before = done.reduce((s, i) => s + i.file.size, 0);
    const after = done.reduce((s, i) => s + (i.outBlob?.size ?? 0), 0);
    return { count: done.length, before, after };
  }, [items]);

  const showQuality =
    tool.kind === "compress" ||
    tool.kind === "social" ||
    (tool.kind === "convert" && tool.output !== "png") ||
    tool.kind === "resize";

  // Once files are added the big drop area shrinks, so the results are not pushed off screen.
  const compact = items.length > 0;

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`relative rounded-3xl border-2 border-dashed text-center transition ${
          compact ? "p-4 sm:p-5" : "p-8 sm:p-12"
        } ${dragging ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-500"}`}
      >
        {compact ? (
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p role="status" className="flex items-center gap-3 text-base font-semibold text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zest text-lg" aria-hidden>
                ✓
              </span>
              {items.length} image{items.length > 1 ? "s" : ""} added
              <span className="hidden text-sm font-normal text-slate-500 sm:inline">· drop more here</span>
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-full border-2 border-slate-900 px-5 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40"
            >
              Add more images
            </button>
          </div>
        ) : (
          <>
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zest text-3xl`} aria-hidden>
              {tool.icon}
            </div>
            <p className="text-lg font-semibold text-slate-900">Drop images here</p>
            <p className="mt-1 text-sm text-slate-500">or choose files · {tool.acceptLabel}</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-5 inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40"
            >
              Select images
            </button>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={tool.accept}
          className="sr-only"
          aria-label={`Select images for ${tool.name}`}
          onChange={(e) => {
            if (e.target.files) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {!compact && <p className="mt-4 text-xs text-slate-400">🔒 Processed in your browser. Files are never uploaded.</p>}
      </div>

      {/* Scroll target: settings and results start here */}
      <div ref={workRef} className="scroll-mt-20" aria-hidden />

      {/* Settings */}
      {(showQuality || tool.kind === "social" || tool.kind === "resize") && (
        <div className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          {tool.kind === "social" && tool.presets && (
            <>
              <ThemedSelect
                className="sm:col-span-2"
                label={`${tool.platform} size`}
                value={presetId}
                onChange={setPresetId}
                options={tool.presets.map((p) => {
                  const [name, size] = p.label.split(" – ");
                  return { value: p.id, label: name, detail: size ?? `${p.w}×${p.h}` };
                })}
              />
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Resize mode</legend>
                <div className="mt-2 flex gap-2">
                  {(["fill", "fit"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFit(m)}
                      aria-pressed={fit === m}
                      className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        fit === m ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {m === "fill" ? "Fill (crop edges)" : "Fit (add background)"}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="block text-sm font-medium text-slate-700">
                Background colour (for Fit)
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="mt-2 block h-10 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
                />
              </label>
            </>
          )}

          {tool.kind === "resize" && (
            <>
              <fieldset className="sm:col-span-2">
                <legend className="text-sm font-medium text-slate-700">Resize by</legend>
                <div className="mt-2 flex gap-2">
                  {(["pixels", "percent"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      aria-pressed={mode === m}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium capitalize transition ${
                        mode === m ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600 hover:border-slate-400"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </fieldset>

              {mode === "pixels" ? (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    Width (px)
                    <input
                      type="number"
                      min={1}
                      value={width}
                      onChange={(e) => {
                        const v = e.target.value === "" ? "" : Number(e.target.value);
                        setWidth(v);
                        if (lock && first && v !== "") setHeight(Math.round((first.height * Number(v)) / first.width));
                      }}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Height (px)
                    <input
                      type="number"
                      min={1}
                      value={height}
                      onChange={(e) => {
                        const v = e.target.value === "" ? "" : Number(e.target.value);
                        setHeight(v);
                        if (lock && first && v !== "") setWidth(Math.round((first.width * Number(v)) / first.height));
                      }}
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
                    <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="h-4 w-4 accent-brand-600" />
                    Lock aspect ratio
                  </label>
                </>
              ) : (
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Scale: {percent}%
                  <input
                    type="range"
                    min={5}
                    max={200}
                    value={percent}
                    onChange={(e) => setPercent(Number(e.target.value))}
                    className="mt-2 w-full accent-brand-600"
                  />
                </label>
              )}
            </>
          )}

          {showQuality && !(tool.kind === "resize" && tool.output === "same" && false) && (
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Quality: {quality}%
              <input
                type="range"
                min={10}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-2 w-full accent-brand-600"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Lower quality means a smaller file. PNG output uses fewer colours below 100%.
              </span>
            </label>
          )}
        </div>
      )}

      {/* Results */}
      {items.length > 0 && (
        <div className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {items.length} image{items.length > 1 ? "s" : ""}
              {totals.count > 0 && totals.before > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {formatBytes(totals.before)} → {formatBytes(totals.after)}
                  {tool.kind === "compress" && totals.after < totals.before && (
                    <strong className="ml-2 text-emerald-600">
                      −{Math.round((1 - totals.after / totals.before) * 100)}%
                    </strong>
                  )}
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setItems([])}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Clear
              </button>
              {totals.count > 1 && (
                <button
                  type="button"
                  onClick={downloadAll}
                  className="rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-brand-700"
                >
                  Download all (ZIP)
                </button>
              )}
            </div>
          </div>

          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
                <div className="checker flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl sm:w-32">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.outUrl ? <img src={i.outUrl} alt={`Preview of ${i.file.name}`} className="max-h-24 max-w-full object-contain" /> : <span className="text-xs text-slate-400">…</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{i.file.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {i.bitmap ? `${i.bitmap.width}×${i.bitmap.height}` : ""} · {formatBytes(i.file.size)}
                    {i.status === "done" && i.outBlob && (
                      <>
                        {" "}
                        → {i.outW}×{i.outH} · <strong className="text-slate-800">{formatBytes(i.outBlob.size)}</strong>
                      </>
                    )}
                  </p>
                  {i.status === "error" && <p className="mt-1 text-xs text-rose-600">{i.error}</p>}
                  {(i.status === "loading" || i.status === "working") && <p className="mt-1 text-xs text-brand-600">Processing…</p>}
                </div>
                {i.status === "done" && i.outUrl && (
                  <a
                    href={i.outUrl}
                    download={i.outName}
                    className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
                  >
                    Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}