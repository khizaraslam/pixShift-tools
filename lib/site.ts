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
  /**
   * Logo comes from the environment so it can be swapped without touching code.
   * NEXT_PUBLIC_LOGO_URL  = "/logo.png" (file inside /public) or a full https:// address.
   * NEXT_PUBLIC_LOGO_ONLY = "true" when the image already contains the brand name (wordmark),
   *                         so the text name is not repeated next to it.
   * Leave NEXT_PUBLIC_LOGO_URL empty to use the built-in mark.
   */
  logo: (process.env.NEXT_PUBLIC_LOGO_URL ?? "").trim(),
  logoOnly: process.env.NEXT_PUBLIC_LOGO_ONLY === "true",
} as const;

/** Logo address for schema, manifest and previews. Falls back to the built-in icon. */
export function logoUrl() {
  const l = SITE.logo || "/icon.svg";
  return /^https?:\/\//i.test(l) ? l : absoluteUrl(l);
}

export function absoluteUrl(path = "/") {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}
