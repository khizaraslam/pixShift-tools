import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import ToolsExplorer from "@/components/ToolsExplorer";
import { TOOLS } from "@/lib/tools";
import { SITE, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: `All Free Image Tools Compress, Resize, Convert, Edit | PixShift`,
  description: `Browse free image tools: compressors, converters, resizers, social media sizes, background remover, watermark, crop, colour picker, calculators and more. Private, in your browser.`,
  alternates: { canonical: "/tools" },
  openGraph: { type: "website", url: "/tools", siteName: SITE.name, title: "All free image tools | PixShift" },
};

export default function ToolsPage() {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "All PixShift image tools",
      url: absoluteUrl("/tools"),
      isPartOf: { "@id": absoluteUrl("/#website") },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, url: absoluteUrl(`/${t.slug}`), name: t.name })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: "All tools", item: absoluteUrl("/tools") },
      ],
    },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
      <JsonLd data={schema} />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-pine/70">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2" aria-hidden>/</span>
        <span aria-current="page">All tools</span>
      </nav>
      <ToolsExplorer
        heading={
          <>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] leading-[1.02]">Find the right tool in seconds</h1>
            <p className="mt-3 text-base text-pith/85 sm:text-lg">
              free image tools. They run in your browser, so nothing is uploaded and you never need an account.
            </p>
          </>
        }
      />
    </div>
  );
}
