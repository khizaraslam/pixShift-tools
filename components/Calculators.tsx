"use client";

import { useState } from "react";
import type { CalcId } from "@/lib/tools";
import { formatBytes } from "@/lib/image";
import { Btn, Seg, fieldCls } from "./ui";

const UNIT_IN: Record<string, number> = { in: 1, cm: 1 / 2.54, mm: 1 / 25.4 };
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? String(Math.round(n * 10 ** d) / 10 ** d) : "–");

function Num({ label, value, onChange, min = 0, step = "any", suffix }: { label: string; value: number | ""; onChange: (v: number | "") => void; min?: number; step?: string; suffix?: string }) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className={fieldCls}
        />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 mt-1 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>}
      </div>
    </label>
  );
}

function Card({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 id={id} className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Result({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border-2 border-pine bg-zest/60 p-4 text-pine" aria-live="polite">{children}</div>;
}

const DPIS = [72, 96, 150, 300, 600];

function DpiPick({ value, onChange }: { value: number | ""; onChange: (v: number | "") => void }) {
  return (
    <div>
      <Num label="DPI (pixels per inch)" value={value} onChange={onChange} min={1} />
      <div className="mt-2 flex flex-wrap gap-2">
        {DPIS.map((d) => (
          <button key={d} type="button" aria-pressed={value === d} onClick={() => onChange(d)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${value === d ? "border-pine bg-zest" : "border-slate-300 hover:bg-slate-100"}`}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dpi() {
  const [pw, setPw] = useState<number | "">(3000);
  const [ph, setPh] = useState<number | "">(2000);
  const [unit, setUnit] = useState("in");
  const [w, setW] = useState<number | "">(10);
  const [h, setH] = useState<number | "">("");
  const [want, setWant] = useState<number | "">(300);
  const dpi = pw && w ? Number(pw) / (Number(w) * UNIT_IN[unit]) : null;
  const hDpi = ph && h ? Number(ph) / (Number(h) * UNIT_IN[unit]) : null;
  const rate = (d: number) => (d >= 300 ? ["Excellent", "Sharp prints at close range."] : d >= 200 ? ["Good", "Fine for most prints."] : d >= 150 ? ["Fair", "OK for posters seen from a distance."] : ["Low", "Prints will look soft. Print smaller or use a bigger image."]);
  const needW = w && want ? Math.round(Number(w) * UNIT_IN[unit] * Number(want)) : null;
  const needH = h && want ? Math.round(Number(h) * UNIT_IN[unit] * Number(want)) : null;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card id="dpi-1" title="1. What DPI will my print have?">
        <div className="grid grid-cols-2 gap-4">
          <Num label="Image width" suffix="px" value={pw} onChange={setPw} min={1} />
          <Num label="Image height" suffix="px" value={ph} onChange={setPh} min={1} />
        </div>
        <Seg label="Print size unit" value={unit} options={[{ value: "in", label: "inches" }, { value: "cm", label: "cm" }, { value: "mm", label: "mm" }]} onChange={setUnit} />
        <div className="grid grid-cols-2 gap-4">
          <Num label="Print width" suffix={unit} value={w} onChange={setW} />
          <Num label="Print height" suffix={unit} value={h} onChange={setH} />
        </div>
        {dpi ? (
          <Result>
            <p className="text-2xl font-extrabold">{fmt(dpi, 0)} DPI</p>
            <p className="text-sm"><strong>{rate(dpi)[0]}.</strong> {rate(dpi)[1]}</p>
            {hDpi && Math.abs(hDpi - dpi) / dpi > 0.02 && <p className="mt-1 text-xs">Height gives {fmt(hDpi, 0)} DPI, so the shape differs from your image. Keep the same ratio.</p>}
          </Result>
        ) : (
          <p className="text-sm text-slate-500">Enter the image pixels and a print width.</p>
        )}
      </Card>
      <Card id="dpi-2" title="2. How many pixels do I need?">
        <p className="text-sm text-slate-600">Uses the print size above.</p>
        <DpiPick value={want} onChange={setWant} />
        {needW || needH ? (
          <Result>
            <p className="text-2xl font-extrabold">{needW ? `${needW} px wide` : ""}{needW && needH ? " × " : ""}{needH ? `${needH} px high` : ""}</p>
            <p className="text-sm">for {w || "?"}{h ? ` × ${h}` : ""} {unit} at {want} DPI</p>
          </Result>
        ) : (
          <p className="text-sm text-slate-500">Enter a print width or height on the left.</p>
        )}
      </Card>
    </div>
  );
}

function PxToIn() {
  const [w, setW] = useState<number | "">(1800);
  const [h, setH] = useState<number | "">(1200);
  const [dpi, setDpi] = useState<number | "">(300);
  const rows = (v: number | "") => (v && dpi ? [Number(v) / Number(dpi), (Number(v) / Number(dpi)) * 2.54, (Number(v) / Number(dpi)) * 25.4] : null);
  const rw = rows(w);
  const rh = rows(h);
  return (
    <Card id="pxin" title="Pixels to inches, cm and mm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Num label="Width" suffix="px" value={w} onChange={setW} />
        <Num label="Height (optional)" suffix="px" value={h} onChange={setH} />
      </div>
      <DpiPick value={dpi} onChange={setDpi} />
      {rw ? (
        <Result>
          <p className="text-2xl font-extrabold">{fmt(rw[0])} in{rh ? ` × ${fmt(rh[0])} in` : ""}</p>
          <p className="text-sm">{fmt(rw[1])} cm{rh ? ` × ${fmt(rh[1])} cm` : ""} · {fmt(rw[2], 1)} mm{rh ? ` × ${fmt(rh[2], 1)} mm` : ""}</p>
        </Result>
      ) : (
        <p className="text-sm text-slate-500">Enter pixels and a DPI.</p>
      )}
    </Card>
  );
}

function InToPx() {
  const [unit, setUnit] = useState("in");
  const [w, setW] = useState<number | "">(4);
  const [h, setH] = useState<number | "">(6);
  const [dpi, setDpi] = useState<number | "">(300);
  const px = (v: number | "") => (v && dpi ? Math.round(Number(v) * UNIT_IN[unit] * Number(dpi)) : null);
  const pw = px(w);
  const ph = px(h);
  return (
    <Card id="inpx" title="Inches or cm to pixels">
      <Seg label="Unit" value={unit} options={[{ value: "in", label: "inches" }, { value: "cm", label: "cm" }, { value: "mm", label: "mm" }]} onChange={setUnit} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Num label="Width" suffix={unit} value={w} onChange={setW} />
        <Num label="Height (optional)" suffix={unit} value={h} onChange={setH} />
      </div>
      <DpiPick value={dpi} onChange={setDpi} />
      {pw ? (
        <Result>
          <p className="text-2xl font-extrabold">{pw} px{ph ? ` × ${ph} px` : ""}</p>
          {pw && ph && <p className="text-sm">{fmt((pw * ph) / 1e6, 1)} megapixels</p>}
        </Result>
      ) : (
        <p className="text-sm text-slate-500">Enter a size and a DPI.</p>
      )}
    </Card>
  );
}

const DEPTH = [
  { value: 8, label: "Grey 8-bit" },
  { value: 24, label: "Colour 24-bit" },
  { value: 32, label: "With alpha 32-bit" },
];
const RATIO: { value: string; label: string; r: number }[] = [
  { value: "none", label: "None (raw)", r: 1 },
  { value: "png", label: "PNG (lossless)", r: 2 },
  { value: "jpg90", label: "JPG high quality", r: 8 },
  { value: "jpg75", label: "JPG medium", r: 16 },
  { value: "webp", label: "WebP / AVIF", r: 22 },
];

function FileSize() {
  const [w, setW] = useState<number | "">(4000);
  const [h, setH] = useState<number | "">(3000);
  const [depth, setDepth] = useState(24);
  const [ratio, setRatio] = useState("jpg75");
  const raw = w && h ? (Number(w) * Number(h) * depth) / 8 : null;
  const r = RATIO.find((x) => x.value === ratio)!;
  return (
    <Card id="fsz" title="Estimate image file size">
      <div className="grid gap-4 sm:grid-cols-2">
        <Num label="Width" suffix="px" value={w} onChange={setW} min={1} />
        <Num label="Height" suffix="px" value={h} onChange={setH} min={1} />
      </div>
      <div className="flex flex-wrap gap-2">
        {[["HD", 1280, 720], ["Full HD", 1920, 1080], ["4K", 3840, 2160], ["12 MP", 4000, 3000]].map(([l, a, b]) => (
          <Btn key={l as string} kind="line" onClick={() => { setW(a as number); setH(b as number); }}>{l}</Btn>
        ))}
      </div>
      <Seg label="Colour depth" value={depth} options={DEPTH} onChange={setDepth} />
      <Seg label="Compression" value={ratio} options={RATIO.map((x) => ({ value: x.value, label: x.label }))} onChange={setRatio} />
      {raw ? (
        <Result>
          <p className="text-2xl font-extrabold">≈ {formatBytes(raw / r.r)}</p>
          <p className="text-sm">Raw pixel data is {formatBytes(raw)}. Compressed sizes are estimates; real files vary with the picture.</p>
        </Result>
      ) : (
        <p className="text-sm text-slate-500">Enter width and height.</p>
      )}
    </Card>
  );
}

export default function Calculators({ calc }: { calc: CalcId }) {
  if (calc === "dpi") return <Dpi />;
  if (calc === "px-to-in") return <PxToIn />;
  if (calc === "in-to-px") return <InToPx />;
  return <FileSize />;
}
