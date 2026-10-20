import { OG_SIZE, OG_TYPE, renderOg } from "@/lib/og";

export const alt = "PixShift: free image compressor, resizer and converter";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image() {
  return renderOg({
    title: "Squeeze the file. Keep the picture.",
    line: "Free image compressor, resizer, converter and editor. Private, with no upload.",
  });
}
