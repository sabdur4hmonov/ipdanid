// Bounded research, not a released engine or an importable guide contract.
// Change one internal route vertex (a,b,c -> a,d,c). Both real chords count;
// route continuity, endpoints, number of lines and physical pins are preserved.
import type { Instruction } from "../src/core/types";
import {
  classicFrame,
  classicPins,
  referenceRaster,
} from "../src/core/classic-reference";
import {
  leastSquaresImportance,
  squareChordExcluded,
} from "../src/core/classic-least-squares";
import { connectionAllowed, inside } from "../src/core/geometry";
import {
  viewingImage,
  viewingSsimPrepared,
} from "../tests/helpers/viewing-ssim";
type Footprint = { indices: Uint32Array; alpha: Float64Array };
type RegionalScore = { all: { ssim: number }; faces: { ssim: number }[] };
export function physicalScoreImproves(
  previous: RegionalScore,
  next: RegionalScore,
) {
  return (
    Number.isFinite(next.all.ssim) &&
    Number.isFinite(previous.all.ssim) &&
    next.all.ssim >= previous.all.ssim + 1e-7 &&
    next.faces.length === previous.faces.length &&
    next.faces.every(
      (face, i) =>
        Number.isFinite(face.ssim) &&
        Number.isFinite(previous.faces[i].ssim) &&
        face.ssim >= previous.faces[i].ssim - 1e-8,
    )
  );
}
export class PhysicalRouteObjective {
  readonly image: Float64Array;
  readonly target: Float32Array;
  readonly weights: Float32Array;
  readonly size: number;
  private pins;
  private cache = new Map<number, Footprint>();
  private bytes = 0;
  private mask: Uint32Array;
  private coverage: Float64Array;
  private indices: Uint32Array;
  private scratch: Float64Array;
  private marks: Uint32Array;
  private touched: Uint32Array;
  private epoch = 0;
  private footprintEpoch = 0;
  constructor(
    readonly guide: Instruction,
    target: Uint8Array,
    size = 500,
  ) {
    if (
      guide.profile.colors.length !== 1 ||
      guide.profile.colors[0] !== "#000000" ||
      target.length !== size * size * 3 ||
      size < 32 ||
      size > 1000
    )
      throw Error("physical-route/input");
    this.size = size;
    const n = guide.params.resolution;
    this.pins = classicPins(guide.profile, n).map((p) => ({
      x: (p.x * size) / n,
      y: (p.y * size) / n,
    }));
    this.image = Float64Array.from(
      referenceRaster(guide, size).filter((_, k) => k % 3 === 0),
    );
    this.target = Float32Array.from(
      { length: size * size },
      (_, k) => target[k * 3] / 255,
    );
    this.weights = leastSquaresImportance(
      size,
      guide.params.kitPreparation?.transform.targetFaces ?? [],
    );
    this.mask = new Uint32Array(size * size);
    this.coverage = new Float64Array(size * size);
    this.indices = new Uint32Array(size * size);
    this.scratch = new Float64Array(size * size);
    this.marks = new Uint32Array(size * size);
    this.touched = new Uint32Array(size * size);
  }
  key(a: number, b: number) {
    return Math.min(a, b) * this.pins.length + Math.max(a, b);
  }
  footprint(a: number, b: number): Footprint {
    const key = this.key(a, b),
      cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return cached;
    }
    const p = this.pins[Math.min(a, b)],
      q = this.pins[Math.max(a, b)],
      size = this.size;
    const steps = Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) * 2),
      epoch = ++this.footprintEpoch;
    let count = 0;
    const add = (x: number, y: number, w: number) => {
      if (x < 0 || y < 0 || x >= size || y >= size) return;
      const k = y * size + x;
      if (this.mask[k] !== epoch) {
        this.mask[k] = epoch;
        this.coverage[k] = 0;
        this.indices[count++] = k;
      }
      this.coverage[k] = Math.max(this.coverage[k], w);
    };
    for (let k = 0; k <= steps; k++) {
      const t = k / steps,
        x = p.x + (q.x - p.x) * t,
        y = p.y + (q.y - p.y) * t,
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
      (this.guide.profile.threadMm /
        (classicFrame(this.guide.profile).mm / size)) *
        this.guide.profile.opacity,
    );
    if (alpha >= 1) throw Error("physical-route/opaque-removal");
    const indices = this.indices.slice(0, count),
      result = {
        indices,
        alpha: Float64Array.from(indices, (i) => alpha * this.coverage[i]),
      };
    this.cache.set(key, result);
    this.bytes += count * 12;
    while (this.bytes > 32 * 1024 * 1024) {
      const k = this.cache.keys().next().value!;
      const old = this.cache.get(k)!;
      this.bytes -= old.indices.length * 12;
      this.cache.delete(k);
    }
    return result;
  }
  loss() {
    let s = 0;
    for (let k = 0; k < this.image.length; k++)
      s += this.weights[k] * (this.image[k] - this.target[k]) ** 2;
    return s;
  }
  approve(_remove: [number, number][], _add: [number, number][]) {
    return true;
  }
  change(remove: [number, number][], add: [number, number][], apply = false) {
    const epoch = ++this.epoch;
    let count = 0;
    const combine = (f: Footprint, inverse: boolean) => {
      for (let j = 0; j < f.indices.length; j++) {
        const k = f.indices[j];
        if (this.marks[k] !== epoch) {
          this.marks[k] = epoch;
          this.scratch[k] = 1;
          this.touched[count++] = k;
        }
        const v = 1 - f.alpha[j];
        this.scratch[k] *= inverse ? 1 / v : v;
      }
    };
    for (const [a, b] of remove) combine(this.footprint(a, b), true);
    for (const [a, b] of add) combine(this.footprint(a, b), false);
    let gain = 0;
    for (let j = 0; j < count; j++) {
      const k = this.touched[j],
        old = this.image[k],
        value = old * this.scratch[k],
        target = this.target[k];
      gain += this.weights[k] * ((old - target) ** 2 - (value - target) ** 2);
      if (apply) this.image[k] = value;
    }
    return gain;
  }
}
// Separate hypothesis after raw-pixel loss visibly washed out the face:
// compare area-averaged viewing tones, and reject any move that worsens even
// one detected face's tone error. No image overlay or post-render alteration.
export class RegionalViewObjective extends PhysicalRouteObjective {
  private acceptedScore?: ReturnType<typeof viewingSsimPrepared>;
  private board?: Uint8Array;
  private strict: boolean;
  private exact: boolean;
  private taps?: { start: Uint32Array; to: Uint16Array; weight: Float64Array };
  private block: number;
  private viewSize: number;
  private view: Float64Array;
  private goal: Float64Array;
  private importance: Float32Array;
  private faceBits: Uint8Array;
  private faces: number;
  private delta: Float64Array;
  private viewMarks: Uint32Array;
  private viewTouched: Uint32Array;
  private factor: Float64Array;
  private pixelMarks: Uint32Array;
  private pixelTouched: Uint32Array;
  private serial = 0;
  constructor(
    guide: Instruction,
    target: Uint8Array,
    size = 500,
    exact = false,
    strict = false,
  ) {
    super(guide, exact ? new Uint8Array(size * size * 3) : target, size);
    this.exact = exact;
    this.strict = strict;
    this.block = size === 500 ? 4 : 1;
    this.viewSize = exact ? 160 : size / this.block;
    const count = this.viewSize ** 2,
      face = guide.params.kitPreparation?.transform.targetFaces ?? [];
    this.faces = face.length;
    if (this.faces > 3) throw Error("physical-route/faces");
    this.view = new Float64Array(count);
    this.goal = new Float64Array(count);
    this.faceBits = new Uint8Array(count);
    this.importance = leastSquaresImportance(this.viewSize, face);
    if (exact) {
      if (size !== 1000 || target.length !== 500 * 500 * 3)
        throw Error("physical-route/view-size");
      this.view.set(viewingImage(Float32Array.from(this.image), size));
      this.goal.set(
        viewingImage(
          Float32Array.from(
            { length: 500 * 500 },
            (_, k) => target[k * 3] / 255,
          ),
          500,
        ),
      );
      this.taps = viewingTaps(size);
    }
    for (let k = 0; !exact && k < size * size; k++) {
      const v =
        Math.floor(Math.floor(k / size) / this.block) * this.viewSize +
        Math.floor((k % size) / this.block);
      this.view[v] += this.image[k] / this.block ** 2;
      this.goal[v] += this.target[k] / this.block ** 2;
    }
    for (let k = 0; k < count; k++) {
      const x = ((k % this.viewSize) + 0.5) / this.viewSize,
        y = (Math.floor(k / this.viewSize) + 0.5) / this.viewSize;
      face.forEach((b, i) => {
        if (
          ((x - b.left - b.width / 2) / (b.width / 2)) ** 2 +
            ((y - b.top - b.height / 2) / (b.height / 2)) ** 2 <=
          1
        )
          this.faceBits[k] |= 1 << i;
      });
    }
    this.delta = new Float64Array(count);
    this.viewMarks = new Uint32Array(count);
    this.viewTouched = new Uint32Array(count);
    this.factor = new Float64Array(size * size);
    this.pixelMarks = new Uint32Array(size * size);
    this.pixelTouched = new Uint32Array(size * size);
    if (strict) {
      this.board = Uint8Array.from({ length: 160 * 160 }, (_, k) =>
        inside(
          guide.profile.shape,
          ((k % 160) + 0.5) / 160,
          (Math.floor(k / 160) + 0.5) / 160,
        )
          ? 1
          : 0,
      );
      this.acceptedScore = viewingSsimPrepared(
        Float32Array.from(this.view),
        Float32Array.from(this.goal),
        { faces: face, boardMask: this.board },
      );
    }
  }
  override approve(remove: [number, number][], add: [number, number][]) {
    if (!this.strict) return true;
    if (this.change(remove, add) <= 0) return false;
    const next = Float32Array.from(this.view);
    for (let k = 0; k < next.length; k++)
      if (this.viewMarks[k] === this.serial) next[k] += this.delta[k];
    const score = viewingSsimPrepared(next, Float32Array.from(this.goal), {
      faces: this.guide.params.kitPreparation?.transform.targetFaces,
      boardMask: this.board,
    });
    if (!physicalScoreImproves(this.acceptedScore!, score)) return false;
    this.acceptedScore = score;
    return true;
  }
  override loss() {
    let s = 0;
    for (let k = 0; k < this.view.length; k++)
      s += this.importance[k] * (this.view[k] - this.goal[k]) ** 2;
    return s;
  }
  override change(
    remove: [number, number][],
    add: [number, number][],
    apply = false,
  ) {
    const epoch = ++this.serial;
    let pixels = 0,
      views = 0;
    const combine = (f: Footprint, inverse: boolean) => {
      for (let j = 0; j < f.indices.length; j++) {
        const k = f.indices[j];
        if (this.pixelMarks[k] !== epoch) {
          this.pixelMarks[k] = epoch;
          this.factor[k] = 1;
          this.pixelTouched[pixels++] = k;
        }
        this.factor[k] *= inverse ? 1 / (1 - f.alpha[j]) : 1 - f.alpha[j];
      }
    };
    for (const [a, b] of remove) combine(this.footprint(a, b), true);
    for (const [a, b] of add) combine(this.footprint(a, b), false);
    for (let j = 0; j < pixels; j++) {
      const k = this.pixelTouched[j],
        v =
          Math.floor(Math.floor(k / this.size) / this.block) * this.viewSize +
          Math.floor((k % this.size) / this.block);
      const value = this.image[k] * (this.factor[k] - 1);
      if (this.exact) {
        const { start, to, weight } = this.taps!,
          x = k % this.size,
          y = Math.floor(k / this.size);
        for (let ty = start[y]; ty < start[y + 1]; ty++)
          for (let tx = start[x]; tx < start[x + 1]; tx++) {
            const cell = to[ty] * 160 + to[tx];
            if (this.viewMarks[cell] !== epoch) {
              this.viewMarks[cell] = epoch;
              this.delta[cell] = 0;
              this.viewTouched[views++] = cell;
            }
            this.delta[cell] += value * weight[tx] * weight[ty];
          }
      } else {
        if (this.viewMarks[v] !== epoch) {
          this.viewMarks[v] = epoch;
          this.delta[v] = 0;
          this.viewTouched[views++] = v;
        }
        this.delta[v] += value / this.block ** 2;
      }
    }
    let gain = 0;
    const faceGain = new Float64Array(this.faces);
    for (let j = 0; j < views; j++) {
      const k = this.viewTouched[j],
        e = this.view[k] - this.goal[k],
        d = this.delta[k],
        g = -d * (2 * e + d);
      gain += g * this.importance[k];
      for (let f = 0; f < this.faces; f++)
        if (this.faceBits[k] & (1 << f)) faceGain[f] += g;
    }
    if (faceGain.some((g) => g < -1e-10)) {
      if (apply) throw Error("physical-route/face-regression");
      return -Infinity;
    }
    if (apply) {
      for (let j = 0; j < pixels; j++) {
        const k = this.pixelTouched[j];
        this.image[k] *= this.factor[k];
      }
      for (let j = 0; j < views; j++) {
        const k = this.viewTouched[j];
        this.view[k] += this.delta[k];
      }
    }
    return gain;
  }
}
function viewingTaps(size: number) {
  const sigma = (size / 160) * 0.6,
    width = Math.round(sigma * 8 + 1) | 1,
    radius = (width - 1) / 2;
  const kernel = Float64Array.from({ length: width }, (_, i) =>
      Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)),
    ),
    sum = kernel.reduce((a, b) => a + b, 0);
  for (let k = 0; k < width; k++) kernel[k] = Math.fround(kernel[k] / sum);
  const reflect = (k: number) => {
    while (k < 0 || k >= size) k = k < 0 ? -k : 2 * size - k - 2;
    return k;
  };
  const inverse = Array.from({ length: size }, () => new Map<number, number>()),
    scale = size / 160;
  for (let d = 0; d < 160; d++) {
    const lo = d * scale,
      hi = (d + 1) * scale;
    for (let j = Math.floor(lo); j < Math.ceil(hi); j++) {
      const w = (Math.min(hi, j + 1) - Math.max(lo, j)) / scale;
      for (let k = 0; k < width; k++) {
        const s = reflect(j + k - radius);
        inverse[s].set(d, (inverse[s].get(d) ?? 0) + w * kernel[k]);
      }
    }
  }
  const start = new Uint32Array(size + 1),
    to: number[] = [],
    weight: number[] = [];
  inverse.forEach((row, s) => {
    start[s] = to.length;
    for (const [d, w] of row) {
      to.push(d);
      weight.push(w);
    }
  });
  start[size] = to.length;
  return { start, to: Uint16Array.from(to), weight: Float64Array.from(weight) };
}
export class ExactViewObjective extends RegionalViewObjective {
  constructor(guide: Instruction, target: Uint8Array) {
    super(guide, target, 1000, true);
  }
}
export class ExactSsimObjective extends RegionalViewObjective {
  constructor(guide: Instruction, target: Uint8Array) {
    super(guide, target, 1000, true, true);
  }
}
export async function refinePhysicalRoute(
  guide: Instruction,
  target: Uint8Array,
  options: {
    proposals?: number;
    size?: number;
    cancelled?: () => boolean;
    progress?: (value: number) => void;
    regionalView?: boolean;
    exactView?: boolean;
    exactSsim?: boolean;
  } = {},
) {
  if (guide.algorithm !== "classic-greedy/3" || guide.segments.length !== 1)
    throw Error("physical-route/baseline");
  const Objective = options.exactSsim
    ? ExactSsimObjective
    : options.exactView
      ? ExactViewObjective
      : options.regionalView
        ? RegionalViewObjective
        : PhysicalRouteObjective;
  const objective = new Objective(guide, target, options.size ?? 500),
    path = [...guide.segments[0].path],
    p = guide.profile,
    n = p.pins.length,
    used = new Set<number>(),
    degree = new Uint16Array(n),
    legal = new Map<number, boolean>();
  const key = (a: number, b: number) => objective.key(a, b);
  const woven =
      p.shape === "rectangle" &&
      p.standardKit?.chordPolicy === "axis-interior-skip/2",
    crossings = new Uint16Array(1001);
  const bin = (a: number, b: number) => {
    const u = p.pins[a],
      v = p.pins[b];
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
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      k = key(a, b);
    if (used.has(k)) throw Error("physical-route/repeated-baseline");
    used.add(k);
    degree[a]++;
    degree[b]++;
    const h = bin(a, b);
    if (h >= 0) crossings[h]++;
  }
  let rng = 0x51f15e,
    proposed = 0,
    evaluated = 0,
    accepted = 0;
  const budget = options.proposals ?? 24000,
    before = objective.loss(),
    started = performance.now();
  const possible = (a: number, b: number) => {
    const d = Math.abs(a - b);
    if (Math.min(d, n - d) < 25 || squareChordExcluded(p, a, b)) return false;
    const k = key(a, b);
    if (!legal.has(k)) legal.set(k, connectionAllowed(p, a, b));
    return legal.get(k)!;
  };
  for (let index = path.length - 2; index > 0 && proposed < budget; index--) {
    if (options.cancelled?.())
      throw new DOMException("Cancelled", "AbortError");
    const a = path[index - 1],
      b = path[index],
      c = path[index + 1],
      old1 = key(a, b),
      old2 = key(b, c),
      ha = bin(a, b),
      hb = bin(b, c);
    used.delete(old1);
    used.delete(old2);
    if (ha >= 0) crossings[ha]--;
    if (hb >= 0) crossings[hb]--;
    let best = b,
      bestGain = 1e-9;
    // Eight alternatives per original vertex: one bounded pass, deterministic.
    for (let k = 0; k < 8 && proposed < budget; k++) {
      proposed++;
      rng ^= rng << 13;
      rng ^= rng >>> 17;
      rng ^= rng << 5;
      const d = (rng >>> 0) % n;
      if (
        d === b ||
        degree[d] > 158 ||
        a === c ||
        !possible(a, d) ||
        !possible(d, c) ||
        used.has(key(a, d)) ||
        used.has(key(d, c))
      )
        continue;
      const h1 = bin(a, d),
        h2 = bin(d, c);
      if (
        (h1 >= 0 && crossings[h1] + 1 + (h1 === h2 ? 1 : 0) > 8) ||
        (h2 >= 0 && crossings[h2] + 1 + (h1 === h2 ? 1 : 0) > 8)
      )
        continue;
      const gain = objective.change(
        [
          [a, b],
          [b, c],
        ],
        [
          [a, d],
          [d, c],
        ],
      );
      evaluated++;
      if (gain > bestGain) {
        bestGain = gain;
        best = d;
      }
    }
    if (
      best !== b &&
      !objective.approve(
        [
          [a, b],
          [b, c],
        ],
        [
          [a, best],
          [best, c],
        ],
      )
    )
      best = b;
    if (best !== b) {
      objective.change(
        [
          [a, b],
          [b, c],
        ],
        [
          [a, best],
          [best, c],
        ],
        true,
      );
      degree[b] -= 2;
      degree[best] += 2;
      path[index] = best;
      accepted++;
    }
    used.add(key(a, best));
    used.add(key(best, c));
    const h1 = bin(a, best),
      h2 = bin(best, c);
    if (h1 >= 0) crossings[h1]++;
    if (h2 >= 0) crossings[h2]++;
    if (index % 64 === 0) {
      options.progress?.(proposed / budget);
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  return {
    path,
    proposed,
    evaluated,
    accepted,
    before,
    after: objective.loss(),
    elapsedMs: performance.now() - started,
    maxDegree: Math.max(...degree),
    maxCrossing: Math.max(...crossings),
    image: objective.image,
  };
}
