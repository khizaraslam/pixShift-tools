import Link from "next/link";
import { GROUP_LABEL, TOOLS, type ToolGroup } from "@/lib/tools";
import Logo from "./Logo";

const NAV: ToolGroup[] = ["compress", "convert", "resize", "social", "edit"];
const ALL = Object.keys(GROUP_LABEL) as ToolGroup[];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((g) => (
            <Link
              key={g}
              href={`/tools#${g}`}
              className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700"
            >
              {GROUP_LABEL[g].label}
            </Link>
          ))}
          <Link href="/tools" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600">
            All tools
          </Link>
        </nav>

        {/* Mobile menu with no JS: native details element */}
        <details className="group relative lg:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-300 text-slate-700 [&::-webkit-details-marker]:hidden" aria-label="Open menu">
            <span aria-hidden className="text-xl group-open:hidden">☰</span>
            <span aria-hidden className="hidden text-xl group-open:block">✕</span>
          </summary>
          <nav aria-label="Mobile" className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            <Link href="/tools" className="mb-1 block rounded-xl bg-slate-900 px-3 py-2.5 text-center text-sm font-semibold text-white">
              All tools
            </Link>
            {ALL.map((g) => (
              <Link key={g} href={`/tools#${g}`} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50">
                {GROUP_LABEL[g].label}
                <span className="text-xs text-slate-400">{TOOLS.filter((t) => t.group === g).length}</span>
              </Link>
            ))}
          </nav>
        </details>
      </div>
    </header>
  );
}
