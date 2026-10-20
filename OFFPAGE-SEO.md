# Off-Page SEO, AEO, GEO & LLMO Playbook for PixShift

Off-page work cannot be coded; it has to be done after launch. This is a practical checklist. Replace `pixshift.example` with your real domain first (set `NEXT_PUBLIC_SITE_URL`, `/llms.txt` is generated from the tool list, nothing to edit).

## 0. Launch checklist (week 1)

- [ ] Deploy (Vercel, Netlify or a VPS) on your real domain with HTTPS.
- [ ] Verify the site in **Google Search Console** and **Bing Webmaster Tools**; submit `/sitemap.xml`.
- [ ] Add verification codes in `app/layout.tsx` (`metadata.verification`).
- [ ] Check `/robots.txt`, `/sitemap.xml`, `/llms.txt` load correctly.
- [ ] Test each tool page in Google's Rich Results Test and PageSpeed Insights.
- [ ] Create profiles with identical name, logo and description: LinkedIn page, X, GitHub, YouTube, Facebook, Pinterest. Add the URLs to `sameAs` in `app/layout.tsx` (builds entity trust for Google and AI models).

## 1. Backlinks (off-page SEO)

Quality beats quantity. Aim for relevant, editorial links.

1. **Tool directories**: Product Hunt, AlternativeTo, SaaSHub, Future Tools-style directories, "free online tools" lists, Indie Hackers, BetaList.
2. **Developer and design communities**: share on Reddit (r/webdev, r/SideProject, r/photography when relevant and allowed by rules), Hacker News "Show HN", Dev.to, Hashnode. Lead with the privacy angle: "processes in your browser, nothing uploaded".
3. **Linkable assets** (these earn links naturally):
   - Social media image size cheat sheet (updated yearly) linking to your Instagram and LinkedIn resizers.
   - "Image format comparison: JPG vs PNG vs WebP" with real file size tests you run.
   - A free embeddable aspect ratio calculator widget with attribution link.
4. **Resource page outreach**: find pages like "best free image compressors", "web performance tools", "tools for bloggers" and email the owner a short, personal pitch.
5. **Guest posts** on web performance, photography, blogging and social media marketing sites.
6. **Broken link building**: find dead links to old image tools on relevant blogs and suggest yours.
7. **HARO-style requests** (Qwoted, Featured, Source of Sources): answer journalist questions about image optimization.
8. Avoid paid link schemes, PBNs and mass directory spam. They risk penalties.

Track: referring domains, anchor text variety (mostly brand and naked URL), and link relevance.

## 2. AEO (Answer Engine Optimization)

Goal: be the quoted answer in Google AI Overviews, featured snippets, voice assistants.

- Every tool page has a **"Quick answer"** paragraph near the top (already built). Keep it 40–60 words, direct, factual.
- FAQ sections with concise answers plus **FAQPage** schema (built in).
- **HowTo** steps with schema (built in).
- Add more question-led content over time: a `/blog` with posts like "How to reduce image size without losing quality", "What size is an Instagram post in 2026?". Use the question as the H1/H2 and answer immediately.
- Keep facts current (social sizes change). Update `dateModified`.

## 3. GEO (Generative Engine Optimization)

Goal: be cited by ChatGPT, Perplexity, Gemini, Copilot and Claude.

- Allow AI crawlers (done in `robots.ts`). Review it if you want to block training bots but keep search bots.
- Publish **original, citable data**: benchmark post, e.g. "We compressed 100 photos: average size saved by JPG vs WebP". Statistics and clear methodology get cited.
- Use clear, extractable structure: short paragraphs, descriptive headings, tables, numbered steps.
- Be named consistently everywhere (same brand name, description, logo) so models connect mentions to one entity.
- Get **mentions** (not only links) on trusted sites, Reddit threads, Wikipedia-adjacent resource lists, YouTube tutorials. Unlinked brand mentions help generative engines.
- Add author/editor attribution and a real contact page (E-E-A-T). Consider an author bio for blog posts.

## 4. LLMO (LLM Optimization)

- `/llms.txt` summarises the site for LLMs. It is generated from `lib/tools.ts` + `lib/catalog.ts`, so it updates itself when you add tools. Optionally add `llms-full.txt` with the full text of key pages.
- Plain, semantic HTML with server-rendered content (Next.js does this) so crawlers that do not run JavaScript can read pages.
- Unambiguous entity description: "PixShift is a free browser-based image compression and conversion tool" repeated on home, About and profiles.
- Test regularly: ask ChatGPT, Perplexity, Gemini and Claude things like "best free private image compressor" and "how to resize image for LinkedIn banner", and record whether PixShift is mentioned or cited. Adjust content and outreach based on gaps.

## 5. Content and on-page growth plan

| Month | Action |
|---|---|
| 1 | Launch, submit sitemap, create profiles, directories (10–15 listings) |
| 2 | Publish 4 blog posts targeting question keywords; social size cheat sheet |
| 3 | Original benchmark study; outreach to 30 relevant sites |
| 4+ | Add new tools (image cropper, HEIC to JPG, SVG optimizer), multilingual pages (hreflang), YouTube short tutorials |

## 6. Measurement

- Search Console: impressions, clicks, queries, indexing, Core Web Vitals.
- Referring domains (Ahrefs, Semrush, or free Bing and Search Console link reports).
- AI visibility checks monthly (manual prompts across ChatGPT, Perplexity, Gemini, Claude).
- Conversion goal: tool usage events (add privacy-friendly analytics such as Plausible or Umami).

## 7. Things to avoid

- Fake reviews or fake aggregate ratings in schema (violates Google guidelines; none are included here).
- Cloaked or auto-generated thin pages at scale.
- Claiming "no data collected" if you add analytics or ads. Update the privacy page accordingly.


## With 90 tools: where to push first

High-intent, lower-competition pages convert best in the first months. Start link building and social posts with these:

- Size-target pages: `compress-image-to-20kb`, `-50kb`, `-100kb`, `-200kb` (exam, visa and job-form audiences; very common searches in Pakistan, India and Bangladesh).
- `passport-size-photo-maker` and `background-changer` (ID photo audiences).
- Social size pages (`instagram-post-resizer`, `youtube-thumbnail-resizer`, `whatsapp-dp-resizer`): share a clean "all sizes" cheat sheet on Pinterest, Reddit and X, linking to the tool.
- Format pages (`webp-to-jpg`, `avif-to-jpg`, `jpg-to-webp`): answer "how do I open/convert WebP" questions on Quora, Reddit and Stack Exchange with a link.
- Developer pages (`image-to-base64`, `favicon-generator`, `svg-to-png`): list on dev tool directories, Product Hunt and Hacker News "Show HN".
- Keep the honest limits in the copy (background remover is colour-based, not AI). Trust earns links and avoids bad reviews.
