// import Link from "next/link";
// import { getTool } from "@/lib/tools";
// import ToolVisual from "./ToolVisual";

// const BLURBS: Record<string, string> = {
//   "image-compressor": "Smaller JPG, PNG and WebP files",
//   "image-resizer": "Exact pixels or a percentage",
//   "jpg-compressor": "Fit photos under upload limits",
//   "png-compressor": "Fewer colours, transparency kept",
//   "webp-converter": "Lighter images for websites",
//   "jpg-to-png": "Lossless PNG from a JPG",
//   "png-to-jpg": "Shrink PNGs into JPGs",
//   "aspect-ratio-calculator": "Find a ratio or a missing side",
//   "instagram-image-resizer": "Post, story and profile sizes",
//   "linkedin-image-resizer": "Banner, post and profile sizes",
// };

// // Photo colour for each print, and its tilt on the line.
// const LOOK: Record<string, { bg: string; tilt: number }> = {
//   "image-compressor": { bg: "#c8f23a", tilt: -2.5 },
//   "jpg-compressor": { bg: "#ffd37a", tilt: 2 },
//   "png-compressor": { bg: "#9ad1ff", tilt: -1.5 },
//   "image-resizer": { bg: "#ff9db5", tilt: 3 },
//   "aspect-ratio-calculator": { bg: "#b9a2ff", tilt: -2 },
//   "webp-converter": { bg: "#8fe3c0", tilt: 2.5 },
//   "jpg-to-png": { bg: "#ffb36b", tilt: -3 },
//   "png-to-jpg": { bg: "#c8f23a", tilt: 1.5 },
//   "instagram-image-resizer": { bg: "#ff9db5", tilt: -2 },
//   "linkedin-image-resizer": { bg: "#9ad1ff", tilt: 2.5 },
// };

// // Two lines of five prints. Every tool is visible at once.
// const LINES = [
//   ["image-compressor", "jpg-compressor", "png-compressor", "image-resizer", "aspect-ratio-calculator"],
//   ["webp-converter", "jpg-to-png", "png-to-jpg", "instagram-image-resizer", "linkedin-image-resizer"],
// ];

// export default function ToolIndex() {
//   return (
//     <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-24 pt-20">
//       <h2 id="tools-heading" className="max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05]">
//         What do you need to do with your image?
//       </h2>
//       <p className="mt-3 max-w-xl text-base text-pine/80 sm:text-lg">
//         All 10 free tools are hanging here. Pick a print to open it.
//       </p>

//       <div className="mt-6 space-y-2 overflow-hidden px-1.5 pb-3">
//         {LINES.map((slugs, l) => (
//           <ul key={l} className="grid grid-cols-2 gap-x-6 gap-y-10 pt-2 sm:grid-cols-3 lg:grid-cols-5">
//             {slugs.map((slug) => {
//               const t = getTool(slug);
//               const look = LOOK[slug];
//               if (!t || !look) return null;
//               return (
//                 <li key={slug} className="relative pt-7">
//                   {/* the line the print hangs from */}
//                   <span aria-hidden className="absolute -inset-x-3 top-[9px] h-[3px] rounded-full bg-pine" />
//                   <Link
//                     href={`/${slug}`}
//                     className="print tool-row group relative block border-[3px] border-pine bg-white p-2.5 pb-3.5 shadow-[5px_5px_0_0_#0d2b24] focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
//                     style={{ "--r": `${look.tilt}deg` } as React.CSSProperties}
//                   >
//                     {/* clothes peg */}
//                     <span
//                       aria-hidden
//                       className="absolute -top-[22px] left-1/2 h-7 w-3.5 -translate-x-1/2 rounded-sm border-[3px] border-pine bg-pulp"
//                     />
//                     <span
//                       className="flex aspect-[4/3] items-center justify-center overflow-hidden border-[3px] border-pine p-3 text-pine"
//                       style={{ background: look.bg }}
//                       aria-hidden
//                     >
//                       <span className="block w-full origin-center scale-[1.2]">
//                         <ToolVisual slug={slug} />
//                       </span>
//                     </span>
//                     <span className="mt-3 block text-lg font-extrabold leading-tight text-pine">{t.name}</span>
//                     <span className="mt-1 block text-sm leading-snug text-pine/75">{BLURBS[slug]}</span>
//                   </Link>
//                 </li>
//               );
//             })}
//           </ul>
//         ))}
//       </div>
//     </section>
//   );
// }

