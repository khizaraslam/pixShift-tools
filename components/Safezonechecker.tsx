"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { gcd } from "@/lib/image";
import { getTool } from "@/lib/tools";

/* ---------- Zone data ----------
   All zone values are fractions (0–1) of the placement's width/height.
   Guides are approximate: platforms change their layouts, so update here. */

type Rect = { x: number; y: number; w: number; h: number };
type Circle = { cx: number; cy: number; r: number }; // r is a fraction of the SHORTER side

type Covered =
  | ({ shape: "rect"; label: string } & Rect)
  | ({ shape: "circle"; label: string } & Circle);

type Placement = {
  id: string;
  name: string;
  w: number;
  h: number;
  /** Area that stays visible. Everything outside gets dimmed. */
  safe?: ({ shape: "rect"; label: string } & Rect) | ({ shape: "circle"; label: string } & Circle);
  /** Areas that platform UI covers. Keep text and faces out of these. */
  covered?: Covered[];
  note: string;
};

const PLATFORMS: { slug: "instagram-image-resizer" | "linkedin-image-resizer"; placements: Placement[] }[] = [
  {
    slug: "instagram-image-resizer",
    placements: [
      {
        id: "ig-square",
        name: "Square post",
        w: 1080,
        h: 1080,
        safe: { shape: "rect", label: "Profile grid shows this part", x: 0.125, y: 0, w: 0.75, h: 1 },
        note: "In the feed your post is shown in full. On the profile grid it is trimmed to a 3:4 crop.",
      },
      {
        id: "ig-portrait",
        name: "Portrait post",
        w: 1080,
        h: 1350,
        safe: { shape: "rect", label: "Profile grid shows this part", x: 0.03125, y: 0, w: 0.9375, h: 1 },
        note: "Full 4:5 in the feed. The grid trims the sides slightly, so keep key details off the edges.",
      },
      {
        id: "ig-story",
        name: "Story or Reel",
        w: 1080,
        h: 1920,
        covered: [
          { shape: "rect", label: "Profile name and progress bar", x: 0, y: 0, w: 1, h: 0.13 },
          { shape: "rect", label: "Reply bar and caption", x: 0, y: 0.823, w: 1, h: 0.177 },
        ],
        note: "Keep text and faces between the top 250 px and bottom 340 px.",
      },
      {
        id: "ig-profile",
        name: "Profile photo",
        w: 320,
        h: 320,
        safe: { shape: "circle", label: "Visible circle", cx: 0.5, cy: 0.5, r: 0.5 },
        note: "Instagram shows your photo as a circle. Keep the face in the middle.",
      },
    ],
  },
  {
    slug: "linkedin-image-resizer",
    placements: [
      {
        id: "li-cover",
        name: "Profile cover",
        w: 1584,
        h: 396,
        covered: [{ shape: "circle", label: "Your profile photo", cx: 0.14, cy: 0.95, r: 0.41 }],
        note: "Your profile photo sits over the bottom left. Put text and logos on the right side.",
      },
      {
        id: "li-profile",
        name: "Profile photo",
        w: 400,
        h: 400,
        safe: { shape: "circle", label: "Visible circle", cx: 0.5, cy: 0.5, r: 0.5 },
        note: "LinkedIn crops your photo into a circle. Center your face.",
      },
      {
        id: "li-post",
        name: "Shared image post",
        w: 1200,
        h: 627,
        note: "No fixed overlay. Mobile feeds can trim edges slightly, so keep text away from the borders.",
      },
    ],
  },
];

/* ---------- Helpers ---------- */

function ratioLabel(w: number, h: number) {
  const d = gcd(w, h);
  const a = w / d;
  const b = h / d;
  return a <= 32 && b <= 32 ? `${a}:${b}` : `${(w / h).toFixed(2)}:1`;
}

/** How much of the uploaded image is cut when it is fitted to the placement (cover). */
function cropInfo(imgW: number, imgH: number, w: number, h: number) {
  const img = imgW / imgH;
  const target = w / h;
  if (Math.abs(img - target) / target < 0.01) return { pct: 0, axis: "" };
  if (img > target) return { pct: Math.round((1 - target / img) * 100), axis: "left and right" };
  return { pct: Math.round((1 - img / target) * 100), axis: "top and bottom" };
}

/* ---------- Component ---------- */

