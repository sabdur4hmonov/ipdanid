import type { Instruction, MaterialProfile, RegionBox } from "./types";
import type { GenerateOptions } from "./engine";
import { deepFreeze, hash, sequencePayload } from "./engine";
import { assertPinSpacing, connectionAllowed } from "./geometry";
import { Distribution } from "./distribution";
import { validateStandardProfile } from "./standard-kit";

// Owner-provided reference, versioned independently of classic-greedy/1.
export const CLASSIC_REFERENCE_DEFAULTS = Object.freeze({
  version: "classic-reference/2" as const,
  lineDarkness: 0.15,
  darknessGamma: 1.6,
  overdrawPenalty: 3,
  minGap: 25,
  maxChordRepeat: 1,
  importanceAmplitude: 0.5,
  renderer: "classic-coverage/2" as const,
});
export type ClassicReferenceSettings = typeof CLASSIC_REFERENCE_DEFAULTS & {
  faces: RegionBox[];
};
export function classicFrame(p: MaterialProfile) {
  const scale = p.standardKit?.patternScale ?? 1;
  return { scale, left: (1 - scale) / 2, mm: p.widthMm * scale };
}
export function classicPins(p: MaterialProfile, n: number) {
  const f = classicFrame(p);
  // Affine view transform only: physical stored coordinates/labels are untouched.
  return p.pins.map((a) => ({
    x: 1 + ((a.x - f.left) / f.scale) * (n - 3),
    y: 1 + ((a.y - f.left) / f.scale) * (n - 3),
  }));
}
export function referenceProfile(p: MaterialProfile): MaterialProfile {
  const result = structuredClone(p);
  if (!result.standardKit) throw Error("classic2/standard-kit-required");
  result.id += "-classic2";
  result.version = 11;
  result.opacity = 0.9;
  result.standardKit.referenceRender = "classic-coverage/2";
  return result;
}
export function referenceImportance(n: number, faces: RegionBox[]) {
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let gaussian = 0;
      for (const b of faces) {
        const dx = (x - n * (b.left + b.width / 2)) / ((n * b.width) / 2),
          dy = (y - n * (b.top + b.height / 2)) / ((n * b.height) / 2);
        gaussian = Math.max(gaussian, Math.exp(-(dx * dx + dy * dy)));
      }
      out[y * n + x] = 1 + 0.5 * gaussian;
    }
  return out;
}
export function referenceLinePixels(
  a: { x: number; y: number },
  b: { x: number; y: number },
  size: number,
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y))),
    out: number[] = [];
  let last = -1;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps,
      x = Math.round(a.x + (b.x - a.x) * t),
      y = Math.round(a.y + (b.y - a.y) * t);
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    const i = y * size + x;
    if (i !== last) out.push(i);
    last = i;
  }
  return Int32Array.from(out);
}

// Exactly the reference's max-bilinear-coverage raster, with typed scratch instead
// of allocating a Map for every strand. Output is derived only from the path.
type RasterInput = Pick<
  Instruction,
  "profile" | "segments" | "params" | "metrics"
>;
const rasterCache = new WeakMap<
  RasterInput,
  Map<number, { completed: number; pixels: Float32Array }>
