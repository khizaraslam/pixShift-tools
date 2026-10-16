export const SITE = {
  name: "PixShift",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://pixshift.example").replace(/\/$/, ""),
  tagline: "Free online image tools that run in your browser",
  description:
    "PixShift offers free image compressor, resizer, converter and social media resize tools. Files are processed locally in your browser, so your photos are never uploaded.",
  twitter: "@pixshift",
  email: "hello@pixshift.example",
  locale: "en_US",
  launched: "2026-10-14",
} as const;

export function absoluteUrl(path = "/") {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
