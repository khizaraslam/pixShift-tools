import { GROUP_LABEL, TOOLS, toolsInGroup, type ToolGroup } from "@/lib/tools";
import { SITE, absoluteUrl } from "@/lib/site";

// Served at /llms.txt. Built from the tool list, so it never goes out of date.
export const dynamic = "force-static";

export function GET() {
  const groups = Object.keys(GROUP_LABEL) as ToolGroup[];
  const lines: string[] = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.name} is a free set of browser-based image tools: compress, resize, convert, crop, edit and prepare pictures for social media. All processing happens locally in the user's browser, so images are never uploaded. No signup, watermark or usage limit.`,
    "",
    "## Key facts",
    "",
    "- Processing is client-side (browser Canvas API); files are not uploaded to any server.",
    "- Input formats: JPG, PNG, WebP, GIF, BMP, AVIF and SVG (some depend on the browser). Output formats: JPG, PNG, WebP and AVIF (AVIF encoding only in Chromium browsers).",
    "- Free to use, no account required.",
    "- Background remover, upscaler and object remover use classic image processing, not AI: they work best on plain backgrounds, small objects and modest enlargements.",
    "- Social media sizes are current recommendations and platforms may change them.",
    "",
  ];
  for (const g of groups) {
    lines.push(`## ${GROUP_LABEL[g].label}`, "");
    for (const t of toolsInGroup(g)) lines.push(`- [${t.name}](${absoluteUrl(`/${t.slug}`)}): ${t.short}. ${t.quickAnswer.split(/(?<=\.)\s/)[0]}`);
    lines.push("");
  }
  lines.push("## Optional", "", `- [All tools](${absoluteUrl("/tools")})`, `- [About](${absoluteUrl("/about")})`, `- [Privacy](${absoluteUrl("/privacy")})`, `- [Sitemap](${absoluteUrl("/sitemap.xml")})`, "");
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
