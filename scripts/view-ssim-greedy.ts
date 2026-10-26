// Research only: a separate from-blank route, never serialized as an old guide.
import type { MaterialProfile, RegionBox } from "../src/core/types";
import { classicPins, classicFrame } from "../src/core/classic-reference";
import {
  leastSquaresImportance,
  squareChordExcluded,
  SquareWeave,
} from "../src/core/classic-least-squares";
import { connectionAllowed, inside } from "../src/core/geometry";
import { viewingImage } from "../tests/helpers/viewing-ssim";
import { ssimObjective } from "./viewing-ssim-gradient";

export function viewSsimGreedy(
  profile: MaterialProfile,
  pixels: Uint8Array,
  faces: RegionBox[],
  lines = 3000,
  whiteReference?: number[],
) {
  const started = performance.now(),
    n = 160,
    count = profile.pins.length;
  if (
    pixels.length !== 500 * 500 * 3 ||
    count !== 240 ||
    profile.colors[0] !== "#000000"
  )
    throw Error("view-ssim/input");
  const pins = classicPins(profile, 500).map((p) => ({
      x: (p.x * n) / 500,
      y: (p.y * n) / 500,
    })),
    goal = Float64Array.from(
      viewingImage(
        Float32Array.from({ length: 250000 }, (_, k) => pixels[k * 3] / 255),
        500,
      ),
    ),
    importance = leastSquaresImportance(n, faces),
    weights = Float64Array.from(importance, (v, k) =>
      inside(profile.shape, ((k % n) + 0.5) / n, (Math.floor(k / n) + 0.5) / n)
        ? v
        : 0,
    ),
    objective = ssimObjective(n, goal, weights),
    image = new Float64Array(n * n).fill(1),
    alpha = Math.min(
      1,
      (profile.threadMm / (classicFrame(profile).mm / n)) * profile.opacity,
    ),
    degree = new Uint16Array(count),
    used = new Uint8Array(count * count),
    legal = new Int8Array(count * count),
    cache = new Map<number, { indices: Uint16Array; alpha: Float32Array }>(),
    marks = new Uint32Array(n * n),
    coverage = new Float64Array(n * n),
    touched = new Uint16Array(n * n),
    weave = new SquareWeave(profile);
  let epoch = 0,
    bytes = 0,
    gradient = new Float64Array(n * n),
    score = 0;
  const key = (a: number, b: number) => Math.min(a, b) * count + Math.max(a, b);
  const footprint = (a: number, b: number) => {
    const k = key(a, b);
    if (cache.has(k)) return cache.get(k)!;
    const u = pins[Math.min(a, b)],
      v = pins[Math.max(a, b)],
      steps = Math.ceil(Math.hypot(u.x - v.x, u.y - v.y) * 2);
    epoch++;
    let length = 0;
    const add = (x: number, y: number, w: number) => {
      if (x < 0 || y < 0 || x >= n || y >= n) return;
      const i = y * n + x;
      if (marks[i] !== epoch) {
        marks[i] = epoch;
        coverage[i] = 0;
        touched[length++] = i;
      }
      coverage[i] = Math.max(coverage[i], w);
    };
    for (let s = 0; s <= steps; s++) {
      const t = s / steps,
        x = u.x + (v.x - u.x) * t,
        y = u.y + (v.y - u.y) * t,
        ix = Math.floor(x),
        iy = Math.floor(y),
        fx = x - ix,
        fy = y - iy;
      add(ix, iy, (1 - fx) * (1 - fy));
      add(ix + 1, iy, fx * (1 - fy));
      add(ix, iy + 1, (1 - fx) * fy);
      add(ix + 1, iy + 1, fx * fy);
    }
    const indices = touched.slice(0, length),
      f = {
        indices,
        alpha: Float32Array.from(indices, (i) => coverage[i] * alpha),
      };
    bytes += indices.byteLength + f.alpha.byteLength;
    if (bytes > 128 * 1024 * 1024) throw Error("view-ssim/cache-ceiling");
    cache.set(k, f);
    return f;
  };
  const path = [0];
  // Separate constrained hypothesis: unchanged SSIM derivative, but physically
  // admissible candidates may not exceed the control prefix's white-region
  // attenuation by the already declared .01 acceptance allowance. No new weight.
  const white = Uint8Array.from(
      weights,
      (w, k) =>
        +(
          w > 0 &&
          pixels[
            (((Math.floor(k / n) * 500) / n) | 0) * 500 * 3 +
              ((((k % n) * 500) / n) | 0) * 3
          ] > 250
        ),
    ),
    whiteCount = white.reduce((a, b) => a + b, 0),
    budgets = new Float64Array(lines + 1);
  if (whiteReference) {
    if (whiteReference.length !== lines + 1 || !whiteCount)
      throw Error("view-ssim/reference");
    const control = new Float64Array(n * n).fill(1);
    let spent = 0;
    for (let j = 1; j <= lines; j++) {
      const f = footprint(whiteReference[j - 1], whiteReference[j]);
      for (let k = 0; k < f.indices.length; k++) {
        const p = f.indices[k],
          delta = control[p] * f.alpha[k];
        if (white[p]) spent += delta / whiteCount;
        control[p] -= delta;
      }
      budgets[j] = spent + 0.01;
    }
  }
  let whiteSpent = 0,
    bestWhite = 0;
  for (let s = 0; s < lines; s++) {
    if (s % 10 === 0) ({ gradient, score } = objective(image));
    const a = path[s];
    let best = -1,
      gain = -Infinity;
    for (let b = 0; b < count; b++) {
      const gap = Math.abs(a - b),
        k = key(a, b);
      if (
        Math.min(gap, count - gap) < 25 ||
        used[k] ||
        degree[a] >= 160 ||
        degree[b] >= 159 ||
        squareChordExcluded(profile, a, b) ||
        !weave.allows(a, b)
      )
        continue;
      if (!legal[k]) legal[k] = connectionAllowed(profile, a, b) ? 1 : -1;
      if (legal[k] < 0) continue;
      const f = footprint(a, b);
      let value = 0,
        whiteDelta = 0;
      for (let j = 0; j < f.indices.length; j++) {
        const p = f.indices[j];
        const delta = image[p] * f.alpha[j];
        value -= gradient[p] * delta;
        if (whiteReference && white[p]) whiteDelta += delta / whiteCount;
      }
      if (whiteReference && whiteSpent + whiteDelta > budgets[s + 1] + 1e-12)
        continue;
      if (value > gain) {
        gain = value;
        best = b;
        bestWhite = whiteDelta;
      }
    }
    if (best < 0) throw Error("view-ssim/no-legal-exit");
    const f = footprint(a, best);
    for (let j = 0; j < f.indices.length; j++)
      image[f.indices[j]] *= 1 - f.alpha[j];
    used[key(a, best)] = 1;
    whiteSpent += bestWhite;
    degree[a]++;
    degree[best]++;
    weave.add(a, best);
    path.push(best);
  }
  return {
    path,
    elapsedMs: performance.now() - started,
    cacheBytes: bytes,
    finalModelScore: objective(image).score,
    model: image,
  };
}
