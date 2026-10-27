// Research-only adaptation of Virtually Passed (Matthew James), MIT2025.
// Source c96b9ac6316f84c17e0adb644c2df4a971406305; notice in
// scripts/licenses/virtually-passed-MIT.txt. Never serialize as an old engine.
// Direct bilinear chord integration replaces MATLAB radon/griddata. The
// analytic stripe response and constants are retained, NOT MATLAB parity.
import type { MaterialProfile } from "../src/core/types";
import { classicPins } from "../src/core/classic-reference";
import { connectionAllowed } from "../src/core/geometry";

export const PROJECTION_CIRCLE = Object.freeze({
  version: "projection-circle-research/1",
  d: 0.036,
  pMin: 0.00016,
  tStart: 0.0014,
  tEnd: 0.0161,
  minGap: 25,
  maxIncident: 160,
  lines: 3000,
  publishedThresholdDisabledForFixedBudget: true,
});
export type ProjectionChord = {
  a: number;
  b: number;
  nx: number;
  ny: number;
  s: number;
  length: number;
};

// Circle normalized to unit radius, in the ACTUAL raster coordinate system.
// Normal sign is arbitrary: simultaneous (n,s)->(-n,-s) is invariant.
export function projectionChord(
  a: { x: number; y: number },
  b: { x: number; y: number },
): Omit<ProjectionChord, "a" | "b"> {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length = Math.hypot(dx, dy);
  if (!(length > 1e-8)) throw Error("projection/chord");
  const nx = -dy / length,
    ny = dx / length;
  return { nx, ny, s: nx * a.x + ny * a.y, length };
}

// Same four-band analytic stripe mask, R=1. Rewriting the boundary as a
// numerator inequality avoids dividing every tested chord by sin²(delta).
export function stripeResponse(
  test: Omit<ProjectionChord, "a" | "b">,
  selected: Omit<ProjectionChord, "a" | "b">,
) {
  const cosine = test.nx * selected.nx + test.ny * selected.ny,
    sine = test.nx * selected.ny - test.ny * selected.nx,
    sine2 = sine * sine,
    boundary =
      test.s * test.s +
      selected.s * selected.s -
      2 * test.s * selected.s * cosine -
      sine2;
  const { tStart, tEnd, d, pMin } = PROJECTION_CIRCLE;
  let mask = boundary < (tStart * tStart) / 4 ? 1 : 0;
  for (let i = 0; i < 3; i++) {
    const low = tStart + ((tEnd - tStart) * i) / 3,
      high = tStart + ((tEnd - tStart) * (i + 1)) / 3;
    if (boundary > (low * low) / 4 && boundary < (high * high) / 4)
      mask = (tEnd - low) / (tEnd - tStart);
  }
  return (mask * d * pMin) / ((d * test.length - pMin) * Math.abs(sine) + pMin);
}

// Normalized Radon value restricted to an exact kit chord: average darkness,
// midpoint quadrature at >=one sample per pixel, bilinear source interpolation.
// No feature weights, gamma change, generated pixels or early-score stop.
export function normalizedChordDarkness(
  pixels: Uint8Array,
  n: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
  let sum = 0;
  for (let k = 0; k < steps; k++) {
    const t = (k + 0.5) / steps,
      x = a.x + (b.x - a.x) * t,
      y = a.y + (b.y - a.y) * t,
      ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy,
      at = (xx: number, yy: number) =>
        pixels[
          (Math.max(0, Math.min(n - 1, yy)) * n +
            Math.max(0, Math.min(n - 1, xx))) *
            3
        ] / 255;
    sum +=
      1 -
      ((1 - fx) * (1 - fy) * at(ix, iy) +
        fx * (1 - fy) * at(ix + 1, iy) +
        (1 - fx) * fy * at(ix, iy + 1) +
        fx * fy * at(ix + 1, iy + 1));
  }
  return sum / steps;
}

