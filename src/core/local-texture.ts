import { PhysicalContrast } from "./physical-contrast";
import { contains, portraitRegions, validPortrait } from "./portrait";
import type { MaterialProfile, PortraitSettings } from "./types";

export interface LocalTextureSettings {
  version: "fixed-source-excess-gradient/1";
  reference: "processed-target/sample-centers-v1";
  distanceMm: number;
  strength: number;
  mask: "light-face-excluding-features/1";
  minimumTone: number;
  maximumTone: number;
  search: "fixed-plus-minus-one/1";
}
export const DEFAULT_LOCAL_TEXTURE: LocalTextureSettings = {
  version: "fixed-source-excess-gradient/1",
  reference: "processed-target/sample-centers-v1",
  distanceMm: 1.25,
  strength: 1,
  mask: "light-face-excluding-features/1",
  minimumTone: 0.6,
  maximumTone: 0.92,
  search: "fixed-plus-minus-one/1",
};
export function validLocalTexture(s: LocalTextureSettings) {
  if (
    !s ||
    s.version !== DEFAULT_LOCAL_TEXTURE.version ||
    s.reference !== DEFAULT_LOCAL_TEXTURE.reference ||
    s.mask !== DEFAULT_LOCAL_TEXTURE.mask ||
    s.search !== DEFAULT_LOCAL_TEXTURE.search ||
    !Number.isFinite(s.distanceMm) ||
    s.distanceMm < 0.5 ||
    s.distanceMm > 5 ||
    !Number.isFinite(s.strength) ||
    s.strength < 0 ||
    s.strength > 4 ||
    ![s.minimumTone, s.maximumTone].every(
      (v) => Number.isFinite(v) && v >= 0 && v <= 1,
    ) ||
    s.minimumTone >= s.maximumTone
  )
    throw Error("Invalid local texture settings");
}
// Exact excess source-gradient energy. No made-up contours, target edits or source overlay.
export class LocalTexture {
  readonly operator: PhysicalContrast;
  readonly sourceEnergy: Float64Array;
  readonly active: Uint8Array;
  constructor(
    n: number,
    p: MaterialProfile,
    portrait: PortraitSettings,
    target: Float64Array,
    mask: Uint8Array,
    weight: Float64Array,
    s: LocalTextureSettings,
  ) {
    validLocalTexture(s);
    validPortrait(portrait);
    if (
      !portrait.enabled ||
      portrait.people ||
      portrait.regions?.placement !== "manual" ||
      target.length !== n * n ||
      target.some((v) => !Number.isFinite(v) || v < 0 || v > 1)
    )
      throw Error("Local texture requires reviewed single-person regions");
    const boxes = portraitRegions(portrait);
    this.active = new Uint8Array(n * n);
    for (let k = 0; k < n * n; k++) {
      const x = (k % n) / (n - 1),
        y = Math.floor(k / n) / (n - 1);
      this.active[k] = +(
        !!mask[k] &&
        target[k] >= s.minimumTone &&
        target[k] <= s.maximumTone &&
        contains(boxes.face, x, y) &&
        ![boxes.eyes, boxes.nose, boxes.mouth].some((b) => contains(b, x, y))
      );
    }
    this.operator = new PhysicalContrast(
      n,
      p,
      this.active,
      weight,
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
    this.sourceEnergy = Float64Array.from(
      { length: this.operator.terms },
      (_, t) => this.gradient(target, t) ** 2,
    );
  }
  private gradient(d: Float64Array, t: number) {
    const o = this.operator;
    return d[o.a[t]] - (1 - o.beta[t]) * d[o.b[t]] - o.beta[t] * d[o.c[t]];
  }
  objective(d: Float64Array) {
    let sum = 0;
    for (let t = 0; t < this.operator.terms; t++)
      sum +=
        this.operator.weight[t] *
        Math.max(0, this.gradient(d, t) ** 2 - this.sourceEnergy[t]);
    return sum;
  }
  gain(
    d: Float64Array,
    change: Float64Array,
    pixelMarks: Uint32Array,
    epoch: number,
    changed: Uint32Array,
  ) {
    const o = this.operator;
    let value = 0;
    for (const k of changed)
      for (let at = o.offsets[k]; at < o.offsets[k + 1]; at++) {
        const t = o.incident[at];
        if (o.marks[t] === epoch) continue;
        o.marks[t] = epoch;
        const a = o.a[t],
          b = o.b[t],
          c = o.c[t],
          f = o.beta[t],
          e = this.gradient(d, t),
          delta =
            (pixelMarks[a] === epoch ? change[a] : 0) -
            (1 - f) * (pixelMarks[b] === epoch ? change[b] : 0) -
            f * (pixelMarks[c] === epoch ? change[c] : 0);
        value +=
          o.weight[t] *
          (Math.max(0, e * e - this.sourceEnergy[t]) -
            Math.max(0, (e + delta) ** 2 - this.sourceEnergy[t]));
      }
    return value;
  }
}
