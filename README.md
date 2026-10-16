# PixShift

Free, private, browser-based image tools built with **Next.js (App Router)**, **TypeScript** and **Tailwind CSS v4**.

## Tools

Image Compressor, Image Resizer, JPG Compressor, PNG Compressor, WebP Converter, JPG to PNG, PNG to JPG, Aspect Ratio Calculator, Instagram Image Resizer, LinkedIn Image Resizer.

All processing uses the browser Canvas API (plus `upng-js` for real PNG compression and `fflate` for ZIP downloads). Nothing is uploaded.

## Run

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_SITE_URL to your domain
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```

## Before you launch

1. Set `NEXT_PUBLIC_SITE_URL` to your real domain (used by sitemap, canonical URLs, schema, robots).
2. Replace `https://pixshift.example` in `public/llms.txt`.
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
- Homepage: `components/home/HeroLab.tsx` (live JPEG compression demo; a dropped photo is handed to the chosen tool page through `lib/pending.ts`, in memory only), `ToolIndex.tsx` + `ToolVisual.tsx` (typographic tool list), `SizeFinder.tsx`, `FormatRace.tsx` (encodes one picture as PNG, JPG and WebP live). The format race shows the real encoded picture (with a zoom toggle) for the chosen format. Demo pictures are drawn in code in `lib/scene.ts`.
- If `next build` complains about a font name or axis, check the names in `app/layout.tsx` against the next/font Google font list.

## Add a new tool

Add an entry to `lib/tools.ts`. The page, sitemap entry, schema and home card are generated automatically. Add it to `public/llms.txt` too.
