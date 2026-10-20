import Link from "next/link";
import { GROUP_LABEL, TOOLS, toolsInGroup, type ToolGroup } from "@/lib/tools";
import { SITE } from "@/lib/site";
import Logo from "./Logo";

const GROUPS = Object.keys(GROUP_LABEL) as ToolGroup[];

const linkCls = "text-pith/75 transition hover:text-zest focus:outline-none focus-visible:text-zest focus-visible:underline";

export default function Footer() {
  const dot = (g: ToolGroup) => TOOLS.find((t) => t.group === g)?.color ?? "#c8f23a";

  return (
    <footer className="mt-24 bg-pine text-pith">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-14 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          {/* Brand */}
          <div>
            <Logo size={34} tone="dark" />
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-pith/80">
              {SITE.tagline}. Everything runs on your device, so your photos stay yours.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2 text-sm font-semibold" aria-label="Highlights">
              {["No upload", "No signup", "No watermark"].map((t) => (
                <li key={t} className="flex items-center gap-1.5 rounded-full border border-pith/25 px-3 py-1">
                  <span aria-hidden className="text-zest">✓</span>
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/tools"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-zest px-5 py-3 text-sm font-extrabold text-pine transition hover:bg-white focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
            >
              Browse all tools <span aria-hidden>→</span>
            </Link>
          </div>

          {/* Links */}
          <div className="grid gap-10 sm:grid-cols-2">
            <nav aria-label="Browse by job">
              <p className="text-sm font-bold text-zest">Browse by job</p>
              <ul className="mt-3 space-y-2 text-sm">
                {GROUPS.map((g) => (
                  <li key={g}>
                    <Link href={`/tools#${g}`} className={`flex items-center gap-2 ${linkCls}`}>
                      <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot(g) }} />
                      {GROUP_LABEL[g].label}
                      <span className="text-xs text-pith/45">{toolsInGroup(g).length}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Company">
              <p className="text-sm font-bold text-zest">Company</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/about" className={linkCls}>About</Link></li>
                <li><Link href="/privacy" className={linkCls}>Privacy</Link></li>
                <li><a href="/sitemap.xml" className={linkCls}>Sitemap</a></li>
                <li><a href="/llms.txt" className={linkCls}>llms.txt</a></li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-1 border-t border-pith/15 pt-6 text-xs text-pith/60 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>All image processing happens on your device.</p>
        </div>
      </div>
    </footer>
  );
}