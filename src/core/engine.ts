import { validSubjectPlan } from "./subject-plan";
import { Distribution } from "./distribution";
import { assertContinuation } from "./continuation";
import type { Instruction, MaterialProfile, Segment, Step } from "./types";
import { strandFootprint, rasterSequence, type Footprint } from "./optical";
import { MAX_LINES, MAX_FOOTPRINT_BYTES } from "./limits";
import { refinePath } from "./refine";
import {
  contains,
  portraitRegionSets,
  regionMeasurements,
  validPortrait,
} from "./portrait";
import type { PortraitSettings } from "./types";
import { connectionAllowed, insideProfile, assertPinSpacing } from "./geometry";
export const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
export async function hash(value: unknown): Promise<string> {
  const bytes =
    value instanceof Uint8Array
      ? value
      : new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
export function flatten(instruction: Instruction): Step[] {
  const steps: Step[] = [];
  instruction.segments.forEach((s, segment) =>
    s.path.slice(1).forEach((to, i) =>
      steps.push({
        index: steps.length + 1,
        from: s.path[i],
        to,
        ...(instruction.profile.standardKit
          ? {
              fromLabel: instruction.profile.pins[s.path[i]].sectorLabel,
              toLabel: instruction.profile.pins[to].sectorLabel,
            }
          : {}),
        color: s.color,
        segment,
        segmentStart: i === 0,
      }),
    ),
  );
  return steps;
}
export function sequencePayload(
  i: Pick<
    Instruction,
    "profile" | "segments" | "algorithm" | "params" | "imageHash"
  >,
) {
  return {
    profile: i.profile,
    segments: i.segments,
    algorithm: i.algorithm,
    params: i.params,
    imageHash: i.imageHash,
  };
}
export function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    Object.values(obj).forEach(deepFreeze);
    Object.freeze(obj);
  }
  return obj;
}
export interface GenerateOptions {
  kitPreparation?: import("./standard-preparation").KitPreparation;
  accessPolicy?: "kit-build/1";
  product?: import("./lettering-contract").LetteringProduct;
  pixels: Uint8Array;
  resolution: number;
  profile: MaterialProfile;
  lines: number;
  mode: "dark" | "light" | "color";
  portrait?: PortraitSettings;
  subject?: import("./subject-plan").SubjectPlan;
  seed?: Instruction;
  onProgress?: (fraction: number) => void;
  cancelled?: () => boolean;
  guarded?: boolean;
  onDiagnostic?: (data: Record<string, unknown>) => void;
}
export async function generate(o: GenerateOptions): Promise<Instruction> {
  if (o.product) throw Error("lettering/strategy");
  if (o.subject) validSubjectPlan(o.subject, o.portrait);
  const grouped = Boolean(o.portrait?.enabled && o.portrait.people);
  if (
    grouped &&
    o.portrait!.people!.faces.some((f) => f.regions.placement !== "manual")
  )
    throw Error("Review every person's facial regions");
  if (grouped) o = { ...o, guarded: true };
  const algorithm = grouped
    ? "group-optical/15"
    : o.guarded
      ? "continuous-guarded/6"
      : "greedy-optical/4";
  const started = performance.now(),
    { resolution: n, profile: p } = o;
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 192 ||
    o.pixels.length !== n * n * 3
  )
    throw new Error("Invalid bounded RGB image");
  if (
    !Number.isInteger(o.lines) ||
    o.lines < 1 ||
    o.lines > MAX_LINES ||
    !Number.isInteger(p.maxLines) ||
    p.maxLines < 1 ||
    p.maxLines > MAX_LINES ||
    o.lines > p.maxLines
  )
    throw new Error("Line limit exceeded");
  if (
    p.pins.length < 24 ||
    p.pins.length > 240 ||
    ![p.widthMm, p.heightMm, p.threadMm, p.opacity, p.stockMeters].every(
      Number.isFinite,
    ) ||
    p.widthMm <= 0 ||
    p.heightMm <= 0 ||
    p.threadMm <= 0 ||
    p.opacity <= 0 ||
    p.opacity > 1 ||
    p.stockMeters < 0
  )
    throw new Error("Invalid material profile");
  if (o.portrait) validPortrait(o.portrait);
  assertPinSpacing(p);
  const portrait = o.portrait?.enabled ? o.portrait : undefined;
  if (o.seed) {
    assertContinuation(o, await hash(o.pixels), [algorithm]);
    const { validateInstruction } = await import("./validation");
    await validateInstruction(o.seed);
  }
  const distribution = o.guarded
    ? new Distribution(p.pins.length, o.seed?.segments)
    : undefined;
  if (o.guarded && o.seed) {
    if (o.lines < o.seed.metrics.lines)
      throw new Error("Continuation ceiling is below the existing sequence");
  }
  const base = rgb(p.baseColor),
    target = Float32Array.from(o.pixels, (x) => x / 255),
    rendered = Float32Array.from({ length: n * n * 3 }, (_, k) => base[k % 3]);
  const mask = new Uint8Array(n * n),
    weight = new Float32Array(n * n),
    regions = portrait ? portraitRegionSets(portrait) : undefined;
  const coarseScale = 4,
    cn = Math.ceil(n / coarseScale),
    cells = cn * cn,
    coarseOf = new Int32Array(n * n),
    coarseCount = new Int32Array(cells),
    coarseWeight = new Float32Array(cells),
    coarseTarget = new Float32Array(cells * 3),
    coarseRendered = new Float32Array(cells * 3);
  let pixelsInMask = 0,
    weightSum = 0;
  const lum = (i: number) =>
    0.2126 * target[i * 3] +
    0.7152 * target[i * 3 + 1] +
    0.0722 * target[i * 3 + 2];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x,
        nx = x / (n - 1),
        ny = y / (n - 1),
        cell = Math.floor(y / coarseScale) * cn + Math.floor(x / coarseScale);
      coarseOf[i] = cell;
      mask[i] = +insideProfile(p, nx, ny);
      if (!mask[i]) continue;
      const edge =
        Math.abs(
          lum(y * n + Math.min(n - 1, x + 1)) - lum(y * n + Math.max(0, x - 1)),
        ) +
        Math.abs(
          lum(Math.min(n - 1, y + 1) * n + x) - lum(Math.max(0, y - 1) * n + x),
        );
      let w = 1 + Math.min(2, edge * 5);
      if (regions) {
        if (regions.face.some((b) => contains(b, nx, ny))) w *= 5;
        if (
          ["eyes", "nose", "mouth"].some((name) =>
            regions[name].some((b) => contains(b, nx, ny)),
          )
        )
          w *= 2;
      }
      weight[i] = w;
      pixelsInMask++;
      weightSum += w;
      coarseCount[cell]++;
      coarseWeight[cell] += w;
      for (let c = 0; c < 3; c++) {
        coarseTarget[cell * 3 + c] += target[i * 3 + c];
        coarseRendered[cell * 3 + c] += base[c];
      }
    }
  for (let cell = 0; cell < cells; cell++)
    if (coarseCount[cell]) {
      coarseWeight[cell] /= coarseCount[cell];
      for (let c = 0; c < 3; c++) {
        coarseTarget[cell * 3 + c] /= coarseCount[cell];
        coarseRendered[cell * 3 + c] /= coarseCount[cell];
      }
    }
  // Stronger penalty for overshooting the target prevents extra strands simply darkening highlights.
  const loss = (v: number, t: number, ink: number, b: number) =>
    (v - t) ** 2 * ((ink < b && v < t) || (ink > b && v > t) ? 1.7 : 1);
  const firstInk = rgb(p.colors[0]);
  const weightedLoss = () => {
    let s = 0;
    for (let i = 0; i < n * n; i++)
      if (mask[i])
        for (let c = 0; c < 3; c++)
          s +=
            weight[i] *
            loss(rendered[i * 3 + c], target[i * 3 + c], firstInk[c], base[c]);
    for (let cell = 0; cell < cells; cell++)
      if (coarseCount[cell])
        for (let c = 0; c < 3; c++)
          s +=
            0.35 *
            coarseCount[cell] *
            coarseWeight[cell] *
            (coarseRendered[cell * 3 + c] - coarseTarget[cell * 3 + c]) ** 2;
    return s;
  };
  const mse = () => {
    let s = 0;
    for (let i = 0; i < n * n; i++)
      if (mask[i])
        for (let c = 0; c < 3; c++)
          s += (target[i * 3 + c] - rendered[i * 3 + c]) ** 2;
    return s / (pixelsInMask * 3);
  };
  const baselineMse = mse(),
    initialLoss = weightedLoss(),
    baselineRegions = portrait
      ? regionMeasurements(o.pixels, rendered, n, p, portrait)
      : undefined;
  let stageAt = 0,
    progressAt = 0;
  let objective = initialLoss,
    stageLoss = initialLoss,
    cacheBytes = 0,
    peakCacheBytes = 0,
    total = 0,
    meters = 0,
    lookaheadPairs = 0;
  const cache = new Map<string, Footprint>(),
    legal = new Map<string, boolean>(),
    segments: Segment[] = [],
    perColorMeters: Record<string, number> = {};
  const footprint = (from: number, to: number) => {
    const key = `${Math.min(from, to)}:${Math.max(from, to)}`;
    let f = cache.get(key);
    if (f) {
      cache.delete(key);
      cache.set(key, f);
      return f;
    }
    f = strandFootprint(p, from, to, n);
    const bytes =
      f.pixels.byteLength + f.alpha.byteLength + f.density.byteLength;
    while (cacheBytes + bytes > MAX_FOOTPRINT_BYTES && cache.size) {
      const first = cache.keys().next().value!;
      const old = cache.get(first)!;
      cacheBytes -=
        old.pixels.byteLength + old.alpha.byteLength + old.density.byteLength;
      cache.delete(first);
    }
    cache.set(key, f);
    cacheBytes += bytes;
    peakCacheBytes = Math.max(peakCacheBytes, cacheBytes);
    return f;
  };
  const allowed = (a: number, b: number) => {
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    if (!legal.has(key)) legal.set(key, connectionAllowed(p, a, b));
    return legal.get(key)!;
  };
  const deltas = new Float64Array(cells * 3),
    marks = new Uint32Array(cells),
    touched = new Int32Array(cells);
  let epoch = 0;
  const score = (f: Footprint, ink: number[]) => {
    let gain = 0,
      num = 0;
    epoch++;
    for (let k = 0; k < f.pixels.length; k++) {
      const i = f.pixels[k];
      if (!mask[i]) continue;
      const cell = coarseOf[i];
      if (marks[cell] !== epoch) {
        marks[cell] = epoch;
        touched[num++] = cell;
        deltas[cell * 3] = deltas[cell * 3 + 1] = deltas[cell * 3 + 2] = 0;
      }
      for (let c = 0; c < 3; c++) {
        const at = i * 3 + c,
          old = rendered[at],
          next = old + (ink[c] - old) * f.alpha[k];
        gain +=
          weight[i] *
          (loss(old, target[at], ink[c], base[c]) -
            loss(next, target[at], ink[c], base[c]));
        deltas[cell * 3 + c] += next - old;
      }
    }
    for (let j = 0; j < num; j++) {
      const cell = touched[j];
      for (let c = 0; c < 3; c++) {
        const at = cell * 3 + c,
          old = coarseRendered[at],
          next = old + deltas[at] / coarseCount[cell];
        gain +=
          0.35 *
          coarseCount[cell] *
          coarseWeight[cell] *
          ((old - coarseTarget[at]) ** 2 - (next - coarseTarget[at]) ** 2);
      }
    }
    return gain;
  };
  const apply = (f: Footprint, ink: number[]) => {
    for (let k = 0; k < f.pixels.length; k++) {
      const i = f.pixels[k];
      if (!mask[i]) continue;
      const cell = coarseOf[i];
      for (let c = 0; c < 3; c++) {
        const at = i * 3 + c,
          old = rendered[at];
        rendered[at] += (ink[c] - old) * f.alpha[k];
        coarseRendered[cell * 3 + c] +=
          (rendered[at] - old) / coarseCount[cell];
      }
    }
  };
  const check = () => {
    if (o.cancelled?.())
      throw new DOMException("Generation cancelled", "AbortError");
  };
  type Choice = { to: number; gain: number; f: Footprint };
  const scan = (from: number, previous: number | undefined, ink: number[]) => {
    const choices: Choice[] = [];
    for (let to = 0; to < p.pins.length; to++) {
      check();
      if (
        to === previous ||
        !allowed(from, to) ||
        (distribution && !distribution.canChange([[from, to]]))
      )
        continue;
      const f = footprint(from, to);
      choices.push({ to, gain: score(f, ink), f });
    }
    return choices.sort((a, b) => b.gain - a.gain || a.to - b.to);
  };
  let stoppedReason: Instruction["metrics"]["stoppedReason"] = "compute-limit";
  const colors = o.mode === "color" ? p.colors : p.colors.slice(0, 1),
    minimumRelativeGain = 1e-7;
  if (o.seed) {
    rendered.set(rasterSequence(o.seed));
    coarseRendered.fill(0);
    for (let i = 0; i < n * n; i++)
      if (mask[i])
        for (let c = 0; c < 3; c++)
          coarseRendered[coarseOf[i] * 3 + c] +=
            rendered[i * 3 + c] / coarseCount[coarseOf[i]];
    objective = weightedLoss();
    segments.push(...structuredClone(o.seed.segments));
    total = o.seed.metrics.lines;
    stoppedReason = o.seed.metrics.stoppedReason;
  }
  for (let ci = 0; !o.seed && ci < colors.length; ci++) {
    const color = colors[ci],
      ink = rgb(color),
      path = [0],
      budget =
        Math.floor(o.lines / colors.length) +
        (ci < o.lines % colors.length ? 1 : 0);
    perColorMeters[color] = 0;
    const append = (choice: Choice) => {
      const from = path.at(-1)!,
        a = p.pins[from],
        b = p.pins[choice.to];
      const length =
        ((Math.hypot((b.x - a.x) * p.widthMm, (b.y - a.y) * p.heightMm) +
          p.wrapAllowanceMm) /
          1000) *
          (1 + p.wasteFraction) +
        (path.length === 1 ? 0.5 : 0);
      if (distribution && !distribution.canChange([[from, choice.to]]))
        throw new Error("Exceeded provisional winding guards");
      distribution?.apply([[from, choice.to]]);
      apply(choice.f, ink);
      path.push(choice.to);
      meters += length;
      perColorMeters[color] += length;
      total++;
      objective -= choice.gain;
    };
    while (path.length - 1 < budget) {
      check();
      const from = path.at(-1)!,
        choices = scan(from, path.at(-2), ink),
        best = choices[0];
      const threshold = Math.max(1e-9, objective * minimumRelativeGain);
      if (best && best.gain > threshold) append(best);
      else {
        // A temporary non-improving connector may reach a useful strand without a new knot.
        const saved = rendered.slice(),
          savedCoarse = coarseRendered.slice();
        let pair: [Choice, Choice] | undefined,
          pairGain = threshold;
        if (path.length + 1 <= budget)
          for (const bridge of choices.slice(0, 8)) {
            apply(bridge.f, ink);
            distribution?.apply([[from, bridge.to]]);
            let second: Choice | undefined;
            try {
              second = scan(bridge.to, from, ink)[0];
            } finally {
              distribution?.apply([], [[from, bridge.to]]);
            }
            if (second && bridge.gain + second.gain > pairGain) {
              pair = [bridge, second];
              pairGain = bridge.gain + second.gain;
            }
            rendered.set(saved);
            coarseRendered.set(savedCoarse);
            check();
          }
        if (!pair) {
          stoppedReason =
            best && best.gain > 0 ? "quality-plateau" : "no-improvement";
          break;
        }
        append(pair[0]);
        append(pair[1]);
        lookaheadPairs++;
      }
      if (total - progressAt >= 25) {
        progressAt = total;
        o.onProgress?.(
          portrait && colors.length === 1
            ? (0.8 * total) / o.lines
            : total / o.lines,
        );
        await new Promise((r) => setTimeout(r, 0));
      }
      if (total - stageAt >= 250) {
        stageAt = total;
        if (stageLoss > 0 && (stageLoss - objective) / stageLoss < 0.0001) {
          stoppedReason = "quality-plateau";
          break;
        }
        stageLoss = objective;
      }
    }
    if (path.length > 1) segments.push({ color, path });
    else delete perColorMeters[color];
  }
  if (!total)
    throw new Error(
      "No improving feasible path. Adjust image contrast, base or materials.",
    );
  let refinement: Awaited<ReturnType<typeof refinePath>> | undefined;
  if (portrait && colors.length === 1) {
    refinement = await refinePath({
      path: segments[0].path,
      n,
      profile: p,
      target,
      raster: rendered,
      mask,
      weights: weight,
      ink: firstInk,
      base,
      footprint,
      allowed,
      check,
      startAt: o.seed?.metrics.refinement?.nextAt,
      distribution,
      onProgress: (f) => o.onProgress?.(0.8 + f * 0.19),
    });
    coarseRendered.fill(0);
    for (let i = 0; i < n * n; i++)
      if (mask[i])
        for (let c = 0; c < 3; c++)
          coarseRendered[coarseOf[i] * 3 + c] +=
            rendered[i * 3 + c] / coarseCount[coarseOf[i]];
    objective = weightedLoss();
    meters = 0;
    for (const segment of segments) {
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
      perColorMeters[segment.color] = length;
      meters += length;
    }
  }
  const result: Instruction = {
    schema: "iprasm.instruction/1",
    algorithm: algorithm,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    imageHash: await hash(o.pixels),
    sequenceHash: "",
    profile: structuredClone(p),
    segments,
    params: {
      ...(o.accessPolicy ? { accessPolicy: o.accessPolicy } : {}),
      resolution: n,
      requestedLines: o.lines,
      mode: o.mode,
      stockPolicy: "estimate",
      ...(o.seed
        ? {
            parentSequenceHash: o.seed.sequenceHash,
            refinementStage: (o.seed.params.refinementStage ?? 1) + 1,
          }
        : {}),
      ...(portrait ? { portrait: structuredClone(portrait) } : {}),
      ...(o.subject ? { subject: structuredClone(o.subject) } : {}),
      optimization: {
        lookahead: 8,
        coarseScale,
        minimumRelativeGain,
        ...(o.guarded ? { pairLimit: 32, pinDegreeLimit: 160 } : {}),
      },
    },
    metrics: {
      baselineMse,
      reconstructionMse: mse(),
      estimatedMeters: meters,
      perColorMeters,
      lines: total,
      stoppedReason,
      stockShortfallMeters: Math.max(0, meters - p.stockMeters),
      weightedError: {
        baseline: initialLoss / (weightSum * 3),
        final: objective / (weightSum * 3),
      },
      ...(portrait
        ? {
            regions: {
              baseline: baselineRegions!,
              final: regionMeasurements(o.pixels, rendered, n, p, portrait),
            },
          }
        : {}),
      durationMs: performance.now() - started,
      lookaheadPairs,
      peakCacheBytes,
      ...(refinement ? { refinement } : {}),
    },
  };
  result.sequenceHash = await hash(sequencePayload(result));
  o.onProgress?.(1);
  return deepFreeze(result);
}
