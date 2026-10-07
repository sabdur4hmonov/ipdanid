import { Distribution } from "./distribution";
import { connectionAllowed } from "./geometry";
import { deepFreeze, flatten, hash, sequencePayload } from "./engine";
import type { Instruction, Progress, Project, ProjectFile } from "./types";
import { MAX_LINES } from "./limits";
import { validPortrait } from "./portrait";
import { validateProfileLayout } from "./pin-layout";
import { validPhysicalContrast } from "./physical-contrast";
import { SIMPLIFICATION_TOLERANCES, withinQualityTolerance } from "./simplify";
export async function validateInstruction(
  value: unknown,
): Promise<Instruction> {
  if (!value || typeof value !== "object")
    throw new Error("Invalid instruction file");
  const i = value as Instruction,
    p = i.profile;
  if (
    i.schema !== "iprasm.instruction/1" ||
    ![
      "greedy-optical/1",
      "greedy-optical/2",
      "greedy-optical/3",
      "greedy-optical/4",
      "density-optical/5",
      "continuous-guarded/6",
      "density-multiscale/7",
      "density-physical/8",
      "assembly-prune/9",
    ].includes(i.algorithm)
  )
    throw new Error("Unsupported instruction version");
  const qualityFirst = [
      "greedy-optical/4",
      "density-optical/5",
      "continuous-guarded/6",
      "density-multiscale/7",
      "density-physical/8",
      "assembly-prune/9",
    ].includes(i.algorithm),
    limit = qualityFirst ? MAX_LINES : 3000;
  if (
    !p ||
    !["circle", "rectangle", "heart"].includes(p.shape) ||
    !Number.isFinite(p.widthMm) ||
    !Number.isFinite(p.heightMm) ||
    p.widthMm < 50 ||
    p.widthMm > 2000 ||
    p.heightMm < 50 ||
    p.heightMm > 2000 ||
    !Number.isFinite(p.threadMm) ||
    p.threadMm <= 0 ||
    p.threadMm > 5 ||
    !Number.isFinite(p.opacity) ||
    p.opacity <= 0 ||
    p.opacity > 1 ||
    !Number.isFinite(p.stockMeters) ||
    p.stockMeters < 0 ||
    (!qualityFirst && p.stockMeters === 0) ||
    !Number.isInteger(p.minPinGap) ||
    p.minPinGap < 1 ||
    !Number.isFinite(p.shaftMm) ||
    p.shaftMm <= 0 ||
    p.shaftMm > 20 ||
    !Number.isFinite(p.wrapAllowanceMm) ||
    p.wrapAllowanceMm < 0 ||
    p.wrapAllowanceMm > 100 ||
    !Number.isFinite(p.wasteFraction) ||
    p.wasteFraction < 0 ||
    p.wasteFraction > 1 ||
    !Number.isInteger(p.version) ||
    p.version < 1 ||
    !Number.isInteger(p.maxLines) ||
    p.maxLines < 1 ||
    p.maxLines > limit
  )
    throw new Error("Invalid material dimensions");
  if (
    !Array.isArray(p.pins) ||
    p.pins.length < 24 ||
    p.pins.length > 240 ||
    p.pins.some(
      (pin, id) =>
        pin.id !== id ||
        !Number.isFinite(pin.x) ||
        !Number.isFinite(pin.y) ||
        pin.x < 0 ||
        pin.x > 1 ||
        pin.y < 0 ||
        pin.y > 1,
    )
  )
    throw new Error("Invalid pin geometry");
  validateProfileLayout(p);
  if (
    !/^#[0-9a-f]{6}$/i.test(p.baseColor) ||
    !Array.isArray(p.colors) ||
    !p.colors.length ||
    p.colors.some((c) => !/^#[0-9a-f]{6}$/i.test(c))
  )
    throw new Error("Invalid palette");
  if (
    !Array.isArray(i.segments) ||
    i.segments.length < 1 ||
    i.segments.length > 12
  )
    throw new Error("Invalid color segments");
  let total = 0;
  for (const segment of i.segments) {
    if (
      !p.colors.includes(segment.color) ||
      !Array.isArray(segment.path) ||
      segment.path.length < 2 ||
      segment.path.length > limit + 1
    )
      throw new Error("Invalid thread segment");
    total += segment.path.length - 1;
    for (let j = 0; j < segment.path.length; j++) {
      const pin = segment.path[j];
      if (
        !Number.isInteger(pin) ||
        !p.pins[pin] ||
        (j > 0 && !connectionAllowed(p, segment.path[j - 1], pin))
      )
        throw new Error("Invalid or prohibited pin connection");
    }
  }
  if (
    total > limit ||
    total > p.maxLines ||
    !i.metrics ||
    i.metrics.lines !== total ||
    !Number.isFinite(i.metrics.estimatedMeters) ||
    i.metrics.estimatedMeters < 0 ||
    (!qualityFirst && i.metrics.estimatedMeters > p.stockMeters) ||
    !Number.isFinite(i.metrics.reconstructionMse) ||
    i.metrics.reconstructionMse < 0 ||
    !Number.isFinite(i.metrics.baselineMse) ||
    i.metrics.baselineMse < 0 ||
    i.metrics.reconstructionMse > i.metrics.baselineMse + 1e-6
  )
    throw new Error("Invalid sequence limits");
  if (
    !i.params ||
    !["dark", "light", "color"].includes(i.params.mode) ||
    !Number.isInteger(i.params.resolution) ||
    i.params.resolution < 32 ||
    i.params.resolution > 192 ||
    !Number.isInteger(i.params.requestedLines) ||
    i.params.requestedLines < total ||
    i.params.requestedLines > limit
  )
    throw new Error("Invalid generation parameters");
  if (
    [
      "continuous-guarded/6",
      "density-multiscale/7",
      "density-physical/8",
      "assembly-prune/9",
    ].includes(i.algorithm)
  ) {
    if (
      i.params.optimization?.pairLimit !== 32 ||
      i.params.optimization.pinDegreeLimit !== 160
    )
      throw new Error("Invalid winding guards");
    new Distribution(p.pins.length, i.segments);
    if (
      i.algorithm === "density-multiscale/7" &&
      (JSON.stringify(i.params.optimization.contrastScales) !== "[1,2,4]" ||
        i.params.optimization.kind !== "optical-coordinate" ||
        i.params.optimization.order !== "dispersed-v1" ||
        i.params.optimization.overshoot !== "target-luminance-v1")
    )
      throw new Error("Invalid multiscale contrast settings");
    if (i.algorithm === "density-physical/8") {
      validPhysicalContrast(i.params.optimization.contrastPhysical!);
      if (
        i.params.optimization.contrastScales !== undefined ||
        i.params.optimization.kind !== "optical-coordinate" ||
        i.params.optimization.order !== "dispersed-v1" ||
        i.params.optimization.overshoot !== "target-luminance-v1"
      )
        throw new Error("Invalid physical contrast settings");
      const routes = i.metrics.densityFit?.routingPairs;
      if (
        !Array.isArray(routes) ||
        routes.reduce((s, r) => s + r.count, 0) !==
          i.metrics.densityFit?.routingConnections
      )
        throw new Error("Invalid routing accounting");
      const available = new Map<string, number>();
      for (const segment of i.segments)
        for (let j = 1; j < segment.path.length; j++) {
          const k = [segment.path[j - 1], segment.path[j]]
            .sort((a, b) => a - b)
            .join(":");
          available.set(k, (available.get(k) ?? 0) + 1);
        }
      const used = new Set<string>();
      for (const r of routes) {
        const k = [r.from, r.to].sort((a, b) => a - b).join(":");
        if (
          !Number.isInteger(r.from) ||
          !Number.isInteger(r.to) ||
          !p.pins[r.from] ||
          !p.pins[r.to] ||
          !connectionAllowed(p, r.from, r.to) ||
          !Number.isInteger(r.count) ||
          r.count < 1 ||
          r.count > (available.get(k) ?? 0) ||
          used.has(k)
        )
          throw new Error("Invalid routing accounting");
        used.add(k);
      }
    }
  }
  if (qualityFirst) {
    if (i.algorithm === "assembly-prune/9") {
      const s = i.params.simplification,
        d = i.metrics.simplificationDifferences;
      if (
        !s ||
        s.version !== "route-prune/1" ||
        s.referenceHash !== i.params.parentSequenceHash ||
        ![
          "density-multiscale/7",
          "density-physical/8",
          "continuous-guarded/6",
        ].includes(s.sourceAlgorithm) ||
        JSON.stringify(s.tolerances) !==
          JSON.stringify(SIMPLIFICATION_TOLERANCES) ||
        s.gateReference !== "complete-original-native-raster/1" ||
        s.visualAccepted !== false ||
        s.routingAdded !== 0 ||
        ![
          "not-identifiable-from-legacy-guide",
          "preserved-pair-provenance",
        ].includes(s.remainingRoutingClassification) ||
        ![
          s.proposals,
          s.accepted,
          s.connectionsSaved,
          s.replacementConnections,
          s.removedTraversals,
        ].every((v) => Number.isSafeInteger(v) && v >= 0) ||
        s.proposals > 2000 ||
        s.accepted > s.proposals ||
        s.connectionsSaved !== s.removedTraversals - s.replacementConnections ||
        !d ||
        ![
          "face",
          "leftEye",
          "rightEye",
          "nose",
          "lips",
          "jaw",
          "lightSkin",
        ].every((k) => d[k] && Object.values(d[k]).every(Number.isFinite)) ||
        !withinQualityTolerance(d) ||
        i.metrics.densityFit ||
        i.metrics.weightedError
      )
        throw Error("Invalid simplification evidence");
      if (
        s.remainingRoutingClassification === "preserved-pair-provenance"
          ? s.routingOccurrenceConvention !== "earliest-Euler-occurrence/1" ||
            !Number.isSafeInteger(s.remainingRoutingConnections) ||
            s.remainingRoutingConnections! < 0 ||
            s.remainingRoutingConnections! > total ||
            !Number.isSafeInteger(s.originalRoutingConnections) ||
            s.remainingRoutingConnections! > s.originalRoutingConnections!
          : s.routingOccurrenceConvention !== "unavailable" ||
            s.remainingRoutingConnections !== null
      )
        throw Error("Invalid simplification routing provenance");
    }
    if (
      [
        "density-optical/5",
        "density-multiscale/7",
        "density-physical/8",
      ].includes(i.algorithm)
    ) {
      if (i.params.optimization?.pairLimit !== undefined) {
        if (
          i.params.optimization.pairLimit !== 32 ||
          i.params.optimization.pinDegreeLimit !== 160
        )
          throw new Error("Invalid winding guards");
        const degree = new Array(p.pins.length).fill(0),
          pairs = new Map<string, number>();
        for (const s of i.segments)
          for (let j = 1; j < s.path.length; j++) {
            const a = s.path[j - 1],
              b = s.path[j],
              key = [a, b].sort((a, b) => a - b).join(":");
            degree[a]++;
            degree[b]++;
            pairs.set(key, (pairs.get(key) ?? 0) + 1);
          }
        if (
          degree.some((d) => d > 160) ||
          [...pairs.values()].some((c) => c > 32)
        )
          throw new Error("Exceeded winding guards");
      }
      const fit = i.metrics.densityFit;
      const exchange = i.params.optimization?.exchange;
      if (exchange) {
        const evidence = i.metrics.exchange;
        if (
          i.algorithm !== "density-physical/8" ||
          i.params.optimization?.convergence ||
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
          exchange.poolSize > 256 ||
          !evidence ||
          ![
            evidence.evaluations,
            evidence.accepted,
            evidence.proposals,
            evidence.poolEvaluations,
            evidence.proposalEvaluations,
          ].every((v) => Number.isSafeInteger(v) && v >= 0) ||
          evidence.evaluations > exchange.evaluationLimit ||
          evidence.accepted > evidence.proposalEvaluations ||
          evidence.proposals > exchange.poolSize ** 2 ||
          evidence.evaluations !==
            evidence.poolEvaluations + evidence.proposalEvaluations ||
          !["evaluation-limit", "candidate-pool-exhausted"].includes(
            evidence.stop,
          ) ||
          fit?.sweeps !== 0 ||
          fit?.evaluations !== evidence.evaluations ||
          !i.params.parentSequenceHash
        )
          throw Error("Invalid chord-exchange provenance");
      } else if (i.metrics.exchange)
        throw Error("Unbound chord-exchange evidence");
      const convergence = i.params.optimization?.convergence;
      if (
        convergence &&
        (i.algorithm !== "density-physical/8" ||
          convergence.version !== "density-convergence/1" ||
          !/^[a-f0-9]{64}$/.test(convergence.rootSequenceHash) ||
          !/^[a-f0-9]{64}$/.test(convergence.originalCheckpointChecksum) ||
          ![
            convergence.priorSweeps,
            convergence.priorSweepLimit,
            convergence.plannedTotalSweeps,
            convergence.additionalSweeps,
          ].every(Number.isSafeInteger) ||
          convergence.priorSweeps < 1 ||
          convergence.priorSweeps !== convergence.priorSweepLimit ||
          convergence.plannedTotalSweeps <= convergence.priorSweepLimit ||
          convergence.plannedTotalSweeps > 24 ||
          convergence.plannedTotalSweeps !== i.params.optimization?.sweeps ||
          convergence.additionalSweeps < 0 ||
          convergence.priorSweeps + convergence.additionalSweeps !==
            fit?.sweeps ||
          typeof convergence.snapshot !== "boolean")
      )
        throw Error("Invalid convergence provenance");
      if (
        !i.params.portrait?.enabled ||
        i.params.mode === "color" ||
        !fit ||
        ![
          fit.sweeps,
          fit.evaluations,
          fit.fittedConnections,
          fit.routingConnections,
        ].every((v) => Number.isSafeInteger(v) && v >= 0) ||
        fit.sweeps < (exchange ? 0 : 1) ||
        fit.sweeps > 24 ||
        fit.fittedConnections + fit.routingConnections !== total ||
        (fit.removedConnections !== undefined &&
          (!Number.isSafeInteger(fit.removedConnections) ||
            fit.removedConnections < 0))
      )
        throw new Error("Invalid global fit accounting");
      if (
        i.params.optimization?.kind === "optical-coordinate" &&
        i.params.optimization.order !== "dispersed-v1"
      )
        throw new Error("Invalid global candidate order");
      if (
        i.params.optimization?.overshoot !== undefined &&
        i.params.optimization.overshoot !== "target-luminance-v1"
      )
        throw new Error("Invalid darkening protection");
    }
    if (
      i.params.parentSequenceHash &&
      (!/^[a-f0-9]{64}$/.test(i.params.parentSequenceHash) ||
        !Number.isSafeInteger(i.params.refinementStage) ||
        i.params.refinementStage! < 2)
    )
      throw new Error("Invalid generation parameters");
    if (
      i.params.stockPolicy !== "estimate" ||
      !i.params.optimization ||
      (["greedy-optical/4", "continuous-guarded/6"].includes(i.algorithm)
        ? i.params.optimization.lookahead !== 8 ||
          i.params.optimization.coarseScale !== 4 ||
          i.params.optimization.minimumRelativeGain !== 1e-7
        : !["density-coordinate", "optical-coordinate"].includes(
            i.params.optimization.kind ?? "",
          ) ||
          i.params.optimization.lookahead !== 0 ||
          i.params.optimization.coarseScale !== 1 ||
          i.params.optimization.minimumRelativeGain !== 0.0001 ||
          !Number.isFinite(i.params.optimization.edgeWeight) ||
          i.params.optimization.edgeWeight! < 0 ||
          i.params.optimization.edgeWeight! > 4 ||
          !Number.isInteger(i.params.optimization.sweeps) ||
          i.params.optimization.sweeps! < 1 ||
          i.params.optimization.sweeps! > 24)
    )
      throw new Error("Invalid generation parameters");
    if (i.params.portrait) validPortrait(i.params.portrait);
    let meters = 0;
    const perColor: Record<string, number> = {};
    for (const segment of i.segments) {
      let length = 0.5;
      for (let j = 1; j < segment.path.length; j++) {
        const a = p.pins[segment.path[j - 1]],
          b = p.pins[segment.path[j]];
        length +=
          ((Math.hypot((b.x - a.x) * p.widthMm, (b.y - a.y) * p.heightMm) +
            p.wrapAllowanceMm) /
            1000) *
          (1 + p.wasteFraction);
      }
      meters += length;
      perColor[segment.color] = (perColor[segment.color] ?? 0) + length;
    }
    if (
      Math.abs(meters - i.metrics.estimatedMeters) > 1e-5 ||
      !Number.isFinite(i.metrics.stockShortfallMeters) ||
      Math.abs(
        i.metrics.stockShortfallMeters! - Math.max(0, meters - p.stockMeters),
      ) > 1e-5 ||
      !i.metrics.perColorMeters ||
      Object.keys(i.metrics.perColorMeters).length !==
        Object.keys(perColor).length ||
      Object.entries(perColor).some(
        ([c, m]) =>
          !Number.isFinite(i.metrics.perColorMeters[c]) ||
          Math.abs(m - i.metrics.perColorMeters[c]) > 1e-5,
      )
    )
      throw new Error("Invalid material accounting");
    if (
      i.algorithm !== "assembly-prune/9" &&
      (!i.metrics.weightedError ||
        !Number.isFinite(i.metrics.weightedError.baseline) ||
        !Number.isFinite(i.metrics.weightedError.final) ||
        i.metrics.weightedError.final < 0 ||
        i.metrics.weightedError.final > i.metrics.weightedError.baseline + 1e-5)
    )
      throw new Error("Invalid optimization metrics");
    if (i.metrics.regions) {
      for (const phase of [
        i.metrics.regions.baseline,
        i.metrics.regions.final,
      ]) {
        if (
          !phase ||
          ["face", "eyes", "nose", "mouth", "outline"].some(
            (name) =>
              !phase[name] ||
              ![phase[name].mse, phase[name].edgeMse, phase[name].pixels].every(
                Number.isFinite,
              ) ||
              phase[name].mse < 0 ||
              phase[name].edgeMse < 0 ||
              !Number.isInteger(phase[name].pixels) ||
              phase[name].pixels < 0 ||
              phase[name].pixels > i.params.resolution ** 2,
          )
        )
          throw new Error("Invalid regional metrics");
      }
    }
  }
  if ((await hash(sequencePayload(i))) !== i.sequenceHash)
    throw new Error("Sequence integrity mismatch");
  return deepFreeze(i);
}
export function progressFor(i: Instruction): Progress {
  return {
    sequenceHash: i.sequenceHash,
    confirmed: 0,
    revision: 0,
    updatedAt: new Date().toISOString(),
  };
}
export function confirm(
  progress: Progress,
  step: number,
  i: Instruction,
): Progress {
  if (
    progress.sequenceHash !== i.sequenceHash ||
    !Number.isInteger(step) ||
    step < 0 ||
    step > flatten(i).length
  )
    throw new Error("Invalid confirmed step");
  return {
    ...progress,
    confirmed: step,
    revision: progress.revision + 1,
    updatedAt: new Date().toISOString(),
  };
}
export function mergeProgress(
  local: Progress,
  remote: Progress,
): { progress: Progress; conflict: boolean } {
  if (local.sequenceHash !== remote.sequenceHash)
    throw new Error("Different sequences");
  if (JSON.stringify(local) === JSON.stringify(remote))
    return { progress: local, conflict: false };
  return { progress: local, conflict: true };
}
export function toTxt(i: Instruction): string {
  const knots = [
    "density-optical/5",
    "continuous-guarded/6",
    "density-multiscale/7",
    "density-physical/8",
    "assembly-prune/9",
  ].includes(i.algorithm)
    ? i.segments
        .map(
          (s, j) =>
            `# Segment ${j + 1}: tie ${s.color} to pin ${s.path[0]}; follow its ordered steps without cutting; secure a finishing knot at pin ${s.path.at(-1)}.`,
        )
        .join("\n") + "\n"
    : "";
  return `IP_RASM_TXT_V1\n${JSON.stringify(i)}\n\n${knots}# Ordered steps: step from to color\n${flatten(
    i,
  )
    .map((s) => `${s.index} ${s.from} ${s.to} ${s.color}`)
    .join("\n")}`;
}
export async function fromFile(text: string): Promise<Instruction> {
  if (text.length > 4_000_000) throw new Error("Instruction file too large");
  const raw = text.startsWith("IP_RASM_TXT_V1\n") ? text.split("\n")[1] : text;
  return validateInstruction(JSON.parse(raw));
}
export function projectFile(project: Project): ProjectFile {
  return { schema: "iprasm.project/1", project };
}
export async function parseProjectFile(
  text: string,
): Promise<Project | Instruction> {
  if (text.length > 4_000_000) throw new Error("Project file too large");
  if (text.startsWith("IP_RASM_TXT_V1\n")) return fromFile(text);
  const value = JSON.parse(text);
  if (value.schema !== "iprasm.project/1") return validateInstruction(value);
  const p = value.project as Project;
  if (
    !p ||
    typeof p.name !== "string" ||
    p.name.length > 100 ||
    !p.edits ||
    !p.progress
  )
    throw new Error("Invalid project metadata");
  await validateInstruction(p.instruction);
  if (
    p.progress.sequenceHash !== p.instruction.sequenceHash ||
    !Number.isInteger(p.progress.revision) ||
    p.progress.revision < 0 ||
    !Number.isFinite(Date.parse(p.progress.updatedAt))
  )
    throw new Error("Invalid project progress");
  confirm(p.progress, p.progress.confirmed, p.instruction);
  const limits = {
    zoom: [0.25, 6],
    panX: [-0.5, 0.5],
    panY: [-0.5, 0.5],
    rotation: [-180, 180],
    brightness: [-100, 100],
    contrast: [0.5, 2],
  };
  for (const [key, range] of Object.entries(limits)) {
    const v = p.edits[key as keyof typeof p.edits];
    if (!Number.isFinite(v) || v < range[0] || v > range[1])
      throw new Error("Invalid crop parameters");
  }
  return { ...p, id: crypto.randomUUID(), deletedAt: undefined };
}
