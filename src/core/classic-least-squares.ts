import type { Instruction, MaterialProfile, RegionBox } from "./types";
import type { GenerateOptions } from "./engine";
import { deepFreeze, hash, sequencePayload } from "./engine";
import { assertPinSpacing, connectionAllowed } from "./geometry";
import { Distribution } from "./distribution";
import { validateStandardProfile } from "./standard-kit";
import {
  classicPins,
  referenceRaster,
  referenceLinePixels,
  referenceProfile,
} from "./classic-reference";

// Separate immutable contract: old /2 scores, guides and rendering stay valid.
export const CLASSIC_LS_DEFAULTS = Object.freeze({
  version: "classic-reference/3" as const,
  scoring: "ls" as const,
  lineDarkness: 0.08,
  darknessGamma: 1.6,
  minGap: 25,
  maxChordRepeat: 1,
  importanceAmplitude: 1,
  renderer: "classic-coverage/2" as const,
  squareAxisExclusion: "axis-centre-skip/1" as const,
});
export type ClassicLeastSquaresSettings = typeof CLASSIC_LS_DEFAULTS & {
  faces: RegionBox[];
};
export function leastSquaresProfile(p: MaterialProfile): MaterialProfile {
  const result = referenceProfile(p);
  result.id = p.id + "-classic3";
  result.version = 13;
  result.standardKit!.referenceEngine = "classic-greedy/3";
  return result;
}
// Preserve the physical kit/template coordinates. Only exactly horizontal or
// vertical chords intersecting the central 4% square are excluded in /3.
// Epsilon accounts solely for perimeter coordinate reconstruction ULPs.
export function isSquareCentreAxis(p: MaterialProfile, a: number, b: number) {
  if (p.shape !== "rectangle") return false;
  const u = p.pins[a],
    v = p.pins[b],
    eps = 1e-12,
    h = 0.02;
  return (
    (Math.abs(u.x - v.x) <= eps &&
      Math.abs(u.x - 0.5) <= h &&
      Math.min(u.y, v.y) <= 0.5 + h &&
      Math.max(u.y, v.y) >= 0.5 - h) ||
    (Math.abs(u.y - v.y) <= eps &&
      Math.abs(u.y - 0.5) <= h &&
      Math.min(u.x, v.x) <= 0.5 + h &&
      Math.max(u.x, v.x) >= 0.5 - h)
  );
}
export function leastSquaresImportance(n: number, faces: RegionBox[]) {
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let gaussian = 0;
      for (const b of faces) {
        const dx = (x - n * (b.left + b.width / 2)) / ((n * b.width) / 2),
          dy = (y - n * (b.top + b.height / 2)) / ((n * b.height) / 2);
        gaussian = Math.max(gaussian, Math.exp(-(dx * dx + dy * dy)));
      }
      out[y * n + x] = 1 + gaussian;
    }
  return out;
}

export async function generateClassicLeastSquares(
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
    p.standardKit.referenceEngine !== "classic-greedy/3" ||
    p.colors.length !== 1 ||
    p.baseColor !== "#ffffff" ||
    !Number.isInteger(o.lines) ||
    o.lines < 1 ||
    o.lines > p.maxLines
  )
    throw Error("classic3/combination");
  assertPinSpacing(p);
  validateStandardProfile(p);
  const faces = o.kitPreparation?.transform.targetFaces ?? [],
    settings: ClassicLeastSquaresSettings = {
      ...CLASSIC_LS_DEFAULTS,
      faces,
    },
    importance = leastSquaresImportance(n, faces),
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
      o.seed.algorithm !== "classic-greedy/3" ||
      o.seed.imageHash !== imageHash ||
      JSON.stringify(o.seed.profile) !== JSON.stringify(p) ||
      o.seed.params.resolution !== n ||
      o.seed.params.accessPolicy !== o.accessPolicy ||
      JSON.stringify(o.seed.params.kitPreparation) !==
        JSON.stringify(o.kitPreparation) ||
      JSON.stringify(o.seed.params.classic) !== JSON.stringify(settings) ||
      o.seed.metrics.lines > o.lines
    )
      throw Error("classic3/seed-identity");
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
      algorithm: "classic-greedy/3",
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
        isSquareCentreAxis(p, cur, b) ||
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
        const e = err[pixels[j]],
          dd = 0.08 * importance[pixels[j]];
        sum += dd * (2 * e - dd);
      }
      const score = sum / pixels.length;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (best < 0) throw Error("classic3/fixed-budget-has-no-legal-path");
    const pixels = chord(cur, best);
    for (let j = 0; j < pixels.length; j++)
      err[pixels[j]] -= 0.08 * importance[pixels[j]];
    used.add(key(cur, best));
    distribution.apply([[cur, best]]);
    path.push(best);
    prev = cur;
    if (
      o.seed &&
      s < o.seed.metrics.lines &&
      o.seed.segments[0].path[s + 1] !== best
    )
      throw Error("classic3/seed-replay");
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
