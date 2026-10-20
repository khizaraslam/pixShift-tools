"use client";

import { useMemo, useState } from "react";
import type { Tool } from "@/lib/tools";
import { formatBytes } from "@/lib/image";
import { copyText, downloadBlob } from "@/lib/files";
import Drop from "./Drop";
import { Btn, fieldCls } from "./ui";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read this file."));
    r.readAsDataURL(file);
  });
}

/** Works out the picture type from the first characters of its Base64 text. */
function sniff(b64: string): string {
  if (b64.startsWith("iVBOR")) return "image/png";
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("R0lGOD")) return "image/gif";
  if (b64.startsWith("UklGR")) return "image/webp";
  if (b64.startsWith("PHN2Zy") || b64.startsWith("PD94bW") || b64.startsWith("PCFET")) return "image/svg+xml";
  if (b64.startsWith("Qk")) return "image/bmp";
  return "image/png";
}

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp", "image/svg+xml": "svg", "image/bmp": "bmp", "image/avif": "avif" };

export default function Base64Tool({ tool }: { tool: Tool }) {
  const toMode = tool.mode === "to";
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState("");
  const [text, setText] = useState("");
  const [size, setSize] = useState(0);
  const [bad, setBad] = useState(false);

  const load = async (files: File[]) => {
    setError("");
    try {
      setDataUrl(await readAsDataUrl(files[0]));
      setName(files[0].name);
      setSize(files[0].size);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  };

  const copy = async (label: string, value: string) => {
    if (await copyText(value)) {
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? "" : c)), 1400);
    }
  };

  // Base64 to image: accept a data URI or bare Base64.
  const decoded = useMemo(() => {
    const t = text.trim().replace(/^["']|["']$/g, "");
    if (!t) return null;
    const m = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/.exec(t);
    const mime = m?.[1] || "";
    const raw = (m ? m[3] : t).replace(/\s+/g, "");
    if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(raw) || raw.length < 8) return { error: true as const };
    const type = mime || sniff(raw);
    return { error: false as const, type, raw, url: `data:${type};base64,${raw.replace(/-/g, "+").replace(/_/g, "/")}` };
  }, [text]);

  const saveDecoded = () => {
    if (!decoded || decoded.error) return;
    try {
      const bin = atob(decoded.raw.replace(/-/g, "+").replace(/_/g, "/"));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      downloadBlob(new Blob([bytes], { type: decoded.type }), `pixshift-image.${EXT[decoded.type] ?? "png"}`);
    } catch {
      setError("That text is not valid Base64.");
    }
  };

  if (toMode) {
    const raw = dataUrl.split(",")[1] ?? "";
    const snippets: [string, string][] = dataUrl
      ? [
          ["Data URI", dataUrl],
          ["Base64 only", raw],
          ["HTML", `<img src="${dataUrl}" alt="">`],
          ["CSS", `background-image: url("${dataUrl}");`],
        ]
      : [];
    return (
      <div className="space-y-6">
        <Drop accept={tool.accept} acceptLabel={tool.acceptLabel} icon={tool.icon} name={tool.name} multiple={false} count={dataUrl ? 1 : 0} onFiles={load} />
        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {dataUrl && (
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="Preview" className="checker h-20 w-20 rounded-xl object-contain" />
              <p className="min-w-0 text-sm text-slate-600">
                <strong className="block truncate text-slate-900">{name}</strong>
                {formatBytes(size)} → text of {formatBytes(dataUrl.length)}
                {dataUrl.length > 200_000 && <span className="block text-xs text-amber-700">Large Base64 slows pages down. Use it for small images.</span>}
              </p>
            </div>
            <textarea readOnly value={dataUrl} rows={5} aria-label="Base64 data URI" onFocus={(e) => e.currentTarget.select()} className={`${fieldCls} font-mono text-xs`} />
            <div className="flex flex-wrap gap-2">
              {snippets.map(([l, v]) => (
                <Btn key={l} kind={l === "Data URI" ? "dark" : "line"} onClick={() => copy(l, v)}>{copied === l ? "Copied ✓" : `Copy ${l}`}</Btn>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-medium text-slate-700">
          Paste Base64 text or a data URI
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setBad(false);
              setError("");
            }}
            rows={7}
            placeholder="data:image/png;base64,iVBORw0KGgo…"
            className={`${fieldCls} font-mono text-xs`}
          />
        </label>
        {decoded?.error && <p role="alert" className="mt-3 text-sm text-rose-700">That does not look like Base64 text.</p>}
        {bad && <p role="alert" className="mt-3 text-sm text-rose-700">The text decoded, but it is not a picture your browser can show.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
        {decoded && !decoded.error && (
          <div className="mt-4 space-y-3">
            <div className="checker flex justify-center rounded-2xl p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={decoded.url} alt="Decoded preview" onError={() => setBad(true)} onLoad={() => setBad(false)} className="max-h-72 max-w-full object-contain" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Btn onClick={saveDecoded} disabled={bad}>Download .{EXT[decoded.type] ?? "png"}</Btn>
              <span className="text-xs text-slate-500">{decoded.type}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
