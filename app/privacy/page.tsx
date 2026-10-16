import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: `Privacy Policy – ${SITE.name}`,
  description: `${SITE.name} processes images locally in your browser. Read what data we do and do not collect.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: October 14, 2026</p>
      <div className="mt-6 space-y-4 leading-relaxed text-slate-700">
        <h2 className="pt-2 text-2xl font-bold">Your images</h2>
        <p>
          Images you select are processed locally by your browser. They are not uploaded to, or stored on, our servers.
        </p>
        <h2 className="pt-2 text-2xl font-bold">Analytics and cookies</h2>
        <p>
          This starter does not include analytics or advertising cookies. If you add analytics or ads to your deployment, update this section to describe them and add any consent notice your region requires.
        </p>
        <h2 className="pt-2 text-2xl font-bold">Contact</h2>
        <p>
          Email <a className="text-brand-600 underline" href={`mailto:${SITE.email}`}>{SITE.email}</a> with any privacy questions.
        </p>
      </div>
    </div>
  );
}
