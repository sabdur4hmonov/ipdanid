// Research only. Continuous two-edge reversal; never an old-engine guide.
import type { MaterialProfile, RegionBox } from "../src/core/types";
import { classicPins, classicFrame } from "../src/core/classic-reference";
import { connectionAllowed } from "../src/core/geometry";
import {
  leastSquaresImportance,
  squareChordExcluded,
} from "../src/core/classic-least-squares";
import { viewingSsimPrepared } from "../src/core/viewing-ssim";
import { viewingMask } from "../src/core/viewing-mask";
import { ssimObjective } from "./viewing-ssim-gradient";

export function reverseRouteInterval(path: number[], i: number, j: number) {
  if (
    !Number.isInteger(i) ||
    !Number.isInteger(j) ||
    i < 0 ||
    j <= i + 1 ||
    j >= path.length - 1
  )
    throw Error("two-opt/cuts");
  for (let a = i + 1, b = j; a < b; a++, b--)
    [path[a], path[b]] = [path[b], path[a]];
}
export function routeDegrees(path: number[], count: number) {
  const d = new Uint16Array(count);
  for (let k = 1; k < path.length; k++) {
    if (
      !Number.isInteger(path[k - 1]) ||
      !Number.isInteger(path[k]) ||
      path[k - 1] < 0 ||
      path[k] < 0 ||
      path[k - 1] >= count ||
      path[k] >= count
    )
      throw Error("two-opt/pin");
    d[path[k - 1]]++;
    d[path[k]]++;
  }
  return d;
}
type Footprint = { indices: Uint16Array; alpha: Float32Array };
class ViewModel {
  readonly image: Float64Array;
  readonly white: Uint8Array;
  readonly cache = new Map<number, Footprint>();
  private marks = new Uint32Array(25600);
  private weights = new Float64Array(25600);
  private touched = new Uint16Array(25600);
  private serial = 0;
  private changeMarks = new Uint32Array(25600);
  private factors = new Float64Array(25600);
  private changed = new Uint16Array(25600);
  private epoch = 0;
  bytes = 0;
  peakBytes = 0;
  whiteCount = 0;
  whiteSum = 0;
  constructor(
    readonly profile: MaterialProfile,
    view: Float32Array,
    readonly goal: Float32Array,
  ) {
    this.image = Float64Array.from(view);
    const mask = viewingMask(profile.shape, 160);
    this.white = Uint8Array.from(goal, (v, k) => +(v > 0.98 && !!mask[k]));
    for (let k = 0; k < 25600; k++)
      if (this.white[k]) {
        this.whiteCount++;
        this.whiteSum += 1 - this.image[k];
      }
  }
  footprint(a: number, b: number) {
    const count = this.profile.pins.length,
      key = Math.min(a, b) * count + Math.max(a, b),
      found = this.cache.get(key);
    if (found) {
      this.cache.delete(key);
      this.cache.set(key, found);
      return found;
    }
    const pins = classicPins(this.profile, 500),
      u = pins[Math.min(a, b)],
      v = pins[Math.max(a, b)],
      ax = (u.x * 160) / 500,
      ay = (u.y * 160) / 500,
      bx = (v.x * 160) / 500,
      by = (v.y * 160) / 500;
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2),
      epoch = ++this.serial;
    let length = 0;
    const add = (x: number, y: number, w: number) => {
      if (x < 0 || y < 0 || x >= 160 || y >= 160) return;
      const k = y * 160 + x;
      if (this.marks[k] !== epoch) {
        this.marks[k] = epoch;
        this.weights[k] = 0;
        this.touched[length++] = k;
      }
      this.weights[k] = Math.max(this.weights[k], w);
    };
    for (let k = 0; k <= steps; k++) {
      const t = k / steps,
        x = ax + (bx - ax) * t,
        y = ay + (by - ay) * t,
        ix = Math.floor(x),
        iy = Math.floor(y),
        fx = x - ix,
        fy = y - iy;
      add(ix, iy, (1 - fx) * (1 - fy));
      add(ix + 1, iy, fx * (1 - fy));
      add(ix, iy + 1, (1 - fx) * fy);
      add(ix + 1, iy + 1, fx * fy);
    }
    const alpha = Math.min(
      1,
      (this.profile.threadMm / (classicFrame(this.profile).mm / 160)) *
        this.profile.opacity,
    );
    if (alpha >= 1) throw Error("two-opt/opaque");
    const indices = this.touched.slice(0, length),
      f = {
        indices,
        alpha: Float32Array.from(indices, (k) => this.weights[k] * alpha),
      };
    const size = indices.byteLength + f.alpha.byteLength;
    while (this.bytes + size > 64 * 1024 * 1024) {
      const oldKey = this.cache.keys().next().value!;
      const old = this.cache.get(oldKey)!;
      this.bytes -= old.indices.byteLength + old.alpha.byteLength;
      this.cache.delete(oldKey);
    }
    this.cache.set(key, f);
    this.bytes += size;
    this.peakBytes = Math.max(this.peakBytes, this.bytes);
    return f;
  }
  change(
    remove: [number, number][],
    add: [number, number][],
    gradient: Float64Array,
    whiteLimit: number,
    apply = false,
  ) {
    const epoch = ++this.epoch;
    let count = 0;
    const merge = (f: Footprint, inverse: boolean) => {
      for (let k = 0; k < f.indices.length; k++) {
        const p = f.indices[k];
        if (this.changeMarks[p] !== epoch) {
          this.changeMarks[p] = epoch;
          this.factors[p] = 1;
          this.changed[count++] = p;
        }
        const v = 1 - f.alpha[k];
        this.factors[p] *= inverse ? 1 / v : v;
      }
    };
    for (const [a, b] of remove) merge(this.footprint(a, b), true);
    for (const [a, b] of add) merge(this.footprint(a, b), false);
    let gain = 0,
      whiteDelta = 0;
    for (let k = 0; k < count; k++) {
      const p = this.changed[k],
        next = this.image[p] * this.factors[p],
        delta = next - this.image[p];
      if (!Number.isFinite(next) || next > 1.00001 || next < 0)
        return -Infinity;
      gain += gradient[p] * delta;
      if (this.white[p]) whiteDelta -= delta;
    }
    if (this.whiteSum + whiteDelta > whiteLimit) return -Infinity;
    if (apply) {
      for (let k = 0; k < count; k++) {
        const p = this.changed[k];
        this.image[p] *= this.factors[p];
      }
      this.whiteSum += whiteDelta;
    }
    return gain;
  }
}
function features(faces: RegionBox[]) {
  return faces.flatMap((f) =>
    [
      [0.3, 0.35, 0.4, 0.4],
      [0.1, 0.18, 0.8, 0.24],
      [0.2, 0.7, 0.6, 0.23],
    ].map(([x, y, w, h]) => ({
      left: f.left + x * f.width,
      top: f.top + y * f.height,
      width: f.width * w,
      height: f.height * h,
    })),
  );
}
export function continuousTwoOpt(
  profile: MaterialProfile,
  parentPath: number[],
  goal: Float32Array,
  physicalView: Float32Array,
  faces: RegionBox[],
  cancelled?: () => boolean,
) {
  const started = performance.now(),
    path = [...parentPath],
    count = profile.pins.length,
    lines = path.length - 1;
  if (
    lines !== 3000 ||
    count !== 240 ||
    goal.length !== 25600 ||
    physicalView.length !== 25600 ||
    !faces.length ||
    faces.length > 3
  )
    throw Error("two-opt/input");
  const key = (a: number, b: number) => Math.min(a, b) * count + Math.max(a, b),
    used = new Set<number>();
  const legal = (a: number, b: number) =>
    Math.min(Math.abs(a - b), count - Math.abs(a - b)) >= 25 &&
    !squareChordExcluded(profile, a, b) &&
    connectionAllowed(profile, a, b);
  for (let k = 1; k < path.length; k++) {
    if (!legal(path[k - 1], path[k]) || used.has(key(path[k - 1], path[k])))
      throw Error("two-opt/parent");
    used.add(key(path[k - 1], path[k]));
  }
  const degrees = routeDegrees(path, count);
  if (degrees.some((d) => d > 160)) throw Error("two-opt/degree");
  const bins = new Uint16Array(1001),
    woven =
      profile.shape === "rectangle" &&
      profile.standardKit?.chordPolicy === "axis-interior-skip/2";
  const bin = (a: number, b: number) => {
    const u = profile.pins[a],
      v = profile.pins[b];
    return woven && (u.y - 0.5) * (v.y - 0.5) < 0
      ? Math.max(
          0,
          Math.min(
            1000,
            Math.round(
              (u.x + ((0.5 - u.y) / (v.y - u.y)) * (v.x - u.x)) * 1000,
            ),
          ),
        )
      : -1;
  };
  const rebuild = () => {
    used.clear();
    bins.fill(0);
    for (let k = 1; k < path.length; k++) {
      used.add(key(path[k - 1], path[k]));
      const b = bin(path[k - 1], path[k]);
      if (b >= 0) bins[b]++;
    }
  };
  rebuild();
  const model = new ViewModel(profile, physicalView, goal),
    mask = viewingMask(profile.shape, 160),
    weights = Float64Array.from(leastSquaresImportance(160, faces), (v, k) =>
      mask[k] ? v : 0,
    ),
    objective = ssimObjective(160, Float64Array.from(goal), weights),
    regions = features(faces);
  const measure = () =>
    viewingSsimPrepared(Float32Array.from(model.image), goal, {
      faces,
      regions,
      boardMask: mask,
    });
  const initial = measure(),
    whiteLimit = model.whiteSum + 0.01 * model.whiteCount;
  let evaluated = 0,
    attemptedAccepted = 0,
    retained = 0,
    batch = 0,
    rollbacks = 0;
  let baselinePath = [...path],
    baselineImage = model.image.slice(),
    baselineWhite = model.whiteSum;
  let { score, gradient } = objective(model.image),
    batchScore = score;
  const initialScore = score;
  const finishBatch = () => {
    if (!batch) return;
    const next = measure(),
      after = objective(model.image);
    const preserve =
      next.faces.every((f, k) => f.ssim >= initial.faces[k].ssim) &&
      next.regions!.every(
        (r, k) =>
          r.ssim >= initial.regions![k].ssim - (k % 3 === 0 ? 0 : 0.005),
      );
    if (after.score > batchScore + 1e-8 && preserve) {
      retained += batch;
      score = after.score;
      gradient = after.gradient;
      baselinePath = [...path];
      baselineImage = model.image.slice();
      baselineWhite = model.whiteSum;
    } else {
      rollbacks++;
      path.splice(0, path.length, ...baselinePath);
      model.image.set(baselineImage);
      model.whiteSum = baselineWhite;
      rebuild();
      ({ score, gradient } = objective(model.image));
    }
    batchScore = score;
    batch = 0;
  };
  for (let i = 0; i < lines; i++) {
    if (cancelled?.()) throw new DOMException("Cancelled", "AbortError");
    if (attemptedAccepted >= 256) break;
    let bestJ = -1,
      bestGain = 0;
    for (let k = 0; k < 16; k++) {
      evaluated++;
      const j = i + 2 + Math.floor(((k + 1) * (lines - i - 2)) / 17);
      if (j >= lines || j <= i + 1) continue;
      const a = path[i],
        b = path[i + 1],
        c = path[j],
        d = path[j + 1];
      if (
        new Set([a, b, c, d]).size !== 4 ||
        used.has(key(a, c)) ||
        used.has(key(b, d)) ||
        !legal(a, c) ||
        !legal(b, d)
      )
        continue;
      const delta = new Map<number, number>();
      for (const [u, v, s] of [
        [a, b, -1],
        [c, d, -1],
        [a, c, 1],
        [b, d, 1],
      ]) {
        const t = bin(u, v);
        if (t >= 0) delta.set(t, (delta.get(t) ?? 0) + s);
      }
      if ([...delta].some(([b, d]) => bins[b] + d > 8)) continue;
      const gain = model.change(
        [
          [a, b],
          [c, d],
        ],
        [
          [a, c],
          [b, d],
        ],
        gradient,
        whiteLimit,
      );
      if (gain > bestGain) {
        bestGain = gain;
        bestJ = j;
      }
    }
    if (bestJ >= 0) {
      const j = bestJ,
        a = path[i],
        b = path[i + 1],
        c = path[j],
        d = path[j + 1];
      model.change(
        [
          [a, b],
          [c, d],
        ],
        [
          [a, c],
          [b, d],
        ],
        gradient,
        whiteLimit,
        true,
      );
      used.delete(key(a, b));
      used.delete(key(c, d));
      used.add(key(a, c));
      used.add(key(b, d));
      for (const [u, v, s] of [
        [a, b, -1],
        [c, d, -1],
        [a, c, 1],
        [b, d, 1],
      ]) {
        const t = bin(u, v);
        if (t >= 0) bins[t] += s;
      }
      reverseRouteInterval(path, i, j);
      batch++;
      attemptedAccepted++;
      if (batch === 8) finishBatch();
    }
  }
  finishBatch();
  const endDegrees = routeDegrees(path, count);
  if (
    endDegrees.some((d, k) => d !== degrees[k]) ||
    path[0] !== parentPath[0] ||
    path.at(-1) !== parentPath.at(-1) ||
    used.size !== 3000
  )
    throw Error("two-opt/invariant");
  return {
    schema: "iprasm.research-two-opt/1" as const,
    path,
    metrics: {
      evaluated,
      attemptedAccepted,
      retained,
      rollbacks,
      peakCacheBytes: model.peakBytes,
      durationMs: performance.now() - started,
      surrogateBefore: initialScore,
      surrogateAfter: score,
    },
  };
}
