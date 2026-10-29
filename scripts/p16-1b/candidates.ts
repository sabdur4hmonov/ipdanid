// Research only: deliberately not imported by app, Worker, API or guide dispatch.
import type { GenerateOptions } from "../../src/core/engine";
import type { RegionBox, MaterialProfile } from "../../src/core/types";
import {
  ClassicScoreCache,
  ClassicScoreGeometry,
  CLASSIC_SCORE_REPAIR,
} from "../../src/core/classic-score-cache";
import {
  leastSquaresImportance,
  squareChordExcluded,
  SquareWeave,
} from "../../src/core/classic-least-squares";
import { connectionAllowed } from "../../src/core/geometry";
import {
  classicPins,
  referenceLinePixels,
} from "../../src/core/classic-reference";

export const recipes = Object.freeze({
  A: "p16-1b/feature-finish/1",
  B: "p16-1b/masked-xdog/1",
  C: "p16-1b/alternating-front/1",
});
export type Candidate = keyof typeof recipes;

// Compact support makes unmasked target bytes provably unchanged. Fixed facial
// proportions registered to reviewed boxes; not a claim of measured landmarks.
export function featureMask(n: number, faces: RegionBox[], mouth: boolean) {
  const out = new Float32Array(n * n);
  const ellipses = [
    [0.5, 0.43, 0.14, 0.26], // nose bridge
    [0.5, 0.63, 0.2, 0.09], // nostrils
    [0.5, 0.57, 0.16, 0.13], // tip shadow
    [0.28, 0.3, 0.2, 0.105],
    [0.72, 0.3, 0.2, 0.105],
    ...(mouth ? [[0.5, 0.805, 0.3, 0.12]] : []),
  ];
  for (const f of faces) {
    for (
      let y = Math.max(0, Math.floor(f.top * n));
      y < Math.min(n, Math.ceil((f.top + f.height) * n));
      y++
    )
      for (
        let x = Math.max(0, Math.floor(f.left * n));
        x < Math.min(n, Math.ceil((f.left + f.width) * n));
        x++
      ) {
        const fx = (x / n - f.left) / f.width,
          fy = (y / n - f.top) / f.height;
        for (const [cx, cy, rx, ry] of ellipses) {
          const r = Math.hypot((fx - cx) / rx, (fy - cy) / ry);
          const t = Math.max(0, Math.min(1, (1 - r) / 0.3));
          out[y * n + x] = Math.max(out[y * n + x], t * t * (3 - 2 * t));
        }
      }
  }
  return out;
}

function gaussian(source: Float32Array, n: number, sigma: number) {
  const radius = Math.ceil(3 * sigma),
    w = Float64Array.from({ length: radius * 2 + 1 }, (_, i) =>
      Math.exp(-((i - radius) ** 2) / (2 * sigma ** 2)),
    );
  const sum = w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) w[i] /= sum;
  const row = new Float32Array(source.length),
    out = new Float32Array(source.length);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let v = 0;
      for (let k = -radius; k <= radius; k++)
        v +=
          source[y * n + Math.max(0, Math.min(n - 1, x + k))] * w[k + radius];
      row[y * n + x] = v;
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let v = 0;
      for (let k = -radius; k <= radius; k++)
        v += row[Math.max(0, Math.min(n - 1, y + k)) * n + x] * w[k + radius];
      out[y * n + x] = v;
    }
  return out;
}

export function sketchTarget(
  pixels: Uint8Array,
  n: number,
  faces: RegionBox[],
) {
  if (pixels.length !== n * n * 3 || n < 32 || n > 500)
    throw Error("p16-1b/target-size");
  const mono = Float32Array.from(
    { length: n * n },
    (_, k) => pixels[k * 3] / 255,
  );
  const small = gaussian(mono, n, 1),
    large = gaussian(mono, n, 1.6),
    mask = featureMask(n, faces, false);
  const out = pixels.slice();
  for (let k = 0; k < mono.length; k++) {
    const d = small[k] - 0.98 * large[k];
    const edge = d >= -0.015 ? 0 : -Math.tanh(10 * (d + 0.015));
    if (!mask[k] || !edge) continue;
    const v = Math.round(255 * mono[k] * (1 - 0.18 * mask[k] * edge));
    out[k * 3] = out[k * 3 + 1] = out[k * 3 + 2] = v;
  }
  return out;
}

