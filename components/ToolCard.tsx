import Link from "next/link";
import type { Tool } from "@/lib/tools";

export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/${tool.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-brand-500/50 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40"
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-zest text-2xl`} aria-hidden>
        {tool.icon}
      </div>
      <h3 className="text-base font-bold text-slate-900">{tool.name}</h3>
      <p className="mt-1 line-clamp-3 text-sm text-slate-500">{tool.description}</p>
      <span className="mt-4 text-sm font-semibold text-brand-600 transition group-hover:translate-x-1">Open tool →</span>
    </Link>
  );
}
