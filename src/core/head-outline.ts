import { inside, HEART_POLYGON } from "./geometry";
import { displayBox, sourceToTarget } from "./coordinates";
import { boardDelta, CROP_ZOOM_MAX, CROP_ZOOM_MIN } from "./shape-crop";
import type { EditParams, RegionBox, Shape } from "./types";

// Selection geometry only. These normalized source points contain no photo pixels.
export type OutlinePoint = { x: number; y: number };
const cross = (a: OutlinePoint, b: OutlinePoint, c: OutlinePoint) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export function validOutline(points: OutlinePoint[]) {
  if (
    !Array.isArray(points) ||
    points.length < 6 ||
    points.length > 48 ||
    points.some(
      (p) =>
        !p ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 0 ||
        p.x > 1 ||
        p.y < 0 ||
        p.y > 1,
    )
  )
    throw Error("Mark 6–48 points around the whole head");
  let area = 0;
  for (let j = 0; j < points.length; j++) {
    const a = points[j],
      b = points[(j + 1) % points.length];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-5)
      throw Error("Repeated outline point");
    area += a.x * b.y - b.x * a.y;
    for (let k = j + 1; k < points.length; k++) {
      if (k === j + 1 || (j === 0 && k === points.length - 1)) continue;
      const c = points[k],
        d = points[(k + 1) % points.length];
      // Reject intersections, including a non-adjacent touching/collinear edge.
      const overlap =
        Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <=
          Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) + 1e-10 &&
        Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <=
          Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) + 1e-10;
      if (
        overlap &&
        cross(a, b, c) * cross(a, b, d) <= 1e-12 &&
        cross(c, d, a) * cross(c, d, b) <= 1e-12
      )
        throw Error("Outline edges cross; correct the marked points");
    }
  }
  if (Math.abs(area) < 0.0002) throw Error("Outline is too small");
}
export function outlineBounds(points: OutlinePoint[]): RegionBox {
  const left = Math.min(...points.map((p) => p.x)),
    top = Math.min(...points.map((p) => p.y));
  return {
    left,
    top,
    width: Math.max(...points.map((p) => p.x)) - left,
    height: Math.max(...points.map((p) => p.y)) - top,
  };
}
export function fitMarkedOutline(
  shape: Shape,
  source: OutlinePoint[],
  edits: EditParams,
  aspect: number,
  widthMm: number,
  heightMm: number,
  imageWidth: number,
  imageHeight: number,
  n = 160,
) {
  validOutline(source);
  if (
    ![aspect, widthMm, heightMm, imageWidth, imageHeight, n].every(
      (v) => Number.isFinite(v) && v > 0,
    )
  )
    throw Error("Invalid outline geometry");
  const old = source.map((p) =>
    sourceToTarget(
      p.x * imageWidth,
      p.y * imageHeight,
      imageWidth,
      imageHeight,
      edits,
      aspect,
      n,
    ),
  );
  const bounds = outlineBounds(old),
    center = {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
  const size = 192,
    stride = size + 1,
    prefix = new Uint32Array(stride * stride),
    safe = new Uint8Array(size * size);
  const boundary = new Uint8Array(size * size);
  // The heart's narrow central cusp lies between grid centers. Mark its actual polygon
  // edges conservatively so a grid cannot erase that concavity or overstate clearance.
  if (shape === "heart")
    for (let j = 0; j < HEART_POLYGON.length; j++) {
      const a = HEART_POLYGON[j],
        b = HEART_POLYGON[(j + 1) % HEART_POLYGON.length],
        count = Math.max(
          1,
          Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * (size - 1) * 2),
        );
      for (let k = 0; k <= count; k++) {
        const x = Math.round((a.x + ((b.x - a.x) * k) / count) * (size - 1)),
          y = Math.round((a.y + ((b.y - a.y) * k) / count) * (size - 1));
        if (x >= 0 && x < size && y >= 0 && y < size)
          boundary[y * size + x] = 1;
      }
    }
  // Conservative 4 mm rectangular clearance plus a cell for edge sampling/rounding.
  const mx = Math.ceil((4 / widthMm) * (size - 1)) + 1,
    my = Math.ceil((4 / heightMm) * (size - 1)) + 1;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      prefix[(y + 1) * stride + x + 1] =
        +(
          !inside(shape, x / (size - 1), y / (size - 1)) ||
          boundary[y * size + x] === 1
        ) +
        prefix[y * stride + x + 1] +
        prefix[(y + 1) * stride + x] -
        prefix[y * stride + x];
  for (let y = my; y < size - my; y++)
    for (let x = mx; x < size - mx; x++) {
      const l = x - mx,
        t = y - my,
        r = x + mx + 1,
        b = y + my + 1;
      safe[y * size + x] = +(
        prefix[b * stride + r] -
          prefix[t * stride + r] -
          prefix[b * stride + l] +
          prefix[t * stride + l] ===
        0
      );
    }
  const hi = Math.min(
      CROP_ZOOM_MAX / edits.zoom,
      1 / bounds.width,
      1 / bounds.height,
    ),
    samples: OutlinePoint[] = [];
  // Entire closed boundary, not just vertices. All supported board masks have no holes;
  // a simple polygon whose complete boundary is contained also contains no hidden outside notch.
  for (let j = 0; j < old.length; j++) {
    const a = old[j],
      b = old[(j + 1) % old.length],
      count = Math.max(
        1,
        Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * hi * (size - 1) * 2),
      );
    for (let k = 0; k < count; k++)
      samples.push({
        x: a.x + ((b.x - a.x) * k) / count - center.x,
        y: a.y + ((b.y - a.y) * k) / count - center.y,
      });
  }
  const clear = (cx: number, cy: number, r: number) =>
    samples.every((p) => {
      const x = Math.round((cx + r * p.x) * (size - 1)),
        y = Math.round((cy + r * p.y) * (size - 1));
      return (
        x >= 0 && x < size && y >= 0 && y < size && safe[y * size + x] === 1
      );
    });
  let best:
    | {
        edits: EditParams;
        face: RegionBox;
        ratio: number;
        centerPenalty: number;
      }
    | undefined;
  const display = displayBox(bounds, n);
  for (let yi = 4; yi <= 36; yi++)
    for (let xi = 4; xi <= 36; xi++) {
      const cx = xi / 40,
        cy = yi / 40;
      if (!clear(cx, cy, 0)) continue;
      let lo = 0,
        upper = hi;
      for (let k = 0; k < 17; k++) {
        const r = (lo + upper) / 2;
        if (clear(cx, cy, r)) lo = r;
        else upper = r;
      }
      if (
        edits.zoom * lo < CROP_ZOOM_MIN ||
        bounds.width * lo < 0.1 ||
        bounds.height * lo < 0.1
      )
        continue;
      const face = {
        left: cx - (bounds.width * lo) / 2,
        top: cy - (bounds.height * lo) / 2,
        width: bounds.width * lo,
        height: bounds.height * lo,
      };
      const nextDisplay = displayBox(face, n),
        delta = boardDelta(
          nextDisplay.left - lo * display.left + (lo - 1) * 0.5,
          nextDisplay.top - lo * display.top + (lo - 1) * 0.5,
          edits.rotation,
          aspect,
        );
      const next = {
        ...edits,
        zoom: edits.zoom * lo,
        panX: lo * edits.panX + delta.x,
        panY: lo * edits.panY + delta.y,
      };
      if (Math.abs(next.panX) > 0.5 || Math.abs(next.panY) > 0.5) continue;
      const centerPenalty = (cx - 0.5) ** 2 + (cy - 0.5) ** 2;
      if (
        !best ||
        lo > best.ratio + 1e-5 ||
        (Math.abs(lo - best.ratio) < 1e-5 && centerPenalty < best.centerPenalty)
      )
        best = { edits: next, face, ratio: lo, centerPenalty };
    }
  if (!best)
    throw Error("Whole-head outline does not fit within these controls");
  return {
    ...best,
    version: "source-head-outline-fit/1",
    clearanceMm: 4,
    sampledGeometry: size,
  };
}
