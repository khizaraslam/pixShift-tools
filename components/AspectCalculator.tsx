"use client";

import { useMemo, useState } from "react";
import { gcd } from "@/lib/image";

const COMMON = [
  { label: "16:9", w: 16, h: 9 },
  { label: "4:3", w: 4, h: 3 },
  { label: "3:2", w: 3, h: 2 },
  { label: "1:1", w: 1, h: 1 },
  { label: "4:5", w: 4, h: 5 },
  { label: "9:16", w: 9, h: 16 },
  { label: "21:9", w: 21, h: 9 },
];

export default function AspectCalculator() {
  const [w, setW] = useState(1920);
  const [h, setH] = useState(1080);
  const [nw, setNw] = useState<number | "">(1280);
  const [nh, setNh] = useState<number | "">("");

  const ratio = useMemo(() => {
    if (!w || !h) return null;
    const d = gcd(w, h);
    return { a: Math.round(w / d), b: Math.round(h / d), dec: w / h };
  }, [w, h]);

  const resultH = ratio && nw !== "" ? Math.round((Number(nw) * h) / w) : null;
  const resultW = ratio && nh !== "" ? Math.round((Number(nh) * w) / h) : null;

  const field =
    "mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="calc-ratio">
        <h2 id="calc-ratio" className="text-lg font-semibold">1. Find the ratio</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="text-sm font-medium text-slate-700">
            Width
            <input type="number" min={1} value={w || ""} onChange={(e) => setW(Number(e.target.value))} className={field} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Height
            <input type="number" min={1} value={h || ""} onChange={(e) => setH(Number(e.target.value))} className={field} />
          </label>
        </div>
        <div className="mt-6 rounded-2xl bg-pine p-6 text-zest">
          <p className="text-sm text-zest/80">Aspect ratio</p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight">{ratio ? `${ratio.a}:${ratio.b}` : "–"}</p>
          {ratio && <p className="mt-2 text-sm text-zest/80">Decimal: {ratio.dec.toFixed(4)}</p>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Common ratios">
          {COMMON.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => {
                // Keep the current width, set height from the chosen ratio.
                const base = w || 1920;
                setW(base);
                setH(Math.round((base * c.h) / c.w));
              }}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand-500 hover:bg-brand-50"
            >
              {c.label}
            </button>
          ))}
        </div>
        {ratio && (
          <div className="mt-6" aria-hidden>
            <div
              className="mx-auto rounded-lg border-2 border-brand-500 bg-brand-50"
              style={{ aspectRatio: `${w} / ${h}`, maxWidth: "100%", width: ratio.dec >= 1 ? "100%" : `${Math.max(25, ratio.dec * 100)}%`, maxHeight: 220 }}
            />
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="calc-resize">
        <h2 id="calc-resize" className="text-lg font-semibold">2. Resize and keep the ratio</h2>
        <p className="mt-1 text-sm text-slate-500">Enter either a new width or a new height.</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <label className="text-sm font-medium text-slate-700">
            New width
            <input
              type="number"
              min={1}
              value={nw}
              onChange={(e) => {
                setNw(e.target.value === "" ? "" : Number(e.target.value));
                setNh("");
              }}
              className={field}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            New height
            <input
              type="number"
              min={1}
              value={nh}
              onChange={(e) => {
                setNh(e.target.value === "" ? "" : Number(e.target.value));
                setNw("");
              }}
              className={field}
            />
          </label>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm text-slate-500">Result</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">
            {resultH !== null ? `${nw} × ${resultH}` : resultW !== null ? `${resultW} × ${nh}` : "–"}
          </p>
          <p className="mt-2 text-xs text-slate-500">Formula: new height = new width × (height ÷ width)</p>
        </div>
      </section>
    </div>
  );
}
