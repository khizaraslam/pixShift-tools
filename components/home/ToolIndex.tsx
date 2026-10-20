import Link from "next/link";
import { GROUP_LABEL, TOOLS, getTool, toolsInGroup, type ToolGroup } from "@/lib/tools";
import ToolVisual from "./ToolVisual";

// Tilt of each print on its line.
const TILT = [-2.5, 2, -1.5, 3, -2, 2.5, -3, 1.5, -2, 2.5];

// Two lines of five prints: the tools most people come for.
const LINES = [
  ["image-compressor", "compress-image-to-100kb", "image-resizer", "jpg-to-webp", "background-remover"],
  ["image-cropper", "instagram-post-resizer", "add-watermark-to-image", "color-picker-from-image", "image-to-pdf"],
];

const GROUPS = Object.keys(GROUP_LABEL) as ToolGroup[];

export default function ToolIndex() {
  let n = 0;
  return (
    <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-24 pt-20">
      <h2 id="tools-heading" className="max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05]">
        What do you need to do with your image?
      </h2>
      <p className="mt-3 max-w-xl text-base text-pine/80 sm:text-lg">
         free tools. These ten are the ones people reach for most. Pick a print to open it.
      </p>

      <div className="-mx-3 mt-6 space-y-2 overflow-hidden px-3 pb-4">
        {LINES.map((slugs, l) => (
          <ul key={l} className="grid grid-cols-2 gap-x-6 gap-y-10 pt-2 sm:grid-cols-3 lg:grid-cols-5">
            {slugs.map((slug) => {
              const t = getTool(slug);
              const tilt = TILT[n++ % TILT.length];
              if (!t) return null;
              return (
                <li key={slug} className="relative pt-7">
                  {/* the line the print hangs from */}
                  <span aria-hidden className="absolute -inset-x-3 top-[9px] h-[3px] bg-pine" />
                  <Link
                    href={`/${slug}`}
                    className="print tool-row group relative flex h-full flex-col border-[3px] border-pine bg-white p-2.5 pb-3.5 shadow-[5px_5px_0_0_#0d2b24] focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
                    style={{ "--r": `${tilt}deg` } as React.CSSProperties}
                  >
                    {/* clothes peg */}
                    <span aria-hidden className="absolute -top-[22px] left-1/2 h-7 w-3.5 -translate-x-1/2 rounded-sm border-[3px] border-pine bg-pulp" />
                    <span
                      className="flex aspect-[4/3] items-center justify-center overflow-hidden border-[3px] border-pine p-3 text-pine"
                      style={{ background: t.color }}
                      aria-hidden
                    >
                      <span className="block w-full origin-center scale-[1.2]">
                        <ToolVisual slug={slug} />
                      </span>
                    </span>
                    <span className="mt-3 block text-lg font-extrabold leading-tight text-pine">{t.name}</span>
                    <span className="mt-1 block flex-1 text-sm leading-snug text-pine/75">{t.short}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </div>

      {/* The rest of the catalogue, one door per group */}
      <h3 className="mt-14 text-2xl font-extrabold tracking-tight">Browse by job</h3>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GROUPS.map((g) => (
          <li key={g}>
            <Link
              href={`/tools#${g}`}
              className="group flex h-full flex-col rounded-2xl border border-pine/15 bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-pine hover:shadow-[0_10px_24px_-12px_rgba(13,43,36,0.45)] focus:outline-none focus-visible:border-pine focus-visible:ring-4 focus-visible:ring-pulp/60"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden className="h-3 w-3 shrink-0 rounded-full ring-1 ring-pine/20" style={{ background: TOOLS.find((t) => t.group === g)?.color }} />
                <span className="text-lg font-extrabold">{GROUP_LABEL[g].label}</span>
                <span className="ml-auto rounded-full bg-pine px-2 py-0.5 text-xs font-bold text-zest">{toolsInGroup(g).length}</span>
              </span>
              <span className="mt-2 text-sm leading-snug text-pine/70">{GROUP_LABEL[g].blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6">
        <Link href="/tools" className="inline-flex items-center rounded-full bg-pine px-6 py-3 text-sm font-bold text-zest transition hover:bg-brand-600">
          Browse all tools →
        </Link>
      </p>
    </section>
  );
}
