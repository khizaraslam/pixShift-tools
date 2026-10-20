import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import { SITE, absoluteUrl } from "@/lib/site";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = {
  title: `About ${SITE.name} Private, Free Image Tools`,
  description: `Learn what ${SITE.name} is, how the tools work, and why your images never leave your browser.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          url: absoluteUrl("/about"),
          name: `About ${SITE.name}`,
          isPartOf: { "@id": absoluteUrl("/#website") },
        }}
      />
      <h1 className="text-4xl font-extrabold tracking-tight">About {SITE.name}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-slate-700">
        <p>
          {SITE.name} is a free collection of image tools: compressing, resizing, converting formats and preparing pictures for social media.
        </p>
        <p>
          Every tool runs inside your browser using standard web technologies such as the Canvas API. That means your photos are processed on your own device and are not uploaded to our servers.
        </p>
        <h2 className="pt-4 text-2xl font-bold">What we believe</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>Image tools should be fast, free and simple.</li>
          <li>Your files are yours. Privacy should be the default, not a premium feature.</li>
          <li>Clear answers beat jargon. Every tool page explains what it does and how to use it.</li>
        </ul>
        <h2 className="pt-4 text-2xl font-bold">Contact</h2>
        <p>
          Questions or feedback? Email <a className="text-brand-600 underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </div>
    </div>
  );
}
