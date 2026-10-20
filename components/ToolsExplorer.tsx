"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { GROUP_LABEL, TOOLS, getTool, type Tool, type ToolGroup } from "@/lib/tools";
import ToolVisual from "@/components/home/ToolVisual";

const GROUPS = Object.keys(GROUP_LABEL) as ToolGroup[];

/** What people actually want to do, in their words. Each fills the search box. */
const GOALS: [string, string][] = [
  ["Compress to 100 KB", "100kb"],
  ["Remove background", "background"],
  ["JPG to PNG", "jpg to png"],
  ["Resize for Instagram", "instagram"],
  ["Add a watermark", "watermark"],
  ["Image to PDF", "pdf"],
];

const POPULAR = ["image-compressor", "background-remover", "image-resizer", "compress-image-to-100kb"];

function Arrow() {
  return (
    <span
      aria-hidden
      className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-pine/15 text-pine transition group-hover:border-pine group-hover:bg-zest group-focus-visible:border-pine group-focus-visible:bg-zest"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" />
      </svg>
    </span>
  );
}

function ToolRow({ t }: { t: Tool }) {
  return (
    <Link
      href={`/${t.slug}`}
      className="group flex h-full items-center gap-3.5 rounded-2xl border border-pine/12 bg-white p-3.5 transition duration-200 hover:-translate-y-0.5 hover:border-pine hover:shadow-[0_10px_24px_-12px_rgba(13,43,36,0.45)] focus:outline-none focus-visible:border-pine focus-visible:ring-4 focus-visible:ring-pulp/60"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ring-1 ring-pine/10"
        style={{ background: t.color }}
        aria-hidden
      >
        {t.icon}
      </span>
      <span className="min-w-0">
        <span className="block font-bold leading-tight">{t.name}</span>
        <span className="mt-0.5 block text-sm leading-snug text-pine/70">{t.short}</span>
      </span>
      <Arrow />
    </Link>
  );
}

function PopularCard({ t }: { t: Tool }) {
  return (
    <Link
      href={`/${t.slug}`}
      className="tool-row group flex h-full flex-col overflow-hidden rounded-3xl border border-pine/15 bg-white transition duration-200 hover:-translate-y-1 hover:border-pine hover:shadow-[0_16px_32px_-16px_rgba(13,43,36,0.5)] focus:outline-none focus-visible:border-pine focus-visible:ring-4 focus-visible:ring-pulp/60"
    >
      <span className="flex aspect-[16/10] items-center justify-center p-5 text-pine" style={{ background: t.color }} aria-hidden>
        <span className="block w-full max-w-[200px]">
          <ToolVisual slug={t.slug} />
        </span>
      </span>
      <span className="flex flex-1 items-center gap-3 p-4">
        <span className="min-w-0">
          <span className="block text-lg font-extrabold leading-tight">{t.name}</span>
          <span className="mt-1 block text-sm leading-snug text-pine/70">{t.short}</span>
        </span>
        <Arrow />
      </span>
    </Link>
  );
}