export default function SafeZoneChecker() {
  const [pi, setPi] = useState(0);
  const [si, setSi] = useState(0);
  const [guides, setGuides] = useState(true);
  const [img, setImg] = useState<{ url: string; w: number; h: number; name: string } | null>(null);

  // Release the object URL when the image changes or the component unmounts.
  useEffect(() => {
    return () => {
      if (img) URL.revokeObjectURL(img.url);
    };
  }, [img]);

  const platform = PLATFORMS[pi];
  const tool = getTool(platform.slug)!;
  const p = platform.placements[Math.min(si, platform.placements.length - 1)];

  const scale = Math.min(240 / p.w, 240 / p.h);
  const fw = Math.max(40, Math.round(p.w * scale));
  const fh = Math.max(20, Math.round(p.h * scale));

  const crop = img ? cropInfo(img.w, img.h, p.w, p.h) : null;

  function onFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => setImg({ url, w: probe.naturalWidth, h: probe.naturalHeight, name: file.name });
    probe.onerror = () => URL.revokeObjectURL(url);
    probe.src = url;
  }

  // SVG overlay in placement pixel space so circles stay circles.
  const W = p.w;
  const H = p.h;
  const m = Math.min(W, H);

  let dimPath = "";
  if (p.safe) {
    const outer = `M0 0H${W}V${H}H0Z`;
    if (p.safe.shape === "rect") {
      const s = p.safe;
      dimPath = `${outer}M${s.x * W} ${s.y * H}h${s.w * W}v${s.h * H}h${-s.w * W}Z`;
    } else {
      const s = p.safe;
      const cx = s.cx * W;
      const cy = s.cy * H;
      const r = s.r * m;
      dimPath = `${outer}M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
    }
  }

  return (
    <section aria-labelledby="zone-heading" className="pt-24">
      <h2 id="zone-heading" className="max-w-3xl text-[clamp(1.9rem,5vw,3.75rem)] leading-[1.02]">
        Will your image get cropped?
      </h2>
      <p className="mt-4 max-w-xl text-lg text-pine/80">
        Choose where you are posting and drop in your image. You will see what the platform trims or covers before you
        publish. Your image stays in your browser.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* Controls */}
        <div>
          <div className="flex gap-2" role="group" aria-label="Platform">
            {PLATFORMS.map((pl, i) => (
              <button
                key={pl.slug}
                type="button"
                aria-pressed={pi === i}
                onClick={() => {
                  setPi(i);
                  setSi(0);
                }}
                className={`rounded-full border-[3px] border-pine px-5 py-2 text-base font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp ${
                  pi === i ? "bg-pine text-zest" : "hover:bg-zest"
                }`}
              >
                {getTool(pl.slug)?.platform}
              </button>
            ))}
          </div>

          <ul className="mt-5 border-t-[3px] border-pine">
            {platform.placements.map((pl, i) => (
              <li key={pl.id} className="border-b-[3px] border-pine">
                <button
                  type="button"
                  aria-pressed={si === i}
                  onClick={() => setSi(i)}
                  className={`flex w-full items-baseline justify-between gap-4 px-3 py-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-pulp ${
                    si === i ? "bg-pine text-zest" : "hover:bg-zest"
                  }`}
                >
                  <span className="font-bold">{pl.name}</span>
                  <span className="tabular-nums text-sm">
                    {pl.w} × {pl.h}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-full border-[3px] border-pine px-5 py-2 text-base font-bold transition focus-within:ring-4 focus-within:ring-pulp hover:bg-zest">
              {img ? "Change image" : "Upload image"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  onFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {img && (
              <button
                type="button"
                onClick={() => setImg(null)}
                className="rounded-full px-3 py-2 text-sm font-bold underline underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
              >
                Remove
              </button>
            )}
            <label className="ml-auto flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={guides}
                onChange={(e) => setGuides(e.target.checked)}
                className="h-4 w-4 accent-pine"
              />
              Show guides
            </label>
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center self-start rounded-[2rem] bg-zest p-5">
          <div
            className="relative overflow-hidden border-4 border-pine bg-pith transition-all duration-300"
            style={{ width: fw, height: fh }}
            role="img"
            aria-label={`${p.name} preview, ${p.w} by ${p.h} pixels${img ? `, showing ${img.name}` : ""}`}
          >
            {img && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}

            {guides && (
              <svg
                viewBox={`0 0 ${W} ${H}`}
                className="absolute inset-0 h-full w-full text-pulp"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <pattern id="zone-hatch" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="40" height="40" fill="currentColor" fillOpacity="0.28" />
                    <line x1="0" y1="0" x2="0" y2="40" stroke="currentColor" strokeWidth="14" />
                  </pattern>
                </defs>

                {p.safe && <path d={dimPath} fillRule="evenodd" className="fill-pine" fillOpacity="0.6" />}

                {p.covered?.map((c) =>
                  c.shape === "rect" ? (
                    <rect
                      key={c.label}
                      x={c.x * W}
                      y={c.y * H}
                      width={c.w * W}
                      height={c.h * H}
                      fill="url(#zone-hatch)"
                    />
                  ) : (
                    <circle key={c.label} cx={c.cx * W} cy={c.cy * H} r={c.r * m} fill="url(#zone-hatch)" />
                  ),
                )}
              </svg>
            )}
          </div>

          <p className="mt-4 text-2xl font-extrabold tabular-nums">
            {p.w} × {p.h} px
            <span className="ml-3 text-sm font-semibold">Ratio {ratioLabel(p.w, p.h)}</span>
          </p>

          {guides && (p.safe || p.covered?.length) && (
            <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm font-semibold">
              {p.safe && (
                <li className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 border-2 border-pine bg-pith" aria-hidden />
                  {p.safe.label} (rest is dimmed)
                </li>
              )}
              {p.covered?.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 border-2 border-pine bg-pulp" aria-hidden />
                  {c.label}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 max-w-sm text-center text-sm text-pine/80">{p.note}</p>

          {img && crop && (
            <p
              role="status"
              className={`mt-3 max-w-sm rounded-2xl px-4 py-2 text-center text-sm font-bold ${
                crop.pct > 0 ? "bg-pine text-zest" : "bg-pith"
              }`}
            >
              {crop.pct > 0
                ? `Your ${img.w} × ${img.h} image loses about ${crop.pct}% from the ${crop.axis} at this size.`
                : "Your image already matches this ratio. Nothing is cut."}
            </p>
          )}

          <Link
            href={`/${tool.slug}`}
            className="mt-4 rounded-full bg-pine px-6 py-2.5 text-sm font-bold text-zest transition hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
          >
            Resize for {tool.platform}
          </Link>
          <p className="mt-2 text-xs text-pine/70">Guides are approximate. Platforms change their layouts.</p>
        </div>
      </div>
    </section>
  );
}