import Link from "next/link";
import { getTool } from "@/lib/tools";
import ToolVisual from "./ToolVisual";

const BLURBS: Record<string, string> = {
  "image-compressor": "Smaller JPG, PNG and WebP files",
  "image-resizer": "Exact pixels or a percentage",
  "jpg-compressor": "Fit photos under upload limits",
  "png-compressor": "Fewer colours, transparency kept",
  "webp-converter": "Lighter images for websites",
  "jpg-to-png": "Lossless PNG from a JPG",
  "png-to-jpg": "Shrink PNGs into JPGs",
  "aspect-ratio-calculator": "Find a ratio or a missing side",
  "instagram-image-resizer": "Post, story and profile sizes",
  "linkedin-image-resizer": "Banner, post and profile sizes",
};

// Photo colour for each print, and its tilt on the line.
const LOOK: Record<string, { bg: string; tilt: number }> = {
  "image-compressor": { bg: "#c8f23a", tilt: -2.5 },
  "jpg-compressor": { bg: "#ffd37a", tilt: 2 },
  "png-compressor": { bg: "#9ad1ff", tilt: -1.5 },
  "image-resizer": { bg: "#ff9db5", tilt: 3 },
  "aspect-ratio-calculator": { bg: "#b9a2ff", tilt: -2 },
  "webp-converter": { bg: "#8fe3c0", tilt: 2.5 },
  "jpg-to-png": { bg: "#ffb36b", tilt: -3 },
  "png-to-jpg": { bg: "#c8f23a", tilt: 1.5 },
  "instagram-image-resizer": { bg: "#ff9db5", tilt: -2 },
  "linkedin-image-resizer": { bg: "#9ad1ff", tilt: 2.5 },
};

// Two lines of five prints. Every tool is visible at once.
const LINES = [
  ["image-compressor", "jpg-compressor", "png-compressor", "image-resizer", "aspect-ratio-calculator"],
  ["webp-converter", "jpg-to-png", "png-to-jpg", "instagram-image-resizer", "linkedin-image-resizer"],
];

export default function ToolIndex() {
  return (
    <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-24 pt-20">
      <h2 id="tools-heading" className="max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.05]">
        What do you need to do with your image?
      </h2>
      <p className="mt-3 max-w-xl text-base text-pine/80 sm:text-lg">
        All 10 free tools are hanging here. Pick a print to open it.
      </p>

      <div className="-mx-3 mt-6 space-y-2 overflow-hidden px-3 pb-4">
        {LINES.map((slugs, l) => (
          <ul key={l} className="grid grid-cols-2 gap-x-6 gap-y-10 pt-2 sm:grid-cols-3 lg:grid-cols-5">
            {slugs.map((slug) => {
              const t = getTool(slug);
              const look = LOOK[slug];
              if (!t || !look) return null;
              return (
                <li key={slug} className="relative pt-7">
                  {/* the line the print hangs from */}
                  <span aria-hidden className="absolute -inset-x-3 top-[9px] h-[3px] bg-pine" />
                  <Link
                    href={`/${slug}`}
                    className="print tool-row group relative flex h-full flex-col border-[3px] border-pine bg-white p-2.5 pb-3.5 shadow-[5px_5px_0_0_#0d2b24] focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
                    style={{ "--r": `${look.tilt}deg` } as React.CSSProperties}
                  >
                    {/* clothes peg */}
                    <span
                      aria-hidden
                      className="absolute -top-[22px] left-1/2 h-7 w-3.5 -translate-x-1/2 rounded-sm border-[3px] border-pine bg-pulp"
                    />
                    <span
                      className="flex aspect-[4/3] items-center justify-center overflow-hidden border-[3px] border-pine p-3 text-pine"
                      style={{ background: look.bg }}
                      aria-hidden
                    >
                      <span className="block w-full origin-center scale-[1.2]">
                        <ToolVisual slug={slug} />
                      </span>
                    </span>
                    <span className="mt-3 block text-lg font-extrabold leading-tight text-pine">{t.name}</span>
                    <span className="mt-1 block flex-1 text-sm leading-snug text-pine/75">{BLURBS[slug]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </section>
  );
}