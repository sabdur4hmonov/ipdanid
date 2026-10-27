// Frozen pre-optimization coverage oracle (6498565). Test-only: retain the
// original three-channel Float32 arithmetic to catch physical-render changes.
import type { Instruction } from "../../src/core/types";
import { classicPins, classicFrame } from "../../src/core/classic-reference";
// Exactly the reference's max-bilinear-coverage raster, with typed scratch instead
// of allocating a Map for every strand. Output is derived only from the path.
type RasterInput = Pick<
  Instruction,
  "profile" | "segments" | "params" | "metrics"
>;
const rasterCache = new WeakMap<
  RasterInput,
  Map<number, { completed: number; pixels: Float32Array }>
>();
export function frozenReferenceRaster(
  i: RasterInput,
  outSize = 1000,
  completed = i.metrics.lines,
  incremental?: { pixels: Float32Array; completed: number },
): Float32Array {
  if (
    !Number.isInteger(outSize) ||
    outSize < 32 ||
    outSize > 1000 ||
    !Number.isFinite(completed)
  )
    throw Error("classic2/render-bounds");
  completed = Math.max(0, Math.min(i.metrics.lines, Math.floor(completed)));
  if (
    incremental &&
    (incremental.pixels.length !== outSize * outSize * 3 ||
      !Number.isInteger(incremental.completed) ||
      incremental.completed < 0 ||
      incremental.completed > completed)
  )
    throw Error("classic2/incremental-render-bounds");
  const previous = rasterCache.get(i)?.get(outSize);
  if (previous?.completed === completed) return previous.pixels;
  const p = i.profile,
    n = i.params.resolution,
    pins = classicPins(p, n),
    scale = outSize / n,
    alpha = Math.min(
      1,
      (p.threadMm / (classicFrame(p).mm / outSize)) * p.opacity,
    ),
    out =
      incremental?.pixels ?? new Float32Array(outSize * outSize * 3).fill(1),
    weights = new Float64Array(outSize * outSize),
    marks = new Uint32Array(outSize * outSize),
    touched = new Uint32Array(outSize * outSize);
  let epoch = 0,
    at = 0;
  for (const segment of i.segments) {
    const ink = [1, 3, 5].map(
      (k) => parseInt(segment.color.slice(k, k + 2), 16) / 255,
    );
    for (let s = 1; s < segment.path.length && at < completed; s++, at++) {
      if (at < (incremental?.completed ?? 0)) continue;
      const a = pins[segment.path[s - 1]],
        b = pins[segment.path[s]],
        ax = a.x * scale,
        ay = a.y * scale,
        bx = b.x * scale,
        by = b.y * scale,
        steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      let count = 0;
      ++epoch;
      const add = (px: number, py: number, w: number) => {
        if (px < 0 || py < 0 || px >= outSize || py >= outSize) return;
        const k = py * outSize + px;
        if (marks[k] !== epoch) {
          marks[k] = epoch;
          weights[k] = 0;
          touched[count++] = k;
        }
        weights[k] = Math.max(weights[k], w);
      };
      for (let k = 0; k <= steps; k++) {
        const t = k / steps,
          x = ax + (bx - ax) * t,
          y = ay + (by - ay) * t,
          ix = Math.floor(x),
          iy = Math.floor(y),
          fx = x - ix,
          fy = y - iy;
        add(ix, iy, (1 - fx) * (1 - fy));
        add(ix + 1, iy, fx * (1 - fy));
        add(ix, iy + 1, (1 - fx) * fy);
        add(ix + 1, iy + 1, fx * fy);
      }
      for (let k = 0; k < count; k++) {
        const pixel = touched[k],
          a = alpha * weights[pixel];
        for (let c = 0; c < 3; c++) {
          const idx = pixel * 3 + c;
          out[idx] *= 1 - a * (1 - ink[c]);
        }
      }
    }
  }
  // Immutable completed guides share their exact preview with player and PDF.
  // Mutable construction snapshots are intentionally not cached.
  if (Object.isFrozen(i)) {
    let grids = rasterCache.get(i);
    if (!grids) {
      grids = new Map();
      rasterCache.set(i, grids);
    }
    grids.set(outSize, { completed, pixels: out });
  }
  return out;
}
