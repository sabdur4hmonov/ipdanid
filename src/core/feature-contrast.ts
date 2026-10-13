import { PhysicalContrast, physicalOffset } from "./physical-contrast";
import { portraitRegions, validPortrait, contains } from "./portrait";
import type { MaterialProfile, PortraitSettings, RegionBox } from "./types";
export interface FeatureContrastSettings {
  version: "source-feature-contrast/1";
  reference: "processed-target/sample-centers-v1";
  distanceMm: number;
  strength: number;
  gradientReference: number;
  maximumSourceBoost: number;
  taper: "raised-cosine/1";
  source: "exact-target-luminance/1";
}
export const DEFAULT_FEATURE_CONTRAST: FeatureContrastSettings = {
  version: "source-feature-contrast/1",
  reference: "processed-target/sample-centers-v1",
  distanceMm: 1.25,
  strength: 1,
  gradientReference: 0.03,
  maximumSourceBoost: 3,
  taper: "raised-cosine/1",
  source: "exact-target-luminance/1",
};
export function validFeatureContrast(s: FeatureContrastSettings) {
  if (
    !s ||
    s.version !== "source-feature-contrast/1" ||
    s.reference !== "processed-target/sample-centers-v1" ||
    s.taper !== "raised-cosine/1" ||
    s.source !== "exact-target-luminance/1" ||
    !Number.isFinite(s.distanceMm) ||
    s.distanceMm < 0.5 ||
    s.distanceMm > 5 ||
    !Number.isFinite(s.strength) ||
    s.strength < 0.1 ||
    s.strength > 4 ||
    !Number.isFinite(s.gradientReference) ||
    s.gradientReference < 0.005 ||
    s.gradientReference > 0.2 ||
    !Number.isFinite(s.maximumSourceBoost) ||
    s.maximumSourceBoost < 1 ||
    s.maximumSourceBoost > 4
  )
    throw Error("Invalid source feature contrast");
}
function taper(b: RegionBox, x: number, y: number) {
  if (!contains(b, x, y)) return 0;
  return (
    ((1 - Math.cos((2 * Math.PI * (x - b.left)) / b.width)) *
      (1 - Math.cos((2 * Math.PI * (y - b.top)) / b.height))) /
    4
  );
}
export function featureContrast(
  n: number,
  p: MaterialProfile,
  portrait: PortraitSettings,
  target: Float64Array,
  mask: Uint8Array,
  baseWeight: Float64Array,
  s: FeatureContrastSettings,
) {
  validFeatureContrast(s);
  validPortrait(portrait);
  if (
    !portrait.enabled ||
    portrait.people ||
    portrait.regions?.placement !== "manual" ||
    portrait.regions.reference !== s.reference ||
    target.length !== n * n
  )
    throw Error(
      "Source feature contrast requires reviewed single-person regions",
    );
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 320 ||
    mask.length !== n * n ||
    baseWeight.length !== n * n ||
    target.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
    baseWeight.some((v) => !Number.isFinite(v) || v < 0)
  )
    throw Error("Invalid source feature grid");
  const regions = portraitRegions(portrait),
    weights = new Float64Array(n * n),
    active = new Uint8Array(n * n);
  const offsets = [
    physicalOffset(s.distanceMm, p.widthMm, n),
    physicalOffset(s.distanceMm, p.heightMm, n),
  ];
  for (let i = 0; i < n * n; i++) {
    if (!mask[i]) continue;
    const x = i % n,
      y = Math.floor(i / n),
      local = Math.max(
        taper(regions.nose, x / (n - 1), y / (n - 1)),
        taper(regions.mouth, x / (n - 1), y / (n - 1)),
      );
    if (local <= 0) continue;
    let energy = 0,
      terms = 0;
    for (let axis = 0; axis < 2; axis++) {
      const pos = (axis ? y : x) + offsets[axis],
        low = Math.floor(pos),
        high = Math.ceil(pos),
        f = pos - low;
      if (high >= n) continue;
      const b = axis ? low * n + x : y * n + low,
        c = axis ? high * n + x : y * n + high;
      if (!mask[b] || !mask[c]) continue;
      const d = target[i] - (1 - f) * target[b] - f * target[c];
      energy += d * d;
      terms++;
    }
    active[i] = 1;
    weights[i] =
      baseWeight[i] *
      local *
      (1 +
        Math.min(
          s.maximumSourceBoost,
          Math.sqrt(energy / Math.max(1, terms)) / s.gradientReference,
        ));
  }
  // Only the first scale contributes; two unused placeholders keep the legacy three-scale API unchanged.
  const operator = new PhysicalContrast(
    n,
    p,
    active,
    weights,
    s.strength,
    {
      version: "board-mm-forward/1",
      distancesMm: [s.distanceMm, s.distanceMm * 2, s.distanceMm * 4],
      derivativeReferenceMm: s.distanceMm,
      interpolation: "axis-linear/1",
      coordinateReference: "sample-centers/1",
      boundary: "all-samples-inside/1",
    },
    [0],
  );
  return { operator, weights, active };
}