export default function ToolsExplorer({ heading }: { heading: ReactNode }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<ToolGroup>(GROUPS[0]);
  const inputRef = useRef<HTMLInputElement>(null);
  const term = q.trim().toLowerCase();

  const match = useMemo(() => {
    if (!term) return TOOLS;
    const words = term.split(/\s+/);
    return TOOLS.filter((t) => {
      const hay = `${t.name} ${t.short} ${t.keywords.join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [term]);

  const popular = POPULAR.map((s) => getTool(s)).filter((t): t is Tool => !!t);
  const dot = (g: ToolGroup) => TOOLS.find((t) => t.group === g)?.color ?? "#c8f23a";
  const count = (g: ToolGroup) => TOOLS.filter((t) => t.group === g).length;

  // Press "/" anywhere to start searching.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Highlight the group that is on screen.
  useEffect(() => {
    if (term) return;
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting));
        const first = GROUPS.find((g) => seen.get(g));
        if (first) setActive(first);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    GROUPS.forEach((g) => {
      const el = document.getElementById(g);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [term]);

  return (
    <div>
      {/* Hero: the one loud moment on this page */}
      <section aria-label="Search tools" className="relative overflow-hidden rounded-[2rem] bg-pine px-5 py-8 text-pith sm:px-10 sm:py-12">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-zest/25 blur-3xl" />
        {/* a small stack of "prints" built from real tools */}
        <div aria-hidden className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="relative h-52 w-64">
            {TOOLS.filter((t) => ["image-compressor", "background-remover", "image-resizer", "image-to-pdf"].includes(t.slug))
              .slice(0, 4)
              .map((t, i) => (
                <span
                  key={t.slug}
                  className="absolute flex h-24 w-24 items-center justify-center rounded-2xl border-[3px] border-pine text-4xl shadow-[0_10px_0_-2px_rgba(0,0,0,0.25)]"
                  style={{ background: t.color, left: [0, 120, 30, 140][i], top: [0, 18, 100, 112][i], transform: `rotate(${[-8, 7, 5, -6][i]}deg)` }}
                >
                  {t.icon}
                </span>
              ))}
          </div>
        </div>

        <div className="relative max-w-2xl lg:max-w-[34rem]">
          {heading}
          <div className="mt-6">
            <label className="relative block">
              <span className="sr-only">Search tools</span>
              <svg aria-hidden className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-pine/60" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="9" cy="9" r="6" />
                <path d="m14 14 4 4" />
              </svg>
              <input
                ref={inputRef}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="What do you want to do? Try “50kb” or “passport”"
                className="w-full rounded-full border-[3px] border-zest bg-white py-4 pl-13 pr-14 text-base text-pine placeholder:text-pine/50 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp/70 sm:text-lg"
              />
              {q ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-pine/10 text-pine hover:bg-pine/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-pine"
                >
                  ✕
                </button>
              ) : (
                <kbd aria-hidden className="absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-pine/25 px-2 py-0.5 text-xs font-semibold text-pine/60 sm:block">
                  /
                </kbd>
              )}
            </label>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick goals">
              {GOALS.map(([label, query]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setQ(query)}
                  aria-pressed={term === query}
                  className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp/70 ${
                    term === query ? "border-zest bg-zest text-pine" : "border-pith/30 text-pith hover:border-zest hover:text-zest"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile group switcher */}
      {!term && (
        <nav aria-label="Tool groups" className="no-scrollbar sticky top-[57px] z-30 -mx-4 mt-4 flex gap-2 overflow-x-auto bg-pith/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
          {GROUPS.map((g) => (
            <a
              key={g}
              href={`#${g}`}
              aria-current={active === g ? "true" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold ${active === g ? "border-pine bg-pine text-pith" : "border-pine/20 bg-white"}`}
            >
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: dot(g) }} />
              {GROUP_LABEL[g].label}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Desktop rail */}
        <aside className="hidden lg:block">
          <nav aria-label="Tool groups" className="sticky top-24">
            <p className="px-3 text-sm font-bold text-pine/60">Browse by job</p>
            <ul className="mt-2 space-y-0.5">
              {GROUPS.map((g) => {
                const on = !term && active === g;
                return (
                  <li key={g}>
                    <a
                      href={`#${g}`}
                      onClick={() => setQ("")}
                      aria-current={on ? "true" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[15px] font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp/60 ${on ? "bg-pine text-pith" : "text-pine hover:bg-pine/8"}`}
                    >
                      <span aria-hidden className="h-3 w-3 rounded-full ring-1 ring-pine/20" style={{ background: dot(g) }} />
                      {GROUP_LABEL[g].label}
                      <span className={`ml-auto text-xs ${on ? "text-pith/70" : "text-pine/50"}`}>{count(g)}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 rounded-2xl bg-white p-3.5 text-sm leading-snug text-pine/75 ring-1 ring-pine/10">
              Every tool runs in your browser. Your photos are never uploaded.
            </p>
          </nav>
        </aside>

        <div className="min-w-0">
          {term ? (
            <div>
              <p role="status" className="text-sm font-semibold text-pine/80">
                {match.length ? `${match.length} tool${match.length > 1 ? "s" : ""} for “${q.trim()}”` : `Nothing matches “${q.trim()}”`}
              </p>
              {match.length ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {match.map((t) => (
                    <li key={t.slug}>
                      <ToolRow t={t} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-pine/30 bg-white p-6">
                  <p className="font-bold">Try a format, a size or a task.</p>
                  <p className="mt-1 text-sm text-pine/75">For example “webp”, “1080”, “passport”, “crop” or “pdf”.</p>
                  <button type="button" onClick={() => setQ("")} className="mt-4 rounded-full bg-pine px-4 py-2 text-sm font-semibold text-pith hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp/60">
                    Show all tools
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <section aria-labelledby="popular-h">
                <h2 id="popular-h" className="text-2xl sm:text-3xl">Most used</h2>
                <p className="mt-1 text-pine/70">Start here if you are not sure.</p>
                <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                  {popular.map((t) => (
                    <li key={t.slug}>
                      <PopularCard t={t} />
                    </li>
                  ))}
                </ul>
              </section>

              {GROUPS.map((g) => {
                const list = match.filter((t) => t.group === g);
                if (!list.length) return null;
                return (
                  <section key={g} id={g} aria-labelledby={`${g}-h`} className="scroll-mt-32 pt-14">
                    <div className="flex items-end justify-between gap-4 border-b-[3px] pb-3" style={{ borderColor: dot(g) }}>
                      <div>
                        <h2 id={`${g}-h`} className="text-2xl sm:text-3xl">{GROUP_LABEL[g].label}</h2>
                        <p className="mt-1 text-pine/70">{GROUP_LABEL[g].blurb}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold ring-1 ring-pine/15">{list.length}</span>
                    </div>
                    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                      {list.map((t) => (
                        <li key={t.slug}>
                          <ToolRow t={t} />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
