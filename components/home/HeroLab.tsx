"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { setPending } from "@/lib/pending";
import { formatBytes } from "@/lib/image";
import { TOOLS, getTool } from "@/lib/tools";
import { H, W, drawScene } from "@/lib/scene";

function toJpeg(c: HTMLCanvasElement, q: number) {
  return new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", q),
  );
}

function suggest(type: string) {
  const base = ["image-resizer", "instagram-post-resizer", "background-remover"];
  if (type === "image/png") return ["png-compressor", "png-to-jpg", "png-to-webp", ...base];
  if (type === "image/jpeg") return ["jpg-compressor", "jpg-to-webp", "compress-image-to-100kb", ...base];
  return ["image-compressor", "webp-converter", ...base];
}

export default function HeroLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const busyRef = useRef(false);
  const verRef = useRef(0);
  const qRef = useRef(100);

  const [quality, setQualityState] = useState(100);
  const [split, setSplit] = useState(50);
  const [dims, setDims] = useState({ w: W, h: H });
  const [ready, setReady] = useState(false);
  const [tick, setTick] = useState(0);
  const [fullSize, setFullSize] = useState(0);
  const [out, setOut] = useState<{ url: string; size: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [error, setError] = useState("");

  const setQuality = useCallback((v: number) => {
    qRef.current = v;
    setQualityState(v);
  }, []);

  // Draw the source picture (built-in scene or the visitor's photo).
  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    (async () => {
      try {
        if (file) {
          const bmp = await createImageBitmap(file);
          if (cancelled) return;
          const scale = Math.min(1, 960 / Math.max(bmp.width, bmp.height));
          canvas.width = Math.max(1, Math.round(bmp.width * scale));
          canvas.height = Math.max(1, Math.round(bmp.height * scale));
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
          bmp.close?.();
        } else {
          canvas.width = W;
          canvas.height = H;
          drawScene(ctx);
        }
        const full = await toJpeg(canvas, 1);
        if (cancelled) return;
        verRef.current += 1;
        setDims({ w: canvas.width, h: canvas.height });
        setFullSize(full.size);
        setError("");
        setReady(true);
        setTick((t) => t + 1);
      } catch {
        if (!cancelled) {
          setError("That file could not be read as an image.");
          setFile(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  // Re-encode with real JPEG compression whenever quality or source changes.
  const encode = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || busyRef.current) return;
    busyRef.current = true;
    try {
      const sig = () => `${qRef.current}:${verRef.current}`;
      let last = "";
      while (last !== sig()) {
        last = sig();
        const blob = await toJpeg(canvas, qRef.current / 100);
        const url = URL.createObjectURL(blob);
        const prev = urlRef.current;
        urlRef.current = url;
        setOut({ url, size: blob.size });
        if (prev) setTimeout(() => URL.revokeObjectURL(prev), 400);
      }
    } catch {
      /* ignore: next change retries */
    } finally {
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (ready) void encode();
  }, [quality, ready, tick, encode]);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  // The one load moment: quality drops while the headline squeezes with it.
  useEffect(() => {
    if (!ready || introDone) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setQuality(38);
      setIntroDone(true);
      return;
    }
    const start = performance.now();
    const dur = 1800;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setQuality(Math.round(100 + (38 - 100) * e));
      if (p < 1) raf = requestAnimationFrame(step);
      else setIntroDone(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ready, introDone, setQuality]);

  const onFiles = (list: FileList | File[]) => {
    const f = Array.from(list).find((x) => x.type.startsWith("image/"));
    if (f) {
      setFile(f);
      setIntroDone(true);
      setSplit(50);
    } else {
      setError("Choose a JPG, PNG, WebP, GIF, BMP or AVIF image.");
    }
  };

  const wdth = Math.round(58 + (quality / 100) * 62);
  const saved = out && fullSize > 0 ? Math.max(0, Math.round((1 - out.size / fullSize) * 100)) : 0;
  const actions = file ? suggest(file.type).map((s) => getTool(s)).filter(Boolean) : [];

  return (
    <section className="hero-glow">
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14">
        <h1
          className="squeeze text-[clamp(1.9rem,6.6vw,5.25rem)] font-extrabold leading-[0.98]"
          style={{ "--w": wdth } as React.CSSProperties}
        >
          <span
            className="mb-4 inline-block rounded-full border-[3px] border-pine bg-white px-4 py-1.5 text-sm font-bold leading-snug sm:text-base"
            style={{ fontVariationSettings: '"wdth" 100', fontFamily: "var(--font-body), ui-sans-serif, system-ui, sans-serif" }}
          >
            Free image compressor, resizer and converter
          </span>
          <span className="block">Squeeze the file.</span>
          <span className="block">Keep the picture.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-pine/80">
          Compress, resize and convert photos right here. Move the slider below and watch what every kilobyte costs.
        </p>
        <ul className="mt-5 flex flex-wrap gap-2 text-sm font-semibold" aria-label="Highlights">
          {["Free", "No signup", "No watermark"].map((t) => (
            <li key={t} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 ring-1 ring-pine/15">
              <span aria-hidden className="text-brand-600">✓</span>
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-pine px-6 py-3.5 text-base font-extrabold text-zest transition hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
          >
            Choose a photo
          </button>
          <Link
            href="/tools"
            className="rounded-full border-2 border-pine px-6 py-3 text-base font-bold transition hover:bg-pine hover:text-zest focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
          >
            Browse all tools
          </Link>
        </div>

        <div
          className={`mt-10 rounded-[2rem] bg-zest p-3 transition-shadow sm:p-5 ${dragging ? "ring-8 ring-pine" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
        >
          <div
            className="relative mx-auto overflow-hidden rounded-2xl bg-pine focus-within:ring-4 focus-within:ring-pine"
            style={{
              aspectRatio: `${dims.w} / ${dims.h}`,
              width: `min(100%, ${((70 * dims.w) / dims.h).toFixed(1)}vh)`,
            }}
          >
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              role="img"
              aria-label={file ? "Your photo at full quality" : "Sample picture at full quality"}
              className="absolute inset-0 h-full w-full"
            />
            {out && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={out.url}
                alt={`The same picture compressed at ${quality}% quality`}
                draggable={false}
                className="absolute inset-0 h-full w-full select-none"
                style={{ clipPath: `inset(0 0 0 ${split}%)` }}
              />
            )}
            <div className="pointer-events-none absolute inset-y-0 w-[3px] -translate-x-1/2 bg-white" style={{ left: `${split}%` }}>
              <span
                aria-hidden
                className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-pine bg-zest font-bold text-pine"
              >
                ↔
              </span>
            </div>
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-pine/85 px-3 py-1 text-xs font-semibold text-white">
              Full quality
            </span>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-pine/85 px-3 py-1 text-xs font-semibold text-white">
              {quality}% quality
            </span>
            {out && (
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-4 right-4 z-[5] -rotate-6 rounded-lg bg-zest px-4 py-2 text-pine shadow-[4px_4px_0_0_#0d2b24]"
              >
                <p className="squeeze text-3xl font-extrabold leading-none tabular-nums" style={{ "--w": 80 } as React.CSSProperties}>
                  {saved > 0 ? `−${saved}%` : "Same"}
                </p>
              </div>
            )}
            <input
              type="range"
              min={0}
              max={100}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              aria-label="Compare full quality with compressed"
              className="absolute inset-0 z-10 h-full w-full cursor-ew-resize opacity-0"
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end" aria-live="polite">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <p className="text-sm font-semibold">At full quality</p>
                <p className="squeeze text-3xl font-extrabold tabular-nums" style={{ "--w": 90 } as React.CSSProperties}>
                  {fullSize ? formatBytes(fullSize) : "…"}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold">At {quality}%</p>
                <p className="squeeze text-5xl font-extrabold tabular-nums sm:text-6xl" style={{ "--w": 90 } as React.CSSProperties}>
                  {out ? formatBytes(out.size) : "…"}
                </p>
              </div>
              <p className="sr-only">{saved > 0 ? `${saved}% smaller` : "Same size"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Choose your own photo"
                onChange={(e) => {
                  if (e.target.files) onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-full bg-pine px-5 py-3 text-sm font-bold text-zest transition hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
              >
                Try your own photo
              </button>
              {file && (
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setSplit(50);
                  }}
                  className="rounded-full border-2 border-pine px-5 py-[10px] text-sm font-bold transition hover:bg-pine hover:text-zest focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
                >
                  Back to the sample
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm font-medium text-pine/80">Drag the divider: original on the left, compressed on the right.</p>

          <div className="mt-5">
            <label className="flex items-center justify-between text-sm font-semibold" htmlFor="hero-quality">
              <span>Smallest file</span>
              <span>Best quality</span>
            </label>
            <input
              id="hero-quality"
              type="range"
              min={5}
              max={100}
              value={quality}
              onChange={(e) => {
                setIntroDone(true);
                setQuality(Number(e.target.value));
              }}
              aria-label="JPEG quality"
              aria-valuetext={`${quality} percent`}
              className="sq-range mt-3"
            />
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-pine px-4 py-3 text-sm font-medium text-pith">
              {error}
            </p>
          )}

          {file && actions.length > 0 && (
            <div className="mt-6 border-t-[3px] border-pine pt-5">
              <p className="text-base font-bold">What do you want to do with {file.name}?</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {actions.map((t) =>
                  t ? (
                    <li key={t.slug}>
                      <Link
                        href={`/${t.slug}`}
                        onClick={() => setPending([file])}
                        className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2 text-sm font-bold text-pith transition hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
                      >
                        <span aria-hidden>{t.icon}</span>
                        {t.name}
                      </Link>
                    </li>
                  ) : null,
                )}
              </ul>
              <p className="mt-3 text-xs text-pine/75">
                The preview above is scaled to fit this page. The tools work on your full-size file.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
