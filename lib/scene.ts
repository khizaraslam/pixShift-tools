// Pictures drawn in code, used by the homepage demos. No image files are needed.

export const W = 720;
export const H = 440;

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A detailed "photo": gradients, grain and fine lines make compression damage easy to see. */
export function drawScene(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1b1340");
  sky.addColorStop(0.45, "#e0526b");
  sky.addColorStop(0.75, "#ffb36b");
  sky.addColorStop(1, "#ffe3a8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  const sun = ctx.createRadialGradient(470, 260, 6, 470, 260, 130);
  sun.addColorStop(0, "#fffbe6");
  sun.addColorStop(0.25, "#ffd37a");
  sun.addColorStop(1, "rgba(255,180,100,0)");
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  const r = rng(7);
  ctx.fillStyle = "#fff";
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = 0.3 + r() * 0.7;
    ctx.fillRect(r() * W, r() * H * 0.4, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  const layers = [
    { c: "#6b2d5c", base: 310, amp: 76, f: 0.011, s: 3 },
    { c: "#3f1d4d", base: 352, amp: 64, f: 0.017, s: 11 },
    { c: "#1d1236", base: 400, amp: 46, f: 0.024, s: 23 },
  ];
  for (const L of layers) {
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 4) {
      const y = L.base - Math.abs(Math.sin(x * L.f + L.s)) * L.amp - Math.sin(x * L.f * 2.7 + L.s * 2) * L.amp * 0.25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = L.c;
    ctx.fill();
  }

  const g = rng(99);
  for (let i = 0; i < 11000; i++) {
    ctx.fillStyle = g() > 0.5 ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.09)";
    ctx.fillRect(g() * W, g() * H, 2, 2);
  }

  ctx.strokeStyle = "rgba(255,255,255,.4)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 16; i++) {
    const y = 36 + i * 5;
    ctx.beginPath();
    ctx.moveTo(36, y);
    ctx.lineTo(36 + (i % 3 === 0 ? 150 : 100), y);
    ctx.stroke();
  }
}

/** A flat, logo-like graphic: few colours and hard edges, where PNG usually beats JPG. */
export function drawFlat(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = "#f5f7ec";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#c8f23a";
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.5, h * 0.36, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0d2b24";
  ctx.fillRect(w * 0.54, h * 0.16, w * 0.34, h * 0.2);
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(w * 0.54, h * 0.44 + i * h * 0.04, w * (i % 2 ? 0.22 : 0.34), h * 0.02);
  }

  ctx.fillStyle = "#ff6a8b";
  ctx.beginPath();
  ctx.moveTo(w * 0.56, h * 0.88);
  ctx.lineTo(w * 0.88, h * 0.88);
  ctx.lineTo(w * 0.72, h * 0.66);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#0d2b24";
  ctx.font = `800 ${Math.round(h * 0.24)}px Arial, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("Aa", w * 0.3, h * 0.52);
}
