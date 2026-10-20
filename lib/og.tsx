import { ImageResponse } from "next/og";

// Social share image (Open Graph) design, shared by the homepage and every tool page.
// Shown when a link is shared on WhatsApp, LinkedIn, X, Facebook, Slack and so on.

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/png";

const PINE = "#0d2b24";
const ZEST = "#c8f23a";
const PULP = "#ff6a8b";
const PITH = "#f5f7ec";

async function loadFont() {
  const res = await fetch(new URL("../assets/fonts/Inter-ExtraBold.otf", import.meta.url));
  return res.arrayBuffer();
}

interface OgProps {
  title: string;
  line: string;
  color?: string;
}

export async function renderOg({ title, line, color = ZEST }: OgProps) {
  const font = await loadFont();
  const titleSize = title.length > 22 ? 78 : title.length > 14 ? 88 : 100;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PITH,
          padding: 36,
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            border: `8px solid ${PINE}`,
            borderRadius: 40,
            background: PITH,
            padding: "44px 52px",
          }}
        >
          {/* Left: brand, title, one line, reassurance pills */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: PINE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 999, background: ZEST }} />
              </div>
              <div style={{ marginLeft: 16, fontSize: 40, color: PINE, letterSpacing: -1 }}>PixShift</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: titleSize, lineHeight: 1.02, color: PINE, letterSpacing: -3 }}>{title}</div>
              <div style={{ marginTop: 22, fontSize: 31, lineHeight: 1.3, color: PINE, opacity: 0.8, maxWidth: 640 }}>
                {line}
              </div>
            </div>

            <div style={{ display: "flex" }}>
              {["Free", "No upload", "Runs in your browser"].map((t) => (
                <div
                  key={t}
                  style={{
                    marginRight: 14,
                    padding: "10px 22px",
                    borderRadius: 999,
                    background: ZEST,
                    border: `4px solid ${PINE}`,
                    fontSize: 26,
                    color: PINE,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Right: a tilted print, like on the homepage */}
          <div style={{ width: 360, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 300,
                background: "#fff",
                border: `8px solid ${PINE}`,
                padding: 18,
                transform: "rotate(5deg)",
                boxShadow: `14px 14px 0 ${PINE}`,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -46,
                  left: 118,
                  width: 40,
                  height: 62,
                  background: PULP,
                  border: `6px solid ${PINE}`,
                  borderRadius: 6,
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  height: 220,
                  background: color,
                  border: `6px solid ${PINE}`,
                  padding: 26,
                }}
              >
                <div style={{ height: 26, width: "100%", background: PINE, borderRadius: 999 }} />
                <div style={{ marginTop: 18, height: 26, width: "68%", background: PINE, borderRadius: 999 }} />
                <div style={{ marginTop: 18, height: 26, width: "38%", background: PINE, borderRadius: 999 }} />
              </div>
              <div style={{ marginTop: 18, height: 18, width: "70%", background: PINE, borderRadius: 999 }} />
              <div style={{ marginTop: 12, height: 14, width: "45%", background: PINE, opacity: 0.4, borderRadius: 999 }} />
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "Inter", data: font, weight: 800, style: "normal" }],
    },
  );
}
