import type { MaterialProfile, Shape } from "./types";
export function inside(shape: Shape, x: number, y: number): boolean {
  if (shape === "circle") return (x - 0.5) ** 2 + (y - 0.5) ** 2 <= 0.25 + 1e-8;
  if (shape === "rectangle") return x >= 0 && x <= 1 && y >= 0 && y <= 1;
  // Same polygon is used by pin placement, masking and connection validation.
  const poly = HEART_POLYGON;
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    )
      hit = !hit;
  }
  return hit;
}
function heartPolygon() {
  return Array.from({ length: 720 }, (_, i) => {
    const t = (i / 720) * Math.PI * 2;
    return {
      x: 0.5 + (16 * Math.sin(t) ** 3) / 34,
      y:
        0.5 -
        (13 * Math.cos(t) -
          5 * Math.cos(2 * t) -
          2 * Math.cos(3 * t) -
          Math.cos(4 * t) +
          2.5) /
          32,
    };
  });
}
const HEART_POLYGON = heartPolygon();
export function assertPinSpacing(p: MaterialProfile) {
  for (let i = 0; i < p.pins.length; i++)
    for (let j = i + 1; j < p.pins.length; j++) {
      const a = p.pins[i],
        b = p.pins[j];
      if (
        Math.hypot((a.x - b.x) * p.widthMm, (a.y - b.y) * p.heightMm) <
        p.shaftMm + p.threadMm
      )
        throw new Error(
          "Pin spacing is too small: use fewer pins or a larger board.",
        );
    }
}
export function createProfile(
  shape: Shape = "circle",
  count = 120,
  mode: "dark" | "light" | "color" = "dark",
  dimensions = { widthMm: 400, heightMm: 400 },
): MaterialProfile {
  const { widthMm, heightMm } = dimensions;
  if (
    !Number.isFinite(widthMm) ||
    !Number.isFinite(heightMm) ||
    widthMm < 50 ||
    heightMm < 50 ||
    widthMm > 2000 ||
    heightMm > 2000 ||
    (shape === "circle" && widthMm !== heightMm)
  )
    throw new Error(
      "Invalid board dimensions; a circle requires equal dimensions.",
    );
  if (!Number.isInteger(count) || count < 24 || count > 240)
    throw new Error("Pin count must be 24–240");
  let points: { x: number; y: number }[];
  if (shape === "circle")
    points = Array.from({ length: count }, (_, i) => ({
      x: 0.5 + 0.48 * Math.sin((i / count) * Math.PI * 2),
      y: 0.5 - 0.48 * Math.cos((i / count) * Math.PI * 2),
    }));
  else {
    const poly =
      shape === "heart"
        ? HEART_POLYGON
        : [
            { x: 0.02, y: 0.02 },
            { x: 0.98, y: 0.02 },
            { x: 0.98, y: 0.98 },
            { x: 0.02, y: 0.98 },
          ];
    const lengths = poly.map((p, i) =>
      Math.hypot(
        (p.x - poly[(i + 1) % poly.length].x) * widthMm,
        (p.y - poly[(i + 1) % poly.length].y) * heightMm,
      ),
    );
    const total = lengths.reduce((a, b) => a + b, 0);
    points = Array.from({ length: count }, (_, i) => {
      let d = (i / count) * total,
        j = 0;
      while (d > lengths[j] && j < poly.length - 1) {
        d -= lengths[j++];
      }
      const a = poly[j],
        b = poly[(j + 1) % poly.length],
        f = d / lengths[j];
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    });
  }
  return {
    id: `dev-${shape}-${count}-${mode}`,
    version: 3,
    provisional: true,
    shape,
    widthMm,
    heightMm,
    pins: points.map((p, id) => ({ id, ...p })),
    shaftMm: 1.5,
    threadMm: 0.3,
    opacity: 0.85,
    maxLines: 3000,
    minPinGap: 5,
    stockMeters: 1200,
    baseColor: mode === "light" ? "#18201d" : "#faf8ef",
    colors:
      mode === "color"
        ? ["#202c38", "#ae4245", "#2e7471"]
        : mode === "light"
          ? ["#eee9d9"]
          : ["#18201d"],
    wrapAllowanceMm: 8,
    wasteFraction: 0.12,
  };
}
export function connectionAllowed(
  p: MaterialProfile,
  a: number,
  b: number,
): boolean {
  const gap = Math.min(Math.abs(a - b), p.pins.length - Math.abs(a - b));
  if (gap < p.minPinGap) return false;
  const u = p.pins[a],
    v = p.pins[b];
  if (!u || !v) return false;
  if (p.shape === "heart")
    for (let t = 0.04; t < 0.99; t += 0.04)
      if (!inside(p.shape, u.x + (v.x - u.x) * t, u.y + (v.y - u.y) * t))
        return false;
  return true;
}
export function linePixels(
  p: MaterialProfile,
  a: number,
  b: number,
  n: number,
): Uint32Array {
  const u = p.pins[a],
    v = p.pins[b];
  const x1 = Math.round(u.x * (n - 1)),
    y1 = Math.round(u.y * (n - 1)),
    x2 = Math.round(v.x * (n - 1)),
    y2 = Math.round(v.y * (n - 1));
  const len = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  const arr: number[] = [];
  for (let i = 0; i <= len; i++) {
    const x = Math.round(x1 + ((x2 - x1) * i) / len),
      y = Math.round(y1 + ((y2 - y1) * i) / len);
    if (arr.at(-1) !== y * n + x) arr.push(y * n + x);
  }
  return new Uint32Array(arr);
}
