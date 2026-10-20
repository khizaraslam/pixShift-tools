"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatCoords, formatTaken, parseExif, type Exif } from "@/lib/exif";
import { baseName, formatBytes } from "@/lib/image";

interface Loaded {
  name: string;
  size: number;
  w: number;
  h: number;
  exif: Exif | null;
  thumb: string;
  clean: { url: string; size: number; name: string };
}

interface Row {
  label: string;
  value: string;
  hot?: boolean;
  href?: string;
}

const EXAMPLE: Exif = {
  make: "Example",
  model: "Phone 12",
  taken: "2026:10:14 09:41:00",
  exposure: "1/120 s",
  fnumber: "f/1.8",
  iso: 64,
  focal: "26 mm",
  lat: 31.5882,
  lon: 74.3105,
};

function buildRows(exif: Exif | null, w: number, h: number, size: number): Row[] {
  const rows: Row[] = [{ label: "File", value: `${w}×${h} px · ${formatBytes(size)}` }];
  if (!exif) return rows;
  const taken = formatTaken(exif.taken);
  if (taken) rows.push({ label: "Taken", value: taken });
  const camera = [exif.make, exif.model && exif.make && exif.model.startsWith(exif.make) ? exif.model.slice(exif.make.length).trim() : exif.model]
    .filter(Boolean)
    .join(" ");
  if (camera) rows.push({ label: "Camera", value: camera });
  if (exif.lens) rows.push({ label: "Lens", value: exif.lens });
  const settings = [exif.fnumber, exif.exposure, exif.iso ? `ISO ${exif.iso}` : "", exif.focal].filter(Boolean).join(" · ");
  if (settings) rows.push({ label: "Settings", value: settings });
  if (exif.software) rows.push({ label: "Software", value: exif.software });
  if (exif.lat !== undefined && exif.lon !== undefined) {
    rows.push({
      label: "Location",
      value: formatCoords(exif.lat, exif.lon) + (exif.alt !== undefined ? ` · ${Math.round(exif.alt)} m` : ""),
      hot: true,
      href: `https://www.openstreetmap.org/?mlat=${exif.lat}&mlon=${exif.lon}#map=16/${exif.lat}/${exif.lon}`,
    });
  }
  return rows;
}

