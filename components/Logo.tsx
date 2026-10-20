import Link from "next/link";
import { SITE } from "@/lib/site";

/**
 * Brand mark. Uses NEXT_PUBLIC_LOGO_URL when set, otherwise the built-in mark.
 * tone="dark" is for dark backgrounds (footer): light text, and a custom logo image
 * sits on a light chip so a dark logo never disappears.
 */
export default function Logo({ size = 32, className = "", tone = "light" }: { size?: number; className?: string; tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  const img = SITE.logo ? (
    // Plain <img>: the address can be a local file or any external https URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SITE.logo} alt={SITE.logoOnly ? SITE.name : ""} height={size} style={{ height: size, width: "auto" }} className="block max-w-[180px] object-contain" />
  ) : null;
  return (
    <Link
      href="/"
      className={`flex items-center gap-2.5 text-lg font-extrabold tracking-tight ${dark ? "text-pith" : "text-pine"} ${className}`}
      aria-label={`${SITE.name} home`}
    >
      {img ? (
        dark ? <span className="rounded-xl bg-pith px-2.5 py-1.5">{img}</span> : img
      ) : (
        <span
          className={`flex items-center justify-center rounded-lg ${dark ? "bg-zest text-pine" : "bg-pine text-zest"}`}
          style={{ height: size, width: size }}
          aria-hidden
        >
          ◐
        </span>
      )}
      {!(SITE.logo && SITE.logoOnly) && <span>{SITE.name}</span>}
    </Link>
  );
}