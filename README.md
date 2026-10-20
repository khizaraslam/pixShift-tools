# PixShift

Free, private, browser-based image tools built with **Next.js (App Router)**, **TypeScript** and **Tailwind CSS v4**.

## Tools (90)

| Group | Tools |
| --- | --- |
| Compress | Image, JPG, PNG, WebP, AVIF compressors; compress to 20 KB, 50 KB, 100 KB, 200 KB |
| Convert | JPG/PNG/WebP/AVIF conversions (JPG→PNG, PNG→JPG, JPG→WebP, PNG→WebP, WebP→JPG, WebP→PNG, AVIF→JPG, AVIF→PNG, JPG→AVIF, PNG→AVIF, BMP→JPG, GIF→PNG), WebP converter, SVG→PNG |
| Resize | Image resizer, 500×500, 1080×1080, 1920×1080, passport size photo maker, Etsy, Amazon product images |
| Social | Instagram post / story / profile, Facebook post / cover, YouTube thumbnail / banner, LinkedIn post / banner, X (Twitter), Pinterest, WhatsApp DP, TikTok, Twitch, Discord |
| Edit | Crop, circle crop, rotate/flip, watermark, remove EXIF, enhancer, sharpener, black & white, upscaler, blur background, remove object, blur/pixelate part, background remover, background changer, transparent background, add border, photo filters, sepia, vintage, invert colours, blur image, photo to sketch, pixelate, vignette, add text to image, make image square, flip, mirror, brightness adjuster |
| Colours | Colour picker from image, extract palette |
| Calculators | Aspect ratio, DPI, pixels to inches, inches to pixels, image file size |
| More | Image to PDF, combine images, **image collage maker**, story collage maker, **meme generator**, image splitter, favicon generator, image to Base64, Base64 to image |

Everything runs in the browser: Canvas API, `upng-js` (PNG quantisation), `fflate` (ZIP). Nothing is uploaded.

**Honest limits** (also written on the tool pages): the background remover/changer is colour based (plain backgrounds), the upscaler enlarges by smooth scaling plus sharpening, object removal fills from surrounding pixels, and AVIF can only be created in Chromium browsers. None of these use AI.

## How the code is organised

- `lib/tools.ts` types, the first eight tools, groups, helpers. `lib/catalog.ts` compact specs for every other tool; `build()` turns each into a full page (title, headings, steps, FAQ, schema).
- `components/ToolRunner.tsx` picks the screen by `tool.engine`: `ImageTool` (compress / resize / convert / presets / target size), `Editor` (all pixel edits, maths in `lib/ops.ts`), `CropTool`, `ColorTool` (`lib/colors.ts`), `Calculators`, `Base64Tool`, `PdfTool` (`lib/pdf.ts`), `CombineTool`, `SplitTool`, `FaviconTool` (`lib/ico.ts`), `CollageTool` (layouts, shapes, spacing), `MemeTool` (top and bottom caption). Engines load lazily with `next/dynamic`.
- `/tools` is the searchable hub, `/llms.txt` is generated, the sitemap and share images follow the tool list automatically.
- Old URLs `/instagram-image-resizer` and `/linkedin-image-resizer` redirect (301) to the new post pages in `next.config.mjs`.

## Run

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_SITE_URL to your domain
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```

## Before you launch

1. Set `NEXT_PUBLIC_SITE_URL` to your real domain (used by sitemap, canonical URLs, schema, robots).
2. `/llms.txt` is generated; nothing to edit.
3. Edit brand name, email and social handle in `lib/site.ts`.
4. Add `sameAs` social profile URLs in `app/layout.tsx` and search-console verification codes in `metadata.verification`.
5. Follow `OFFPAGE-SEO.md` for off-page SEO, AEO, GEO and LLMO.

## SEO features included

- Per-page title, description, keywords, canonical URL, Open Graph and Twitter tags
- JSON-LD: Organization, WebSite, WebPage, ItemList, WebApplication, BreadcrumbList, FAQPage, HowTo
- `sitemap.xml`, `robots.txt` (AI crawlers allowed), `llms.txt`, web manifest, icon
- "Quick answer" block and FAQs on every tool page (answer-engine friendly)
- Server-rendered semantic HTML, skip link, accessible controls, mobile-first responsive layout

## Design notes

- Palette lives in `app/globals.css` (`pith`, `pine`, `zest`, `pulp`). The old `brand-*` scale is mapped to greens so every page follows it.
- Fonts: Anybody (variable width axis, used for headlines that squeeze and widen) and Schibsted Grotesk (body), loaded in `app/layout.tsx`.
- Homepage: `components/home/HeroLab.tsx` (live JPEG compression demo; a dropped photo is handed to the chosen tool page through `lib/pending.ts`, in memory only), `ToolIndex.tsx` + `ToolVisual.tsx` (tools hanging as photo prints), `PhotoId.tsx` (reads a photo's hidden camera, time and GPS data with the small parser in `lib/exif.ts`, and saves a clean copy without it), `SizeFinder.tsx`. Demo pictures are drawn in code in `lib/scene.ts`.
- If `next build` complains about a font name or axis, check the names in `app/layout.tsx` against the next/font Google font list.

## Social share images

`app/opengraph-image.tsx` (homepage) and `app/[slug]/opengraph-image.tsx` (every tool) draw a 1200×630 preview with `lib/og.tsx`, using the bundled Inter ExtraBold font in `assets/fonts/` (OFL license, see `FONT-LICENSE.txt`). Next.js adds the `og:image` tags automatically. After deploying, check a link in a share debugger or by pasting it into WhatsApp or LinkedIn; those apps cache previews, so a re-scrape may be needed after changes.

## Add a new tool

Add one object to `SPECS` in `lib/catalog.ts` (slug, name, group, engine, short line, quick answer, meta description, FAQ, keywords). To open a page in a different starting state (for example Flip Image or Sepia Filter), set `mode` on the spec and add it to `MODE_INIT` in `components/Editor.tsx`. For a new pixel edit, add an op in `lib/ops.ts`, its defaults and controls in `components/Editor.tsx`, and `OpId` in `lib/tools.ts`. The page, hub card, sitemap, `llms.txt`, schema and share image are generated automatically.
