import type { MaterialProfile } from "./types";
import { classicPins, referenceLinePixels } from "./classic-reference";
import { connectionAllowed } from "./geometry";

const MAX_CACHE_BYTES = 160 * 1024 * 1024;
// The /3 pixel sets AND their iteration order are directional at floating-point
// ties. Store both directions; each solve still binds the first eligible visit.
export class ClassicScoreGeometry {
  readonly lines: (Int32Array | undefined)[];
  readonly legal: Uint8Array;
  readonly buckets: Uint16Array;
  readonly offsets: Uint32Array;
  readonly references: Uint16Array;
  readonly bytes: number;
  constructor(
    readonly profile: MaterialProfile,
    readonly resolution: number,
    excluded: (a: number, b: number) => boolean,
    cancelled?: () => boolean,
  ) {
    const count = profile.pins.length;
    if (
      !Number.isInteger(resolution) ||
      resolution < 32 ||
      resolution > 500 ||
      count > 240 ||
      count < 24
    )
      throw Error("classic-cache/size");
    const pins = classicPins(profile, resolution);
    this.lines = new Array(count * count);
    this.legal = new Uint8Array(this.lines.length);
    this.buckets = Uint16Array.from({ length: this.lines.length }, (_, k) => k);
    this.offsets = new Uint32Array(resolution * resolution + 1);
    let bytes =
      this.legal.byteLength + this.offsets.byteLength + this.buckets.byteLength;
    for (let a = 0; a < count; a++) {
      if (cancelled?.()) throw new DOMException("Cancelled", "AbortError");
      for (let b = 0; b < count; b++) {
        const gap = Math.abs(a - b),
          key = a * count + b;
        if (
          Math.min(gap, count - gap) < 25 ||
          excluded(a, b) ||
          !connectionAllowed(profile, a, b)
        )
          continue;
        const line = referenceLinePixels(pins[a], pins[b], resolution);
        this.lines[key] = line;
        this.legal[key] = 1;
        bytes += line.byteLength;
        if (bytes > MAX_CACHE_BYTES) throw Error("classic-cache/ceiling");
        const reverse = this.lines[b * count + a];
        // Share only exactly reversed pixel sets; retain directed arrays for
        // canonical direct-sum order at ties and Float32 residual application.
        if (
          reverse &&
          reverse.length === line.length &&
          line.every((v, k) => v === reverse[reverse.length - 1 - k])
        )
          this.buckets[key] = this.buckets[b * count + a];
        else for (const p of line) this.offsets[p + 1]++;
      }
    }
    for (let p = 1; p < this.offsets.length; p++)
      this.offsets[p] += this.offsets[p - 1];
    const length = this.offsets[this.offsets.length - 1];
    if (bytes + length * 2 + this.offsets.byteLength > MAX_CACHE_BYTES)
      throw Error("classic-cache/ceiling");
    this.references = new Uint16Array(length);
    const cursor = this.offsets.slice();
    for (let key = 0; key < this.lines.length; key++) {
      const line = this.lines[key];
      if (line && this.buckets[key] === key)
        for (const p of line) this.references[cursor[p]++] = key;
    }
    this.bytes = bytes + this.references.byteLength;
  }
}

export class ClassicScoreCache {
  readonly sums: Float64Array;
  constructor(
    readonly geometry: ClassicScoreGeometry,
    readonly residual: Float32Array,
    readonly darkness: Float64Array,
  ) {
    if (
      residual.length !== geometry.resolution ** 2 ||
      darkness.length !== residual.length
    )
      throw Error("classic-cache/arrays");
    this.sums = new Float64Array(geometry.lines.length);
    for (let key = 0; key < geometry.lines.length; key++) {
      const line = geometry.lines[key];
      if (!line || geometry.buckets[key] !== key) continue;
      let sum = 0;
      for (const p of line) {
        const dd = darkness[p];
        sum += dd * (2 * residual[p] - dd);
      }
      this.sums[key] = sum;
    }
  }
  score(key: number) {
    return (
      this.sums[this.geometry.buckets[key]] / this.geometry.lines[key]!.length
    );
  }
  directScore(key: number) {
    let sum = 0;
    const line = this.geometry.lines[key]!;
    for (const p of line) {
      const dd = this.darkness[p];
      sum += dd * (2 * this.residual[p] - dd);
    }
    this.sums[this.geometry.buckets[key]] = sum;
    return sum / line.length;
  }
  apply(key: number) {
    const { offsets, references, lines } = this.geometry;
    for (const p of lines[key]!) {
      const before = this.residual[p];
      this.residual[p] -= this.darkness[p]; // Preserve the original Float32 rounding.
      const delta = 2 * this.darkness[p] * (this.residual[p] - before);
      for (let j = offsets[p]; j < offsets[p + 1]; j++)
        this.sums[references[j]] += delta;
    }
  }
}

// Conservative normalized-score repair window for <=3500strands, n<=500,
// dd<=.16, <=710pixels/chord. Even a worst-case3500*710 updates has a
// standard Float64 accumulation bound <1.3e-7per candidate. Repair both
// contenders at1e-6, preserving the direct loop's strict first-index tie rule.
export const CLASSIC_SCORE_REPAIR = 1e-6;
