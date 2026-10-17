import type { RegionBox, Shape } from "./types";
import { inside, createProfile } from "./geometry";

export function classicCircleProfile() {
  const p = createProfile("circle", 240, "dark", {
    widthMm: 500,
    heightMm: 500,
  });
  return {
    ...p,
    id: "phase8-circle46",
    version: 8,
    baseColor: "#ffffff",
    threadMm: 0.12,
    colors: ["#000000"],
    pins: p.pins.map((pin) => ({
      id: pin.id,
      x: 0.5 + ((pin.x - 0.5) * 0.46) / 0.48,
      y: 0.5 + ((pin.y - 0.5) * 0.46) / 0.48,
    })),
  };
}
export interface FaceFill {
  version:
    | "reviewed-face-fill/1"
    | "reviewed-face-fill/2"
    | "reviewed-head-framing/3"
    | "reviewed-customer-framing/4"
    | "reviewed-product-framing/5"
    | "reviewed-caption-framing/6";
  caption?: {
    version: "portrait-caption/1";
    text: string;
    font: import("./lettering-contract").LetteringFont;
    fontHash: string;
    bounds: RegionBox;
    portraitScale: number;
  };
  product?: {
    kind: "people" | "animal" | "vehicle" | "object" | "lettering";
    bounds?: RegionBox;
  };
  sourceBounds: RegionBox;
  targetBounds: RegionBox;
  faces: RegionBox[];
  targetFaces?: RegionBox[];
  framing?: {
    keepShoulders: boolean;
    adjustments: { zoom: number; x: number; y: number }[];
    heads: { source: RegionBox; target: RegionBox; chin: number }[];
    fadePx: number;
    rotation?: 0 | 1 | 2 | 3;
  };
}
export interface KitPreparation {
  version:
    | "standard-preparation/1"
    | "standard-preparation/2"
    | "standard-preparation/3"
    | "standard-preparation/4"
    | "standard-preparation/5"
    | "standard-preparation/6";
  sourceHash: string;
  sourceAspect: number;
  whiteBackground: "automatic" | "manual" | "original";
  transform: FaceFill;
}
// Explicit crop of real source pixels. A whole face union must fit; a failed
// detector never becomes an invented box. The caller shows and reviews this crop.
export function faceFill(
  faces: RegionBox[],
  shape: Shape,
  imageAspect = 1,
  scale = 1,
): FaceFill {
  if (
    !faces.length ||
    faces.length > (shape === "heart" ? 2 : 3) ||
    !(imageAspect > 0) ||
    !(scale > 0 && scale <= 1) ||
    faces.some(
      (b) =>
        ![b.left, b.top, b.width, b.height].every(Number.isFinite) ||
        b.left < 0 ||
        b.top < 0 ||
        b.width <= 0 ||
        b.height <= 0 ||
        b.left + b.width > 1 ||
        b.top + b.height > 1,
    )
  )
    throw Error("kit/face-count-or-bounds");
  const l = Math.min(...faces.map((b) => b.left)),
    t = Math.min(...faces.map((b) => b.top));
  const r = Math.max(...faces.map((b) => b.left + b.width)),
    b = Math.max(...faces.map((b) => b.top + b.height));
  const padding = 0.08 * Math.max(r - l, b - t);
  const sourceBounds = {
    left: Math.max(0, l - padding),
    top: Math.max(0, t - padding),
    width: Math.min(1, r + padding) - Math.max(0, l - padding),
    height: Math.min(1, b + padding) - Math.max(0, t - padding),
  };
  const ratio = (sourceBounds.width * imageAspect) / sourceBounds.height;
  let best: RegionBox | undefined;
  for (let yi = 3; yi <= 17; yi++)
    for (let xi = 3; xi <= 17; xi++) {
      const cx = xi / 20,
        cy = yi / 20;
      let lo = 0,
        hi = Math.min(0.92 * scale, (0.92 * scale) / ratio);
      for (let k = 0; k < 18; k++) {
        const h = (lo + hi) / 2,
          w = h * ratio;
        let fits = true;
        for (let edge = 0; edge < 4 && fits; edge++)
          for (let j = 0; j <= 32; j++) {
            const u = j / 32,
              x =
                cx -
                w / 2 +
                (edge === 0
                  ? u * w
                  : edge === 1
                    ? w
                    : edge === 2
                      ? (1 - u) * w
                      : 0),
              y =
                cy -
                h / 2 +
                (edge === 0
                  ? 0
                  : edge === 1
                    ? u * h
                    : edge === 2
                      ? h
                      : (1 - u) * h);
            if (
              !inside(shape, 0.5 + (x - 0.5) / scale, 0.5 + (y - 0.5) / scale)
            ) {
              fits = false;
              break;
            }
          }
        if (fits) lo = h;
        else hi = h;
      }
      const candidate = {
        left: cx - (lo * ratio) / 2,
        top: cy - lo / 2,
        width: lo * ratio,
        height: lo,
      };
      if (!best || candidate.height > best.height + 1e-6) best = candidate;
    }
  if (!best || best.height < 0.1 || best.width < 0.1)
    throw Error("kit/face-fill-unavailable");
  return {
    version: "reviewed-face-fill/1",
    sourceBounds,
    targetBounds: best,
    faces: structuredClone(faces),
  };
}
