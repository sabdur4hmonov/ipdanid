import type { GenerateOptions } from "./engine";
import { deepFreeze, hash, sequencePayload } from "./engine";
import type { Instruction } from "./types";
import { assertPinSpacing, connectionAllowed, insideProfile } from "./geometry";
import { Distribution } from "./distribution";
import { rasterSequence, strandFootprint, type Footprint } from "./optical";
import { MAX_LINES } from "./limits";
import { validateStandardProfile } from "./standard-kit";

// Independent sequential greedy baseline. Each decision measures the exact optical
// strand used by the shared renderer; no global rerouting or target overlay.
export async function generateClassic(
  o: GenerateOptions & {
    onCheckpoint?: (instruction: Instruction) => void;
  },
): Promise<Instruction> {
  const { profile: p, resolution: n } = o;
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 192 ||
    o.pixels.length !== n * n * 3 ||
    o.mode !== "dark" ||
    p.colors.length !== 1 ||
    p.baseColor.toLowerCase() !== "#ffffff" ||
    !Number.isSafeInteger(o.lines) ||
    o.lines < 1 ||
    o.lines > Math.min(MAX_LINES, p.maxLines) ||
    p.pins.length < 24 ||
    p.pins.length > 240 ||
    !(p.threadMm > 0) ||
    !(p.opacity > 0 && p.opacity <= 1)
  )
    throw Error("classic/combination");
  assertPinSpacing(p);
  validateStandardProfile(p);
  const imageHash = await hash(o.pixels);
  if (o.seed) {
    const { validateInstruction } = await import("./validation");
    await validateInstruction(o.seed);
    if (
      o.seed.algorithm !== "classic-greedy/1" ||
      o.seed.imageHash !== imageHash ||
      o.seed.params.resolution !== n ||
      o.seed.params.mode !== o.mode ||
      JSON.stringify(o.seed.profile) !== JSON.stringify(p) ||
      JSON.stringify(o.seed.params.portrait) !== JSON.stringify(o.portrait) ||
      JSON.stringify(o.seed.params.subject) !== JSON.stringify(o.subject) ||
      JSON.stringify(o.seed.params.kitPreparation) !==
        JSON.stringify(o.kitPreparation) ||
      o.seed.params.accessPolicy !== o.accessPolicy ||
      o.seed.metrics.lines > o.lines
    )
      throw Error("classic/recovery-identity");
  }
  const target = Float32Array.from(o.pixels, (v) => v / 255);
  const rendered = o.seed
    ? rasterSequence(o.seed)
    : new Float32Array(n * n * 3).fill(1);
  const mask = Uint8Array.from(
    { length: n * n },
    (_, at) =>
      +insideProfile(p, (at % n) / (n - 1), Math.floor(at / n) / (n - 1)),
  );
  let samples = 0,
    baseline = 0;
  for (let at = 0; at < mask.length; at++)
    if (mask[at]) {
      samples += 3;
      for (let c = 0; c < 3; c++) baseline += (1 - target[at * 3 + c]) ** 2;
    }
  const ink = [1, 3, 5].map(
    (at) => parseInt(p.colors[0].slice(at, at + 2), 16) / 255,
  );
  const path = o.seed ? [...o.seed.segments[0].path] : [0];
  const distribution = new Distribution(p.pins.length, o.seed?.segments);
  const cache = new Map<number, Footprint>();
  const legalCache = new Map<number, boolean>();
  function legal(a: number, b: number) {
    const key = Math.min(a, b) * p.pins.length + Math.max(a, b);
    if (!legalCache.has(key)) legalCache.set(key, connectionAllowed(p, a, b));
    return legalCache.get(key)!;
  }
  let cacheBytes = 0,
    peakCacheBytes = 0;
  function footprint(a: number, b: number) {
    const key = Math.min(a, b) * p.pins.length + Math.max(a, b);
    let f = cache.get(key);
    if (!f) {
      f = strandFootprint(p, a, b, n);
      const bytes =
        f.pixels.byteLength + f.alpha.byteLength + f.density.byteLength;
      while (cacheBytes + bytes > 64 * 1024 * 1024 && cache.size) {
        const first = cache.keys().next().value!;
        const old = cache.get(first)!;
        cacheBytes -=
          old.pixels.byteLength + old.alpha.byteLength + old.density.byteLength;
        cache.delete(first);
      }
      cache.set(key, f);
      cacheBytes += bytes;
      peakCacheBytes = Math.max(peakCacheBytes, cacheBytes);
    }
    return f;
  }
  function mse() {
    let sum = 0;
    for (let at = 0; at < mask.length; at++)
      if (mask[at])
        for (let c = 0; c < 3; c++)
          sum += (rendered[at * 3 + c] - target[at * 3 + c]) ** 2;
    return sum / samples;
  }
  let meters = 0.5;
  function length(a: number, b: number) {
    return (
      ((Math.hypot(
        (p.pins[a].x - p.pins[b].x) * p.widthMm,
        (p.pins[a].y - p.pins[b].y) * p.heightMm,
      ) +
        p.wrapAllowanceMm) /
        1000) *
      (1 + p.wasteFraction)
    );
  }
  for (let at = 1; at < path.length; at++)
    meters += length(path[at - 1], path[at]);
  let reason: Instruction["metrics"]["stoppedReason"] = "requested";
  const started = performance.now();
  async function snapshot(): Promise<Instruction> {
    const i: Instruction = {
      schema: "iprasm.instruction/1",
      algorithm: "classic-greedy/1",
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      imageHash,
      sequenceHash: "",
      profile: structuredClone(p),
      segments: [{ color: p.colors[0], path: [...path] }],
      params: {
        ...(o.kitPreparation
          ? { kitPreparation: structuredClone(o.kitPreparation) }
          : {}),
        resolution: n,
        requestedLines: o.lines,
        mode: "dark",
        stockPolicy: "estimate",
        ...(o.accessPolicy ? { accessPolicy: o.accessPolicy } : {}),
        ...(o.portrait ? { portrait: structuredClone(o.portrait) } : {}),
        ...(o.subject ? { subject: structuredClone(o.subject) } : {}),
        optimization: {
          lookahead: 0,
          coarseScale: 1,
          minimumRelativeGain: 0,
          pairLimit: 32,
          pinDegreeLimit: 160,
        },
      },
      metrics: {
        baselineMse: baseline / samples,
        reconstructionMse: mse(),
        estimatedMeters: meters,
        weightedError: { baseline: baseline / samples, final: mse() },
        perColorMeters: { [p.colors[0]]: meters },
        lines: path.length - 1,
        stoppedReason: reason,
        stockShortfallMeters: Math.max(0, meters - p.stockMeters),
        durationMs: performance.now() - started,
        peakCacheBytes,
      },
    };
    i.sequenceHash = await hash(sequencePayload(i));
    return deepFreeze(i);
  }
  while (path.length - 1 < o.lines) {
    if (o.cancelled?.()) throw new DOMException("Cancelled", "AbortError");
    const from = path[path.length - 1];
    let best = -1,
      bestGain = 1e-12;
    for (let to = 0; to < p.pins.length; to++) {
      if (!legal(from, to) || !distribution.canChange([[from, to]])) continue;
      const f = footprint(from, to);
      let gain = 0;
      for (let k = 0; k < f.pixels.length; k++) {
        const at = f.pixels[k];
        if (!mask[at]) continue;
        for (let c = 0; c < 3; c++) {
          const old = rendered[at * 3 + c],
            d = (ink[c] - old) * f.alpha[k];
          gain -= 2 * (old - target[at * 3 + c]) * d + d * d;
        }
      }
      if (gain > bestGain) {
        best = to;
        bestGain = gain;
      }
    }
    if (best < 0) {
      reason = "no-improvement";
      break;
    }
    const f = footprint(from, best);
    for (let k = 0; k < f.pixels.length; k++)
      if (mask[f.pixels[k]])
        for (let c = 0; c < 3; c++) {
          const at = f.pixels[k] * 3 + c;
          rendered[at] += (ink[c] - rendered[at]) * f.alpha[k];
        }
    distribution.apply([[from, best]]);
    path.push(best);
    meters += length(from, best);
    if ((path.length - 1) % 25 === 0) {
      o.onProgress?.((path.length - 1) / o.lines);
      await new Promise((r) => setTimeout(r, 0));
    }
    if (o.onCheckpoint && (path.length - 1) % 250 === 0)
      o.onCheckpoint(await snapshot());
  }
  if (path.length < 2) throw Error("classic/no-improving-path");
  o.onProgress?.(1);
  return snapshot();
}
