"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { takePending } from "@/lib/pending";

interface Props {
  accept: string;
  acceptLabel: string;
  icon: string;
  name: string;
  /** What is being dropped, e.g. "image", "images". */
  noun?: string;
  multiple?: boolean;
  /** Number of files already added: shrinks the box to a bar. */
  count?: number;
  onFiles: (files: File[]) => void;
  /** Pick up a file dropped on the homepage. */
  usePending?: boolean;
}

export default function Drop({ accept, acceptLabel, icon, name, noun = "image", multiple = true, count = 0, onFiles, usePending = true }: Props) {
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const compact = count > 0;

  const handle = useCallback(
    (list: FileList | File[]) => {
      const files = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(svg|avif|webp|jpe?g|png|gif|bmp)$/i.test(f.name));
      if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    },
    [multiple, onFiles],
  );

  useEffect(() => {
    if (!usePending) return;
    const f = takePending();
    if (f.length) handle(f);
  }, [usePending, handle]);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        handle(e.dataTransfer.files);
      }}
      className={`relative rounded-3xl border-2 border-dashed text-center transition ${compact ? "p-4 sm:p-5" : "p-8 sm:p-12"} ${
        drag ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-500"
      }`}
    >
      {compact ? (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p role="status" className="flex items-center gap-3 text-base font-semibold text-slate-900">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-zest text-lg" aria-hidden>✓</span>
            {count} {noun}{count > 1 ? "s" : ""} added
          </p>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="rounded-full border-2 border-slate-900 px-5 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-900 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40"
          >
            {multiple ? `Add more ${noun}s` : `Change ${noun}`}
          </button>
        </div>
      ) : (
        <>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zest text-3xl" aria-hidden>{icon}</div>
          <p className="text-lg font-semibold text-slate-900">Drop {multiple ? `${noun}s` : `an ${noun}`} here</p>
          <p className="mt-1 text-sm text-slate-500">or choose {multiple ? "files" : "a file"} · {acceptLabel}</p>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="mt-5 inline-flex items-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40"
          >
            Select {multiple ? `${noun}s` : noun}
          </button>
          <p className="mt-4 text-xs text-slate-400">🔒 Processed in your browser. Files are never uploaded.</p>
        </>
      )}
      <input
        ref={input}
        type="file"
        multiple={multiple}
        accept={accept}
        className="sr-only"
        aria-label={`Select ${noun}s for ${name}`}
        onChange={(e) => {
          if (e.target.files) handle(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