// Objective weights change scores, never the physical dose/residual update.
export class FeatureScoreCache {
  readonly sums: Float64Array;
  constructor(
    readonly geometry: ClassicScoreGeometry,
    readonly residual: Float32Array,
    readonly darkness: Float64Array,
    readonly weights: Float32Array,
  ) {
    if (
      [residual.length, darkness.length, weights.length].some(
        (n) => n !== geometry.resolution ** 2,
      )
    )
      throw Error("p16-1b/weighted-arrays");
    this.sums = new Float64Array(geometry.lines.length);
    for (let key = 0; key < geometry.lines.length; key++) {
      const line = geometry.lines[key];
      if (!line || geometry.buckets[key] !== key) continue;
      let sum = 0;
      for (const p of line)
        sum += weights[p] * darkness[p] * (2 * residual[p] - darkness[p]);
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
    for (const p of line)
      sum +=
        this.weights[p] *
        this.darkness[p] *
        (2 * this.residual[p] - this.darkness[p]);
    this.sums[this.geometry.buckets[key]] = sum;
    return sum / line.length;
  }
  apply(key: number) {
    const { offsets, references, lines } = this.geometry;
    for (const p of lines[key]!) {
      const before = this.residual[p];
      this.residual[p] -= this.darkness[p];
      const delta =
        this.weights[p] * 2 * this.darkness[p] * (this.residual[p] - before);
      for (let j = offsets[p]; j < offsets[p + 1]; j++)
        this.sums[references[j]] += delta;
    }
  }
}

export function researchGeometry(p: MaterialProfile, n: number) {
  return new ClassicScoreGeometry(p, n, (a, b) => squareChordExcluded(p, a, b));
}

// No production Instruction is emitted: research routes cannot masquerade as /3.
// undefined is an independent arithmetic-control clone, not a fourth candidate.
export async function fitResearch(
  o: GenerateOptions,
  candidate: Candidate | undefined,
  suppliedGeometry: ClassicScoreGeometry | false = researchGeometry(
    o.profile,
    o.resolution,
  ),
) {
  const geometry = suppliedGeometry || undefined;
  const n = o.resolution,
    p = o.profile,
    count = p.pins.length;
  if (
    o.pixels.length !== n * n * 3 ||
    (geometry && (geometry.profile !== p || geometry.resolution !== n)) ||
    count !== 240 ||
    o.lines !== 3000 ||
    p.threadMm !== 0.12 ||
    p.opacity !== 0.9 ||
    p.colors[0] !== "#000000"
  )
    throw Error("p16-1b/contract");
  const faces = o.kitPreparation?.transform.targetFaces ?? [];
  const importance = leastSquaresImportance(n, faces),
    darkness = Float64Array.from(importance, (v) => 0.08 * v);
  const err = Float32Array.from(
    { length: n * n },
    (_, k) =>
      Math.pow(1 - Math.fround(o.pixels[k * 3] / 255), 1.6) * importance[k],
  );
  const pins = classicPins(p, n),
    lines = new Map<number, Int32Array>(),
    legality = new Map<number, boolean>();
  let weights: Float32Array | undefined;
  const chord = (directed: number) => {
    let line = lines.get(directed);
    if (!line) {
      line = referenceLinePixels(
        pins[Math.floor(directed / count)],
        pins[directed % count],
        n,
      );
      lines.set(directed, line);
    }
    return line;
  };
  const directScore = (directed: number) => {
    let sum = 0;
    const line = chord(directed);
    for (const pixel of line) {
      const dd = darkness[pixel];
      sum += dd * (2 * err[pixel] - dd);
    }
    return sum / line.length;
  };
  const weightedScore = (directed: number) => {
    let sum = 0;
    const line = chord(directed);
    for (const pixel of line) {
      const dd = darkness[pixel];
      sum += weights![pixel] * dd * (2 * err[pixel] - dd);
    }
    return sum / line.length;
  };
  const applyDirect = (directed: number) => {
    for (const pixel of chord(directed)) err[pixel] -= darkness[pixel];
  };
  let cache: Pick<ClassicScoreCache, "score" | "directScore" | "apply"> =
    geometry
      ? new ClassicScoreCache(geometry, err, darkness)
      : { score: directScore, directScore, apply: applyDirect };
  const used = new Set<number>(),
    degree = new Uint16Array(count),
    directions = new Int32Array(count * count).fill(-1),
    weave = new SquareWeave(p);
  const right = [0],
    left = [0];
  const key = (a: number, b: number) => Math.min(a, b) * count + Math.max(a, b);
  const direction = (a: number, b: number) => {
    const k = key(a, b);
    if (directions[k] < 0) directions[k] = a * count + b;
    return directions[k];
  };
  for (let s = 0; s < 3000; s++) {
    if (o.cancelled?.()) throw new DOMException("Cancelled", "AbortError");
    if (candidate === "A" && s === 2550) {
      weights = Float32Array.from(
        featureMask(n, faces, true),
        (v) => 1 + 3 * v,
      );
      if (geometry)
        cache = new FeatureScoreCache(geometry, err, darkness, weights);
      else
        cache = {
          score: weightedScore,
          directScore: weightedScore,
          apply: applyDirect,
        };
    }
    const atLeft = candidate === "C" && s % 2 === 1;
    const end = atLeft ? left : right;
    const cur = end[end.length - 1],
      prev = end.length > 1 ? end[end.length - 2] : -1;
    // Left extensions are traversed in reverse in the completed route. Floating
    // intersection bins and directed DDA ties must use that FINAL orientation.
    const oriented = (a: number, b: number) =>
      atLeft ? direction(b, a) : direction(a, b);
    let best = -1,
      bestScore = -Infinity;
    for (let b = 0; b < count; b++) {
      const d = Math.abs(b - cur),
        k = key(cur, b);
      if (
        Math.min(d, count - d) < 25 ||
        b === prev ||
        used.has(k) ||
        squareChordExcluded(p, cur, b) ||
        !weave.allows(atLeft ? b : cur, atLeft ? cur : b) ||
        degree[cur] >= 160 ||
        degree[b] >= 160 ||
        (s + 1 < 3000 && degree[b] >= 159)
      )
        continue;
      if (!legality.has(k))
        legality.set(
          k,
          geometry
            ? !!geometry.legal[cur * count + b]
            : connectionAllowed(p, cur, b),
        );
      if (!legality.get(k)) continue;
      const directed = oriented(cur, b);
      let score = cache.score(directed);
      if (best >= 0 && Math.abs(score - bestScore) < CLASSIC_SCORE_REPAIR) {
        score = cache.directScore(directed);
        bestScore = cache.directScore(oriented(cur, best));
      }
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (best < 0) throw Error("p16-1b/no-legal-path");
    cache.apply(oriented(cur, best));
    used.add(key(cur, best));
    degree[cur]++;
    degree[best]++;
    end.push(best);
    weave.add(atLeft ? best : cur, atLeft ? cur : best);
    if ((s + 1) % 50 === 0) {
      o.onProgress?.((s + 1) / 3000);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  const path =
    candidate === "C" ? [...left.slice(1).reverse(), ...right] : right;
  assertResearchRoute(p, path);
  return {
    version: candidate ? recipes[candidate] : "p16-1b/control-clone/1",
    path,
  };
}

export function assertResearchRoute(p: MaterialProfile, path: number[]) {
  if (
    path.length !== 3001 ||
    path.some((v) => !Number.isInteger(v) || v < 0 || v >= 240)
  )
    throw Error("p16-1b/route-size");
  const used = new Set<number>(),
    degree = new Uint16Array(240),
    weave = new SquareWeave(p);
  for (let k = 1; k < path.length; k++) {
    const a = path[k - 1],
      b = path[k],
      d = Math.abs(a - b),
      key = Math.min(a, b) * 240 + Math.max(a, b);
    if (
      Math.min(d, 240 - d) < 25 ||
      used.has(key) ||
      squareChordExcluded(p, a, b) ||
      !connectionAllowed(p, a, b) ||
      !weave.allows(a, b)
    )
      throw Error("p16-1b/illegal-chord");
    used.add(key);
    degree[a]++;
    degree[b]++;
    weave.add(a, b);
  }
  if (degree.some((v) => v > 160)) throw Error("p16-1b/degree");
}
