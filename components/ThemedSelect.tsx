"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  /** Shown on the right, e.g. a pixel size. */
  detail?: string;
}

interface Props {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
}

/** A dropdown styled to match the site. Works with mouse, touch and keyboard. */
export default function ThemedSelect({ label, value, options, onChange, className = "" }: Props) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const [active, setActive] = useState(selectedIndex);

  // Close when clicking or tapping outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
    rootRef.current?.querySelector("button")?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((a) => Math.min(options.length - 1, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  };

  const current = options[selectedIndex];

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <span id={`${id}-label`} className="block text-sm font-semibold text-pine">
        {label}
      </span>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-labelledby={`${id}-label ${id}-btn`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        id={`${id}-btn`}
        onClick={() => (open ? setOpen(false) : openList())}
        className={`mt-2 flex w-full items-center justify-between gap-3 rounded-xl border-[3px] border-pine bg-white px-4 py-2.5 text-left font-bold text-pine transition focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp ${
          open ? "shadow-[4px_4px_0_0_#0d2b24]" : "hover:bg-zest/40"
        }`}
      >
        <span className="min-w-0 flex-1 truncate">{current?.label}</span>
        {current?.detail && <span className="shrink-0 rounded-full bg-zest px-2.5 py-0.5 text-sm tabular-nums">{current.detail}</span>}
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`h-5 w-5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 7l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="no-scrollbar absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-auto rounded-xl border-[3px] border-pine bg-white p-1.5 shadow-[6px_6px_0_0_#0d2b24]"
        >
          {options.map((o, i) => {
            const selected = i === selectedIndex;
            return (
              <li
                key={o.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 font-bold ${
                  selected ? "bg-pine text-zest" : i === active ? "bg-zest text-pine" : "text-pine"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className={`w-4 shrink-0 text-center ${selected ? "" : "invisible"}`}>
                    ✓
                  </span>
                  <span className="truncate">{o.label}</span>
                </span>
                {o.detail && (
                  <span className={`shrink-0 text-sm font-semibold tabular-nums ${selected ? "text-zest" : "text-pine/70"}`}>{o.detail}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}