>();
export function referenceRaster(
  i: RasterInput,
  outSize = 1000,
  completed = i.metrics.lines,
  incremental?: { pixels: Float32Array; completed: number },
): Float32Array {
  if (
    !Number.isInteger(outSize) ||
    outSize < 32 ||
    outSize > 1000 ||
    !Number.isFinite(completed)
  )
    throw Error("classic2/render-bounds");
  completed = Math.max(0, Math.min(i.metrics.lines, Math.floor(completed)));
  if(incremental && (incremental.pixels.length!==outSize*outSize*3 || !Number.isInteger(incremental.completed) || incremental.completed<0 || incremental.completed>completed))throw Error('classic2/incremental-render-bounds');
  const previous = rasterCache.get(i)?.get(outSize);
  if (previous?.completed === completed) return previous.pixels;
  const p = i.profile,
    n = i.params.resolution,
    pins = classicPins(p, n),
    scale = outSize / n,
    alpha = Math.min(
      1,
      (p.threadMm / (classicFrame(p).mm / outSize)) * p.opacity,
    ),
    out =
      incremental?.pixels ?? new Float32Array(outSize * outSize * 3).fill(1),
    weights = new Float64Array(outSize * outSize),
    marks = new Uint32Array(outSize * outSize),
    touched = new Uint32Array(outSize * outSize);
  let epoch = 0,
    at = 0;
  for (const segment of i.segments) {
    const ink = [1, 3, 5].map(
      (k) => parseInt(segment.color.slice(k, k + 2), 16) / 255,
    );
    for (let s = 1; s < segment.path.length && at < completed; s++, at++) {
      if (at < (incremental?.completed ?? 0)) continue;
      const a = pins[segment.path[s - 1]],
        b = pins[segment.path[s]],
        ax = a.x * scale,
        ay = a.y * scale,
        bx = b.x * scale,
        by = b.y * scale,
        steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      let count = 0;
      ++epoch;
      const add = (px: number, py: number, w: number) => {
        if (px < 0 || py < 0 || px >= outSize || py >= outSize) return;
        const k = py * outSize + px;
        if (marks[k] !== epoch) {
          marks[k] = epoch;
          weights[k] = 0;
          touched[count++] = k;
        }
        weights[k] = Math.max(weights[k], w);
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
      for (let k = 0; k < count; k++) {
        const pixel = touched[k],
          a = alpha * weights[pixel];
        for (let c = 0; c < 3; c++) {
          const idx = pixel * 3 + c;
          out[idx] *= 1 - a * (1 - ink[c]);
        }
      }
    }
  }
  // Immutable completed guides share their exact preview with player and PDF.
  // Mutable construction snapshots are intentionally not cached.
  if (Object.isFrozen(i)) {
    let grids = rasterCache.get(i);
    if (!grids) {
      grids = new Map();
      rasterCache.set(i, grids);
    }
    grids.set(outSize, { completed, pixels: out });
  }
  return out;
}

export async function generateClassicReference(
  o: GenerateOptions & { onCheckpoint?: (i: Instruction) => void },
): Promise<Instruction> {
  const { resolution: n, profile: p } = o,
    started = performance.now();
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 500 ||
    o.pixels.length !== n * n * 3 ||
    o.mode !== "dark" ||
    !p.standardKit ||
    p.standardKit.referenceRender !== "classic-coverage/2" ||
    p.colors.length !== 1 ||
    p.baseColor !== "#ffffff" ||
    !Number.isInteger(o.lines) ||
    o.lines < 1 ||
    o.lines > p.maxLines
  )
    throw Error("classic2/combination");
  assertPinSpacing(p);
  validateStandardProfile(p);
  const faces = o.kitPreparation?.transform.targetFaces ?? [],
    settings: ClassicReferenceSettings = {
      ...CLASSIC_REFERENCE_DEFAULTS,
      faces,
    },
    importance = referenceImportance(n, faces),
    target = Float32Array.from(
      { length: n * n },
      (_, k) => o.pixels[k * 3] / 255,
    ),
    err = Float32Array.from(
      target,
      (v, k) => Math.pow(1 - v, 1.6) * importance[k],
    ),
    pins = classicPins(p, n),
    count = pins.length,
    imageHash = await hash(o.pixels),
    path = [0],
    cache = new Map<number, Int32Array>(),
    legalCache = new Map<number, boolean>(),
    used = new Set<number>(),
    distribution = new Distribution(count);
  let prev = -1,
    meters = 0.5,
    peakCacheBytes = 0;
  const key = (a: number, b: number) => (a < b ? a * count + b : b * count + a);
  const chord = (a: number, b: number) => {
    const k = key(a, b);
    let pixels = cache.get(k);
    if (!pixels) {
      pixels = referenceLinePixels(pins[a], pins[b], n);
      cache.set(k, pixels);
      peakCacheBytes += pixels.byteLength;
    }
    return pixels;
  };
  if (o.seed) {
    const { validateInstruction } = await import("./validation");
    await validateInstruction(o.seed);
    if (
      o.seed.algorithm !== "classic-greedy/2" ||
      o.seed.imageHash !== imageHash ||
      JSON.stringify(o.seed.profile) !== JSON.stringify(p) ||
      o.seed.params.resolution !== n ||
      o.seed.params.accessPolicy !== o.accessPolicy ||
      JSON.stringify(o.seed.params.kitPreparation) !==
        JSON.stringify(o.kitPreparation) ||
      JSON.stringify(o.seed.params.classic) !== JSON.stringify(settings) ||
      o.seed.metrics.lines > o.lines
    )
      throw Error("classic2/seed-identity");
  }
  let measuredRaster: { pixels: Float32Array; completed: number } | undefined;
  const snapshot = async (): Promise<Instruction> => {
    const segments = [{ color: p.colors[0], path: [...path] }],
      raster = referenceRaster(
        {
          profile: p,
          segments,
          params: { resolution: n } as Instruction["params"],
          metrics: { lines: path.length - 1 } as Instruction["metrics"],
        },
        n,
        path.length - 1,
        measuredRaster,
      );
    measuredRaster = { pixels: raster, completed: path.length - 1 };
    let baseline = 0,
      loss = 0;
    for (let k = 0; k < target.length; k++) {
      baseline += (1 - target[k]) ** 2;
      for (let c = 0; c < 3; c++) loss += (raster[k * 3 + c] - target[k]) ** 2;
    }
    const i: Instruction = {
      schema: "iprasm.instruction/1",
      algorithm: "classic-greedy/2",
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      imageHash,
      sequenceHash: "",
      profile: structuredClone(p),
      segments,
      params: {
        resolution: n,
        requestedLines: o.lines,
        mode: "dark",
        stockPolicy: "estimate",
        ...(o.accessPolicy ? { accessPolicy: o.accessPolicy } : {}),
        ...(o.kitPreparation
          ? { kitPreparation: structuredClone(o.kitPreparation) }
          : {}),
        classic: structuredClone(settings),
        optimization: {
          lookahead: 0,
          coarseScale: 1,
          minimumRelativeGain: 0,
          pairLimit: 32,
          pinDegreeLimit: 160,
        },
      },
      metrics: {
        baselineMse: baseline / target.length,
        reconstructionMse: loss / (target.length * 3),
        estimatedMeters: meters,
        perColorMeters: { [p.colors[0]]: meters },
        lines: path.length - 1,
        stoppedReason: "requested",
        stockShortfallMeters: Math.max(0, meters - p.stockMeters),
        durationMs: performance.now() - started,
        peakCacheBytes,
      },
    };
    i.sequenceHash = await hash(sequencePayload(i));
    return deepFreeze(i);
  };
  for (let s = 0; s < o.lines; s++) {
    if (o.cancelled?.()) throw new DOMException("Cancelled", "AbortError");
    const cur = path[path.length - 1];
    let best = -1,
      bestScore = -Infinity;
    for (let b = 0; b < count; b++) {
      const d = Math.abs(b - cur),
        gap = Math.min(d, count - d),
        k = key(cur, b);
      if (
        gap < 25 ||
        b === prev ||
        used.has(k) ||
        distribution.degree[cur] >= 160 ||
        distribution.degree[b] >= 160
      )
        continue;
      // Keep an exit available after arrival when the incident guard is near full.
      if (s + 1 < o.lines && distribution.degree[b] >= 159) continue;
      if (!legalCache.has(k)) legalCache.set(k, connectionAllowed(p, cur, b));
      if (!legalCache.get(k)) continue;
      const pixels = chord(cur, b);
      let sum = 0;
      for (let j = 0; j < pixels.length; j++) {
        const e = err[pixels[j]];
        sum += e > 0 ? e : e * 3;
      }
      const score = sum / pixels.length;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (best < 0) throw Error("classic2/fixed-budget-has-no-legal-path");
    const pixels = chord(cur, best);
    for (let j = 0; j < pixels.length; j++)
      err[pixels[j]] -= 0.15 * importance[pixels[j]];
    used.add(key(cur, best));
    distribution.apply([[cur, best]]);
    path.push(best);
    prev = cur;
    if (
      o.seed &&
      s < o.seed.metrics.lines &&
      o.seed.segments[0].path[s + 1] !== best
    )
      throw Error("classic2/seed-replay");
    const a = p.pins[cur],
      b = p.pins[best];
    meters +=
      ((Math.hypot((a.x - b.x) * p.widthMm, (a.y - b.y) * p.heightMm) +
        p.wrapAllowanceMm) /
        1000) *
      (1 + p.wasteFraction);
    if ((s + 1) % 50 === 0) {
      o.onProgress?.((s + 1) / o.lines);
      await new Promise((r) => setTimeout(r, 0));
    }
    if (
      o.onCheckpoint &&
      (s + 1) % 500 === 0 &&
      s + 1 < o.lines &&
      s + 1 > (o.seed?.metrics.lines ?? 0)
    )
      o.onCheckpoint(await snapshot());
  }
  o.onProgress?.(1);
  return snapshot();
}
