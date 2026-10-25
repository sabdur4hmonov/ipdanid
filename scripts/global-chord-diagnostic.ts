// Deliberately NOT a buildable instruction: removes the current-pin constraint
// only, to diagnose whether continuity is the dominant source of missing detail.
import type { MaterialProfile, RegionBox } from "../src/core/types";
import {
  classicPins,
  referenceLinePixels,
} from "../src/core/classic-reference";
import {
  leastSquaresImportance,
  squareChordExcluded,
  SquareWeave,
} from "../src/core/classic-least-squares";
import { connectionAllowed } from "../src/core/geometry";
import { ExactChordScores } from "./chord-lookahead";

export function globalChordDiagnostic(
  p: MaterialProfile,
  pixels: Uint8Array,
  n: number,
  lines: number,
  faces: RegionBox[],
  cancelled?: () => boolean,
) {
  const started = performance.now(),
    count = p.pins.length;
  if (
    pixels.length !== n * n * 3 ||
    count > 256 ||
    n < 32 ||
    n > 500 ||
    !Number.isInteger(lines) ||
    lines < 1
  )
    throw Error("diagnostic/input");
  const check = () => {
    if (cancelled?.()) throw new DOMException("Cancelled", "AbortError");
  };
  check();
  const importance = leastSquaresImportance(n, faces),
    dd = Float64Array.from(importance, (v) => 0.08 * v),
    err = Float32Array.from(
      importance,
      (v, k) => Math.pow(1 - Math.fround(pixels[k * 3] / 255), 1.6) * v,
    ),
    pins = classicPins(p, n),
    chords: (Int32Array | undefined)[] = new Array(count * count),
    endpoints: { key: number; a: number; b: number }[] = [],
    degree = new Uint16Array(count),
    used = new Uint8Array(count * count),
    weave = new SquareWeave(p);
  for (let a = 0; a < count; a++) {
    check();
    for (let b = a + 1; b < count; b++) {
      if (
        Math.min(b - a, count - b + a) < 25 ||
        squareChordExcluded(p, a, b) ||
        !connectionAllowed(p, a, b)
      )
        continue;
      const key = a * count + b;
      chords[key] = referenceLinePixels(pins[a], pins[b], n);
      endpoints.push({ key, a, b });
    }
  }
  const cache = new ExactChordScores(chords, err, dd),
    edges: [number, number][] = [];
  for (let step = 0; step < lines; step++) {
    check();
    let best = -1,
      bestScore = -Infinity;
    for (let j = 0; j < endpoints.length; j++) {
      const { key, a, b } = endpoints[j];
      if (
        used[key] ||
        degree[a] >= 160 ||
        degree[b] >= 160 ||
        !weave.allows(a, b)
      )
        continue;
      let score = cache.score(key);
      if (best >= 0 && Math.abs(score - bestScore) < 1e-9) {
        bestScore = cache.directScore(endpoints[best].key);
        score = cache.directScore(key);
      }
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
    }
    if (best < 0) throw Error("diagnostic/no-legal-chord");
    const { key, a, b } = endpoints[best];
    used[key] = 1;
    degree[a]++;
    degree[b]++;
    weave.add(a, b);
    cache.apply(key);
    edges.push([a, b]);
  }
  const parent = Int32Array.from({ length: count }, (_, i) => i),
    root = (a: number): number =>
      parent[a] === a ? a : (parent[a] = root(parent[a]));
  for (const [a, b] of edges) parent[root(a)] = root(b);
  const components = new Set(
    Array.from(degree, (_, i) => i)
      .filter((i) => degree[i])
      .map(root),
  ).size;
  return {
    edges,
    elapsedMs: performance.now() - started,
    cacheBytes: cache.bytes,
    maxDegree: Math.max(...degree),
    oddVertices: Array.from(degree).filter((v) => v % 2).length,
    components,
  };
}
