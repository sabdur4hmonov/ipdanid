import { validOutline, type OutlinePoint } from "./head-outline";
import { sourceToTarget } from "./coordinates";
import {
  MASK_SIZE,
  encodeBackgroundMask,
  decodeBackgroundMask,
} from "./portrait";
import type { EditParams } from "./types";

export function inOutline(p: OutlinePoint, polygon: OutlinePoint[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function distance(p: OutlinePoint, a: OutlinePoint, b: OutlinePoint) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)),
    );
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
// This is a manual head selection, never detected anatomy. The four-cell guard
// covers quantization, existing radius-one blur and bilinear upsampling so no
// pixel inside the polygon is whitened. The original face/contrast stays intact.
export function outlineBackgroundMask(
  source: OutlinePoint[],
  edits: EditParams,
  aspect: number,
  imageWidth: number,
  imageHeight: number,
  resolution: number,
  existingMask?: string,
) {
  validOutline(source);
  if (
    ![aspect, imageWidth, imageHeight, resolution].every(
      (v) => Number.isFinite(v) && v > 0,
    )
  )
    throw Error("Invalid mask geometry");
  const polygon = source.map((p) =>
    sourceToTarget(
      p.x * imageWidth,
      p.y * imageHeight,
      imageWidth,
      imageHeight,
      edits,
      aspect,
      resolution,
    ),
  );
  const values = Uint8Array.from(decodeBackgroundMask(existingMask)),
    guard = 4 / (MASK_SIZE - 1);
  for (let y = 0; y < MASK_SIZE; y++)
    for (let x = 0; x < MASK_SIZE; x++) {
      const p = { x: x / (MASK_SIZE - 1), y: y / (MASK_SIZE - 1) };
      if (
        !inOutline(p, polygon) &&
        polygon.every(
          (a, i) => distance(p, a, polygon[(i + 1) % polygon.length]) > guard,
        )
      )
        values[y * MASK_SIZE + x] = 1;
    }
  return encodeBackgroundMask(values);
}
