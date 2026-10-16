import type { Faq } from "@/lib/tools";

export default function FaqList({ faqs, heading = "Frequently asked questions" }: { faqs: Faq[]; heading?: string }) {
  return (
    <section aria-labelledby="faq-heading" className="mt-14">
      <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-slate-900">
        {heading}
      </h2>
      <div className="mt-5 divide-y divide-slate-200 rounded-3xl border border-slate-200 bg-white">
        {faqs.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
              <h3 className="text-base font-semibold">{f.q}</h3>
              <span aria-hidden className="text-brand-600 transition group-open:rotate-45">＋</span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
