import type { Metadata } from "next";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import HeroLab from "@/components/home/HeroLab";
import ToolIndex from "@/components/home/ToolIndex";
import SizeFinder from "@/components/home/SizeFinder";
import PhotoId from "@/components/home/PhotoId";
import { SITE_FAQS, TOOLS } from "@/lib/tools";
import { SITE, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "PixShift",
  description:
    "Free online image tools: compress to 50KB or 100KB, resize, convert JPG, PNG, WebP and AVIF, crop, remove backgrounds, add watermarks, social media sizes, PDF, colour picker and calculators. Private, in your browser.",
  alternates: { canonical: "/" },
  keywords: [
    "image compressor",
    "image resizer",
    "compress image to 100kb",
    "jpg to png",
    "png to webp",
    "background remover",
    "instagram post size",
    "image to pdf",
    "free image tools online",
  ],
};

export default function HomePage() {
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": absoluteUrl("/#webpage"),
      url: SITE.url,
      name: "PixShift Free Image Tools",
      isPartOf: { "@id": absoluteUrl("/#website") },
      about: { "@type": "Thing", name: "Online image editing tools" },
      datePublished: SITE.launched,
      dateModified: new Date().toISOString().slice(0, 10),
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "PixShift image tools",
      itemListElement: TOOLS.map((t, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: absoluteUrl(`/${t.slug}`),
        name: t.name,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: SITE_FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <>
      <JsonLd data={schema} />
      <HeroLab />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <ToolIndex />
        <PhotoId />
        <SizeFinder />

        <section
          aria-labelledby="private-heading"
          className="mt-24 grid gap-8 rounded-[2rem] bg-pine p-8 text-pith sm:p-12 lg:grid-cols-2"
        >
          <h2
            id="private-heading"
            className="squeeze text-[clamp(2rem,5.5vw,4rem)] leading-[1.02]"
            style={{ "--w": 78 } as React.CSSProperties}
          >
            Your photos never leave this tab.
          </h2>
          <div className="space-y-4 text-base leading-relaxed text-pith/85">
            <p>
              Every tool runs on your own device, inside your browser. Open the network panel while you compress
              something and you will see no upload.
            </p>
            <p>There is no account, no watermark and no daily limit. The only cap is your device&apos;s memory.</p>
            <p>
              That also makes it quick: there is no queue and nothing to wait for, so a batch of photos finishes about as
              fast as your device can encode them.
            </p>
          </div>
        </section>

        <FaqList faqs={SITE_FAQS} />
      </div>
    </>
  );
}
