import type { Instruction } from "./types";
import { validateInstruction } from "./validation";
import { hash, sequencePayload, rgb, deepFreeze } from "./engine";
import { strandFootprint, rasterSequence, type Footprint } from "./optical";
import { inside, connectionAllowed } from "./geometry";
import { contains, portraitRegions, regionMeasurements } from "./portrait";
import { anatomicalImportance } from "./anatomical-importance";
import {
  headImportance,
  validHeadImportance,
  type HeadImportance,
} from "./head-importance";
import { PhysicalContrast } from "./physical-contrast";
import { Distribution } from "./distribution";
import {
  hairCheckpointBinding,
  sealHairCheckpoint,
  validateHairCheckpoint,
  type HairCycleCheckpoint,
} from "./hair-checkpoint";
export type { HairCycleCheckpoint } from "./hair-checkpoint";

export interface HairCycleSettings {
  version: "face-protected-cycles/1";
  referenceHash: string;
  faceClearanceMm: 4;
  poolSize: 256;
  evaluationLimit: 100000;
  cycleLimit: 512;
  objective: "head-physical-overshoot/1";
}
// Out-and-back cycles are inserted at existing visits, not an optimization graph.
// Every trial has two physical traversals. No hidden route or transferred progress.
export async function refineHairCycles(
  seed: Instruction,
  pixels: Uint8Array,
  head: HeadImportance,
  options: {
    cancelled?: () => boolean;
    onProgress?: (d: Record<string, unknown>) => void;
    onAccepted?: (i: Instruction) => Promise<void> | void;
    resume?: HairCycleCheckpoint;
    onCheckpoint?: (state: HairCycleCheckpoint) => Promise<void> | void;
  } = {},
) {
  await validateInstruction(seed);
  validHeadImportance(head);
  const started = performance.now(),
    n = seed.params.resolution,
    p = seed.profile;
  if (
    !["density-resolved/12", "density-head/13", "hair-cycles/14"].includes(
      seed.algorithm,
    ) ||
    n !== 320 ||
    !p.pinBasis ||
    pixels.length !== n * n * 3 ||
    (await hash(pixels)) !== seed.imageHash ||
    seed.params.portrait?.regions?.placement !== "manual"
  )
    throw Error(
      "Hair refinement requires the exact resolved portrait and manual head selection",
    );
  const setting: HairCycleSettings = {
    version: "face-protected-cycles/1",
    referenceHash: seed.sequenceHash,
    faceClearanceMm: 4,
    poolSize: 256,
    evaluationLimit: 100000,
    cycleLimit: 512,
    objective: "head-physical-overshoot/1",
  };
  const binding = await hairCheckpointBinding(seed, head, setting);
  if (options.resume)
    await validateHairCheckpoint(options.resume, binding, p.pins.length);
  const check = () => {
    if (options.cancelled?.())
      throw new DOMException("Generation cancelled", "AbortError");
  };
  check();
  const reference = rasterSequence(seed),
    size = n * n,
    lum = (a: ArrayLike<number>, k: number) =>
      (a[k * 3] + a[k * 3 + 1] + a[k * 3 + 2]) / 3,
    density = Float64Array.from({ length: size }, (_, k) => lum(reference, k)),
    target = Float64Array.from(
      { length: size },
      (_, k) => lum(pixels, k) / 255,
    ),
    weight = new Float64Array(size),
    mask = new Uint8Array(size),
    protectedPixels = new Uint8Array(size),
    base = anatomicalImportance(seed.params.portrait!),
    importance = headImportance(base, head, p),
    face = portraitRegions(seed.params.portrait!).face,
    protect = {
      left: face.left - 4 / p.widthMm,
      top: face.top - 4 / p.heightMm,
      width: face.width + 8 / p.widthMm,
      height: face.height + 8 / p.heightMm,
    };
  const protectedRegions = [
    protect,
    ...["eyes", "nose", "mouth"].map((key) => {
      const r = portraitRegions(seed.params.portrait!)[key];
      return {
        left: r.left - 4 / p.widthMm,
        top: r.top - 4 / p.heightMm,
        width: r.width + 8 / p.widthMm,
        height: r.height + 8 / p.heightMm,
      };
    }),
  ];
  let weightSum = 0;
  for (let k = 0; k < size; k++) {
    const x = (k % n) / (n - 1),
      y = Math.floor(k / n) / (n - 1);
    mask[k] = +inside(p.shape, x, y);
    weight[k] = mask[k] ? importance(x, y) : 0;
    weightSum += weight[k];
    protectedPixels[k] = +protectedRegions.some((r) => contains(r, x, y));
  }
  const contrast = new PhysicalContrast(
      n,
      p,
      mask,
      weight,
      seed.params.optimization!.edgeWeight!,
      seed.params.optimization!.contrastPhysical!,
    ),
    ink = rgb(p.colors[0]).reduce((a, b) => a + b, 0) / 3,
    penalty = (r: number, t: number) =>
      (r - t) ** 2 *
      (r < t ? 1 + 1.5 * Math.max(0, Math.min(1, (t - 0.35) / 0.45)) ** 2 : 1),
    objective = () => {
      let value = contrast.objective(
        Float64Array.from(density, (v, k) => v - target[k]),
      );
      for (let k = 0; k < size; k++)
        value += weight[k] * penalty(density[k], target[k]);
      return value / weightSum;
    };
  const distribution = new Distribution(p.pins.length, seed.segments),
    path = [...seed.segments[0].path],
    visited = new Set(path),
    change = new Float64Array(size),
    marks = new Uint32Array(size),
    additions: { from: number; to: number }[] = [];
  let epoch = 0,
    evaluations = 0,
    reason: "no-improvement" | "compute-limit" = "compute-limit";
  type Candidate = { from: number; to: number; f: Footprint; initial: number };
  const eligible = (a: number, b: number) =>
    connectionAllowed(p, a, b) &&
    visited.has(a) &&
    visited.has(b) &&
    (distribution.pairs.get([a, b].sort((a, b) => a - b).join(":")) ?? 0) + 2 <=
      32 &&
    distribution.degree[a] + 2 <= 160 &&
    distribution.degree[b] + 2 <= 160;
  const gain = (f: Footprint, count = true) => {
    epoch++;
    if (count) evaluations++;
    let value = 0;
    for (let j = 0; j < f.pixels.length; j++) {
      const k = f.pixels[j],
        alpha = 1 - (1 - f.alpha[j]) ** 2;
      change[k] = (ink - density[k]) * alpha;
      marks[k] = epoch;
      value +=
        weight[k] *
        (penalty(density[k], target[k]) -
          penalty(density[k] + change[k], target[k]));
    }
    return (
      value + contrast.gain(density, target, change, marks, epoch, f.pixels)
    );
  };
  const initialObjective = objective(),
    pool: Candidate[] = [];
  const ranking = (a: Candidate, b: Candidate) =>
    b.initial - a.initial || a.from - b.from || a.to - b.to;
  let scanned = 0,
    scanEvaluations = 0;
  if (options.resume) {
    for (const c of options.resume.pool) {
      check();
      if (!eligible(c.from, c.to))
        throw Error("Illegal checkpoint pool connection");
      const f = strandFootprint(p, c.from, c.to, n);
      if (f.pixels.some((k) => protectedPixels[k]))
        throw Error("Checkpoint pool crosses protected face");
      pool.push({ ...c, f, initial: 0 });
    }
    scanEvaluations = options.resume.scanEvaluations;
    evaluations = scanEvaluations;
    for (const c of options.resume.cycles) {
      check();
      const candidate = pool.find((p) => p.from === c.from && p.to === c.to);
      if (
        !candidate ||
        !eligible(c.from, c.to) ||
        path.length + 1 > Math.min(p.maxLines, seed.params.requestedLines)
      )
        throw Error("Illegal checkpoint cycle");
      // These are verification calls, not new search proposals. Replay the recorded
      // operations from their immutable root; never use the partial guide as a root.
      if (gain(candidate.f, false) <= 1e-9)
        throw Error("Checkpoint cycle no longer improves the bound objective");
      evaluations += pool.filter((p) => eligible(p.from, p.to)).length + 1;
      for (const k of candidate.f.pixels) density[k] += change[k];
      const at = path.indexOf(c.from);
      path.splice(at + 1, 0, c.to, c.from);
      distribution.apply([
        [c.from, c.to],
        [c.to, c.from],
      ]);
      additions.push({ ...c });
    }
    if (evaluations !== options.resume.evaluations)
      throw Error("Hair checkpoint search count mismatch");
  } else
    for (let a = 0; a < p.pins.length; a++)
      for (let b = a + 1; b < p.pins.length; b++) {
        check();
        scanned++;
        if (scanned % 512 === 0) {
          options.onProgress?.({
            stage: "hair-pool",
            scanned,
            total: (p.pins.length * (p.pins.length - 1)) / 2,
            evaluations,
            elapsedMs: performance.now() - started,
          });
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (!eligible(a, b)) continue;
        const f = strandFootprint(p, a, b, n);
        if (f.pixels.some((k) => protectedPixels[k])) continue;
        const initial = gain(f);
        if (
          initial > 1e-9 &&
          (pool.length < setting.poolSize ||
            initial > pool[pool.length - 1].initial)
        ) {
          pool.push({ from: a, to: b, f, initial });
          pool.sort(ranking);
          if (pool.length > setting.poolSize) pool.pop();
        }
      }
  if (!options.resume) scanEvaluations = evaluations;
  async function checkpoint() {
    if (options.onCheckpoint)
      await options.onCheckpoint(
        await sealHairCheckpoint({
          version: "hair-cycle-checkpoint/1",
          binding,
          pool: pool.map(({ from, to }) => ({ from, to })),
          cycles: structuredClone(additions),
          scanEvaluations,
          evaluations,
          elapsedMs:
            (options.resume?.elapsedMs ?? 0) + performance.now() - started,
        }),
      );
  }
  await checkpoint();
  async function materialize() {
    const result = structuredClone(seed);
    result.algorithm = "hair-cycles/14";
    result.id = crypto.randomUUID();
    result.createdAt = new Date().toISOString();
    result.segments[0].path = [...path];
    result.params.parentSequenceHash = seed.sequenceHash;
    result.params.refinementStage = (seed.params.refinementStage ?? 1) + 1;
    result.params.optimization!.head = structuredClone(head);
    result.params.hairCycles = setting;
    delete result.metrics.densityFit;
    delete result.metrics.exchange;
    delete result.metrics.refinement;
    result.metrics.lines = path.length - 1;
    result.metrics.estimatedMeters = seed.metrics.estimatedMeters;
    for (const c of additions) {
      const a = p.pins[c.from],
        b = p.pins[c.to];
      result.metrics.estimatedMeters +=
        ((2 *
          (Math.hypot((a.x - b.x) * p.widthMm, (a.y - b.y) * p.heightMm) +
            p.wrapAllowanceMm)) /
          1000) *
        (1 + p.wasteFraction);
    }
    result.metrics.perColorMeters = {
      [p.colors[0]]: result.metrics.estimatedMeters,
    };
    result.metrics.stockShortfallMeters = Math.max(
      0,
      result.metrics.estimatedMeters - p.stockMeters,
    );
    result.metrics.stoppedReason = reason;
    result.metrics.durationMs =
      (options.resume?.elapsedMs ?? 0) + performance.now() - started;
    result.metrics.hairCycles = {
      evaluations,
      cycles: structuredClone(additions),
      initialObjective,
      finalObjective: objective(),
      protectedFace: "exact-native-pixels",
      originalRoutingConnections:
        seed.metrics.densityFit?.routingConnections ??
        seed.metrics.hairCycles?.originalRoutingConnections ??
        0,
      poolCandidates: pool.length,
    };
    result.metrics.weightedError = {
      baseline: initialObjective,
      final: objective(),
    };
    const raster = rasterSequence(result);
    let error = 0,
      count = 0;
    for (let k = 0; k < size; k++) {
      if (protectedPixels[k])
        for (let c = 0; c < 3; c++)
          if (raster[k * 3 + c] !== reference[k * 3 + c])
            throw Error("Protected face changed");
      if (mask[k])
        for (let c = 0; c < 3; c++) {
          error += (raster[k * 3 + c] - pixels[k * 3 + c] / 255) ** 2;
          count++;
        }
    }
    result.metrics.reconstructionMse = error / count;
    result.metrics.regions!.final = regionMeasurements(
      pixels,
      raster,
      n,
      p,
      seed.params.portrait!,
    );
    result.sequenceHash = await hash(sequencePayload(result));
    await validateInstruction(result);
    return deepFreeze(result);
  }
  while (
    additions.length < setting.cycleLimit &&
    evaluations + pool.length + 1 <= setting.evaluationLimit &&
    path.length + 1 <= Math.min(p.maxLines, seed.params.requestedLines)
  ) {
    check();
    let winner: Candidate | undefined,
      best = 1e-9;
    for (const c of pool)
      if (eligible(c.from, c.to)) {
        const g = gain(c.f);
        if (g > best) {
          best = g;
          winner = c;
        }
      }
    if (!winner) {
      reason = "no-improvement";
      break;
    }
    // Recompute winner delta because other candidates overwrite sparse scratch buffers.
    gain(winner.f);
    for (const k of winner.f.pixels) density[k] += change[k];
    const at = path.indexOf(winner.from);
    path.splice(at + 1, 0, winner.to, winner.from);
    distribution.apply([
      [winner.from, winner.to],
      [winner.to, winner.from],
    ]);
    additions.push({ from: winner.from, to: winner.to });
    if (additions.length % 16 === 0) {
      options.onProgress?.({
        stage: "hair-cycles",
        cycles: additions.length,
        evaluations,
        objective: objective(),
        elapsedMs: performance.now() - started,
      });
      if (options.onAccepted) await options.onAccepted(await materialize());
      await checkpoint();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return materialize();
}
