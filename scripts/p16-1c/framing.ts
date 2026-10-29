// Versioned, review-only composition option. Never imported by the app/Worker/API.
import type { RegionBox, Shape } from "../../src/core/types";
import { frameFreePhoto } from "../../src/core/free-photo-framing";
import { chinOpacity } from "../../src/core/portrait-framing";

export const FRAMING_OPTION = "p16-1c/reviewed-framing/1";
export type FramingLevel = "F1" | "F2";
export function closerFraming(
  face: RegionBox,
  nose: { x: number; y: number },
  shape: Shape,
  aspect: number,
  level: FramingLevel,
) {
  if (
    ![
      face.left,
      face.top,
      face.width,
      face.height,
      nose.x,
      nose.y,
      aspect,
    ].every(Number.isFinite) ||
    face.height <= 0.04 ||
    !["F1", "F2"].includes(level)
  )
    throw Error("p16-1c/landmarks");
  // Existing detector oval boxes have .02 source-edge padding. Their unpadded
  // upper oval is the hairline proxy, not the top of the scalp/hair mass.
  const hairline = face.top + 0.02,
    chin = face.top + face.height - 0.02;
  if (
    nose.y <= hairline ||
    nose.y >= chin ||
    nose.x < face.left ||
    nose.x > face.left + face.width
  )
    throw Error("p16-1c/nose-outside-face");
  const requestedHeight = level === "F1" ? 0.5 : 0.65;
  const initial = frameFreePhoto("people", [face], shape, aspect);
  const zoom = Math.min(
    4,
    requestedHeight / (chin - hairline) / initial.targetBounds.height,
  );
  const height = initial.targetBounds.height * zoom,
    width = height * aspect;
  const adjustment = {
    zoom,
    x: (0.5 - nose.x) * width,
    y: 0.42 - (shape === "heart" ? 0.55 : 0.5) + (0.5 - nose.y) * height,
  };
  const transform = frameFreePhoto("people", [face], shape, aspect, adjustment);
  const t = transform.targetBounds;
  return {
    option: FRAMING_OPTION,
    level,
    transform,
    sourceHairline: hairline,
    sourceChin: chin,
    sourceNose: nose,
    requestedHeight,
    achievedHeight: (chin - hairline) * height,
    zoomCapped: zoom === 4,
    targetNose: { x: t.left + nose.x * t.width, y: t.top + nose.y * t.height },
    targetChin: t.top + chin * t.height,
    fadePx: 18,
    whiteBackground: true,
    keepShoulders: false,
  };
}
export function fadeBelowChin(pixels: Uint8Array, chin: number) {
  if (pixels.length !== 500 * 500 * 3 || !Number.isFinite(chin))
    throw Error("p16-1c/fade-input");
  const out = pixels.slice();
  for (let y = 0; y < 500; y++) {
    const alpha = chinOpacity((y + 0.5) / 500, chin, false, 500);
    for (let x = 0; x < 500; x++)
      for (let c = 0; c < 3; c++) {
        const k = (y * 500 + x) * 3 + c;
        out[k] = Math.round(255 - (255 - pixels[k]) * alpha);
      }
  }
  return out;
}
