import type { RegionBox } from "./types";
import type { SourceFace } from "./face-features";
import { validatePersonMask, type PersonMask } from "./person-mask";
export type QuarterTurn = 0 | 1 | 2 | 3;
// Normalized source edges, independent of target sample centers and crop transforms.
export function unturnPoint(x: number, y: number, turn: QuarterTurn) {
  return turn === 1
    ? { x: y, y: 1 - x }
    : turn === 2
      ? { x: 1 - x, y: 1 - y }
      : turn === 3
        ? { x: 1 - y, y: x }
        : { x, y };
}
export function unturnBox(b: RegionBox, turn: QuarterTurn): RegionBox {
  const points = [
    [b.left, b.top],
    [b.left + b.width, b.top],
    [b.left, b.top + b.height],
    [b.left + b.width, b.top + b.height],
  ].map(([x, y]) => unturnPoint(x, y, turn));
  const left = Math.min(...points.map((p) => p.x)),
    top = Math.min(...points.map((p) => p.y));
  return {
    left,
    top,
    width: Math.max(...points.map((p) => p.x)) - left,
    height: Math.max(...points.map((p) => p.y)) - top,
  };
}
export function unturnFaces(
  faces: SourceFace[],
  turn: QuarterTurn,
): SourceFace[] {
  return faces
    .map((f) => ({
      face: unturnBox(f.face, turn),
      eyes: unturnBox(f.eyes, turn),
      nose: unturnBox(f.nose, turn),
      mouth: unturnBox(f.mouth, turn),
    }))
    .sort((a, b) => a.face.left - b.face.left);
}
export function unturnMask(mask: PersonMask, turn: QuarterTurn): PersonMask {
  validatePersonMask(mask);
  if (!turn) return mask;
  const width = turn % 2 ? mask.height : mask.width,
    height = turn % 2 ? mask.width : mask.height;
  const values = new Float32Array(mask.values.length);
  for (let y = 0; y < mask.height; y++)
    for (let x = 0; x < mask.width; x++) {
      const p = unturnPoint(
        (x + 0.5) / mask.width,
        (y + 0.5) / mask.height,
        turn,
      );
      values[
        Math.min(height - 1, Math.floor(p.y * height)) * width +
          Math.min(width - 1, Math.floor(p.x * width))
      ] = mask.values[y * mask.width + x];
    }
  return { width, height, values };
}
