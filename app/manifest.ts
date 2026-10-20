import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} Free Image Tools`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7ec",
    theme_color: "#0d2b24",
    icons: [{ src: SITE.logo || "/icon.svg", sizes: "any", ...(SITE.logo ? {} : { type: "image/svg+xml" }) }],
  };
}
