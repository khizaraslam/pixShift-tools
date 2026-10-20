"use client";

import type { ReactNode } from "react";

export const fieldCls =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6 ${className}`}>{children}</div>;
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  hint,
  className = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}: <span className="font-semibold text-slate-900">{display ?? value}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-brand-600"
      />
      {hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export function Seg<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="text-sm font-medium text-slate-700">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
              value === o.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600 hover:border-slate-400"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function ColorField({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block h-10 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1"
      />
    </label>
  );
}

export function Btn({
  children,
  onClick,
  kind = "dark",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "dark" | "line" | "zest";
  disabled?: boolean;
  className?: string;
}) {
  const k =
    kind === "dark"
      ? "bg-slate-900 text-white hover:bg-brand-600"
      : kind === "zest"
        ? "bg-zest text-pine border-2 border-pine hover:bg-white"
        : "border border-slate-300 text-slate-700 hover:bg-slate-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50 ${k} ${className}`}
    >
      {children}
    </button>
  );
}