export default function PhotoId() {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);
  const [data, setData] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  useEffect(
    () => () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    },
    [],
  );

  const load = useCallback(async (file: File) => {
    setBusy(true);
    setError("");
    try {
      const head = await file.slice(0, 262144).arrayBuffer();
      const exif = file.type === "image/jpeg" ? parseExif(head) : null;
      const bmp = await createImageBitmap(file);
      const w = bmp.width;
      const h = bmp.height;

      // Drawing to a canvas and saving again keeps only the pixels, so all metadata is dropped.
      const outType = file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
      const ext = outType === "image/png" ? "png" : outType === "image/webp" ? "webp" : "jpg";
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("canvas");
      if (outType === "image/jpeg") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(bmp, 0, 0);
      bmp.close?.();
      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, outType, 0.92));
      if (!blob) throw new Error("encode");

      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      const thumb = URL.createObjectURL(file);
      const cleanUrl = URL.createObjectURL(blob);
      urlsRef.current = [thumb, cleanUrl];
      setData({
        name: file.name,
        size: file.size,
        w,
        h,
        exif,
        thumb,
        clean: { url: cleanUrl, size: blob.size, name: `${baseName(file.name)}-clean.${ext}` },
      });
    } catch {
      setError("That file could not be read as an image. Try a JPG, PNG or WebP photo.");
    } finally {
      setBusy(false);
    }
  }, []);

  const onFiles = (list: FileList | File[]) => {
    const f = Array.from(list).find((x) => x.type.startsWith("image/"));
    if (f) void load(f);
    else setError("Choose a JPG, PNG, WebP, GIF, BMP or AVIF image.");
  };

  const example = !data;
  const exif = data ? data.exif : EXAMPLE;
  const rows = buildRows(exif, data?.w ?? 4032, data?.h ?? 3024, data?.size ?? 2_400_000);
  const hasLocation = !!exif && exif.lat !== undefined;
  const hasAny = !!exif;
  const verdict = hasLocation
    ? { text: "Shares your location", cls: "bg-pulp text-pine" }
    : hasAny
      ? { text: "Shares camera and time", cls: "bg-zest text-pine" }
      : { text: "Nothing personal found", cls: "bg-zest text-pine" };

  return (
    <section aria-labelledby="id-heading" className="pt-24">
      <h2 id="id-heading" className="max-w-3xl text-[clamp(1.9rem,5vw,3.75rem)] leading-[1.02]">
        Every photo carries an ID card. Read yours.
      </h2>
      <p className="mt-4 max-w-xl text-lg text-pine/80">
        Photos from phones often store the exact place and time they were taken, even though you cannot see it. Many sites
        remove this data, but not all of them. Drop a photo to see what it says.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div
          className={`rounded-[2rem] border-[3px] border-dashed border-pine p-6 sm:p-8 ${dragging ? "bg-zest" : "bg-zest/60"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            onFiles(e.dataTransfer.files);
          }}
        >
          <p className="squeeze text-3xl font-extrabold leading-tight sm:text-4xl" style={{ "--w": 85 } as React.CSSProperties}>
            Drop a photo here
          </p>
          <p className="mt-2 text-base text-pine/80">Best with a photo straight from a phone camera. JPG photos carry the most data.</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Choose a photo to read"
            onChange={(e) => {
              if (e.target.files) onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-6 rounded-full bg-pine px-6 py-3 text-base font-extrabold text-zest transition hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
          >
            {data ? "Read another photo" : "Choose a photo"}
          </button>
          <p className="mt-4 text-sm text-pine/75">
            The photo is read inside your browser. It is not uploaded, and nothing is stored.
          </p>
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-pine px-4 py-3 text-sm font-semibold text-pith">
              {error}
            </p>
          )}
        </div>

        <div aria-live="polite">
          <div className="overflow-hidden rounded-2xl border-[3px] border-pine bg-white shadow-[6px_6px_0_0_#0d2b24]">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-pine px-5 py-3">
              <div className="flex items-center gap-3">
                <span aria-hidden className="h-3 w-10 rounded-full bg-pith/30" />
                <span className="squeeze text-xl font-extrabold text-zest" style={{ "--w": 90 } as React.CSSProperties}>
                  Photo ID card
                </span>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-extrabold ${verdict.cls}`}>{verdict.text}</span>
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-[9rem_1fr]">
              <div>
                <div className="checker flex aspect-[3/4] items-center justify-center overflow-hidden border-[3px] border-pine">
                  {data ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={data.thumb} alt={`Your photo ${data.name}`} className="h-full w-full object-cover" />
                  ) : (
                    <span
                      aria-hidden
                      className="block h-full w-full"
                      style={{ background: "linear-gradient(180deg,#1b1340 0%,#e0526b 55%,#ffd37a 100%)" }}
                    />
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-semibold text-pine/75">{data ? data.name : "Example photo"}</p>
              </div>

              <div className="min-w-0">
              <dl>
                {rows.map((r) => (
                  <div
                    key={r.label}
                    className={`grid grid-cols-[5.5rem_1fr] gap-3 border-t border-pine/15 py-2.5 first:border-t-0 ${r.hot ? "-mx-2 rounded-lg bg-pulp/30 px-2" : ""}`}
                  >
                    <dt className="text-sm text-pine/70">{r.label}</dt>
                    <dd className="break-words text-base font-bold leading-snug">
                      {r.value}
                      {r.href && !example && (
                        <>
                          {" "}
                          <a
                            href={r.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="whitespace-nowrap text-sm font-bold underline underline-offset-4 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
                          >
                            See on a map
                          </a>
                        </>
                      )}
                    </dd>
                  </div>
                ))}
                {!hasAny && (
                  <div className="grid grid-cols-[5.5rem_1fr] gap-3 border-t border-pine/15 py-2.5">
                    <dt className="text-sm text-pine/70">Camera data</dt>
                    <dd className="text-base font-bold leading-snug">None found</dd>
                  </div>
                )}
              </dl>
              {!hasAny && data && (
                <p className="mt-2 rounded-lg bg-zest/40 p-3 text-sm leading-relaxed text-pine">
                  <strong>Good for privacy.</strong>{" "}
                  {/whatsapp|telegram|signal|messenger|fb_img|received_/i.test(data.name)
                    ? "The file name suggests this photo was shared through an app. Apps usually remove camera, time and location data when you send a photo. "
                    : "Screenshots, edited photos and photos sent through apps usually have this data removed. "}
                  To see the camera details, choose the original file from your phone&apos;s Camera folder. A location only appears if location tags were turned on in the camera settings.
                </p>
              )}
              </div>
            </div>

            <div className="border-t-[3px] border-pine bg-pith px-5 py-4">
              {example ? (
                <p className="text-sm font-semibold text-pine/80">
                  This is an example with made-up data. Choose a photo to read its own ID card.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href={data.clean.url}
                    download={data.clean.name}
                    className="rounded-full bg-pine px-6 py-3 text-base font-extrabold text-zest transition hover:bg-brand-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-pulp"
                  >
                    Download a clean copy
                  </a>
                  <p className="min-w-0 flex-1 text-sm text-pine/80">
                    {hasAny
                      ? "The clean copy has no camera, time or location data. "
                      : "Saved again with only the pixels. "}
                    {formatBytes(data.clean.size)}. Re-saving can change quality slightly.
                  </p>
                </div>
              )}
              {busy && <p className="mt-3 text-sm text-pine/70">Reading…</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
