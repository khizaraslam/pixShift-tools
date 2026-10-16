import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ImageTool from "@/components/ImageTool";
import AspectCalculator from "@/components/AspectCalculator";
import FaqList from "@/components/FaqList";
import JsonLd from "@/components/JsonLd";
import ToolCard from "@/components/ToolCard";
import { SITE_FAQS, TOOLS, getTool } from "@/lib/tools";
import { SITE, absoluteUrl } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  const url = `/${tool.slug}`;
  return {
    title: tool.title,
    description: tool.description,
    keywords: tool.keywords,
    alternates: { canonical: url },
    openGraph: { type: "website", url, siteName: SITE.name, title: tool.title, description: tool.description, locale: SITE.locale },
    twitter: { card: "summary_large_image", title: tool.title, description: tool.description },
  };
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const url = absoluteUrl(`/${tool.slug}`);
  const faqs = [...tool.faqs, SITE_FAQS[0]];
  const related = tool.related.map((s) => getTool(s)).filter(Boolean);

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "@id": `${url}#app`,
      name: tool.name,
      url,
      description: tool.description,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript and a modern browser",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: tool.benefits.map((b) => b.title),
      publisher: { "@id": absoluteUrl("/#organization") },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
        { "@type": "ListItem", position: 2, name: tool.name, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `How to use the ${tool.name}`,
      step: tool.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: `Step ${i + 1}`, text: s })),
    },
  ];

  return (
    <>
      <JsonLd data={schema} />
      <div className="hero-glow">
        <div className="mx-auto max-w-4xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500">
            <Link href="/" className="hover:text-brand-700">Home</Link>
            <span className="mx-2" aria-hidden>/</span>
            <span aria-current="page" className="text-slate-700">{tool.name}</span>
          </nav>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{tool.h1}</h1>

          {/* Answer-engine block: a direct, quotable answer near the top */}
          <p className="mt-4 rounded-2xl border border-brand-100 bg-white/80 p-4 text-base leading-relaxed text-slate-700 shadow-sm">
            <strong className="text-slate-900">Quick answer: </strong>
            {tool.quickAnswer}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pb-4 sm:px-6">
        <div className="mt-4">{tool.kind === "aspect" ? <AspectCalculator /> : <ImageTool tool={tool} />}</div>

        <article className="mt-14 space-y-12">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-2xl font-bold tracking-tight">About the {tool.name}</h2>
            <div className="mt-3 space-y-3 leading-relaxed text-slate-700">
              {tool.intro.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </section>

          <section aria-labelledby="steps-heading">
            <h2 id="steps-heading" className="text-2xl font-bold tracking-tight">How to use it</h2>
            <ol className="mt-4 space-y-3">
              {tool.steps.map((s, i) => (
                <li key={s} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                  <span className="pt-0.5 text-slate-700">{s}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="benefits-heading">
            <h2 id="benefits-heading" className="text-2xl font-bold tracking-tight">Why use this tool</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {tool.benefits.map((b) => (
                <div key={b.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">{b.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{b.text}</p>
                </div>
              ))}
            </div>
          </section>
        </article>

        <FaqList faqs={faqs} />

        <section aria-labelledby="related-heading" className="mt-14">
          <h2 id="related-heading" className="text-2xl font-bold tracking-tight">Related tools</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {related.map((t) => (t ? <ToolCard key={t.slug} tool={t} /> : null))}
          </div>
        </section>
      </div>
    </>
  );
}
