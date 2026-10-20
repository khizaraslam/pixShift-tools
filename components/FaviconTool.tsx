"use client";

import { useEffect, useRef, useState } from "react";
import type { Tool } from "@/lib/tools";
import { canvasToBlob } from "@/lib/image";
import { buildIco } from "@/lib/ico";
import { copyText, zipBlobs } from "@/lib/files";
import { makeCanvas } from "@/lib/ops";
import Drop from "./Drop";
import { useImages } from "./useImages";
import { Btn, ColorField, Panel, Seg, Slider } from "./ui";

const SIZES = [16, 32, 48, 180, 192, 512];
type Shape = "square" | "rounded" | "circle";

const SNIPPET = `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;

const MANIFEST = JSON.stringify(
  { name: "", short_name: "", icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }, { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }], display: "standalone" },
  null,
  2,
);

function draw(bitmap: ImageBitmap, size: number, shape: Shape, padPct: number, bg: string, clear: boolean) {
  const c = makeCanvas(size, size);
  const x = c.getContext("2d")!;
  const r = shape === "circle" ? size / 2 : shape === "rounded" ? size * 0.22 : 0;
  x.beginPath();
  x.roundRect(0, 0, size, size, r);
  x.clip();
  if (!clear) {
    x.fillStyle = bg;
    x.fillRect(0, 0, size, size);
  }
  const pad = (padPct / 100) * size;
  const box = size - pad * 2;
  // Fit the logo inside the box, keeping its shape.
  const s = Math.min(box / bitmap.width, box / bitmap.height);
  const w = bitmap.width * s;
  const h = bitmap.height * s;
  x.imageSmoothingQuality = "high";
  x.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return c;
}

export default function FaviconTool({ tool }: { tool: Tool }) {
  const { items, add, error, setError } = useImages(false);
  const [shape, setShape] = useState<Shape>("rounded");
  const [pad, setPad] = useState(8);
  const [bg, setBg] = useState("#ffffff");
  const [clear, setClear] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const prevs = useRef<(HTMLCanvasElement | null)[]>([]);
  const it = items[0];

  useEffect(() => {
    if (!it) return;
    SIZES.forEach((s, i) => {
      const cv = prevs.current[i];
      if (!cv) return;
      const d = draw(it.bitmap, s, shape, pad, bg, clear);
      cv.width = s;
      cv.height = s;
      cv.getContext("2d")!.drawImage(d, 0, 0);
    });
  }, [it, shape, pad, bg, clear]);

  const save = async () => {
    if (!it) return;
    setBusy(true);
    setError("");
    try {
      const png: Record<number, Blob> = {};
      for (const s of SIZES) png[s] = await canvasToBlob(draw(it.bitmap, s, shape, pad, bg, clear), "image/png");
      const bytes = async (s: number) => new Uint8Array(await png[s].arrayBuffer());
      const ico = buildIco([{ size: 16, png: await bytes(16) }, { size: 32, png: await bytes(32) }, { size: 48, png: await bytes(48) }]);
      await zipBlobs(
        [
          { name: "favicon.ico", blob: new Blob([ico.buffer as ArrayBuffer], { type: "image/x-icon" }) },
          { name: "favicon-16x16.png", blob: png[16] },
          { name: "favicon-32x32.png", blob: png[32] },
          { name: "apple-touch-icon.png", blob: png[180] },
          { name: "android-chrome-192x192.png", blob: png[192] },
          { name: "android-chrome-512x512.png", blob: png[512] },
          { name: "site.webmanifest", blob: new Blob([MANIFEST], { type: "application/manifest+json" }) },
          { name: "paste-in-head.html", blob: new Blob([SNIPPET], { type: "text/html" }) },
        ],
        "favicons.zip",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Drop accept={tool.accept} acceptLabel={tool.acceptLabel} icon={tool.icon} name={tool.name} multiple={false} count={items.length} onFiles={add} />
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {it && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Your icons</p>
            <ul className="mt-4 flex flex-wrap items-end gap-5">
              {SIZES.map((s, i) => (
                <li key={s} className="text-center">
                  <div className="checker inline-block rounded-lg p-1">
                    <canvas ref={(el) => { prevs.current[i] = el; }} aria-label={`${s} pixel icon`} style={{ width: Math.min(s, 128), height: Math.min(s, 128) }} className="block" />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{s}px</p>
                </li>
              ))}
            </ul>
            {Math.min(it.bitmap.width, it.bitmap.height) < 512 && (
              <p className="mt-4 text-xs text-slate-500">Your logo is {it.bitmap.width}×{it.bitmap.height}. The larger icons may look soft; a square logo of 512 px or more is best.</p>
            )}
          </div>
          <div className="space-y-5">
            <Panel className="sm:grid-cols-1">
              <Seg label="Shape" value={shape} options={[{ value: "square", label: "Square" }, { value: "rounded", label: "Rounded" }, { value: "circle", label: "Circle" }]} onChange={setShape} />
              <Slider label="Padding" value={pad} min={0} max={30} display={`${pad}%`} onChange={setPad} />
              <Btn kind={clear ? "zest" : "line"} onClick={() => setClear(!clear)}>{clear ? "✓ Transparent background" : "Transparent background"}</Btn>
              {!clear && <ColorField label="Background colour" value={bg} onChange={setBg} />}
            </Panel>
            <Btn onClick={save} disabled={busy}>{busy ? "Working…" : "Download ZIP"}</Btn>
            <div>
              <p className="text-sm font-semibold text-slate-900">Paste this in your page&apos;s &lt;head&gt;</p>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-pine p-3 text-xs leading-relaxed text-zest">{SNIPPET}</pre>
              <Btn kind="line" className="mt-2" onClick={async () => { if (await copyText(SNIPPET)) { setCopied(true); setTimeout(() => setCopied(false), 1400); } }}>
                {copied ? "Copied ✓" : "Copy tags"}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
