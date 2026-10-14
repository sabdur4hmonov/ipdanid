import { validSubjectPlan } from "./subject-plan";
import { validLetteringProduct } from "./lettering-contract";
import {
  subjectWeightField,
  measureSubjects,
  validSubjectObjective,
  type SubjectObjectiveSettings,
} from "./subject-objective";
import { capabilityProblem } from "./capabilities";
import {
  LocalTexture,
  validLocalTexture,
  type LocalTextureSettings,
} from "./local-texture";
import { headImportance, type HeadImportance } from "./head-importance";
import {
  featureContrast,
  validFeatureContrast,
  type FeatureContrastSettings,
} from "./feature-contrast";
import { validatePinBasis } from "./pin-basis";
import {
  anatomicalImportance,
  type AnatomicalImportance,
} from "./anatomical-importance";
import type { GenerateOptions } from "./engine";
import { deepFreeze, hash, rgb, sequencePayload } from "./engine";
import { inside, connectionAllowed, assertPinSpacing } from "./geometry";
import { strandFootprint, rasterSequence, type Footprint } from "./optical";
import {
  contains,
  portraitRegions,
  regionMeasurements,
  validPortrait,
} from "./portrait";
import { MAX_FOOTPRINT_BYTES, MAX_LINES } from "./limits";
import type { Instruction } from "./types";
import { validateInstruction } from "./validation";
import { PAIR_LIMIT, INCIDENT_LIMIT } from "./distribution";
import { assertContinuation } from "./continuation";
import {
  PhysicalContrast,
  type PhysicalContrastSettings,
} from "./physical-contrast";

