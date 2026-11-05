import type { RegionBox, Shape } from "./types";
import { suggestPortraitPlacement } from "./portrait-placement";
import { defaultHeadAdjustment } from "./portrait-framing";
import { chinOpacity } from "./portrait-framing";
import type { FaceFill } from "./standard-preparation";

export function websiteFaceQuality(faces: RegionBox[], sourceHeight: number) {
  const heights = faces.map((f) => f.height);
  return {
    far: heights.some((h) => h < 0.25 || h * sourceHeight < 250),
    lowResolution: heights.some((h) => h * sourceHeight < 250),
  };
}
export function websitePortraitPlacement(
  faces: RegionBox[],
  shape: Shape,
  aspect: number,
  rotation: 0 | 1 | 2 | 3 = 0,
) {
  return (
    suggestPortraitPlacement(faces, shape, aspect, rotation) ??
    defaultHeadAdjustment()
  );
}
// Source-space white fade follows the same transform/rotation as the photograph.
// No old framing schema, solver, renderer or immutable guide is modified.
export function websiteChinFade(
  source: HTMLCanvasElement,
  framing: FaceFill,
  keep: boolean,
) {
  if (keep || !framing.faces.length || framing.product?.kind !== "people")
    return source;
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(source, 0, 0);
  const d = ctx.getImageData(0, 0, out.width, out.height);
  fadeWebsitePixels(
    d.data,
    out.width,
    out.height,
    framing.faces,
    framing.targetBounds.height,
  );
  ctx.putImageData(d, 0, 0);
  return out;
}
export function fadeWebsitePixels(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  faces: RegionBox[],
  targetHeight: number,
) {
  if (!faces.length) return;
  const chin = Math.max(
    ...faces.map((f) => f.top + f.height - Math.min(0.02, f.height * 0.05)),
  );
  for (let y = 0; y < h; y++) {
    const alpha = chinOpacity((y + 0.5) / h, chin, false, 500 * targetHeight);
    for (let x = 0; x < w; x++)
      for (let ch = 0; ch < 3; ch++) {
        const at = (y * w + x) * 4 + ch;
        rgba[at] = Math.round(255 - (255 - rgba[at]) * alpha);
      }
  }
}
