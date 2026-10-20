import { OG_SIZE, OG_TYPE, renderOg } from "@/lib/og";
import { TOOLS, getTool } from "@/lib/tools";

export const alt = "PixShift free image tool";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  // First sentence of the description is short enough to read on a small preview.
  const line = tool ? tool.description.split(/(?<=\.)\s/)[0] : "Free image tools that run in your browser.";
  return renderOg({
    title: tool ? tool.name : "PixShift",
    line,
    color: tool?.color,
  });
}
