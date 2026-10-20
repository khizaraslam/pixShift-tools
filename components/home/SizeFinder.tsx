"use client";

import Link from "next/link";
import { useState } from "react";
import { gcd } from "@/lib/image";
import { getTool } from "@/lib/tools";

const PLATFORMS = [
  "instagram-post-resizer",
  "instagram-story-resizer",
  "facebook-post-resizer",
  "facebook-cover-resizer",
  "youtube-thumbnail-resizer",
  "linkedin-post-resizer",
  "linkedin-banner-resizer",
  "twitter-image-resizer",
  "pinterest-pin-resizer",
  "whatsapp-dp-resizer",
] as const;

function ratioLabel(w: number, h: number) {
  const d = gcd(w, h);
  const a = w / d;
  const b = h / d;
  return a <= 32 && b <= 32 ? `${a}:${b}` : `${(w / h).toFixed(2)}:1`;
}

export default function SizeFinder() {
  const [pi, setPi] = useState(0);
  const [si, setSi] = useState(0);
  const tool = getTool(PLATFORMS[pi])!;
  const presets = tool.presets ?? [];
  const preset = presets[Math.min(si, presets.length - 1)];
  const s = Math.min(300 / preset.w, 220 / preset.h);
  const fw = Math.max(24, Math.round(preset.w * s));
  const fh = Math.max(12, Math.round(preset.h * s));

  return (
    <section aria-labelledby="size-heading" className="pt-24">
      <h2 id="size-heading" className="max-w-3xl text-[clamp(1.9rem,5vw,3.75rem)] leading-[1.02]">
        Which size does your post need?
      </h2>
      <p className="mt-4 max-w-xl text-lg text-pine/80">
        Pick a platform and a placement to see its shape and exact pixel size. Sizes are current recommendations, and platforms can change them.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Platform">
            {PLATFORMS.map((slug, i) => (
              <button
                key={slug}
                type="button"
                aria-pressed={pi === i}
                onClick={() => {
                  setPi(i);
                  setSi(0);
                }}
                className={`rounded-full border-[3px] border-pine px-4 py-1.5 text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp ${
                  pi === i ? "bg-pine text-zest" : "hover:bg-zest"
                }`}
              >
                {getTool(slug)?.platform}
              </button>
            ))}
          </div>
          <ul className="mt-5 border-t-[3px] border-pine">
            {presets.map((p, i) => (
              <li key={p.id} className="border-b-[3px] border-pine">
                <button
                  type="button"
                  aria-pressed={si === i}
                  onClick={() => setSi(i)}
                  className={`flex w-full items-baseline justify-between gap-4 px-3 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-pulp ${
                    si === i ? "bg-pine text-zest" : "hover:bg-zest"
                  }`}
                >
                  <span className="font-bold">{p.label.split(" – ")[0]}</span>
                  <span className="tabular-nums text-sm">
                    {p.w} × {p.h}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex min-h-[22rem] flex-col items-center justify-center rounded-[2rem] bg-zest p-6">
          <div
            className="flex items-center justify-center border-4 border-pine bg-pith transition-all duration-300"
            style={{ width: fw, height: fh }}
            aria-hidden
          />
          <p className="squeeze mt-6 text-4xl font-extrabold tabular-nums" style={{ "--w": 90 } as React.CSSProperties}>
            {preset.w} × {preset.h} px
          </p>
          <p className="mt-1 text-sm font-semibold">Ratio {ratioLabel(preset.w, preset.h)}</p>
          <Link
            href={`/${tool.slug}`}
            className="mt-6 rounded-full bg-pine px-6 py-3 text-sm font-bold text-zest transition hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
          >
            Resize for {tool.platform}
          </Link>
        </div>
      </div>
    </section>
  );
}
