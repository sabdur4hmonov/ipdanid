import type { Instruction, MaterialProfile } from "./types";
import { inside } from "./geometry";

export interface Footprint {
  pixels: Uint32Array;
  alpha: Float32Array;
  density: Float32Array;
}
let scratchSize = 0,
  scratchEpoch = 0;
let scratchWeights = new Float64Array(0),
  scratchMarks = new Uint32Array(0),
  scratchPixels = new Uint32Array(0);

// Integrate a thin strand's area along its geometric length, depositing it
// bilinearly into pixel cells. Diagonal lines have their true length, not a
// one-pixel-wide staircase. Both optimization and preview use this operator.
export function strandFootprint(
  p: MaterialProfile,
  from: number,
  to: number,
  n: number,
): Footprint {
  const a = p.pins[from],
    b = p.pins[to];
  const ax = a.x * (n - 1),
    ay = a.y * (n - 1);
  const dx = (b.x - a.x) * (n - 1),
    dy = (b.y - a.y) * (n - 1);
  const length = Math.hypot(dx, dy);
  const samples = Math.max(1, Math.ceil(length * 2));
  // Computational images use a normalized square, even for rectangular boards.
  // Area = physical strand width * physical line length / physical pixel area.
  const physicalLength = Math.hypot(
    (b.x - a.x) * p.widthMm,
    (b.y - a.y) * p.heightMm,
  );
  const area =
    (p.threadMm * physicalLength * (n - 1) ** 2) / (p.widthMm * p.heightMm);
  const mass = (p.opacity * area) / samples;
  if (scratchSize !== n * n) {
    scratchSize = n * n;
    scratchWeights = new Float64Array(scratchSize);
    scratchMarks = new Uint32Array(scratchSize);
    scratchPixels = new Uint32Array(scratchSize);
    scratchEpoch = 0;
  }
  if (++scratchEpoch >= 0xffffffff) {
    scratchMarks.fill(0);
    scratchEpoch = 1;
  }
  let count = 0;
  for (let k = 0; k < samples; k++) {
    const t = (k + 0.5) / samples,
      x = ax + dx * t,
      y = ay + dy * t;
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy;
    for (let j = 0; j < 2; j++)
      for (let i = 0; i < 2; i++) {
        const px = ix + i,
          py = iy + j;
        if (px < 0 || py < 0 || px >= n || py >= n) continue;
        const id = py * n + px,
          weight = mass * (i ? fx : 1 - fx) * (j ? fy : 1 - fy);
        if (scratchMarks[id] !== scratchEpoch) {
          scratchMarks[id] = scratchEpoch;
          scratchPixels[count++] = id;
          scratchWeights[id] = 0;
        }
        scratchWeights[id] += weight;
      }
  }
  const pixels = scratchPixels.slice(0, count),
    alpha = Float32Array.from(pixels, (id) => Math.min(1, scratchWeights[id]));
  return {
    pixels,
    alpha,
    density: Float32Array.from(alpha, (a) => (a >= 1 ? 0 : -Math.log1p(-a))),
  };
}

const rasterCache = new WeakMap<
  Instruction,
  Map<number, { raster: Float32Array; mask: Uint8Array; completed: number }>
>();
export function rasterSequence(
  i: Instruction,
  completed = i.metrics.lines,
): Float32Array {
  return rasterSequenceAtResolution(i, i.params.resolution, completed);
}

// Evaluation only: reconstruct the actual immutable path on a common sample-center grid.
// This does not change a guide's optimization resolution, metadata, hash or valid seed.
export function rasterSequenceAtResolution(
  i: Instruction,
  n: number,
  completed = i.metrics.lines,
): Float32Array {
  if (!Number.isInteger(n) || n < 32 || n > 384)
    throw new Error("Invalid bounded evaluation resolution");
  completed = Math.max(0, Math.min(i.metrics.lines, Math.floor(completed)));
  const base = [1, 3, 5].map(
    (k) => parseInt(i.profile.baseColor.slice(k, k + 2), 16) / 255,
  );
  let grids = rasterCache.get(i);
  if (!grids) {
    grids = new Map();
    rasterCache.set(i, grids);
  }
  // Bound optional evaluation grids per instruction; normal assembly retains its grid.
  if (!grids.has(n) && grids.size >= 3) {
    const extra = [...grids.keys()].find((k) => k !== i.params.resolution);
    if (extra !== undefined) grids.delete(extra);
  }
  let state = grids.get(n);
  if (!state || completed < state.completed) {
    const mask = Uint8Array.from(
      { length: n * n },
      (_, pixel) =>
        +inside(
          i.profile.shape,
          (pixel % n) / (n - 1),
          Math.floor(pixel / n) / (n - 1),
        ),
    );
    state = {
      raster: Float32Array.from({ length: n * n * 3 }, (_, k) => base[k % 3]),
      mask,
      completed: 0,
    };
    grids.set(n, state);
  }
  const { raster, mask } = state;
  let step = 0;
  for (const segment of i.segments) {
    const ink = [1, 3, 5].map(
      (k) => parseInt(segment.color.slice(k, k + 2), 16) / 255,
    );
    for (let j = 1; j < segment.path.length; j++) {
      if (step >= completed) {
        state.completed = completed;
        return raster.slice();
      }
      if (step++ < state.completed) continue;
      const footprint = strandFootprint(
        i.profile,
        segment.path[j - 1],
        segment.path[j],
        n,
      );
      footprint.pixels.forEach((pixel, k) => {
        if (!mask[pixel]) return;
        for (let c = 0; c < 3; c++) {
          const at = pixel * 3 + c;
          raster[at] += (ink[c] - raster[at]) * footprint.alpha[k];
        }
      });
    }
  }
  state.completed = completed;
  return raster.slice();
}
