import type { Instruction, RegionBox } from "./types";
import { deepFreeze, hash, sequencePayload, rgb } from "./engine";
import { validateInstruction } from "./validation";
import { Distribution } from "./distribution";
import { connectionAllowed, inside } from "./geometry";
import { rasterSequence, strandFootprint, type Footprint } from "./optical";
import { contains, portraitRegions, regionMeasurements } from "./portrait";
import { MAX_FOOTPRINT_BYTES } from "./limits";

// Fixed before the portrait trial. These are conservative simulation tolerances,
// not a perceptual guarantee; ordinary/enlarged visual review is an additional gate.
export const SIMPLIFICATION_TOLERANCES = {
  version: "regional-equivalence/1" as const,
  rms: 1 / 255,
  maxPixel: 2 / 255,
  meanTone: 0.001,
  relativeTargetError: 0.01,
  relativeContrast: 0.005,
  relativeGradientError: 0.01,
  darkExcess: 0.001,
};
export interface SimplificationSettings {
  version: "route-prune/1";
  referenceHash: string;
  sourceAlgorithm: string;
  tolerances: typeof SIMPLIFICATION_TOLERANCES;
  proposals: number;
  accepted: number;
  connectionsSaved: number;
  replacementConnections: number;
  removedTraversals: number;
  routingAdded: 0;
  originalRoutingConnections: number | null;
  remainingRoutingClassification:
    "not-identifiable-from-legacy-guide" | "preserved-pair-provenance";
  remainingRoutingConnections: number | null;
  routingOccurrenceConvention: "earliest-Euler-occurrence/1" | "unavailable";
  gateReference: "complete-original-native-raster/1";
  visualAccepted: false;
}
export interface RegionDifference {
  pixels: number;
  rms: number;
  max: number;
  meanTone: number;
  targetError: number;
  referenceTargetError: number;
  contrastChange: number;
  gradientError: number;
  referenceGradientError: number;
  darkExcessChange: number;
}
export function qualityDifferences(
  reference: Float32Array,
  candidate: Float32Array,
  target: Uint8Array,
  n: number,
  i: Instruction,
) {
  const regs = portraitRegions(i.params.portrait!),
    eyes = regs.eyes,
    face = regs.face;
  const windows: Record<string, RegionBox> = {
    face,
    leftEye: { ...eyes, width: eyes.width * 0.48 },
    rightEye: {
      ...eyes,
      left: eyes.left + eyes.width * 0.52,
      width: eyes.width * 0.48,
    },
    nose: regs.nose,
    lips: regs.mouth,
    jaw: {
      ...face,
      top: face.top + face.height * 0.8,
      height: face.height * 0.2,
    },
  };
  const out: Record<string, RegionDifference> = {};
  const lum = (a: ArrayLike<number>, p: number) =>
    (a[p * 3] + a[p * 3 + 1] + a[p * 3 + 2]) / 3;
  const sample = (a: ArrayLike<number>, x: number, y: number) => {
    const l = Math.floor(x),
      t = Math.floor(y),
      fx = x - l,
      fy = y - t;
    return (
      lum(a, t * n + l) * (1 - fx) * (1 - fy) +
      lum(a, t * n + l + 1) * fx * (1 - fy) +
      lum(a, (t + 1) * n + l) * (1 - fx) * fy +
      lum(a, (t + 1) * n + l + 1) * fx * fy
    );
  };
  const normalized = Float32Array.from(target, (x) => x / 255);
  for (const key of [...Object.keys(windows), "lightSkin"]) {
    let pixels = 0,
      sum = 0,
      max = 0,
      tone = 0,
      et = 0,
      er = 0,
      sc = 0,
      sr = 0,
      sc2 = 0,
      sr2 = 0,
      dc = 0,
      dr = 0,
      gc = 0,
      gr = 0,
      terms = 0;
    for (let p = 0; p < n * n; p++) {
      const x = p % n,
        y = Math.floor(p / n),
        nx = x / (n - 1),
        ny = y / (n - 1);
      if (
        !inside(i.profile.shape, nx, ny) ||
        !contains(windows[key] ?? face, nx, ny) ||
        (key === "lightSkin" && lum(normalized, p) < 0.65)
      )
        continue;
      pixels++;
      const a = lum(candidate, p),
        b = lum(reference, p),
        t = lum(normalized, p);
      tone += a - b;
      sc += a;
      sr += b;
      sc2 += a * a;
      sr2 += b * b;
      dc += Math.max(0, t - a);
      dr += Math.max(0, t - b);
      for (let c = 0; c < 3; c++) {
        const d = candidate[p * 3 + c] - reference[p * 3 + c];
        sum += d * d;
        max = Math.max(max, Math.abs(d));
        et += (candidate[p * 3 + c] - normalized[p * 3 + c]) ** 2;
        er += (reference[p * 3 + c] - normalized[p * 3 + c]) ** 2;
      }
      for (const mm of [400 / 159, 800 / 159, 1600 / 159])
        for (const axis of [0, 1]) {
          const d =
              (mm / (axis ? i.profile.heightMm : i.profile.widthMm)) * (n - 1),
            xx = x + (axis ? 0 : d),
            yy = y + (axis ? d : 0);
          if (xx >= n - 1 || yy >= n - 1) continue;
          const dt = t - sample(normalized, xx, yy);
          gc += (a - sample(candidate, xx, yy) - dt) ** 2;
          gr += (b - sample(reference, xx, yy) - dt) ** 2;
          terms++;
        }
    }
    if (!pixels) throw Error("Empty simplification quality region");
    const std = (s: number, s2: number) =>
      Math.sqrt(Math.max(0, s2 / pixels - (s / pixels) ** 2));
    out[key] = {
      pixels,
      rms: Math.sqrt(sum / (pixels * 3)),
      max,
      meanTone: Math.abs(tone / pixels),
      targetError: et / (pixels * 3),
      referenceTargetError: er / (pixels * 3),
      contrastChange:
        Math.abs(std(sc, sc2) - std(sr, sr2)) / Math.max(0.01, std(sr, sr2)),
      gradientError: gc / Math.max(1, terms),
      referenceGradientError: gr / Math.max(1, terms),
      darkExcessChange: (dc - dr) / pixels,
    };
  }
  return out;
}
export function withinQualityTolerance(d: Record<string, RegionDifference>) {
  const t = SIMPLIFICATION_TOLERANCES;
  return Object.values(d).every(
    (r) =>
      r.rms <= t.rms &&
      r.max <= t.maxPixel &&
      r.meanTone <= t.meanTone &&
      r.targetError <=
        r.referenceTargetError * (1 + t.relativeTargetError) + 1e-8 &&
      r.contrastChange <= t.relativeContrast &&
      r.gradientError <=
        r.referenceGradientError * (1 + t.relativeGradientError) + 1e-8 &&
      r.darkExcessChange <= t.darkExcess,
  );
}
export function assemblyEffort(i: Instruction) {
  const starts = i.segments.length,
    knots = starts * 2,
    colorChanges = i.segments
      .slice(1)
      .filter((s, j) => s.color !== i.segments[j].color).length;
  const assumptions = {
    secondsPerConnection: 5,
    secondsPerKnot: 20,
    secondsPerColorChange: 30,
    includes:
      "One destination wrap per connection; initial attachment and securing/cut in knots; repositioning included in connection estimate",
    measuredCustomerTime: false,
  };
  return {
    connections: i.metrics.lines,
    starts,
    knots,
    colorChanges,
    actions: i.metrics.lines + knots + colorChanges,
    estimatedMinutes:
      (i.metrics.lines * 5 + knots * 20 + colorChanges * 30) / 60,
    assumptions,
  };
}
export async function simplifySequence(
  source: Instruction,
  target: Uint8Array,
  options: {
    maxProposals: number;
    cancelled?: () => boolean;
    onProgress?: (d: Record<string, unknown>) => void;
    onAccepted?: (i: Instruction) => Promise<void> | void;
  },
) {
  await validateInstruction(source);
  if (
    !source.params.portrait?.enabled ||
    source.segments.length !== 1 ||
    source.params.mode === "color" ||
    target.length !== source.params.resolution ** 2 * 3 ||
    (await hash(target)) !== source.imageHash ||
    !Number.isInteger(options.maxProposals) ||
    options.maxProposals < 1 ||
    options.maxProposals > 2000
  )
    throw Error(
      "Simplification requires exact monochrome portrait target and bounded proposals",
    );
  const started = performance.now(),
    n = source.params.resolution,
    p = source.profile,
    reference = rasterSequence(source),
    mask = Uint8Array.from(
      { length: n * n },
      (_, k) =>
        +inside(p.shape, (k % n) / (n - 1), Math.floor(k / n) / (n - 1)),
    );
  let path = [...source.segments[0].path],
    proposals = 0,
    accepted = 0,
    removed = 0,
    replacements = 0,
    cacheBytes = 0,
    peakCacheBytes = 0;
  const routeBudget = new Map(
    source.metrics.densityFit?.routingPairs?.map((r) => [
      [r.from, r.to].sort((a, b) => a - b).join(":"),
      r.count,
    ]),
  );
  const tagged = !!source.metrics.densityFit?.routingPairs;
  let tags: number[] = path.slice(1).map((b, j) => {
    const k = [path[j], b].sort((a, b) => a - b).join(":"),
      c = routeBudget.get(k) ?? 0;
    if (c) {
      routeBudget.set(k, c - 1);
      return 1;
    }
    return 0;
  });
  const cache = new Map<number, Footprint>();
  const footprint = (a: number, b: number) => {
    const key = a * p.pins.length + b;
    let f = cache.get(key);
    if (f) return f;
    f = strandFootprint(p, a, b, n);
    const bytes =
      f.pixels.byteLength + f.alpha.byteLength + f.density.byteLength;
    while (cacheBytes + bytes > MAX_FOOTPRINT_BYTES && cache.size) {
      const first = cache.keys().next().value!,
        old = cache.get(first)!;
      cacheBytes -=
        old.pixels.byteLength + old.alpha.byteLength + old.density.byteLength;
      cache.delete(first);
    }
    cache.set(key, f);
    cacheBytes += bytes;
    peakCacheBytes = Math.max(peakCacheBytes, cacheBytes);
    return f;
  };
  const replay = async (route: number[]) => {
    const base = rgb(p.baseColor),
      ink = rgb(source.segments[0].color),
      a = Float32Array.from({ length: n * n * 3 }, (_, k) => base[k % 3]);
    for (let j = 1; j < route.length; j++) {
      const f = footprint(route[j - 1], route[j]);
      for (let k = 0; k < f.pixels.length; k++) {
        const pixel = f.pixels[k];
        if (mask[pixel])
          for (let c = 0; c < 3; c++) {
            const at = pixel * 3 + c;
            a[at] += (ink[c] - a[at]) * f.alpha[k];
          }
      }
      if (j % 512 === 0) {
        if (options.cancelled?.())
          throw new DOMException("Simplification cancelled", "AbortError");
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    return a;
  };
  const build = async (
    route: number[],
    raster: Float32Array,
    differences: Record<string, RegionDifference>,
  ) => {
    const i = structuredClone(source);
    i.algorithm = "assembly-prune/9";
    i.id = crypto.randomUUID();
    i.createdAt = new Date().toISOString();
    i.segments[0].path = route;
    i.params.parentSequenceHash = source.sequenceHash;
    i.params.refinementStage = (source.params.refinementStage ?? 1) + 1;
    i.params.simplification = {
      version: "route-prune/1",
      referenceHash: source.sequenceHash,
      sourceAlgorithm: source.algorithm,
      tolerances: { ...SIMPLIFICATION_TOLERANCES },
      proposals,
      accepted,
      connectionsSaved: source.metrics.lines - route.length + 1,
      replacementConnections: replacements,
      removedTraversals: removed,
      routingAdded: 0,
      originalRoutingConnections:
        source.metrics.densityFit?.routingConnections ?? null,
      remainingRoutingClassification: tagged
        ? "preserved-pair-provenance"
        : "not-identifiable-from-legacy-guide",
      remainingRoutingConnections: tagged
        ? tags.filter((t) => t === 1).length
        : null,
      routingOccurrenceConvention: tagged
        ? "earliest-Euler-occurrence/1"
        : "unavailable",
      gateReference: "complete-original-native-raster/1",
      visualAccepted: false,
    };
    const meters =
      0.5 +
      route.slice(1).reduce((sum, b, j) => {
        const a = p.pins[route[j]],
          v = p.pins[b];
        return (
          sum +
          ((Math.hypot((a.x - v.x) * p.widthMm, (a.y - v.y) * p.heightMm) +
            p.wrapAllowanceMm) /
            1000) *
            (1 + p.wasteFraction)
        );
      }, 0);
    let error = 0,
      num = 0;
    for (let k = 0; k < n * n; k++)
      if (mask[k])
        for (let c = 0; c < 3; c++) {
          error += (raster[k * 3 + c] - target[k * 3 + c] / 255) ** 2;
          num++;
        }
    i.metrics = {
      baselineMse: source.metrics.baselineMse,
      reconstructionMse: error / num,
      estimatedMeters: meters,
      perColorMeters: { [i.segments[0].color]: meters },
      lines: route.length - 1,
      stockShortfallMeters: Math.max(0, meters - p.stockMeters),
      stoppedReason:
        proposals >= options.maxProposals ? "compute-limit" : "quality-plateau",
      durationMs: performance.now() - started,
      peakCacheBytes,
      regions: {
        baseline:
          source.metrics.regions?.baseline ??
          regionMeasurements(target, reference, n, p, source.params.portrait!),
        final: regionMeasurements(
          target,
          raster,
          n,
          p,
          source.params.portrait!,
        ),
      },
      simplificationDifferences: differences,
    };
    i.sequenceHash = await hash(sequencePayload(i));
    await validateInstruction(i);
    return deepFreeze(i);
  };
  // Deterministically disperse proposals across the whole guide instead of deleting
  // an early prefix. Closed loops preserve endpoints; shortcuts include their new strand.
  const order = Array.from({ length: path.length - 2 }, (_, j) => j + 1);
  let state = 0x6d2b79f5;
  for (let j = order.length - 1; j > 0; j--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const k = (state >>> 0) % (j + 1);
    [order[j], order[k]] = [order[k], order[j]];
  }
  for (const originalIndex of order) {
    if (proposals >= options.maxProposals) break;
    if (options.cancelled?.())
      throw new DOMException("Simplification cancelled", "AbortError");
    const at = Math.min(originalIndex, path.length - 2);
    if (at < 1) continue;
    let end = at + 1,
      add = 1;
    for (
      let distance = 2;
      distance <= 6 && at - 1 + distance < path.length;
      distance++
    )
      if (path[at - 1] === path[at - 1 + distance]) {
        end = at - 1 + distance;
        add = 0;
        break;
      }
    if (add && !connectionAllowed(p, path[at - 1], path[end])) continue;
    const route = add
      ? [...path.slice(0, at), ...path.slice(end)]
      : [...path.slice(0, at), ...path.slice(end + 1)];
    if (route.length < 2) continue;
    try {
      new Distribution(p.pins.length, [
        { color: source.segments[0].color, path: route },
      ]);
    } catch {
      continue;
    }
    proposals++;
    const raster = await replay(route),
      differences = qualityDifferences(reference, raster, target, n, source);
    if (withinQualityTolerance(differences)) {
      removed += end - at + 1;
      replacements += add;
      accepted++;
      tags = [
        ...tags.slice(0, at - 1),
        ...(add ? [2] : []),
        ...tags.slice(end),
      ];
      path = route;
      const result = await build(path, raster, differences);
      await options.onAccepted?.(result);
    }
    options.onProgress?.({
      proposals,
      limit: options.maxProposals,
      accepted,
      connectionsSaved: source.metrics.lines - path.length + 1,
    });
    await new Promise((r) => setTimeout(r, 0));
  }
  const raster = await replay(path);
  return build(
    path,
    raster,
    qualityDifferences(reference, raster, target, n, source),
  );
}
