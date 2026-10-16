import Link from "next/link";
import { TOOLS } from "@/lib/tools";
import { SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-extrabold">{SITE.name}</p>
          <p className="mt-2 max-w-xs text-sm text-slate-500">{SITE.tagline}. No uploads, no signup, no watermarks.</p>
        </div>
        <nav aria-label="Tools" className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:col-span-1">
          {TOOLS.map((t) => (
            <Link key={t.slug} href={`/${t.slug}`} className="text-slate-600 hover:text-brand-700">
              {t.name}
            </Link>
          ))}
        </nav>
        <nav aria-label="Company" className="space-y-2 text-sm">
          <Link href="/about" className="block text-slate-600 hover:text-brand-700">About</Link>
          <Link href="/privacy" className="block text-slate-600 hover:text-brand-700">Privacy</Link>
          <a href="/sitemap.xml" className="block text-slate-600 hover:text-brand-700">Sitemap</a>
          <a href="/llms.txt" className="block text-slate-600 hover:text-brand-700">llms.txt</a>
        </nav>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} {SITE.name}. All image processing happens on your device.
      </div>
    </footer>
  );
}
