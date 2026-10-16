"use client";

import { useEffect, useRef, useState } from "react";
import { H, W, drawFlat, drawScene } from "@/lib/scene";
import { formatBytes } from "@/lib/image";

type Kind = "photo" | "flat";
type Fmt = "png" | "jpg" | "webp";
type Out = { url: string; size: number } | null;
type Outs = Record<Fmt, Out>;

const MIMES: Record<Fmt, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };
// Where the zoom looks: an area full of edges and grain, so compression damage shows.
const FOCUS: Record<Kind, string> = { photo: "66% 60%", flat: "36% 52%" };

export default function FormatRace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const urlsRef = useRef<string[]>([]);
  const [kind, setKind] = useState<Kind>("photo");
  const [quality, setQuality] = useState(25);
  const [show, setShow] = useState<Fmt>("jpg");
  const [zoom, setZoom] = useState(true);
  const [outs, setOuts] = useState<Outs | null>(null);

  // Draw the chosen picture (hidden canvas, used only as the source to encode).
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = W;
    canvas.height = H;
    if (kind === "photo") drawScene(ctx);
    else drawFlat(ctx, W, H);
  }, [kind]);

  // Encode the same pixels three ways, for real.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const enc = (type: string, q?: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
      try {
        const [png, jpg, webp] = await Promise.all([
          enc(MIMES.png),
          enc(MIMES.jpg, quality / 100),
          enc(MIMES.webp, quality / 100),
        ]);
        if (cancelled) return;
        const make = (b: Blob | null, mime: string): Out => {
          // Browsers without WebP encoding silently return a PNG.
          if (!b || b.type !== mime) return null;
          const url = URL.createObjectURL(b);
          urlsRef.current.push(url);
          return { url, size: b.size };
        };
        const next: Outs = { png: make(png, MIMES.png), jpg: make(jpg, MIMES.jpg), webp: make(webp, MIMES.webp) };
        setOuts((prev) => {
          if (prev) {
            const old = [prev.png, prev.jpg, prev.webp].map((o) => o?.url).filter(Boolean) as string[];
            setTimeout(() => {
              old.forEach((u) => URL.revokeObjectURL(u));
              urlsRef.current = urlsRef.current.filter((u) => !old.includes(u));
            }, 500);
          }
          return next;
        });
      } catch {
        /* keep the previous result */
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [kind, quality]);

  useEffect(
    () => () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  const rows: { key: Fmt; label: string; note: string }[] = [
    { key: "png", label: "PNG", note: "lossless" },
    { key: "jpg", label: "JPG", note: `${quality}% quality` },
    { key: "webp", label: "WebP", note: `${quality}% quality` },
  ];
  const sizes = rows.map((r) => ({ ...r, size: outs?.[r.key]?.size ?? null }));
  const avail = sizes.filter((r): r is (typeof sizes)[number] & { size: number } => r.size !== null);
  const max = avail.length ? Math.max(...avail.map((r) => r.size)) : 1;
  const small = avail.length ? avail.reduce((a, b) => (b.size < a.size ? b : a)) : null;
  const large = avail.length ? avail.reduce((a, b) => (b.size > a.size ? b : a)) : null;
  const shown = outs?.[show] ?? outs?.png ?? null;

  return (
    <section aria-labelledby="race-heading" className="pt-24">
      <h2 id="race-heading" className="max-w-3xl text-[clamp(1.9rem,5vw,3.75rem)] leading-[1.02]">
        Same picture, three formats.
      </h2>
      <p className="mt-4 max-w-xl text-lg text-pine/80">
        This picture is encoded as PNG, JPG and WebP right now, in your browser. Choose a format to see what it looks
        like, then lower the quality and watch the picture and the size change together.
      </p>

      <canvas ref={canvasRef} width={W} height={H} className="hidden" aria-hidden />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div>
          <div
            className="relative overflow-hidden rounded-2xl border-[3px] border-pine bg-pine"
            style={{ aspectRatio: `${W} / ${H}` }}
          >
            {shown && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shown.url}
                alt={`The test picture encoded as ${show.toUpperCase()}${show === "png" ? "" : ` at ${quality}% quality`}${zoom ? ", zoomed in" : ""}`}
                draggable={false}
                className="absolute inset-0 h-full w-full select-none transition-transform duration-300"
                style={{
                  transform: zoom ? "scale(3.5)" : "scale(1)",
                  transformOrigin: FOCUS[kind],
                  imageRendering: zoom ? "pixelated" : "auto",
                }}
              />
            )}
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-pine/85 px-3 py-1 text-xs font-semibold text-white">
              {rows.find((r) => r.key === show)?.label} · {rows.find((r) => r.key === show)?.note}
            </span>
            {zoom && (
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-zest px-3 py-1 text-xs font-bold text-pine">
                Zoomed 3.5×
              </span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <div className="flex gap-2" role="group" aria-label="Picture type">
              {(
                [
                  ["photo", "Photo"],
                  ["flat", "Logo or graphic"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                  className={`rounded-full border-[3px] border-pine px-5 py-2 text-base font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp ${
                    kind === k ? "bg-pine text-zest" : "hover:bg-zest"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-pressed={zoom}
              onClick={() => setZoom((z) => !z)}
              className={`rounded-full border-[3px] border-pine px-5 py-2 text-base font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp ${
                zoom ? "bg-zest" : "hover:bg-zest"
              }`}
            >
              Zoom in
            </button>
          </div>
        </div>

        <div aria-live="polite">
          <ul className="space-y-4">
            {sizes.map((r) => {
              const isSmallest = small !== null && r.size === small.size;
              const pct = r.size !== null ? Math.max(4, Math.round((r.size / max) * 100)) : 0;
              const active = show === r.key;
              return (
                <li key={r.key}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setShow(r.key)}
                    disabled={r.size === null && outs !== null}
                    className={`block w-full rounded-2xl border-[3px] p-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp disabled:opacity-50 ${
                      active ? "border-pine bg-white" : "border-transparent hover:border-pine/40"
                    }`}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="text-xl font-extrabold">
                        {r.label} <span className="text-sm font-medium text-pine/70">{r.note}</span>
                      </span>
                      <span className="squeeze text-2xl font-extrabold tabular-nums" style={{ "--w": 90 } as React.CSSProperties}>
                        {r.size !== null ? formatBytes(r.size) : outs ? "Not supported here" : "…"}
                      </span>
                    </span>
                    <span className="mt-2 block h-8 overflow-hidden rounded-full border-[3px] border-pine bg-pith">
                      <span
                        className={`block h-full rounded-full transition-[width] duration-500 ease-out ${isSmallest ? "bg-zest" : "bg-pine"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <label className="mt-6 block text-sm font-semibold" htmlFor="race-quality">
            Quality for JPG and WebP: {quality}%
          </label>
          <input
            id="race-quality"
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            aria-valuetext={`${quality} percent`}
            className="sq-range mt-3"
          />

          {small && large && small.key !== large.key && (
            <p className="mt-6 max-w-md text-base leading-relaxed text-pine/85">
              {small.label} is the lightest here, {Math.round((1 - small.size / large.size) * 100)}% smaller than{" "}
              {large.label}.{" "}
              {kind === "photo"
                ? "Photos have smooth colour and grain, which JPG and WebP squeeze well. PNG keeps every pixel, so it is the heaviest."
                : "Flat colours and hard edges suit PNG. JPG has to add noise around edges to compress them."}{" "}
              Results change with every picture.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
