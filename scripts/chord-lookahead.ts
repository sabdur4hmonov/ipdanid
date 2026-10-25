// Research only. Never imported by the app or serialized as a production guide.
import type { MaterialProfile, RegionBox } from "../src/core/types";
import {
  classicPins,
  referenceLinePixels,
} from "../src/core/classic-reference";
import {
  leastSquaresImportance,
  squareChordExcluded,
} from "../src/core/classic-least-squares";
import { connectionAllowed } from "../src/core/geometry";

export class ExactChordScores {
  readonly sums: Float64Array;
  private offsets: Uint32Array;
  private references: Uint16Array;
  private marks: Uint32Array;
  private changes: Float64Array;
  private epoch = 0;
  constructor(
    readonly chords: (Int32Array | undefined)[],
    readonly residual: Float32Array,
    readonly darkness: Float64Array,
  ) {
    if (chords.length > 65536 || residual.length !== darkness.length)
      throw Error("research/cache-size");
    this.sums = new Float64Array(chords.length);
    this.offsets = new Uint32Array(residual.length + 1);
    this.marks = new Uint32Array(residual.length);
    this.changes = new Float64Array(residual.length);
    for (let key = 0; key < chords.length; key++) {
      const line = chords[key];
      if (!line) continue;
      for (const p of line) {
        this.offsets[p + 1]++;
        const dd = darkness[p];
        this.sums[key] += dd * (2 * residual[p] - dd);
      }
    }
    for (let p = 1; p < this.offsets.length; p++)
      this.offsets[p] += this.offsets[p - 1];
    this.references = new Uint16Array(this.offsets[this.offsets.length - 1]);
    const cursor = this.offsets.slice();
    for (let key = 0; key < chords.length; key++) {
      const line = chords[key];
      if (line) for (const p of line) this.references[cursor[p]++] = key;
    }
  }
  get bytes() {
    return (
      this.sums.byteLength +
      this.offsets.byteLength +
      this.references.byteLength +
      this.marks.byteLength +
      this.changes.byteLength +
      this.residual.byteLength +
      this.darkness.byteLength +
      this.chords.reduce((s, c) => s + (c?.byteLength ?? 0), 0)
    );
  }
  score(key: number) {
    return this.sums[key] / this.chords[key]!.length;
  }
  directScore(key: number) {
    let sum = 0;
    for (const p of this.chords[key]!) {
      const dd = this.darkness[p];
      sum += dd * (2 * this.residual[p] - dd);
    }
    return sum / this.chords[key]!.length;
  }
  hypothetical(key: number) {
    if (++this.epoch === 0xffffffff) {
      this.marks.fill(0);
      this.epoch = 1;
    }
    for (const p of this.chords[key]!) {
      this.marks[p] = this.epoch;
      this.changes[p] =
        2 *
        this.darkness[p] *
        (Math.fround(this.residual[p] - this.darkness[p]) - this.residual[p]);
    }
  }
  scoreAfterHypothetical(key: number) {
    let sum = this.sums[key];
    for (const p of this.chords[key]!)
      if (this.marks[p] === this.epoch) sum += this.changes[p];
    return sum / this.chords[key]!.length;
  }
  apply(key: number) {
    for (const p of this.chords[key]!) {
      const before = this.residual[p];
      this.residual[p] -= this.darkness[p];
      const delta = 2 * this.darkness[p] * (this.residual[p] - before);
      for (let j = this.offsets[p]; j < this.offsets[p + 1]; j++)
        this.sums[this.references[j]] += delta;
    }
  }
}

