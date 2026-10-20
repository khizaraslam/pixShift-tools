"use client";

import { useState } from "react";
import type { Tool } from "@/lib/tools";
import { buildPdf, placeOnPage, type PdfPage } from "@/lib/pdf";
import { canvasToBlob, formatBytes } from "@/lib/image";
import { downloadBlob, flatten } from "@/lib/files";
import { makeCanvas } from "@/lib/ops";
import Drop from "./Drop";
import ImageList from "./ImageList";
import { useImages } from "./useImages";
import { Btn, Panel, Seg, Slider } from "./ui";

const MAX_EDGE = 3200;

export default function PdfTool({ tool }: { tool: Tool }) {
  const { items, add, remove, move, clear, error, setError } = useImages();
  const [size, setSize] = useState<"a4" | "letter" | "fit">("a4");
  const [orient, setOrient] = useState<"auto" | "portrait" | "landscape">("auto");
  const [margin, setMargin] = useState(18);
  const [quality, setQuality] = useState(85);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const make = async () => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const pages: PdfPage[] = [];
      for (const it of items) {
        await new Promise((r) => setTimeout(r, 0));
        const s = Math.min(1, MAX_EDGE / Math.max(it.bitmap.width, it.bitmap.height));
        const c = makeCanvas(it.bitmap.width * s, it.bitmap.height * s);
        const x = c.getContext("2d")!;
        x.imageSmoothingQuality = "high";
        x.drawImage(it.bitmap, 0, 0, c.width, c.height);
        const blob = await canvasToBlob(flatten(c), "image/jpeg", quality / 100);
        const jpeg = new Uint8Array(await blob.arrayBuffer());
        pages.push({ jpeg, w: c.width, h: c.height, ...placeOnPage(c.width, c.height, size, orient, margin) });
      }
      const pdf = buildPdf(pages);
      const blob = new Blob([pdf.buffer as ArrayBuffer], { type: "application/pdf" });
      downloadBlob(blob, "pixshift-images.pdf");
      setMessage(`${pages.length} page${pages.length > 1 ? "s" : ""} · ${formatBytes(blob.size)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Drop accept={tool.accept} acceptLabel={tool.acceptLabel} icon={tool.icon} name={tool.name} count={items.length} onFiles={add} />
      {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {items.length > 0 && (
        <>
          <ImageList items={items} onMove={move} onRemove={remove} label="Pages, in order" />
          <Panel>
            <Seg label="Page size" value={size} options={[{ value: "a4", label: "A4" }, { value: "letter", label: "US Letter" }, { value: "fit", label: "Fit each image" }]} onChange={setSize} />
            {size !== "fit" && (
              <Seg label="Orientation" value={orient} options={[{ value: "auto", label: "Auto" }, { value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} onChange={setOrient} />
            )}
            <Seg label="Margin" value={margin} options={[{ value: 0, label: "None" }, { value: 18, label: "Small" }, { value: 36, label: "Large" }]} onChange={setMargin} />
            <Slider label="Picture quality" value={quality} min={40} max={100} display={`${quality}%`} onChange={setQuality} hint="Lower quality makes a smaller PDF." />
          </Panel>
          <div className="flex flex-wrap items-center gap-3">
            <Btn onClick={make} disabled={busy}>{busy ? "Building PDF…" : `Download PDF (${items.length} page${items.length > 1 ? "s" : ""})`}</Btn>
            <Btn kind="line" onClick={clear}>Clear</Btn>
            {message && <p role="status" className="text-sm text-slate-500">{message}</p>}
          </div>
        </>
      )}
    </div>
  );
}
