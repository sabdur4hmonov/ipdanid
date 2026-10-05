import type { EditParams, RegionBox } from "./types";

// Canvas edges and optical sample centers are different coordinate systems.
export const sampleToDisplay = (v: number, n: number) =>
  (0.5 + v * (n - 1)) / n;
export const displayToSample = (v: number, n: number) =>
  (v * n - 0.5) / (n - 1);
export function displayBox(b: RegionBox, n = 160) {
  return {
    left: sampleToDisplay(b.left, n),
    top: sampleToDisplay(b.top, n),
    width: (b.width * (n - 1)) / n,
    height: (b.height * (n - 1)) / n,
  };
}
// Inclusive sample bounds, also used for comparison crops. Matches contains(x/(n-1), y/(n-1)).
export function regionPixels(b: RegionBox, n: number) {
  return {
    left: Math.ceil(b.left * (n - 1)),
    top: Math.ceil(b.top * (n - 1)),
    right: Math.floor((b.left + b.width) * (n - 1)),
    bottom: Math.floor((b.top + b.height) * (n - 1)),
  };
}
export function sourceToTarget(
  x: number,
  y: number,
  width: number,
  height: number,
  e: EditParams,
  aspect = 1,
  n = 160,
) {
  const scale = Math.max(n / width, n / aspect / height) * e.zoom,
    angle = (e.rotation * Math.PI) / 180,
    dx = (x - width / 2) * scale + e.panX * n,
    dy = (y - height / 2) * scale + (e.panY * n) / aspect;
  return {
    x: (n / 2 + Math.cos(angle) * dx - Math.sin(angle) * dy - 0.5) / (n - 1),
    y:
      (n / 2 + aspect * (Math.sin(angle) * dx + Math.cos(angle) * dy) - 0.5) /
      (n - 1),
  };
}
export function targetToSource(
  x: number,
  y: number,
  width: number,
  height: number,
  e: EditParams,
  aspect = 1,
  n = 160,
) {
  const scale = Math.max(n / width, n / aspect / height) * e.zoom,
    angle = (e.rotation * Math.PI) / 180,
    dx = x * (n - 1) + 0.5 - n / 2,
    dy = (y * (n - 1) + 0.5 - n / 2) / aspect;
  return {
    x:
      (Math.cos(angle) * dx + Math.sin(angle) * dy - e.panX * n) / scale +
      width / 2,
    y:
      (-Math.sin(angle) * dx + Math.cos(angle) * dy - (e.panY * n) / aspect) /
        scale +
      height / 2,
  };
}
export function changeRegion(
  b: RegionBox,
  dx: number,
  dy: number,
  resize = false,
): RegionBox {
  const clamp = (v: number, low: number, high: number) =>
    Math.max(low, Math.min(high, v));
  return resize
    ? {
        ...b,
        width: clamp(b.width + dx, 0.01, 1 - b.left),
        height: clamp(b.height + dy, 0.01, 1 - b.top),
      }
    : {
        ...b,
        left: clamp(b.left + dx, 0, 1 - b.width),
        top: clamp(b.top + dy, 0, 1 - b.height),
      };
}