export function researchLookahead(
  profile: MaterialProfile,
  pixels: Uint8Array,
  n: number,
  lines: number,
  faces: RegionBox[],
  options: {
    cancelled?: () => boolean;
    progress?: (p: number) => void;
    greedyControl?: boolean;
  } = {},
) {
  const started = performance.now(),
    count = profile.pins.length;
  if (
    count > 256 ||
    pixels.length !== n * n * 3 ||
    n < 32 ||
    n > 500 ||
    lines < 1
  )
    throw Error("research/input");
  const check = () => {
    if (options.cancelled?.())
      throw new DOMException("Cancelled", "AbortError");
  };
  check();
  const pins = classicPins(profile, n),
    importance = leastSquaresImportance(n, faces),
    darkness = Float64Array.from(importance, (v) => 0.08 * v),
    residual = Float32Array.from(
      importance,
      (v, k) => Math.pow(1 - Math.fround(pixels[k * 3] / 255), 1.6) * v,
    ),
    chords: (Int32Array | undefined)[] = new Array(count * count),
    bins = new Int16Array(count * count).fill(-1),
    crossings = new Uint8Array(1001),
    used = new Uint8Array(count * count),
    orientation = new Int32Array(count * count).fill(-1),
    degree = new Uint16Array(count),
    path = [0];
  const key = (a: number, b: number) => Math.min(a, b) * count + Math.max(a, b);
  let reversedDifferences = 0;
  for (let a = 0; a < count; a++) {
    check();
    for (let b = a + 1; b < count; b++) {
      if (
        Math.min(b - a, count - (b - a)) < 25 ||
        squareChordExcluded(profile, a, b) ||
        !connectionAllowed(profile, a, b)
      )
        continue;
      const k = key(a, b),
        line = referenceLinePixels(pins[a], pins[b], n),
        reverse = referenceLinePixels(pins[b], pins[a], n);
      const directional =
        line.length !== reverse.length ||
        line.some((p, i) => p !== reverse[reverse.length - i - 1]);
      if (directional) {
        reversedDifferences++;
      }
      // Even equal pixel sets can sum differently in reverse order at exact ties.
      chords[b * count + a] = reverse;
      chords[k] = line;
      if (
        profile.shape === "rectangle" &&
        profile.standardKit?.chordPolicy === "axis-interior-skip/2"
      ) {
        const u = profile.pins[a],
          v = profile.pins[b];
        if ((u.y - 0.5) * (v.y - 0.5) < 0)
          bins[k] = Math.max(
            0,
            Math.min(
              1000,
              Math.round(
                (u.x + ((0.5 - u.y) / (v.y - u.y)) * (v.x - u.x)) * 1000,
              ),
            ),
          );
      }
      bins[b * count + a] = bins[k];
    }
  }
  // Preserve /3's first-encounter direction for the few ULP-sensitive raster lines.
  // Hypothetical visits must not prematurely bind a future cache orientation.
  const cache = new ExactChordScores(chords, residual, darkness),
    initializedMs = performance.now() - started;
  type Candidate = { b: number; key: number; score: number };
  const top = (
    a: number,
    prev: number,
    step: number,
    limit: number,
    firstKey = -1,
  ): Candidate[] => {
    const out: Candidate[] = [];
    for (let b = 0; b < count; b++) {
      const pair = key(a, b),
        k =
          orientation[pair] >= 0
            ? orientation[pair]
            : a > b && chords[a * count + b]
              ? a * count + b
              : pair,
        h = bins[k];
      if (
        !chords[k] ||
        used[pair] ||
        k === firstKey ||
        b === prev ||
        degree[a] + (firstKey >= 0 ? 1 : 0) >= 160 ||
        degree[b] >= (step + 1 < lines ? 159 : 160) ||
        (h >= 0 &&
          crossings[h] + (firstKey >= 0 && h === bins[firstKey] ? 1 : 0) >= 8)
      )
        continue;
      if (firstKey < 0) orientation[pair] = k;
      const candidate = { b, key: k, score: cache.score(k) };
      let position = 0;
      while (position < out.length) {
        // Incremental accumulation must not flip exact symmetric ties.
        if (Math.abs(out[position].score - candidate.score) < 1e-9) {
          out[position].score = cache.directScore(out[position].key);
          candidate.score = cache.directScore(candidate.key);
        }
        if (out[position].score < candidate.score) break;
        position++;
      }
      if (position < limit) {
        out.splice(position, 0, candidate);
        if (out.length > limit) out.pop();
      }
    }
    return out;
  };
  for (let step = 0; step < lines; step++) {
    check();
    const current = path[path.length - 1],
      prev = path[path.length - 2] ?? -1;
    const first = top(current, prev, step, options.greedyControl ? 1 : 4);
    let selected: Candidate | undefined,
      best = -Infinity;
    for (const candidate of first) {
      let score = candidate.score;
      if (!options.greedyControl && step + 1 < lines) {
        cache.hypothetical(candidate.key);
        const second = top(candidate.b, current, step + 1, 8, candidate.key);
        if (!second.length) continue;
        score += Math.max(
          ...second.map((s) => cache.scoreAfterHypothetical(s.key)),
        );
      }
      if (score > best) {
        best = score;
        selected = candidate;
      }
    }
    if (!selected) throw Error(`research/no-legal-exit:${step}`);
    cache.apply(selected.key);
    used[key(current, selected.b)] = 1;
    degree[current]++;
    degree[selected.b]++;
    if (bins[selected.key] >= 0) crossings[bins[selected.key]]++;
    path.push(selected.b);
    if (step % 100 === 0) options.progress?.(step / lines);
  }
  return {
    path,
    elapsedMs: performance.now() - started,
    initializedMs,
    cacheBytes: cache.bytes,
    maxDegree: Math.max(...degree),
    maxCrossing: Math.max(...crossings),
    reversedDifferences,
  };
}