export function generateProjectionCircle(
  profile: MaterialProfile,
  pixels: Uint8Array,
  n: number,
  options: {
    lines?: number;
    maxIncident?: number;
    cancelled?: () => boolean;
    onProgress?: (p: number) => void;
  } = {},
) {
  const began = performance.now(),
    lines = options.lines ?? PROJECTION_CIRCLE.lines,
    maxIncident = options.maxIncident ?? PROJECTION_CIRCLE.maxIncident,
    count = profile.pins.length;
  if (
    profile.shape !== "circle" ||
    profile.widthMm !== profile.heightMm ||
    !Number.isInteger(n) ||
    n < 32 ||
    n > 500 ||
    pixels.length !== n * n * 3 ||
    !Number.isInteger(lines) ||
    lines < 1 ||
    lines > 3000 ||
    count < 52 ||
    count > 320 ||
    !Number.isInteger(maxIncident) ||
    maxIncident < 1 ||
    maxIncident > 160
  )
    throw Error("projection/input");
  // Contract is grayscale; do not silently ignore a differently prepared source.
  for (let k = 0; k < pixels.length; k += 3)
    if (pixels[k] !== pixels[k + 1] || pixels[k] !== pixels[k + 2])
      throw Error("projection/grayscale");
  const pins = classicPins(profile, n),
    center = (n - 1) / 2,
    radius = (n - 3) / 2,
    unit = pins.map((p) => ({
      x: (p.x - center) / radius,
      y: (p.y - center) / radius,
    }));
  if (
    unit.some(
      (p) =>
        !Number.isFinite(p.x + p.y) ||
        Math.abs(Math.hypot(p.x, p.y) - 1) > 1e-8,
    )
  )
    throw Error("projection/unit-circle");
  const cancelled = () => {
    if (options.cancelled?.())
      throw new DOMException("Cancelled", "AbortError");
  };
  const chords: ProjectionChord[] = [],
    adjacent = Array.from({ length: count }, () => [] as number[]),
    initial: number[] = [];
  for (let a = 0; a < count; a++) {
    cancelled();
    for (let b = a + 1; b < count; b++) {
      const gap = Math.min(b - a, count - (b - a));
      if (gap < PROJECTION_CIRCLE.minGap || !connectionAllowed(profile, a, b))
        continue;
      const id = chords.length;
      chords.push({ a, b, ...projectionChord(unit[a], unit[b]) });
      adjacent[a].push(id);
      adjacent[b].push(id);
      initial.push(normalizedChordDarkness(pixels, n, pins[a], pins[b]));
    }
  }
  const residual = Float64Array.from(initial),
    used = new Uint8Array(chords.length),
    degrees = new Uint16Array(count),
    path: number[] = [],
    initializationMs = performance.now() - began;
  let selected = -1,
    thresholdCrossingAt: number | null = null,
    minimumSelectedScore = Infinity,
    updates = 0;
  const solveBegan = performance.now();
  for (let step = 0; step < lines; step++) {
    cancelled();
    const current = path.at(-1),
      candidates = current === undefined ? null : adjacent[current];
    let best = -Infinity;
    selected = -1;
    const consider = (id: number) => {
      const c = chords[id];
      if (
        used[id] ||
        degrees[c.a] >= maxIncident ||
        degrees[c.b] >= maxIncident
      )
        return;
      const score = residual[id];
      if (!Number.isFinite(score)) throw Error("projection/nonfinite");
      if (score > best) {
        selected = id;
        best = score;
      }
    };
    if (candidates) for (const id of candidates) consider(id);
    else for (let id = 0; id < chords.length; id++) consider(id);
    if (selected < 0) break; // Never teleport, repeat, pad or relax legality.
    if (thresholdCrossingAt === null && best < 0.0037)
      thresholdCrossingAt = step;
    minimumSelectedScore = Math.min(minimumSelectedScore, best);
    const c = chords[selected];
    if (current === undefined) path.push(c.a, c.b);
    else path.push(current === c.a ? c.b : c.a);
    used[selected] = 1;
    degrees[c.a]++;
    degrees[c.b]++;
    // Every candidate's residual changes, not merely raster pixels on this line.
    for (let id = 0; id < chords.length; id++)
      if (!used[id]) {
        residual[id] -= stripeResponse(chords[id], c);
        updates++;
      }
    options.onProgress?.((step + 1) / lines);
  }
  const actualLines = Math.max(0, path.length - 1);
  return {
    version: PROJECTION_CIRCLE.version,
    importable: false as const,
    path,
    complete: actualLines === lines,
    reason: actualLines === lines ? "fixed-budget" : "no-legal-continuation",
    metrics: {
      requestedLines: lines,
      actualLines,
      chords: chords.length,
      initializationMs,
      solveMs: performance.now() - solveBegan,
      totalMs: performance.now() - began,
      updates,
      thresholdCrossingAt,
      minimumSelectedScore: Number.isFinite(minimumSelectedScore)
        ? minimumSelectedScore
        : null,
      maxIncident: Math.max(...degrees),
      typedArrayBytes:
        residual.byteLength + used.byteLength + degrees.byteLength,
      memoryNote:
        "Typed-array bytes only; JS objects, input, runtime and physical verification excluded.",
    },
  };
}
