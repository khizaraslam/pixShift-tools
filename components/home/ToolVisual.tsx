// Tiny diagrams for the tool index. They only move while the row is hovered or focused.

function Convert({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      <span className="rounded-lg border-[3px] border-pine bg-white px-2 py-1 text-sm font-extrabold">{from}</span>
      <span className="a a-slide h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-pine" />
      <span className="a a-pop rounded-lg border-[3px] border-pine bg-zest px-2 py-1 text-sm font-extrabold">{to}</span>
    </div>
  );
}

export default function ToolVisual({ slug }: { slug: string }) {
  switch (slug) {
    case "image-compressor":
      return (
        <div className="flex w-full flex-col justify-center gap-2" aria-hidden>
          {[100, 78, 56].map((w, i) => (
            <div key={w} className="h-3 rounded-full bg-pine/15">
              <div
                className="a a-shrink h-3 origin-left rounded-full bg-pine"
                style={{ width: `${w}%`, animationDelay: `${i * 0.2}s` }}
              />
            </div>
          ))}
        </div>
      );
    case "image-resizer":
      return (
        <div className="flex h-full items-center justify-center" aria-hidden>
          <div className="a a-resize relative h-12 w-20 rounded-md border-[3px] border-pine bg-zest">
            {["-left-2 -top-2", "-right-2 -top-2", "-left-2 -bottom-2", "-right-2 -bottom-2"].map((c) => (
              <span key={c} className={`absolute h-3 w-3 border-2 border-pine bg-white ${c}`} />
            ))}
          </div>
        </div>
      );
    case "jpg-compressor":
      return (
        <div className="flex h-full items-center justify-center" aria-hidden>
          <div className="relative h-14 w-14 rounded-full border-[3px] border-pine bg-white">
            <span className="a a-needle absolute left-1/2 top-1/2 h-6 w-[3px] origin-bottom -translate-x-1/2 -translate-y-full rounded bg-pine" />
            <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pine" />
          </div>
        </div>
      );
    case "png-compressor":
      return (
        <div className="checker grid h-full grid-cols-4 grid-rows-2 gap-1 rounded-lg border-[3px] border-pine p-1" aria-hidden>
          {["#c8f23a", "#ff6a8b", "#3f7d5c", "#ffd37a", "#9ad1ff", "#e0526b", "#b9a2ff", "#0d2b24"].map((c, i) => (
            <span
              key={c}
              className={`rounded-sm ${i >= 4 ? "a a-fade" : ""}`}
              style={{ background: c, animationDelay: `${(i - 4) * 0.15}s` }}
            />
          ))}
        </div>
      );
    case "webp-converter":
      return <Convert from="PNG" to="WEBP" />;
    case "jpg-to-png":
      return <Convert from="JPG" to="PNG" />;
    case "png-to-jpg":
      return <Convert from="PNG" to="JPG" />;
    case "aspect-ratio-calculator":
      return (
        <div className="flex h-full items-end justify-center gap-2 pb-1" aria-hidden>
          {[
            { c: "h-9 w-16", d: "0s" },
            { c: "h-9 w-9", d: "0.25s" },
            { c: "h-12 w-7", d: "0.5s" },
          ].map((f) => (
            <span
              key={f.c}
              className={`a a-pop rounded-md border-[3px] border-pine bg-zest ${f.c}`}
              style={{ animationDelay: f.d }}
            />
          ))}
        </div>
      );
    case "instagram-image-resizer":
      return (
        <div className="flex h-full items-center justify-center" aria-hidden>
          <div className="a a-float h-16 w-10 rounded-xl border-[3px] border-pine bg-white p-[3px]">
            <div className="h-full w-full rounded-md bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400" />
          </div>
        </div>
      );
    case "linkedin-image-resizer":
      return (
        <div className="flex h-full items-center justify-center" aria-hidden>
          <div className="a a-float w-28">
            <div className="h-8 rounded-md border-[3px] border-pine bg-gradient-to-r from-sky-600 to-blue-800" />
            <div className="-mt-4 ml-3 h-8 w-8 rounded-full border-[3px] border-pine bg-zest" />
          </div>
        </div>
      );
    default:
      return null;
  }
}
