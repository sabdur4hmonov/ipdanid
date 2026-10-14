import type { MaterialProfile } from "./types";
import { defaultPhysicalContrast, physicalOffset } from "./physical-contrast";

export interface RegionQuality {
  maskReference: string;
  pixels: number;
  toneError: number;
  coarseToneError: number;
  physicalContrastResidual: number;
  physicalTerms: number;
  meanDarkExcess: number;
  meanLightExcess: number;
  fineTargetEnergy: number;
  fineSequenceEnergy: number;
  excessTextureEnergy: number;
}

// Evaluation only. Masks and source are frozen outside the immutable guide.
// A numerical screen never approves visible likeness or physical fabrication.
export function regionQuality(
  target: Float64Array,
  rendered: Float64Array,
  region: Uint8Array,
  n: number,
  profile: Pick<MaterialProfile, "widthMm" | "heightMm">,
): RegionQuality {
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    target.length !== n * n ||
    rendered.length !== n * n ||
    region.length !== n * n ||
    ![profile.widthMm, profile.heightMm].every(
      (v) => Number.isFinite(v) && v >= 50 && v <= 2000,
    ) ||
    target.some((v) => !Number.isFinite(v) || v < 0 || v > 1) ||
    rendered.some((v) => !Number.isFinite(v) || v < 0 || v > 1)
  )
    throw Error("Invalid quality evaluation grid");
  const distances = defaultPhysicalContrast();
  let pixels = 0,
    tone = 0,
    dark = 0,
    light = 0,
    contrast = 0,
    terms = 0;
  let fineTarget = 0,
    fineSequence = 0,
    fineExcess = 0,
    fineTerms = 0;
  const stepX = Math.max(1, Math.round((5 * (n - 1)) / profile.widthMm));
  const stepY = Math.max(1, Math.round((5 * (n - 1)) / profile.heightMm));
  const columns = Math.ceil(n / stepX),
    cells = new Map<number, { count: number; t: number; r: number }>();
  let maskReference = `${n}/${profile.widthMm}/${profile.heightMm}/`;
  for (let k = 0; k < region.length; k += 4) {
    let bits = 0;
    for (let j = 0; j < 4; j++) bits = bits * 2 + (region[k + j] ? 1 : 0);
    maskReference += bits.toString(16);
  }
  for (let k = 0; k < n * n; k++) {
    if (!region[k]) continue;
    const x = k % n,
      y = Math.floor(k / n),
      error = rendered[k] - target[k];
    pixels++;
    tone += error * error;
    dark += Math.max(0, -error);
    light += Math.max(0, error);
    const key = Math.floor(y / stepY) * columns + Math.floor(x / stepX);
    const cell = cells.get(key) ?? { count: 0, t: 0, r: 0 };
    cell.count++;
    cell.t += target[k];
    cell.r += rendered[k];
    cells.set(key, cell);
    for (const mm of [...distances.distancesMm, 1.25])
      for (const axis of [0, 1]) {
        const position =
          (axis ? y : x) +
          physicalOffset(mm, axis ? profile.heightMm : profile.widthMm, n);
        if (position > n - 1) continue;
        const lo = Math.floor(position),
          hi = Math.ceil(position),
          f = position - lo;
        const b = axis ? lo * n + x : y * n + lo,
          c = axis ? hi * n + x : y * n + hi;
        if (!region[b] || !region[c]) continue;
        const a = target[k] - (1 - f) * target[b] - f * target[c];
        const d = rendered[k] - (1 - f) * rendered[b] - f * rendered[c];
        if (mm === 1.25) {
          fineTerms++;
          fineTarget += a * a;
          fineSequence += d * d;
          fineExcess += Math.max(0, d * d - a * a);
        } else {
          terms++;
          contrast +=
            (d - a) ** 2 * (distances.derivativeReferenceMm / mm) ** 2;
        }
      }
  }
  if (!pixels) throw Error("Empty quality region");
  let coarse = 0;
  for (const cell of cells.values())
    coarse += cell.count * ((cell.r - cell.t) / cell.count) ** 2;
  return {
    maskReference,
    pixels,
    toneError: tone / pixels,
    coarseToneError: coarse / pixels,
    physicalContrastResidual: contrast / Math.max(1, terms),
    physicalTerms: terms,
    meanDarkExcess: dark / pixels,
    meanLightExcess: light / pixels,
    fineTargetEnergy: fineTarget / Math.max(1, fineTerms),
    fineSequenceEnergy: fineSequence / Math.max(1, fineTerms),
    excessTextureEnergy: fineExcess / Math.max(1, fineTerms),
  };
}

export function screenQuality(
  reference: Record<string, RegionQuality>,
  candidate: Record<string, RegionQuality>,
) {
  const failures: {
    region: string;
    metric: string;
    reference: number;
    candidate: number;
    allowedRise: number;
  }[] = [];
  if (
    Object.keys(reference).sort().join("|") !==
    Object.keys(candidate).sort().join("|")
  )
    throw Error("Quality screen requires the same complete regional set");
  for (const [region, before] of Object.entries(reference)) {
    const after = candidate[region];
    if (
      before.maskReference !== after.maskReference ||
      before.pixels !== after.pixels ||
      !before.physicalTerms ||
      before.physicalTerms !== after.physicalTerms
    )
      throw Error(
        "Quality screen requires fixed populated masks and contrast terms",
      );
    for (const metric of [
      "toneError",
      "coarseToneError",
      "physicalContrastResidual",
    ] as const) {
      const allowedRise = Math.max(before[metric] * 0.02, 0.0001);
      if (
        !Number.isFinite(after[metric]) ||
        after[metric] > before[metric] + allowedRise
      )
        failures.push({
          region,
          metric,
          reference: before[metric],
          candidate: after[metric],
          allowedRise,
        });
    }
    if (
      region === "skin" &&
      after.meanDarkExcess > before.meanDarkExcess + 1 / 255
    )
      failures.push({
        region,
        metric: "meanDarkExcess",
        reference: before.meanDarkExcess,
        candidate: after.meanDarkExcess,
        allowedRise: 1 / 255,
      });
  }
  return {
    version: "fixed-regional-screen/1" as const,
    metricsPass: failures.length === 0,
    failures,
    visualAcceptanceRequired: true,
  };
}
