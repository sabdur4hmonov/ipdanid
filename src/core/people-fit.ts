import type { PersonMask } from "./person-mask";
import { validatePersonMask } from "./person-mask";
import { fitMarkedOutline } from "./head-outline";
import { inside } from "./geometry";
import { sourceToTarget } from "./coordinates";
import type { EditParams, RegionBox, Shape } from "./types";
export function peopleBounds(mask?: PersonMask): RegionBox {
  if (!mask) return { left: 0, top: 0, width: 1, height: 1 };
  validatePersonMask(mask);
  let l = mask.width,
    t = mask.height,
    r = -1,
    b = -1;
  for (let y = 0; y < mask.height; y++)
    for (let x = 0; x < mask.width; x++)
      if (mask.values[y * mask.width + x] > 0.25) {
        l = Math.min(l, x);
        r = Math.max(r, x);
        t = Math.min(t, y);
        b = Math.max(b, y);
      }
  if (r < l) throw Error("No foreground to fit");
  // Include the complete alpha footprint, including bilinear interpolation support.
  const left = Math.max(0, (l - 2) / mask.width),
    top = Math.max(0, (t - 2) / mask.height);
  return {
    left,
    top,
    width: Math.min(1, (r + 3) / mask.width) - left,
    height: Math.min(1, (b + 3) / mask.height) - top,
  };
}
export function fitAllPeople(
  shape: Shape,
  mask: PersonMask | undefined,
  edits: EditParams,
  aspect: number,
  widthMm: number,
  heightMm: number,
  imageWidth: number,
  imageHeight: number,
  n = 160,
) {
  const box = peopleBounds(mask),
    l = box.left,
    t = box.top,
    r = l + box.width,
    b = t + box.height;
  const boundary = [
    { x: l, y: t },
    { x: (l + r) / 2, y: t },
    { x: r, y: t },
    { x: r, y: (t + b) / 2 },
    { x: r, y: b },
    { x: (l + r) / 2, y: b },
    { x: l, y: b },
    { x: l, y: (t + b) / 2 },
  ];
  const fit = fitMarkedOutline(
    shape,
    boundary,
    edits,
    aspect,
    widthMm,
    heightMm,
    imageWidth,
    imageHeight,
    n,
  );
  return { ...fit, version: "all-people-source-fit/1", sourceBounds: box };
}
export function croppedPeopleFraction(
  mask: PersonMask | undefined,
  shape: Shape,
  edits: EditParams,
  aspect: number,
  imageWidth: number,
  imageHeight: number,
  n = 160,
) {
  if (!mask) return undefined;
  validatePersonMask(mask);
  let total = 0,
    missing = 0;
  for (let y = 0; y < mask.height; y++)
    for (let x = 0; x < mask.width; x++) {
      const alpha = mask.values[y * mask.width + x];
      if (alpha <= 0.25) continue;
      const p = sourceToTarget(
        ((x + 0.5) / mask.width) * imageWidth,
        ((y + 0.5) / mask.height) * imageHeight,
        imageWidth,
        imageHeight,
        edits,
        aspect,
        n,
      );
      total++;
      if (!inside(shape, p.x, p.y)) missing++;
    }
  return total ? missing / total : undefined;
}
