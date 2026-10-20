"use client";

import dynamic from "next/dynamic";
import type { Tool } from "@/lib/tools";
import ImageTool from "./ImageTool";

// Each engine loads only on the pages that use it, so a tool page stays light.
const Loading = () => <div className="h-40 animate-pulse rounded-3xl bg-white/60" aria-hidden />;
const Editor = dynamic(() => import("./Editor"), { loading: Loading });
const CropTool = dynamic(() => import("./CropTool"), { loading: Loading });
const ColorTool = dynamic(() => import("./ColorTool"), { loading: Loading });
const Calculators = dynamic(() => import("./Calculators"), { loading: Loading });
const AspectCalculator = dynamic(() => import("./AspectCalculator"), { loading: Loading });
const Base64Tool = dynamic(() => import("./Base64Tool"), { loading: Loading });
const PdfTool = dynamic(() => import("./PdfTool"), { loading: Loading });
const CombineTool = dynamic(() => import("./CombineTool"), { loading: Loading });
const SplitTool = dynamic(() => import("./SplitTool"), { loading: Loading });
const FaviconTool = dynamic(() => import("./FaviconTool"), { loading: Loading });
const CollageTool = dynamic(() => import("./CollageTool"), { loading: Loading });
const MemeTool = dynamic(() => import("./MemeTool"), { loading: Loading });

export default function ToolRunner({ tool }: { tool: Tool }) {
  switch (tool.engine) {
    case "editor":
      return <Editor tool={tool} />;
    case "crop":
      return <CropTool tool={tool} />;
    case "color":
      return <ColorTool tool={tool} />;
    case "calc":
      return tool.calc === "aspect" ? <AspectCalculator /> : <Calculators calc={tool.calc!} />;
    case "base64":
      return <Base64Tool tool={tool} />;
    case "pdf":
      return <PdfTool tool={tool} />;
    case "combine":
      return <CombineTool tool={tool} />;
    case "split":
      return <SplitTool tool={tool} />;
    case "favicon":
      return <FaviconTool tool={tool} />;
    case "collage":
      return <CollageTool tool={tool} />;
    case "meme":
      return <MemeTool tool={tool} />;
    default:
      return <ImageTool tool={tool} />;
  }
}
