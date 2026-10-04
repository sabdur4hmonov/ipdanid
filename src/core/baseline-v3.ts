// Reproducible pre-improvement /3 reference for local comparison scripts/tests.
// The shipping application imports engine.ts, never this baseline.
import type { Instruction, MaterialProfile, Segment, Step } from "./types";
import { strandFootprint, type Footprint } from "./optical";
import { connectionAllowed, inside, assertPinSpacing } from "./geometry";
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
  pixels: Uint8Array;
  resolution: number;
  profile: MaterialProfile;
  lines: number;
  mode: "dark" | "light" | "color";
  onProgress?: (fraction: number) => void;
  cancelled?: () => boolean;
}
export async function generate(o: GenerateOptions): Promise<Instruction> {
  const { resolution: n, profile: p } = o;
  if (
    !Number.isInteger(n) ||
    n < 32 ||
    n > 192 ||
    o.pixels.length !== n * n * 3
  )
    throw new Error("Invalid bounded RGB image");
  if (!Number.isInteger(o.lines) || o.lines < 1 || o.lines > p.maxLines)
    throw new Error("Line limit exceeded");
  if (
    p.pins.length > 240 ||
    p.pins.length < 24 ||
    p.widthMm <= 0 ||
    p.heightMm <= 0 ||
    p.threadMm <= 0 ||
    p.opacity <= 0 ||
    p.opacity > 1 ||
    p.stockMeters <= 0
  )
    throw new Error("Invalid material profile");
  assertPinSpacing(p);
  const base = rgb(p.baseColor),
    rendered = new Float32Array(n * n * 3),
    target = Float32Array.from(o.pixels, (x) => x / 255),
    mask = new Uint8Array(n * n);
  // Prioritize fine image structure without inventing or detecting facial features.
  // Every selected line must also reduce unweighted reconstruction error.
  const detailWeight = new Float32Array(n * n);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const pixel = y * n + x;
      const luminance = (at: number) =>
        0.2126 * target[at * 3] +
        0.7152 * target[at * 3 + 1] +
        0.0722 * target[at * 3 + 2];
      const edge =
        Math.abs(
          luminance(y * n + Math.min(n - 1, x + 1)) -
            luminance(y * n + Math.max(0, x - 1)),
        ) +
        Math.abs(
          luminance(Math.min(n - 1, y + 1) * n + x) -
            luminance(Math.max(0, y - 1) * n + x),
        );
      detailWeight[pixel] = 1 + Math.min(3, edge * 6);
    }
  let count = 0;
  for (let i = 0; i < n * n; i++) {
    mask[i] = +inside(p.shape, (i % n) / (n - 1), Math.floor(i / n) / (n - 1));
    count += mask[i];
    for (let c = 0; c < 3; c++) rendered[i * 3 + c] = base[c];
  }
  const mse = () => {
    let sum = 0;
    for (let i = 0; i < n * n; i++)
      if (mask[i])
        for (let c = 0; c < 3; c++)
          sum += (target[i * 3 + c] - rendered[i * 3 + c]) ** 2;
    return sum / (count * 3);
  };
  const baselineMse = mse(),
    cache = new Map<string, Footprint>(),
    legal = new Map<string, boolean>(),
    segments: Segment[] = [],
    perColorMeters: Record<string, number> = {};
  let total = 0,
    meters = 0,
    stoppedReason: Instruction["metrics"]["stoppedReason"] = "requested";
  const colors = o.mode === "color" ? p.colors : p.colors.slice(0, 1);
  for (let ci = 0; ci < colors.length; ci++) {
    const color = colors[ci],
      ink = rgb(color),
      path = [0];
    perColorMeters[color] = 0;
    const budget =
      Math.floor(o.lines / colors.length) +
      (ci < o.lines % colors.length ? 1 : 0);
    for (let step = 0; step < budget; step++) {
      if (o.cancelled?.())
        throw new DOMException("Generation cancelled", "AbortError");
      const from = path.at(-1)!;
      let best = -1,
        bestGain = 0,
        bestPixels: Footprint | undefined,
        bestLength = 0;
      for (let to = 0; to < p.pins.length; to++) {
        const key = `${Math.min(from, to)}:${Math.max(from, to)}`;
        let allowed = legal.get(key);
        if (allowed === undefined) {
          allowed = connectionAllowed(p, from, to);
          legal.set(key, allowed);
        }
        if (!allowed || to === path.at(-2)) continue;
        const length =
          ((Math.hypot(
            (p.pins[to].x - p.pins[from].x) * p.widthMm,
            (p.pins[to].y - p.pins[from].y) * p.heightMm,
          ) +
            p.wrapAllowanceMm) /
            1000) *
            (1 + p.wasteFraction) +
          (step === 0 ? 0.5 : 0);
        if (meters + length > p.stockMeters) continue;
        let pixels = cache.get(key);
        if (!pixels) {
          pixels = strandFootprint(p, from, to, n);
          cache.set(key, pixels);
        }
        let gain = 0,
          rawGain = 0;
        for (let k = 0; k < pixels.pixels.length; k++) {
          const i = pixels.pixels[k];
          if (mask[i])
            for (let c = 0; c < 3; c++) {
              const old = rendered[i * 3 + c],
                next = old + (ink[c] - old) * pixels.alpha[k],
                r = target[i * 3 + c] - old;
              const improvement = r * r - (target[i * 3 + c] - next) ** 2;
              rawGain += improvement;
              gain += improvement * detailWeight[i];
            }
        }
        // Total squared-error reduction; long lines must improve more pixels.
        if (rawGain > 0 && gain > bestGain) {
          bestGain = gain;
          best = to;
          bestPixels = pixels;
          bestLength = length;
        }
      }
      if (best < 0) {
        stoppedReason =
          meters > p.stockMeters - 0.6 ? "stock" : "no-improvement";
        break;
      }
      for (let k = 0; k < bestPixels!.pixels.length; k++) {
        const i = bestPixels!.pixels[k];
        if (mask[i])
          for (let c = 0; c < 3; c++)
            rendered[i * 3 + c] +=
              (ink[c] - rendered[i * 3 + c]) * bestPixels!.alpha[k];
      }
      path.push(best);
      meters += bestLength;
      perColorMeters[color] += bestLength;
      total++;
      if (total % 25 === 0) {
        o.onProgress?.(total / o.lines);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    if (path.length > 1) segments.push({ color, path });
    else delete perColorMeters[color];
  }
  if (!total)
    throw new Error(
      "No improving feasible path. Adjust image contrast, base or materials.",
    );
  const result: Instruction = {
    schema: "iprasm.instruction/1",
    algorithm: "greedy-optical/3",
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    imageHash: await hash(o.pixels),
    sequenceHash: "",
    profile: structuredClone(p),
    segments,
    params: { resolution: n, requestedLines: o.lines, mode: o.mode },
    metrics: {
      baselineMse,
      reconstructionMse: mse(),
      estimatedMeters: meters,
      perColorMeters,
      lines: total,
      stoppedReason,
    },
  };
  result.sequenceHash = await hash(sequencePayload(result));
  o.onProgress?.(1);
  return deepFreeze(result);
}
