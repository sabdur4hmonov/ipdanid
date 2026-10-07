import { inside, HEART_POLYGON } from "./geometry";
import { displayBox, sourceToTarget, targetToSource } from "./coordinates";
import type { EditParams, PortraitSettings, RegionBox, Shape } from "./types";
export const CROP_ZOOM_MIN = 0.25,
  CROP_ZOOM_MAX = 6;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function boardDelta(
  dx: number,
  dy: number,
  rotation: number,
  aspect: number,
) {
  const a = (rotation * Math.PI) / 180;
  return {
    x: Math.cos(a) * dx + (Math.sin(a) * dy) / aspect,
    y: -aspect * Math.sin(a) * dx + Math.cos(a) * dy,
  };
}
export function panCrop(
  e: EditParams,
  dx: number,
  dy: number,
  aspect: number,
): EditParams {
  const d = boardDelta(dx, dy, e.rotation, aspect);
  return {
    ...e,
    panX: clamp(e.panX + d.x, -0.5, 0.5),
    panY: clamp(e.panY + d.y, -0.5, 0.5),
  };
}
export function zoomCrop(
  e: EditParams,
  factor: number,
  anchor: { x: number; y: number },
  aspect: number,
): EditParams {
  const zoom = clamp(e.zoom * factor, CROP_ZOOM_MIN, CROP_ZOOM_MAX),
    r = zoom / e.zoom;
  const d = boardDelta(
    (1 - r) * (anchor.x - 0.5),
    (1 - r) * (anchor.y - 0.5),
    e.rotation,
    aspect,
  );
  return {
    ...e,
    zoom,
    panX: clamp(r * e.panX + d.x, -0.5, 0.5),
    panY: clamp(r * e.panY + d.y, -0.5, 0.5),
  };
}
export function shapePath(shape: Shape, n = 160) {
  const points =
    shape === "heart"
      ? HEART_POLYGON
      : shape === "circle"
        ? Array.from({ length: 180 }, (_, i) => ({
            x: 0.5 + 0.5 * Math.sin((i * Math.PI) / 90),
            y: 0.5 - 0.5 * Math.cos((i * Math.PI) / 90),
          }))
        : [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ];
  return (
    points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${(0.5 + p.x * (n - 1)) / n} ${(0.5 + p.y * (n - 1)) / n}`,
      )
      .join(" ") + " Z"
  );
}
export function remapPortrait(
  s: PortraitSettings,
  old: EditParams,
  next: EditParams,
  width: number,
  height: number,
  aspect: number,
  n: number,
): PortraitSettings {
  const map = (b: RegionBox): RegionBox => {
    const corners = [
      [b.left, b.top],
      [b.left + b.width, b.top],
      [b.left, b.top + b.height],
      [b.left + b.width, b.top + b.height],
    ].map(([x, y]) => {
      const q = targetToSource(x, y, width, height, old, aspect, n);
      return sourceToTarget(q.x, q.y, width, height, next, aspect, n);
    });
    const left = clamp(Math.min(...corners.map((p) => p.x)), 0, 0.99),
      top = clamp(Math.min(...corners.map((p) => p.y)), 0, 0.99);
    return {
      left,
      top,
      width: clamp(Math.max(...corners.map((p) => p.x)) - left, 0.01, 1 - left),
      height: clamp(Math.max(...corners.map((p) => p.y)) - top, 0.01, 1 - top),
    };
  };
  const face = map(s.face);
  face.width = Math.max(0.1, face.width);
  face.height = Math.max(0.1, face.height);
  face.left = Math.min(face.left, 1 - face.width);
  face.top = Math.min(face.top, 1 - face.height);
  return {
    ...s,
    face,
    backgroundMask: undefined,
    foregroundMask: undefined,
    regions: s.regions
      ? {
          ...s.regions,
          eyes: map(s.regions.eyes),
          nose: map(s.regions.nose),
          mouth: map(s.regions.mouth),
        }
      : undefined,
  };
}
// Bounded sampled-geometry fit, not face detection or a likeness optimizer.
// Whole manually marked rectangle plus 4 mm clearance must fit the board mask.
export function fitMarkedFace(
  shape: Shape,
  face: RegionBox,
  e: EditParams,
  aspect: number,
  widthMm: number,
  heightMm: number,
  n = 160,
) {
  const size = 192,
    stride = size + 1,
    prefix = new Uint32Array(stride * stride),
    mx = Math.ceil((4 / widthMm) * (size - 1)),
    my = Math.ceil((4 / heightMm) * (size - 1));
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++)
      prefix[(y + 1) * stride + x + 1] =
        +!inside(shape, x / (size - 1), y / (size - 1)) +
        prefix[y * stride + x + 1] +
        prefix[(y + 1) * stride + x] -
        prefix[y * stride + x];
  const clear = (b: RegionBox) => {
    const l = Math.floor(b.left * (size - 1)) - mx,
      t = Math.floor(b.top * (size - 1)) - my,
      r = Math.ceil((b.left + b.width) * (size - 1)) + mx + 1,
      bottom = Math.ceil((b.top + b.height) * (size - 1)) + my + 1;
    return (
      l >= 0 &&
      t >= 0 &&
      r <= size &&
      bottom <= size &&
      prefix[bottom * stride + r] -
        prefix[t * stride + r] -
        prefix[bottom * stride + l] +
        prefix[t * stride + l] ===
        0
    );
  };
  const old = displayBox(face, n);
  const editsFor = (b: RegionBox, r: number) => {
    const d = displayBox(b, n),
      delta = boardDelta(
        d.left - r * old.left + (r - 1) * 0.5,
        d.top - r * old.top + (r - 1) * 0.5,
        e.rotation,
        aspect,
      );
    return {
      ...e,
      zoom: e.zoom * r,
      panX: r * e.panX + delta.x,
      panY: r * e.panY + delta.y,
    };
  };
  let best:
    | {
        face: RegionBox;
        edits: EditParams;
        ratio: number;
        centerPenalty: number;
      }
    | undefined;
  for (let yi = 4; yi <= 36; yi++)
    for (let xi = 4; xi <= 36; xi++) {
      const cx = xi / 40,
        cy = yi / 40;
      let lo = 0,
        hi = Math.min(CROP_ZOOM_MAX / e.zoom, 1 / face.width, 1 / face.height);
      for (let k = 0; k < 17; k++) {
        const r = (lo + hi) / 2,
          b = {
            left: cx - (face.width * r) / 2,
            top: cy - (face.height * r) / 2,
            width: face.width * r,
            height: face.height * r,
          };
        if (clear(b)) lo = r;
        else hi = r;
      }
      if (
        e.zoom * lo < CROP_ZOOM_MIN ||
        face.width * lo < 0.1 ||
        face.height * lo < 0.1
      )
        continue;
      const b = {
          left: cx - (face.width * lo) / 2,
          top: cy - (face.height * lo) / 2,
          width: face.width * lo,
          height: face.height * lo,
        },
        next = editsFor(b, lo),
        centerPenalty = (cx - 0.5) ** 2 + (cy - 0.5) ** 2;
      if (Math.abs(next.panX) > 0.5 || Math.abs(next.panY) > 0.5) continue;
      if (
        !best ||
        lo > best.ratio + 1e-5 ||
        (Math.abs(lo - best.ratio) < 1e-5 && centerPenalty < best.centerPenalty)
      )
        best = { face: b, edits: next, ratio: lo, centerPenalty };
    }
  if (!best) throw Error("Marked face cannot fit within the crop controls");
  return {
    ...best,
    version: "marked-face-shape-fit/1",
    clearanceMm: 4,
    sampledGeometry: 192,
  };
}
