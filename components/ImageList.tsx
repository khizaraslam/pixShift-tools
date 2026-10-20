"use client";

import type { Img } from "./useImages";

export default function ImageList({
  items,
  onMove,
  onRemove,
  label = "Order",
}: {
  items: Img[];
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  label?: string;
}) {
  const btn = "flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-sm hover:bg-slate-100 disabled:opacity-30";
  return (
    <ol className="space-y-2" aria-label={label}>
      {items.map((it, i) => (
        <li key={it.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <span className="w-5 text-center text-sm font-bold text-slate-400">{i + 1}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={it.thumb} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{it.file.name}</p>
            <p className="text-xs text-slate-500">{it.bitmap.width}×{it.bitmap.height}</p>
          </div>
          <button type="button" className={btn} disabled={i === 0} onClick={() => onMove(it.id, -1)} aria-label={`Move ${it.file.name} up`}>↑</button>
          <button type="button" className={btn} disabled={i === items.length - 1} onClick={() => onMove(it.id, 1)} aria-label={`Move ${it.file.name} down`}>↓</button>
          <button type="button" className={btn} onClick={() => onRemove(it.id)} aria-label={`Remove ${it.file.name}`}>×</button>
        </li>
      ))}
    </ol>
  );
}