// Reversible integer strand counts, evaluated against the actual optical mean-RGB raster.
// The chosen multigraph is connected and made Eulerian with explicit, measured routing strands.
export interface DensityCheckpoint {
  initialObjective?: "consistent-undershoot/1";
  version: "density-fit-checkpoint/1";
  binding: string;
  checksum: string;
  counts: number[];
  density: number[];
  objective: number;
  sweeps: number;
  evaluations: number;
  removedConnections: number;
  plateau: boolean;
  elapsedMs: number;
  exchange?: {
    version: "chord-exchange-state/1";
    cursor: number;
    proposals: [number, number][];
    poolEvaluations: number;
    proposalEvaluations: number;
    accepted: number;
  };
}
export interface ChordExchangeSettings {
  version: "chord-exchange/1";
  mode: "single" | "paired";
  evaluationLimit: number;
  poolSize: number;
  selection: "initial-full-objective-gain/1" | "nose-lip-residual/1";
}
export interface DensityTuning {
  subjectObjective?: SubjectObjectiveSettings;
  texture?: LocalTextureSettings;
  initialObjective?: "consistent-undershoot/1";
  features?: FeatureContrastSettings;
  // Separately versioned direct-source grid; never an enlarged old target/seed.
  resolved?: boolean;
  head?: HeadImportance;
  edgeWeight: number;
  sweeps: number;
  multiscale?: boolean;
  physical?: PhysicalContrastSettings;
  anatomy?: AnatomicalImportance;
  resume?: DensityCheckpoint;
  onCheckpoint?: (checkpoint: DensityCheckpoint) => Promise<void> | void;
  extension?: {
    version?: "resolved-convergence/1";
    checkpoint: DensityCheckpoint;
    priorSweepLimit: number;
    reference: Instruction;
  };
  // Route a validated saved graph for inspection without consuming more sweeps.
  materializeOnly?: boolean;
  exchange?: ChordExchangeSettings;
}
export async function generateDensity(
  o: GenerateOptions,
  tuning: DensityTuning = {
    edgeWeight: 1,
    sweeps: 8,
  },
): Promise<Instruction> {
  const started = performance.now(),
    { resolution: n, profile: p } = o,
    portrait = o.portrait!,
    general = !!tuning.subjectObjective;
  const initialObjective =
    tuning.initialObjective ??
    tuning.resume?.initialObjective ??
    tuning.extension?.checkpoint.initialObjective ??
    o.seed?.params.optimization?.initialObjective ??
    (!o.seed && !o.profile.pinBasis && o.mode === "light" && !tuning.resume
      ? ("consistent-undershoot/1" as const)
      : undefined);
  if (
    initialObjective !== undefined &&
    initialObjective !== "consistent-undershoot/1"
  )
    throw Error("Invalid initial objective version");
  if (o.subject) validSubjectPlan(o.subject, portrait);
  if (o.product) {
    validLetteringProduct(o.product);
    if (
      !general ||
      o.product.style !== "target" ||
      o.subject?.kind !== "whole-image"
    )
      throw Error("lettering/strategy");
  }
  if ((!portrait?.enabled && !general) || !["dark", "light"].includes(o.mode))
    throw new Error("Density optimization requires a new monochrome portrait");
  if (o.seed) assertContinuation(o, await hash(o.pixels));
  if (portrait) validPortrait(portrait);
  if (general) {
    validSubjectObjective(tuning.subjectObjective!);
    const problem = capabilityProblem("density-subject/18", {
      subject: o.subject,
      mode: o.mode,
      resolution: n,
      shape: p.shape,
    });
    if (problem) throw Error(`subject-fit/${problem}`);
    if (
      !tuning.physical ||
      tuning.resolved ||
      tuning.features ||
      tuning.texture ||
      tuning.anatomy ||
      tuning.head ||
      tuning.exchange ||
      tuning.extension ||
      tuning.multiscale ||
      (o.seed && o.seed.algorithm !== "density-subject/18")
    )
      throw Error("subject-fit/combination");
    if (
      o.seed &&
      JSON.stringify(o.seed.params.optimization?.subjectObjective) !==
        JSON.stringify(tuning.subjectObjective)
    )
      throw Error("Continuation requires the same subject objective");
  }
  if (o.seed?.algorithm === "density-subject/18" && !general)
    throw Error("Continuation requires the same subject objective");
  if (tuning.texture) {
    validLocalTexture(tuning.texture);
    if (
      !o.seed ||
      o.mode !== "dark" ||
      !tuning.resolved ||
      !tuning.physical ||
      tuning.features ||
      tuning.head ||
      tuning.anatomy ||
      tuning.extension ||
      tuning.exchange ||
      tuning.multiscale ||
      portrait.people ||
      portrait.regions?.placement !== "manual"
    )
      throw Error("Local texture requires a separate resolved objective");
  }
  if (
    o.seed?.algorithm === "density-texture/17" &&
    JSON.stringify(o.seed.params.optimization?.texture) !==
      JSON.stringify(tuning.texture)
  )
    throw Error("Continuation requires the same local texture objective");
  if (tuning.features) {
    validFeatureContrast(tuning.features);
    if (
      !tuning.resolved ||
      !tuning.physical ||
      tuning.head ||
      tuning.anatomy ||
      tuning.extension ||
      tuning.exchange ||
      tuning.multiscale ||
      portrait.people ||
      portrait.regions?.placement !== "manual"
    )
      throw Error(
        "Source feature contrast requires a separate resolved objective",
      );
  }
  if (
    o.seed?.algorithm === "density-feature/16" &&
    JSON.stringify(o.seed.params.optimization?.features) !==
      JSON.stringify(tuning.features)
  )
    throw Error("Continuation requires the same source feature objective");
  if (p.pinBasis) {
    validatePinBasis(p);
    if (
      !tuning.physical ||
      tuning.anatomy ||
      (tuning.extension &&
        !(
          tuning.resolved &&
          tuning.extension.version === "resolved-convergence/1"
        )) ||
      tuning.exchange
    )
      throw Error("Pin-basis experiment requires a separate physical fit");
  }
  if (o.seed) await validateInstruction(o.seed);
  if (tuning.materializeOnly && !tuning.resume)
    throw Error("A materialized snapshot requires a bound saved state");
  if (
    tuning.anatomy &&
    (!tuning.physical || tuning.extension || tuning.exchange)
  )
    throw Error("Anatomical importance requires a separate physical fit");
  const anatomical = general
    ? () => 1
    : anatomicalImportance(portrait, tuning.anatomy);
  if (
    tuning.head &&
    (!tuning.resolved ||
      tuning.anatomy ||
      portrait.regions?.placement !== "manual")
  )
    throw Error(
      "Head importance requires a separate resolved fit and manual regions",
    );
  if (
    o.seed &&
    JSON.stringify(o.seed.params.optimization?.head) !==
      JSON.stringify(tuning.head)
  )
    throw Error("Continuation requires the same manual head importance");
  const importanceAt = tuning.head
    ? headImportance(anatomical, tuning.head, p)
    : anatomical;
  if (
    tuning.resolved &&
    (n !== 320 ||
      !tuning.physical ||
      !p.pinBasis ||
      tuning.anatomy ||
      (tuning.extension &&
        tuning.extension.version !== "resolved-convergence/1") ||
      tuning.exchange ||
      (o.seed &&
        !(
          (tuning.features || tuning.texture) &&
          [
            "density-resolved/12",
            tuning.texture ? "density-texture/17" : "density-feature/16",
          ].includes(o.seed.algorithm)
        ) &&
        o.seed.algorithm !==
          (tuning.head ? "density-head/13" : "density-resolved/12")))
  )
    throw Error("Resolved sampling requires a separate 320 physical fit");
  const extension = tuning.extension;
  const convergenceVersion = tuning.resolved
    ? ("resolved-convergence/1" as const)
    : ("density-convergence/1" as const);
  const exchange = tuning.exchange;
  if (
    exchange &&
    (extension ||
      !o.seed ||
      !tuning.physical ||
      tuning.sweeps !== 1 ||
      exchange.version !== "chord-exchange/1" ||
      !["single", "paired"].includes(exchange.mode) ||
      !["initial-full-objective-gain/1", "nose-lip-residual/1"].includes(
        exchange.selection,
      ) ||
      !Number.isSafeInteger(exchange.evaluationLimit) ||
      exchange.evaluationLimit < 100 ||
      exchange.evaluationLimit > 200000 ||
      !Number.isSafeInteger(exchange.poolSize) ||
      exchange.poolSize < 8 ||
      exchange.poolSize > 256)
  )
    throw Error("Invalid bounded chord-exchange settings");
  if (extension) {
    const { checkpoint, priorSweepLimit, reference } = extension;
    await validateInstruction(reference);
    if (
      !tuning.physical ||
      reference.algorithm !==
        (tuning.resolved ? "density-resolved/12" : "density-physical/8") ||
      (tuning.resolved
        ? extension.version !== "resolved-convergence/1" || !!tuning.head
        : extension.version !== undefined) ||
      reference.params.optimization?.convergence ||
      !Number.isSafeInteger(priorSweepLimit) ||
      priorSweepLimit < 1 ||
      priorSweepLimit >= tuning.sweeps ||
      tuning.sweeps > 24 ||
      checkpoint.sweeps !== priorSweepLimit ||
      reference.params.optimization?.sweeps !== priorSweepLimit ||
      reference.metrics.densityFit?.sweeps !== priorSweepLimit ||
      reference.params.parentSequenceHash !== o.seed?.sequenceHash
    )
      throw Error("Invalid explicit convergence extension");
    // Never rewrite the old binding/checksum. Validate and route it under the
    // EXACT old budget; no fit sweep is repeated. The executable hash must match.
    const prior = await generateDensity(
      {
        ...o,
        onProgress: undefined,
        onDiagnostic: (d) =>
          o.onDiagnostic?.({
            ...d,
            stage: "extension-validation",
            originalStage: d.stage,
          }),
      },
      {
        edgeWeight: tuning.edgeWeight,
        sweeps: priorSweepLimit,
        multiscale: tuning.multiscale,
        physical: tuning.physical,
        resolved: tuning.resolved,
        resume: checkpoint,
      },
    );
    if (prior.sequenceHash !== reference.sequenceHash)
      throw Error(
        "Extension state does not reproduce its executable reference",
      );
  }
  assertPinSpacing(p);
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > (tuning.resolved || general ? 320 : 192) ||
    o.pixels.length !== n * n * 3 ||
    !Number.isInteger(o.lines) ||
    o.lines < 1 ||
    o.lines > Math.min(MAX_LINES, p.maxLines) ||
    p.pins.length < 24 ||
    p.pins.length > (p.pinBasis ? 320 : 240) ||
    !Number.isFinite(tuning.edgeWeight) ||
    tuning.edgeWeight < 0 ||
    tuning.edgeWeight > 4 ||
    !Number.isInteger(tuning.sweeps) ||
    tuning.sweeps < 1 ||
    tuning.sweeps > 24
  )
    throw new Error("Invalid bounded density optimization");
  if (
    ![
      p.widthMm,
      p.heightMm,
      p.threadMm,
      p.opacity,
      p.stockMeters,
      p.wrapAllowanceMm,
      p.wasteFraction,
      p.shaftMm,
    ].every(Number.isFinite) ||
    p.widthMm < 50 ||
    p.widthMm > 2000 ||
    p.heightMm < 50 ||
    p.heightMm > 2000 ||
    p.threadMm <= 0 ||
    p.threadMm > 5 ||
    p.opacity <= 0 ||
    p.opacity > 1 ||
    p.stockMeters < 0 ||
    p.wrapAllowanceMm < 0 ||
    p.wrapAllowanceMm > 100 ||
    p.wasteFraction < 0 ||
    p.wasteFraction > 1 ||
    p.shaftMm <= 0 ||
    p.shaftMm > 20 ||
    !Number.isInteger(p.maxLines) ||
    p.maxLines < 1 ||
    p.maxLines > MAX_LINES ||
    !Number.isInteger(p.minPinGap) ||
    p.minPinGap < 1 ||
    !/^#[0-9a-f]{6}$/i.test(p.baseColor) ||
    !p.colors.length ||
    p.colors.some((c) => !/^#[0-9a-f]{6}$/i.test(c))
  )
    throw new Error("Invalid material profile");
  const base = rgb(p.baseColor),
    ink = rgb(p.colors[0]),
    bl = base.reduce((a, b) => a + b, 0) / 3,
    il = ink.reduce((a, b) => a + b, 0) / 3;
  const regions = general ? {} : portraitRegions(portrait),
    size = n * n;
  const target = new Float64Array(size),
    density = new Float64Array(size).fill(bl),
    mask = new Uint8Array(size),
    weight = new Float64Array(size);
  let weightSum = 0;
  const subjectField = general
    ? subjectWeightField(
        o.subject!,
        n,
        p,
        o.pixels,
        tuning.subjectObjective!,
        portrait,
      )
    : undefined;
  for (let i = 0; i < size; i++) {
    const x = (i % n) / (n - 1),
      y = Math.floor(i / n) / (n - 1);
    mask[i] = +inside(p.shape, x, y);
    if (!mask[i]) continue;
    const lum =
      (o.pixels[i * 3] + o.pixels[i * 3 + 1] + o.pixels[i * 3 + 2]) / 765;
    target[i] = lum;
    const importance = subjectField
      ? subjectField.weights[i]
      : importanceAt(x, y);
    // Manual anatomical bands prioritize genuine target contrast; no synthetic contours.
    weight[i] = importance;
    weightSum += weight[i];
  }
  const physical = tuning.physical
    ? new PhysicalContrast(
        n,
        p,
        mask,
        weight,
        tuning.edgeWeight,
        tuning.physical,
      )
    : undefined;
  const fractional = physical && !physical.legacyEquivalent;
  const fine = tuning.features
    ? featureContrast(n, p, portrait, target, mask, weight, tuning.features)
        .operator
    : undefined;
  const texture = tuning.texture
    ? new LocalTexture(n, p, portrait, target, mask, weight, tuning.texture)
    : undefined;
  const fineObjective = () =>
    fine!.objective(Float64Array.from(density, (v, i) => v - target[i]));
  const contrastObjective = () =>
    physical!.objective(Float64Array.from(density, (v, i) => v - target[i]));
  const neighbors = (i: number, visit: (j: number, w: number) => void) => {
    if (fractional) return;
    const x = i % n,
      y = Math.floor(i / n);
    if (tuning.multiscale || physical) {
      // Symmetric differences at 1/2/4 px. Equal derivative units (1 / distance²).
      // Every affected pair is evaluated once by gain(), including pixels outside the footprint.
      for (const step of [1, 2, 4]) {
        for (const [dx, dy] of [
          [-step, 0],
          [step, 0],
          [0, -step],
          [0, step],
        ]) {
          const xx = x + dx,
            yy = y + dy,
            j = yy * n + xx;
          if (xx >= 0 && xx < n && yy >= 0 && yy < n && mask[j])
            visit(
              j,
              ((weight[i] + weight[j]) * 0.5 * tuning.edgeWeight) /
                (step * step),
            );
        }
      }
    } else {
      if (x && mask[i - 1])
        visit(i - 1, (weight[i] + weight[i - 1]) * 0.5 * tuning.edgeWeight);
      if (x < n - 1 && mask[i + 1])
        visit(i + 1, (weight[i] + weight[i + 1]) * 0.5 * tuning.edgeWeight);
      if (y && mask[i - n])
        visit(i - n, (weight[i] + weight[i - n]) * 0.5 * tuning.edgeWeight);
      if (y < n - 1 && mask[i + n])
        visit(i + n, (weight[i] + weight[i + n]) * 0.5 * tuning.edgeWeight);
    }
  };
  const overshoot = (t: number) =>
    1 + 1.5 * Math.max(0, Math.min(1, (t - 0.35) / 0.45)) ** 2;
  const penalty = (r: number, t: number) => {
    const e = r - t;
    return e * e * (e < 0 ? overshoot(t) : 1);
  };
  let objective = 0;
  for (let i = 0; i < size; i++)
    if (mask[i]) {
      objective +=
        weight[i] *
        (p.pinBasis || initialObjective
          ? penalty(bl, target[i])
          : (bl - target[i]) ** 2);
      neighbors(i, (j, w) => {
        if (j > i) objective += w * (target[i] - target[j]) ** 2;
      });
    }
  if (fractional) objective += contrastObjective();
  if (fine) objective += fineObjective();
  if (texture) objective += texture.objective(density);
  const initial = objective,
    counts = new Int32Array(p.pins.length ** 2),
    pinDegree = new Int32Array(p.pins.length),
    pairLimit = PAIR_LIMIT,
    pinDegreeLimit = INCIDENT_LIMIT,
    pairs: [number, number][] = [];
  for (let a = 0; a < p.pins.length; a++)
    for (let b = a + 1; b < p.pins.length; b++)
      if (connectionAllowed(p, a, b)) pairs.push([a, b]);
  // Deterministic shuffle prevents the first nail's fan from consuming early contrast.
  let randomState = 0x6d2b79f5;
  for (let j = pairs.length - 1; j > 0; j--) {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    const k = (randomState >>> 0) % (j + 1);
    [pairs[j], pairs[k]] = [pairs[k], pairs[j]];
  }
  const check = () => {
    if (o.cancelled?.())
      throw new DOMException("Generation cancelled", "AbortError");
  };
  let cacheBytes = 0,
    peakCacheBytes = 0,
    total = 0,
    evaluations = 0,
    sweeps = 0,
    removedConnections = 0;
  const cache = new Map<number, Footprint>(),
    sparse = new Float64Array(size),
    marks = new Uint32Array(size);
  let epoch = 0,
    textureGainCalls = 0;
  const key = (a: number, b: number) =>
    Math.min(a, b) * p.pins.length + Math.max(a, b);
  const footprint = (a: number, b: number) => {
    const id = key(a, b);
    let f = cache.get(id);
    if (f) {
      cache.delete(id);
      cache.set(id, f);
      return f;
    }
    f = strandFootprint(p, a, b, n);
    if (f.alpha.some((a) => a >= 1))
      throw new Error(
        "Global fit requires subpixel thread coverage; use continuous-path mode for this material",
      );
    const bytes =
      f.pixels.byteLength + f.alpha.byteLength + f.density.byteLength;
    while (cacheBytes + bytes > MAX_FOOTPRINT_BYTES && cache.size) {
      const first = cache.keys().next().value!,
        old = cache.get(first)!;
      cacheBytes -=
        old.pixels.byteLength + old.alpha.byteLength + old.density.byteLength;
      cache.delete(first);
    }
    cache.set(id, f);
    cacheBytes += bytes;
    peakCacheBytes = Math.max(peakCacheBytes, cacheBytes);
    return f;
  };
  const gain = (
    f: Pick<Footprint, "pixels"> & { density: Float32Array | Float64Array },
    delta: number,
  ) => {
    if (texture) textureGainCalls++;
    epoch++;
    let value = 0;
    for (let k = 0; k < f.pixels.length; k++) {
      const i = f.pixels[k];
      marks[i] = epoch;
      sparse[i] = (density[i] - il) * Math.expm1(-delta * f.density[k]);
    }
    for (let k = 0; k < f.pixels.length; k++) {
      const i = f.pixels[k];
      if (!mask[i]) continue;
      const change = sparse[i];
      value +=
        weight[i] *
        (penalty(density[i], target[i]) -
          penalty(density[i] + change, target[i]));
      neighbors(i, (j, w) => {
        if (j > i || marks[j] !== epoch) {
          const other = marks[j] === epoch ? sparse[j] : 0,
            e = density[i] - density[j] - (target[i] - target[j]);
          value += w * (e * e - (e + change - other) ** 2);
        }
      });
    }
    return (
      value +
      (fractional
        ? physical.gain(density, target, sparse, marks, epoch, f.pixels)
        : 0) +
      (fine ? fine.gain(density, target, sparse, marks, epoch, f.pixels) : 0) +
      (texture ? texture.gain(density, sparse, marks, epoch, f.pixels) : 0)
    );
  };
  const candidate = (id: number, f: Footprint, a: number, b: number) => {
    if (texture) {
      let best = { delta: 0, gain: 0 };
      // Two full sparse objective evaluations per chord, including unavailable moves.
      // Thus control(strength=0) and candidate consume identical fitting evaluations.
      for (const delta of [-1, 1]) {
        const g = gain(f, delta);
        const legal =
          delta >= -counts[id] &&
          delta <=
            Math.min(
              pairLimit - counts[id],
              pinDegreeLimit - pinDegree[a],
              pinDegreeLimit - pinDegree[b],
              fitLimit - total,
            );
        if (legal && g > best.gain) best = { delta, gain: g };
      }
      return best;
    }
    let num = 0,
      nn = 0;
    for (let k = 0; k < f.pixels.length; k++) {
      const i = f.pixels[k];
      if (!mask[i]) continue;
      const d = (density[i] - il) * f.density[k],
        w = weight[i] * (density[i] < target[i] ? overshoot(target[i]) : 1);
      num += w * (density[i] - target[i]) * d;
      nn += w * d * d;
    }
    if (nn < 1e-12) return { delta: 0, gain: 0 };
    const estimate = Math.max(
      -counts[id],
      Math.min(
        pairLimit - counts[id],
        pinDegreeLimit - pinDegree[a],
        pinDegreeLimit - pinDegree[b],
        fitLimit - total,
        Math.round(num / nn),
      ),
    );
    let best = { delta: 0, gain: 0 };
    for (const delta of new Set([
      estimate,
      estimate > 0 ? estimate - 1 : estimate + 1,
      1,
      -1,
    ]))
      if (
        delta &&
        delta >= -counts[id] &&
        delta <=
          Math.min(
            pairLimit - counts[id],
            pinDegreeLimit - pinDegree[a],
            pinDegreeLimit - pinDegree[b],
            fitLimit - total,
          )
      ) {
        const g = gain(f, delta);
        if (g > best.gain) best = { delta, gain: g };
      }
    return best;
  };
  const apply = (
    a: number,
    b: number,
    delta: number,
    f: Footprint,
    knownGain?: number,
  ) => {
    const id = key(a, b);
    objective -= knownGain ?? gain(f, delta);
    counts[id] += delta;
    pinDegree[a] += delta;
    pinDegree[b] += delta;
    total += delta;
    if (delta < 0) removedConnections -= delta;
    for (let k = 0; k < f.pixels.length; k++) {
      const i = f.pixels[k];
      if (!mask[i]) continue;
      density[i] = il + (density[i] - il) * Math.exp(-delta * f.density[k]);
    }
  };
  const reserve = Math.min(p.pins.length * 2, Math.floor(o.lines * 0.25)),
    fitLimit = Math.max(o.lines - reserve, o.seed?.metrics.lines ?? 0);
  if (o.seed) {
    const replay = rasterSequence(o.seed);
    for (let i = 0; i < size; i++)
      density[i] = (replay[i * 3] + replay[i * 3 + 1] + replay[i * 3 + 2]) / 3;
    for (const segment of o.seed.segments)
      for (let j = 1; j < segment.path.length; j++) {
        check();
        const a = segment.path[j - 1],
          b = segment.path[j];
        counts[key(a, b)]++;
        pinDegree[a]++;
        pinDegree[b]++;
        total++;
      }
    objective = 0;
    for (let i = 0; i < size; i++)
      if (mask[i]) {
        objective += weight[i] * penalty(density[i], target[i]);
        neighbors(i, (j, w) => {
          if (j > i)
            objective +=
              w * (density[i] - density[j] - (target[i] - target[j])) ** 2;
        });
      }
    if (fractional) objective += contrastObjective();
    if (fine) objective += fineObjective();
    if (texture) objective += texture.objective(density);
    if (total > o.lines)
      throw new Error("Seed leaves insufficient routing capacity");
    if (
      counts.some((c) => c > pairLimit) ||
      pinDegree.some((d) => d > pinDegreeLimit)
    )
      throw new Error(
        "Existing sequence exceeds provisional winding guards; generate a new continuous basis",
      );
  }
  let plateau = false,
    priorElapsed = 0;
  const binding =
    tuning.resume || tuning.onCheckpoint || extension
      ? await hash(
          JSON.stringify({
            version: "density-fit-checkpoint/1",
            target: await hash(o.pixels),
            resolution: n,
            profile: p,
            portrait,
            ...(o.subject ? { subject: o.subject } : {}),
            ...(o.accessPolicy ? { accessPolicy: o.accessPolicy } : {}),
            ...(o.product ? { product: o.product } : {}),
            mode: o.mode,
            lines: o.lines,
            seed: o.seed?.sequenceHash,
            edgeWeight: tuning.edgeWeight,
            sweeps: tuning.sweeps,
            multiscale: tuning.multiscale ?? false,
            physical: tuning.physical,
            ...(initialObjective ? { initialObjective } : {}),
            ...(tuning.resolved
              ? { sampling: { version: "direct-source320/1", grid: 320 } }
              : {}),
            ...(tuning.anatomy ? { anatomy: tuning.anatomy } : {}),
            ...(tuning.head ? { head: tuning.head } : {}),
            ...(tuning.features ? { features: tuning.features } : {}),
            ...(tuning.texture ? { texture: tuning.texture } : {}),
            ...(general ? { subjectObjective: tuning.subjectObjective } : {}),
            ...(exchange ? { exchange } : {}),
            ...(extension
              ? {
                  extension: {
                    version: convergenceVersion,
                    reference: extension.reference.sequenceHash,
                    checkpointChecksum: extension.checkpoint.checksum,
                    priorSweepLimit: extension.priorSweepLimit,
                  },
                }
              : {}),
          }),
        )
      : "";
  if (tuning.resume || extension) {
    const s = tuning.resume ?? extension!.checkpoint,
      { checksum, ...payload } = s;
    if (
      s.version !== "density-fit-checkpoint/1" ||
      s.binding !== (tuning.resume ? binding : extension!.checkpoint.binding) ||
      (await hash(JSON.stringify(payload))) !== checksum ||
      s.counts.length !== counts.length ||
      s.density.length !== size ||
      !Number.isSafeInteger(s.sweeps) ||
      s.sweeps < (exchange ? 0 : 1) ||
      s.sweeps > tuning.sweeps ||
      !Number.isSafeInteger(s.evaluations) ||
      (exchange
        ? s.evaluations > exchange.evaluationLimit
        : s.evaluations !== s.sweeps * pairs.length * (texture ? 2 : 1)) ||
      !Number.isSafeInteger(s.removedConnections) ||
      s.removedConnections < 0 ||
      typeof s.plateau !== "boolean" ||
      !Number.isFinite(s.elapsedMs) ||
      s.elapsedMs < 0 ||
      !Number.isFinite(s.objective) ||
      s.objective < 0
    )
      throw Error("Incompatible or corrupt optimizer checkpoint");
    const expected = density.slice(),
      oldCounts = counts.slice();
    let resumedTotal = 0;
    pinDegree.fill(0);
    for (let id = 0; id < counts.length; id++) {
      const c = s.counts[id],
        a = Math.floor(id / p.pins.length),
        b = id % p.pins.length;
      if (
        !Number.isInteger(c) ||
        c < 0 ||
        c > pairLimit ||
        (c && (a >= b || !connectionAllowed(p, a, b)))
      )
        throw Error("Invalid checkpoint distribution");
      if (!c && !oldCounts[id]) continue;
      resumedTotal += c;
      pinDegree[a] += c;
      pinDegree[b] += c;
      const delta = c - oldCounts[id],
        f = footprint(a, b);
      for (let j = 0; j < f.pixels.length; j++) {
        const i = f.pixels[j];
        if (mask[i])
          expected[i] =
            il + (expected[i] - il) * Math.exp(-delta * f.density[j]);
      }
    }
    if (
      resumedTotal > fitLimit ||
      pinDegree.some((d) => d > pinDegreeLimit) ||
      s.density.some(
        (v, i) => !Number.isFinite(v) || Math.abs(v - expected[i]) > 1e-7,
      )
    )
      throw Error("Invalid checkpoint reconstruction");
    counts.set(s.counts);
    density.set(s.density);
    total = resumedTotal;
    let actual = 0;
    for (let i = 0; i < size; i++)
      if (mask[i]) {
        actual += weight[i] * penalty(density[i], target[i]);
        neighbors(i, (j, w) => {
          if (j > i)
            actual +=
              w * (density[i] - density[j] - (target[i] - target[j])) ** 2;
        });
      }
    if (fractional) actual += contrastObjective();
    if (fine) actual += fineObjective();
    if (texture) actual += texture.objective(density);
    if (Math.abs(actual - s.objective) > 1e-6 * Math.max(1, actual))
      throw Error(
        !o.seed && !p.pinBasis && o.mode === "light" && !initialObjective
          ? "Legacy light checkpoint objective mismatch; generate a new variant without changing the old guide"
          : "Invalid checkpoint objective",
      );
    objective = s.objective;
    sweeps = s.sweeps;
    evaluations = s.evaluations;
    if (texture) textureGainCalls = evaluations;
    removedConnections = s.removedConnections;
    plateau = s.plateau;
    priorElapsed = s.elapsedMs;
  }
  for (
    let sweep = sweeps;
    !exchange && !tuning.materializeOnly && !plateau && sweep < tuning.sweeps;
    sweep++
  ) {
    let changed = 0;
    const old = objective;
    // Reverse order each sweep reduces bias from early, unrefined dark connections.
    for (let j = 0; j < pairs.length; j++) {
      check();
      const [a, b] = pairs[sweep % 2 ? pairs.length - 1 - j : j],
        id = key(a, b),
        f = footprint(a, b);
      evaluations += texture ? 2 : 1;
      const best = candidate(id, f, a, b);
      if (best.delta && best.gain > 1e-7) {
        apply(a, b, best.delta, f, texture ? best.gain : undefined);
        changed++;
      }
      if (j % 128 === 0) {
        o.onProgress?.((0.9 * (sweep + j / pairs.length)) / tuning.sweeps);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    sweeps++;
    o.onDiagnostic?.({
      stage: "fit",
      sweep: sweeps,
      plannedSweeps: tuning.sweeps,
      changed,
      fittedConnections: total,
      objective: objective / weightSum,
      evaluations,
    });
    plateau = !changed || (old > 0 && (old - objective) / old < 0.0001);
    if (tuning.onCheckpoint) {
      const payload = {
        version: "density-fit-checkpoint/1" as const,
        ...(initialObjective ? { initialObjective } : {}),
        binding,
        counts: Array.from(counts),
        density: Array.from(density),
        objective,
        sweeps,
        evaluations,
        removedConnections,
        plateau,
        elapsedMs: priorElapsed + performance.now() - started,
      };
      await tuning.onCheckpoint({
        ...payload,
        checksum: await hash(JSON.stringify(payload)),
      });
    }
  }
  let exchangeState = tuning.resume?.exchange;
  if (exchange) {
    const eligibleId = (id: number) => {
      const a = Math.floor(id / p.pins.length),
        b = id % p.pins.length;
      return (
        Number.isSafeInteger(id) &&
        a >= 0 &&
        a < b &&
        b < p.pins.length &&
        connectionAllowed(p, a, b)
      );
    };
    if (
      tuning.resume &&
      (!exchangeState ||
        exchangeState.version !== "chord-exchange-state/1" ||
        ![
          exchangeState.cursor,
          exchangeState.poolEvaluations,
          exchangeState.proposalEvaluations,
          exchangeState.accepted,
        ].every((v) => Number.isSafeInteger(v) && v >= 0) ||
        !Array.isArray(exchangeState.proposals) ||
        exchangeState.cursor > exchangeState.proposals.length ||
        exchangeState.accepted > exchangeState.proposalEvaluations ||
        exchangeState.proposals.length > exchange.poolSize ** 2 ||
        exchangeState.proposals.some(
          (pair) =>
            !Array.isArray(pair) ||
            pair.length !== 2 ||
            pair[0] === pair[1] ||
            !pair.every(eligibleId),
        ) ||
        exchangeState.poolEvaluations + exchangeState.proposalEvaluations !==
          evaluations)
    )
      throw Error("Invalid chord-exchange recovery state");
    const checkpoint = async () => {
      if (!tuning.onCheckpoint) return;
      const payload = {
        version: "density-fit-checkpoint/1" as const,
        ...(initialObjective ? { initialObjective } : {}),
        binding,
        counts: Array.from(counts),
        density: Array.from(density),
        objective,
        sweeps,
        evaluations,
        removedConnections,
        plateau,
        elapsedMs: priorElapsed + performance.now() - started,
        exchange: structuredClone(exchangeState!),
      };
      await tuning.onCheckpoint({
        ...payload,
        checksum: await hash(JSON.stringify(payload)),
      });
    };
    if (!exchangeState) {
      const feature = Uint8Array.from(
        { length: size },
        (_, i) =>
          +(
            contains(
              regions.nose,
              (i % n) / (n - 1),
              Math.floor(i / n) / (n - 1),
            ) ||
            contains(
              regions.mouth,
              (i % n) / (n - 1),
              Math.floor(i / n) / (n - 1),
            )
          ),
      );
      const localPriority = (f: Footprint, delta: number) => {
        let value = 0;
        for (let k = 0; k < f.pixels.length; k++) {
          const i = f.pixels[k];
          if (!mask[i] || !feature[i]) continue;
          const next = il + (density[i] - il) * Math.exp(-delta * f.density[k]);
          value +=
            weight[i] *
            (penalty(density[i], target[i]) - penalty(next, target[i]));
        }
        return value;
      };
      const adds: { id: number; g: number }[] = [],
        drops: { id: number; g: number }[] = [];
      for (let j = 0; j < pairs.length; j++) {
        check();
        const [a, b] = pairs[j],
          id = key(a, b),
          f = footprint(a, b);
        // Both modes pay for exactly the same initial pool construction.
        const qualified =
          exchange.selection !== "nose-lip-residual/1" ||
          f.pixels.some((i) => !!feature[i] && !!mask[i]);
        if (qualified && evaluations < exchange.evaluationLimit) {
          const full = gain(f, 1);
          adds.push({
            id,
            g:
              exchange.selection === "nose-lip-residual/1"
                ? localPriority(f, 1)
                : full,
          });
          evaluations++;
        }
        if (qualified && counts[id] && evaluations < exchange.evaluationLimit) {
          const full = gain(f, -1);
          drops.push({
            id,
            g:
              exchange.selection === "nose-lip-residual/1"
                ? localPriority(f, -1)
                : full,
          });
          evaluations++;
        }
        if (j % 128 === 0) {
          o.onProgress?.((0.9 * evaluations) / exchange.evaluationLimit);
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      const rank = (
        a: { id: number; g: number },
        b: { id: number; g: number },
      ) => b.g - a.g || a.id - b.id;
      adds.sort(rank);
      drops.sort(rank);
      const pool = adds.slice(0, exchange.poolSize).flatMap((a) =>
        drops
          .slice(0, exchange.poolSize)
          .filter((d) => d.id !== a.id)
          .map((d) => ({ a: a.id, d: d.id, g: a.g + d.g })),
      );
      pool.sort((a, b) => b.g - a.g || a.a - b.a || a.d - b.d);
      exchangeState = {
        version: "chord-exchange-state/1",
        cursor: 0,
        proposals: pool.map((v) => [v.a, v.d]),
        poolEvaluations: evaluations,
        proposalEvaluations: 0,
        accepted: 0,
      };
      await checkpoint();
    }
    const feasibleChange = (addId: number, dropId: number) => {
      if (counts[dropId] < 1 || counts[addId] >= pairLimit) return false;
      const changes = new Map<number, number>();
      for (const [id, delta] of [
        [dropId, -1],
        [addId, 1],
      ])
        for (const nail of [Math.floor(id / p.pins.length), id % p.pins.length])
          changes.set(nail, (changes.get(nail) ?? 0) + delta);
      return [...changes].every(
        ([nail, delta]) => pinDegree[nail] + delta <= pinDegreeLimit,
      );
    };
    const combined = (addId: number, dropId: number) => {
      const a = footprint(
          Math.floor(addId / p.pins.length),
          addId % p.pins.length,
        ),
        d = footprint(
          Math.floor(dropId / p.pins.length),
          dropId % p.pins.length,
        );
      const map = new Map<number, number>();
      for (let k = 0; k < a.pixels.length; k++)
        map.set(a.pixels[k], a.density[k]);
      for (let k = 0; k < d.pixels.length; k++)
        map.set(d.pixels[k], (map.get(d.pixels[k]) ?? 0) - d.density[k]);
      return {
        pixels: Uint32Array.from(map.keys()),
        density: Float64Array.from(map.values()),
      };
    };
    for (
      ;
      !tuning.materializeOnly &&
      exchangeState.cursor < exchangeState.proposals.length;
      exchangeState.cursor++
    ) {
      check();
      const [addId, dropId] = exchangeState.proposals[exchangeState.cursor];
      const needed = exchange.mode === "paired" ? 1 : 2;
      if (evaluations + needed > exchange.evaluationLimit) break;
      if (exchange.mode === "paired") {
        {
          const f = combined(addId, dropId),
            g = gain(f, 1);
          evaluations++;
          exchangeState.proposalEvaluations++;
          if (feasibleChange(addId, dropId) && g > 1e-7) {
            objective -= g;
            counts[addId]++;
            counts[dropId]--;
            removedConnections++;
            exchangeState.accepted++;
            for (const [id, delta] of [
              [dropId, -1],
              [addId, 1],
            ]) {
              pinDegree[Math.floor(id / p.pins.length)] += delta;
              pinDegree[id % p.pins.length] += delta;
            }
            for (let k = 0; k < f.pixels.length; k++) {
              const i = f.pixels[k];
              if (mask[i])
                density[i] = il + (density[i] - il) * Math.exp(-f.density[k]);
            }
          }
        }
      } else {
        for (const [id, delta] of [
          [dropId, -1],
          [addId, 1],
        ]) {
          const a = Math.floor(id / p.pins.length),
            b = id % p.pins.length,
            f = footprint(a, b);
          const legal =
            delta < 0
              ? counts[id] > 0
              : counts[id] < pairLimit &&
                pinDegree[a] < pinDegreeLimit &&
                pinDegree[b] < pinDegreeLimit &&
                total < fitLimit;
          // Charge an exact objective evaluation even if this independent change
          // is infeasible, matching the declared evaluation budget.
          const g = gain(f, delta);
          evaluations++;
          exchangeState.proposalEvaluations++;
          if (legal && g > 1e-7) {
            apply(a, b, delta, f, g);
            exchangeState.accepted++;
          }
        }
      }
      if (exchangeState.cursor % 128 === 127) {
        exchangeState.cursor++;
        await checkpoint();
        exchangeState.cursor--;
        o.onDiagnostic?.({
          stage: "exchange",
          mode: exchange.mode,
          evaluations,
          evaluationLimit: exchange.evaluationLimit,
          accepted: exchangeState.accepted,
          objective: objective / weightSum,
        });
        o.onProgress?.((0.9 * evaluations) / exchange.evaluationLimit);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    await checkpoint();
  }
  const fittedConnections = total;
  const fitObjective = objective;
  const routingCounts = new Map<number, number>();
  if (!total) throw new Error("No improving feasible density path");
  const degree = () => {
    const d = new Int32Array(p.pins.length);
    for (const [a, b] of pairs) {
      const c = counts[key(a, b)];
      d[a] += c;
      d[b] += c;
    }
    return d;
  };
  const components = () => {
    const d = degree(),
      seen = new Uint8Array(d.length),
      groups: number[][] = [];
    for (let a = 0; a < d.length; a++)
      if (d[a] && !seen[a]) {
        const group = [a];
        seen[a] = 1;
        for (let j = 0; j < group.length; j++)
          for (let b = 0; b < d.length; b++)
            if (!seen[b] && counts[key(group[j], b)] > 0) {
              seen[b] = 1;
              group.push(b);
            }
        groups.push(group);
      }
    return groups;
  };
  const feasible = (a: number, b: number, amount = 1) =>
    connectionAllowed(p, a, b) &&
    counts[key(a, b)] + amount <= pairLimit &&
    pinDegree[a] + amount <= pinDegreeLimit &&
    pinDegree[b] + amount <= pinDegreeLimit;
  const cost = (a: number, b: number) => -gain(footprint(a, b), 1);
  const add = (a: number, b: number, amount = 1) => {
    if (!feasible(a, b, amount))
      throw new Error("Physical routing exceeds provisional winding guards");
    if (total + amount > o.lines)
      throw new Error("Line limit exceeded by physical routing");
    apply(a, b, amount, footprint(a, b));
    routingCounts.set(key(a, b), (routingCounts.get(key(a, b)) ?? 0) + amount);
  };
  // Connect disconnected fitted components using an out-and-back bridge, preserving all degree parity.
  let groups = components();
  while (groups.length > 1) {
    check();
    let best: [number, number] | undefined,
      bestCost = Infinity;
    for (const a of groups[0])
      for (const group of groups.slice(1))
        for (const b of group)
          if (feasible(a, b, 2)) {
            const c = cost(a, b);
            if (c < bestCost) {
              best = [a, b];
              bestCost = c;
            }
          }
    if (!best)
      throw new Error("No feasible routing between density components");
    add(...best, 2);
    groups = components();
    await new Promise((r) => setTimeout(r, 0));
  }
  const odd = [...degree()].flatMap((d, a) => (d % 2 ? [a] : []));
  while (odd.length) {
    check();
    const a = odd.shift()!;
    let bestIndex = -1,
      bestCost = Infinity;
    for (let j = 0; j < odd.length; j++)
      if (feasible(a, odd[j])) {
        const c = cost(a, odd[j]);
        if (c < bestCost) {
          bestIndex = j;
          bestCost = c;
        }
      }
    if (bestIndex >= 0) {
      add(a, odd.splice(bestIndex, 1)[0]);
    } else {
      const b = odd.shift()!;
      let middle = -1,
        costSum = Infinity;
      for (let k = 0; k < p.pins.length; k++)
        if (
          feasible(a, k) &&
          feasible(k, b) &&
          pinDegree[k] + 2 <= pinDegreeLimit
        ) {
          const c = cost(a, k) + cost(k, b);
          if (c < costSum) {
            middle = k;
            costSum = c;
          }
        }
      if (middle < 0) throw new Error("No feasible parity routing");
      add(a, middle);
      add(middle, b);
    }
    await new Promise((r) => setTimeout(r, 0));
  }
  const routingPairs = [...routingCounts].map(([id, count]) => ({
    from: Math.floor(id / p.pins.length),
    to: id % p.pins.length,
    count,
  }));
  o.onDiagnostic?.({
    stage: "routing",
    fitObjective: fitObjective / weightSum,
    completeObjective: objective / weightSum,
    routingConnections: total - fittedConnections,
    routingPairs,
  });
  const remaining = counts.slice(),
    start = degree().findIndex((d) => d > 0),
    stack = [start],
    path: number[] = [];
  while (stack.length) {
    check();
    const a = stack.at(-1)!,
      previous = stack.at(-2);
    let b = -1;
    for (let j = 0; j < p.pins.length; j++)
      if (remaining[key(a, j)] > 0) {
        b = j;
        if (j !== previous) break;
      }
    if (b < 0) path.push(stack.pop()!);
    else {
      remaining[key(a, b)]--;
      stack.push(b);
    }
  }
  path.reverse();
  if (path.length !== total + 1 || remaining.some((x) => x > 0))
    throw new Error("Incomplete physical Euler route");
  let meters = 0.5;
  for (let j = 1; j < path.length; j++) {
    const a = p.pins[path[j - 1]],
      b = p.pins[path[j]];
    meters +=
      ((Math.hypot((a.x - b.x) * p.widthMm, (a.y - b.y) * p.heightMm) +
        p.wrapAllowanceMm) /
        1000) *
      (1 + p.wasteFraction);
  }
  const result: Instruction = {
    schema: "iprasm.instruction/1",
    algorithm: general
      ? "density-subject/18"
      : tuning.texture
        ? "density-texture/17"
        : tuning.features
          ? "density-feature/16"
          : tuning.head
            ? "density-head/13"
            : tuning.resolved
              ? "density-resolved/12"
              : p.pinBasis
                ? "density-pin-basis/11"
                : tuning.anatomy
                  ? "density-anatomy/10"
                  : tuning.physical
                    ? "density-physical/8"
                    : tuning.multiscale
                      ? "density-multiscale/7"
                      : "density-optical/5",
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    imageHash: await hash(o.pixels),
    sequenceHash: "",
    profile: structuredClone(p),
    segments: [{ color: p.colors[0], path }],
    params: {
      ...(o.accessPolicy ? { accessPolicy: o.accessPolicy } : {}),
      resolution: n,
      requestedLines: o.lines,
      mode: o.mode,
      stockPolicy: "estimate",
      portrait: structuredClone(portrait),
      ...(o.subject ? { subject: structuredClone(o.subject) } : {}),
      ...(o.product ? { product: structuredClone(o.product) } : {}),
      ...(o.seed
        ? {
            parentSequenceHash: o.seed.sequenceHash,
            refinementStage: (o.seed.params.refinementStage ?? 1) + 1,
          }
        : {}),
      optimization: {
        ...(initialObjective ? { initialObjective } : {}),
        ...(tuning.resolved
          ? {
              sampling: {
                version: "direct-source320/1" as const,
                grid: 320 as const,
              },
            }
          : {}),
        ...(tuning.head ? { head: structuredClone(tuning.head) } : {}),
        ...(tuning.features
          ? { features: structuredClone(tuning.features) }
          : {}),
        ...(tuning.texture ? { texture: structuredClone(tuning.texture) } : {}),
        ...(general
          ? { subjectObjective: structuredClone(tuning.subjectObjective) }
          : {}),
        lookahead: 0,
        coarseScale: 1,
        minimumRelativeGain: 0.0001,
        kind: "optical-coordinate",
        ...(tuning.anatomy ? { anatomy: structuredClone(tuning.anatomy) } : {}),
        edgeWeight: tuning.edgeWeight,
        sweeps: tuning.sweeps,
        order: "dispersed-v1",
        overshoot: "target-luminance-v1",
        pairLimit,
        pinDegreeLimit,
        ...(exchange ? { exchange: structuredClone(exchange) } : {}),
        ...(extension
          ? {
              convergence: {
                version: convergenceVersion,
                rootSequenceHash: extension.reference.sequenceHash,
                originalCheckpointChecksum: extension.checkpoint.checksum,
                priorSweeps: extension.checkpoint.sweeps,
                priorSweepLimit: extension.priorSweepLimit,
                plannedTotalSweeps: tuning.sweeps,
                additionalSweeps: sweeps - extension.checkpoint.sweeps,
                snapshot: !!tuning.materializeOnly,
              },
            }
          : {}),
        ...(tuning.physical
          ? { contrastPhysical: structuredClone(tuning.physical) }
          : {}),
        ...(tuning.multiscale && !tuning.physical
          ? { contrastScales: [1, 2, 4] as [1, 2, 4] }
          : {}),
      },
    },
    metrics: {
      baselineMse: 0,
      reconstructionMse: 0,
      estimatedMeters: meters,
      perColorMeters: { [p.colors[0]]: meters },
      lines: total,
      stoppedReason: plateau ? "quality-plateau" : "compute-limit",
      stockShortfallMeters: Math.max(0, meters - p.stockMeters),
      weightedError: {
        baseline: initial / weightSum,
        final: Math.max(0, objective) / weightSum,
      },
      durationMs: priorElapsed + performance.now() - started,
      peakCacheBytes,
      ...(physical ? { physicalContrastBytes: physical.bytes } : {}),
      ...(exchange && exchangeState
        ? {
            exchange: {
              evaluations,
              accepted: exchangeState.accepted,
              proposals: exchangeState.cursor,
              poolEvaluations: exchangeState.poolEvaluations,
              proposalEvaluations: exchangeState.proposalEvaluations,
              stop:
                evaluations >= exchange.evaluationLimit - 1
                  ? ("evaluation-limit" as const)
                  : ("candidate-pool-exhausted" as const),
            },
          }
        : {}),
      densityFit: {
        sweeps,
        evaluations,
        fittedConnections,
        routingConnections: total - fittedConnections,
        removedConnections,
        ...(physical ? { routingPairs } : {}),
      },
      ...(texture
        ? {
            textureSearch: {
              version: "fixed-plus-minus-one/1" as const,
              fitObjectiveEvaluations: evaluations,
              routingObjectiveEvaluations: textureGainCalls - evaluations,
            },
          }
        : {}),
    },
  };
  const baseline = Float32Array.from(
      { length: size * 3 },
      (_, k) => base[k % 3],
    ),
    raster = rasterSequence(result);
  let empty = 0,
    error = 0,
    num = 0;
  for (let i = 0; i < size; i++)
    if (mask[i])
      for (let c = 0; c < 3; c++) {
        empty += (o.pixels[i * 3 + c] / 255 - base[c]) ** 2;
        error += (o.pixels[i * 3 + c] / 255 - raster[i * 3 + c]) ** 2;
        num++;
      }
  result.metrics.baselineMse = empty / num;
  result.metrics.reconstructionMse = error / num;
  result.metrics.regions = general
    ? (() => {
        const target = Float64Array.from(
            { length: size },
            (_, k) =>
              (o.pixels[k * 3] + o.pixels[k * 3 + 1] + o.pixels[k * 3 + 2]) /
              765,
          ),
          reduce = (r: Float32Array) =>
            Object.fromEntries(
              Object.entries(
                measureSubjects(
                  o.subject!,
                  target,
                  Float64Array.from(
                    { length: size },
                    (_, k) => (r[k * 3] + r[k * 3 + 1] + r[k * 3 + 2]) / 3,
                  ),
                  n,
                  p,
                ),
              ).map(([key, q]) => [
                key,
                {
                  mse: q.toneError,
                  edgeMse: q.physicalContrastResidual,
                  pixels: q.pixels,
                },
              ]),
            );
        return { baseline: reduce(baseline), final: reduce(raster) };
      })()
    : {
        baseline: regionMeasurements(o.pixels, baseline, n, p, portrait),
        final: regionMeasurements(o.pixels, raster, n, p, portrait),
      };
  result.sequenceHash = await hash(sequencePayload(result));
  result.metrics.durationMs = priorElapsed + performance.now() - started;
  o.onProgress?.(1);
  return deepFreeze(result);
}
