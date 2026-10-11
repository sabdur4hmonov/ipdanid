import type { MaterialProfile } from "./types";

export interface PhysicalContrastSettings {
  version: "board-mm-forward/1";
  distancesMm: [number, number, number];
  derivativeReferenceMm: number;
  interpolation: "axis-linear/1";
  coordinateReference: "sample-centers/1";
  boundary: "all-samples-inside/1";
}
export const REFERENCE_PITCH_MM = 400 / 159;
export function defaultPhysicalContrast(): PhysicalContrastSettings {
  return {
    version: "board-mm-forward/1",
    distancesMm: [1, 2, 4].map((s) => s * REFERENCE_PITCH_MM) as [
      number,
      number,
      number,
    ],
    derivativeReferenceMm: REFERENCE_PITCH_MM,
    interpolation: "axis-linear/1",
    coordinateReference: "sample-centers/1",
    boundary: "all-samples-inside/1",
  };
}
export function validPhysicalContrast(s: PhysicalContrastSettings) {
  if (
    !s ||
    s.version !== "board-mm-forward/1" ||
    s.interpolation !== "axis-linear/1" ||
    s.coordinateReference !== "sample-centers/1" ||
    s.boundary !== "all-samples-inside/1" ||
    !Array.isArray(s.distancesMm) ||
    s.distancesMm.length !== 3 ||
    !s.distancesMm.every(
      (v, i) =>
        Number.isFinite(v) &&
        v >= 0.1 &&
        v <= 100 &&
        (!i || v > s.distancesMm[i - 1]),
    ) ||
    !Number.isFinite(s.derivativeReferenceMm) ||
    s.derivativeReferenceMm < 0.1 ||
    s.derivativeReferenceMm > 100
  )
    throw new Error("Invalid physical contrast distances");
}
export function physicalOffset(mm: number, axisMm: number, n: number) {
  const value = (mm / axisMm) * (n - 1),
    nearest = Math.round(value);
  // Snap only roundoff around mathematically integral offsets, never real fractional positions.
  return Math.abs(value - nearest) < 1e-10 ? nearest : value;
}

// Forward contrast residual r[a] - ((1-beta)r[b] + beta*r[c]). At an integral
// offset this is exactly v7's undirected pair, counted once, not a doubled central difference.
// Reverse CSR incidence includes anchors outside a changed strand's footprint.
export class PhysicalContrast {
  readonly a: Int32Array;
  readonly b: Int32Array;
  readonly c: Int32Array;
  readonly beta: Float64Array;
  readonly weight: Float64Array;
  readonly offsets: Int32Array;
  readonly incident: Int32Array;
  readonly marks: Uint32Array;
  readonly terms: number;
  readonly legacyEquivalent: boolean;
  readonly bytes: number;
  constructor(
    n: number,
    p: Pick<MaterialProfile, "widthMm" | "heightMm">,
    mask: Uint8Array,
    importance: Float64Array,
    edgeWeight: number,
    settings: PhysicalContrastSettings,
  ) {
    validPhysicalContrast(settings);
    if (
      !Number.isInteger(n) ||
      n < 32 ||
      n > 320 ||
      mask.length !== n * n ||
      importance.length !== n * n ||
      !Number.isFinite(edgeWeight) ||
      edgeWeight < 0 ||
      edgeWeight > 4 ||
      ![p.widthMm, p.heightMm].every(
        (x) => Number.isFinite(x) && x >= 50 && x <= 2000,
      )
    )
      throw new Error("Invalid physical contrast grid");
    const size = n * n,
      capacity = size * 6;
    this.a = new Int32Array(capacity);
    this.b = new Int32Array(capacity);
    this.c = new Int32Array(capacity);
    this.beta = new Float64Array(capacity);
    this.weight = new Float64Array(capacity);
    const degrees = new Int32Array(size);
    let count = 0;
    const xOffsets = settings.distancesMm.map((d) =>
      physicalOffset(d, p.widthMm, n),
    );
    const yOffsets = settings.distancesMm.map((d) =>
      physicalOffset(d, p.heightMm, n),
    );
    this.legacyEquivalent =
      xOffsets.every((v, k) => v === [1, 2, 4][k]) &&
      yOffsets.every((v, k) => v === [1, 2, 4][k]) &&
      settings.distancesMm.every(
        (d, k) => settings.derivativeReferenceMm / d === 1 / [1, 2, 4][k],
      );
    for (let i = 0; i < size; i++)
      if (mask[i]) {
        const x = i % n,
          y = Math.floor(i / n);
        for (let s = 0; s < 3; s++)
          for (let axis = 0; axis < 2; axis++) {
            const d = (axis ? yOffsets : xOffsets)[s],
              anchor = axis ? y : x,
              pos = anchor + d;
            if (pos > n - 1) continue;
            const low = Math.floor(pos),
              f = pos - low,
              high = f === 0 ? low : low + 1;
            const b = axis ? low * n + x : y * n + low,
              c = axis ? high * n + x : y * n + high;
            if (!mask[b] || !mask[c]) continue;
            this.a[count] = i;
            this.b[count] = b;
            this.c[count] = c;
            this.beta[count] = f;
            const pairImportance =
              0.5 *
              (importance[i] + importance[b] * (1 - f) + importance[c] * f);
            this.weight[count] =
              pairImportance *
              edgeWeight *
              (settings.derivativeReferenceMm / settings.distancesMm[s]) ** 2;
            degrees[i]++;
            if (b !== i) degrees[b]++;
            if (c !== i && c !== b) degrees[c]++;
            count++;
          }
      }
    this.terms = count;
    this.offsets = new Int32Array(size + 1);
    for (let i = 0; i < size; i++)
      this.offsets[i + 1] = this.offsets[i] + degrees[i];
    this.incident = new Int32Array(this.offsets[size]);
    const cursor = this.offsets.slice();
    for (let t = 0; t < count; t++)
      for (const i of new Set([this.a[t], this.b[t], this.c[t]]))
        this.incident[cursor[i]++] = t;
    this.marks = new Uint32Array(count);
    this.bytes = [
      this.a,
      this.b,
      this.c,
      this.beta,
      this.weight,
      this.offsets,
      this.incident,
      this.marks,
    ].reduce((sum, a) => sum + a.byteLength, 0);
  }
  objective(residual: Float64Array) {
    let value = 0;
    for (let t = 0; t < this.terms; t++) {
      const f = this.beta[t],
        e =
          residual[this.a[t]] -
          (1 - f) * residual[this.b[t]] -
          f * residual[this.c[t]];
      value += this.weight[t] * e * e;
    }
    return value;
  }
  gain(
    density: Float64Array,
    target: Float64Array,
    change: Float64Array,
    pixelMarks: Uint32Array,
    epoch: number,
    changed: Uint32Array,
  ) {
    let value = 0;
    for (const i of changed)
      for (let at = this.offsets[i]; at < this.offsets[i + 1]; at++) {
        const t = this.incident[at];
        if (this.marks[t] === epoch) continue;
        this.marks[t] = epoch;
        const a = this.a[t],
          b = this.b[t],
          c = this.c[t],
          f = this.beta[t];
        const e =
          density[a] -
          target[a] -
          (1 - f) * (density[b] - target[b]) -
          f * (density[c] - target[c]);
        const delta =
          (pixelMarks[a] === epoch ? change[a] : 0) -
          (1 - f) * (pixelMarks[b] === epoch ? change[b] : 0) -
          f * (pixelMarks[c] === epoch ? change[c] : 0);
        value += this.weight[t] * (e * e - (e + delta) ** 2);
      }
    return value;
  }
}
