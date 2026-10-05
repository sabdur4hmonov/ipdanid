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

// Reversible integer strand counts, evaluated against the actual optical mean-RGB raster.
// The chosen multigraph is connected and made Eulerian with explicit, measured routing strands.
export async function generateDensity(
  o: GenerateOptions,
  tuning = { edgeWeight: 1, sweeps: 8 },
): Promise<Instruction> {
  const started = performance.now(),
    { resolution: n, profile: p } = o,
    portrait = o.portrait;
  if (!portrait?.enabled || !["dark", "light"].includes(o.mode))
    throw new Error("Density optimization requires a new monochrome portrait");
  if (
    o.seed &&
    (o.seed.params.resolution !== n ||
      o.seed.params.mode !== o.mode ||
      o.seed.segments.length !== 1 ||
      o.seed.segments[0].color !== p.colors[0] ||
      o.seed.imageHash !== (await hash(o.pixels)) ||
      JSON.stringify(o.seed.profile) !== JSON.stringify(p) ||
      JSON.stringify(o.seed.params.portrait) !== JSON.stringify(portrait))
  )
    throw new Error(
      "Global rerouting requires the same portrait and materials",
    );
  validPortrait(portrait);
  if (o.seed) await validateInstruction(o.seed);
  assertPinSpacing(p);
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 192 ||
    o.pixels.length !== n * n * 3 ||
    !Number.isInteger(o.lines) ||
    o.lines < 1 ||
    o.lines > Math.min(MAX_LINES, p.maxLines) ||
    p.pins.length < 24 ||
    p.pins.length > 240 ||
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
  const regions = portraitRegions(portrait),
    size = n * n;
  const target = new Float64Array(size),
    density = new Float64Array(size).fill(bl),
    mask = new Uint8Array(size),
    weight = new Float64Array(size);
  let weightSum = 0;
  for (let i = 0; i < size; i++) {
    const x = (i % n) / (n - 1),
      y = Math.floor(i / n) / (n - 1);
    mask[i] = +inside(p.shape, x, y);
    if (!mask[i]) continue;
    const lum =
      (o.pixels[i * 3] + o.pixels[i * 3 + 1] + o.pixels[i * 3 + 2]) / 765;
    target[i] = lum;
    let importance = 1;
    if (contains(regions.face, x, y)) importance = 8;
    if (["eyes", "nose", "mouth"].some((key) => contains(regions[key], x, y)))
      importance = 16;
    // Manual anatomical bands prioritize genuine target contrast; no synthetic contours.
    weight[i] = importance;
    weightSum += weight[i];
  }
  const neighbors = (i: number, visit: (j: number, w: number) => void) => {
    const x = i % n,
      y = Math.floor(i / n);
    if (x && mask[i - 1])
      visit(i - 1, (weight[i] + weight[i - 1]) * 0.5 * tuning.edgeWeight);
    if (x < n - 1 && mask[i + 1])
      visit(i + 1, (weight[i] + weight[i + 1]) * 0.5 * tuning.edgeWeight);
    if (y && mask[i - n])
      visit(i - n, (weight[i] + weight[i - n]) * 0.5 * tuning.edgeWeight);
    if (y < n - 1 && mask[i + n])
      visit(i + n, (weight[i] + weight[i + n]) * 0.5 * tuning.edgeWeight);
  };
  let objective = 0;
  for (let i = 0; i < size; i++)
    if (mask[i]) {
      objective += weight[i] * (bl - target[i]) ** 2;
      neighbors(i, (j, w) => {
        if (j > i) objective += w * (target[i] - target[j]) ** 2;
      });
    }
  const initial = objective,
    counts = new Int32Array(p.pins.length ** 2),
    pinDegree = new Int32Array(p.pins.length),
    pairLimit = 32,
    pinDegreeLimit = 160,
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
  let epoch = 0;
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
  const overshoot = (t: number) =>
    1 + 1.5 * Math.max(0, Math.min(1, (t - 0.35) / 0.45)) ** 2;
  const penalty = (r: number, t: number) => {
    const e = r - t;
    return e * e * (e < 0 ? overshoot(t) : 1);
  };
  const gain = (f: Footprint, delta: number) => {
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
    return value;
  };
  const candidate = (id: number, f: Footprint, a: number, b: number) => {
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
  const apply = (a: number, b: number, delta: number, f: Footprint) => {
    const id = key(a, b);
    objective -= gain(f, delta);
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
  let plateau = false;
  for (let sweep = 0; sweep < tuning.sweeps; sweep++) {
    let changed = 0;
    const old = objective;
    // Reverse order each sweep reduces bias from early, unrefined dark connections.
    for (let j = 0; j < pairs.length; j++) {
      check();
      const [a, b] = pairs[sweep % 2 ? pairs.length - 1 - j : j],
        id = key(a, b),
        f = footprint(a, b);
      evaluations++;
      const best = candidate(id, f, a, b);
      if (best.delta && best.gain > 1e-7) {
        apply(a, b, best.delta, f);
        changed++;
      }
      if (j % 128 === 0) {
        o.onProgress?.((0.9 * (sweep + j / pairs.length)) / tuning.sweeps);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    sweeps++;
    if (!changed || (old > 0 && (old - objective) / old < 0.0001)) {
      plateau = true;
      break;
    }
  }
  const fittedConnections = total;
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
    algorithm: "density-optical/5",
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    imageHash: await hash(o.pixels),
    sequenceHash: "",
    profile: structuredClone(p),
    segments: [{ color: p.colors[0], path }],
    params: {
      resolution: n,
      requestedLines: o.lines,
      mode: o.mode,
      stockPolicy: "estimate",
      portrait: structuredClone(portrait),
      ...(o.seed
        ? {
            parentSequenceHash: o.seed.sequenceHash,
            refinementStage: (o.seed.params.refinementStage ?? 1) + 1,
          }
        : {}),
      optimization: {
        lookahead: 0,
        coarseScale: 1,
        minimumRelativeGain: 0.0001,
        kind: "optical-coordinate",
        edgeWeight: tuning.edgeWeight,
        sweeps: tuning.sweeps,
        order: "dispersed-v1",
        overshoot: "target-luminance-v1",
        pairLimit,
        pinDegreeLimit,
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
      durationMs: performance.now() - started,
      peakCacheBytes,
      densityFit: {
        sweeps,
        evaluations,
        fittedConnections,
        routingConnections: total - fittedConnections,
        removedConnections,
      },
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
  result.metrics.regions = {
    baseline: regionMeasurements(o.pixels, baseline, n, p, portrait),
    final: regionMeasurements(o.pixels, raster, n, p, portrait),
  };
  result.sequenceHash = await hash(sequencePayload(result));
  result.metrics.durationMs = performance.now() - started;
  o.onProgress?.(1);
  return deepFreeze(result);
}
