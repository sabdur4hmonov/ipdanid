// Classic greedy string art — reference implementation (no dependencies).
// Input: grayscale target (0 = black, 1 = white), already prepared:
// white background, contrast-stretched, cropped so the head fills the shape.
// Output: ONE continuous pin sequence (each consecutive pair = one thread
// segment) plus a physically scaled preview render.

export interface ClassicOptions {
  size: number; // target is size x size, row-major
  pins: { x: number; y: number }[]; // pin positions in target pixel units
  lines: number; // maximum number of thread segments
  minGap: number; // minimum pin index distance between consecutive pins
  lineDarkness: number; // darkness removed from the error map per segment (0..1 units)
  maxChordRepeat: number; // how many times the same pin pair may be used
  importance?: Float32Array; // optional per-pixel weight (e.g. 1.0 hair, 1.6 face, 2.2 eyes/nose/mouth)
  startPin?: number;
  minScore?: number; // stop early when the best mean gain falls below this
  overdrawPenalty?: number; // >1 makes lines avoid areas that are already dark enough (light skin, white background)
  scoring?: "mean" | "ls"; // ls = least-squares error reduction (penalizes overdraw naturally)
  darknessGamma?: number; // >1 keeps mid-tones (skin) lighter and features darker
}

export interface ClassicResult {
  sequence: number[]; // pin indices, length = segments + 1
  segments: number;
}

const key = (a: number, b: number, n: number) =>
  a < b ? a * n + b : b * n + a;

// Unique pixel indices along a line (DDA, 1 sample per pixel step).
function linePixels(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  size: number,
): Int32Array {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
  const out: number[] = [];
  let last = -1;
  for (let k = 0; k <= steps; k++) {
    const t = k / steps;
    const x = Math.round(ax + (bx - ax) * t),
      y = Math.round(ay + (by - ay) * t);
    if (x < 0 || y < 0 || x >= size || y >= size) continue;
    const i = y * size + x;
    if (i !== last) out.push(i);
    last = i;
  }
  return Int32Array.from(out);
}

export function circlePins(count: number, size: number, marginPx = 1) {
  const c = (size - 1) / 2,
    r = c - marginPx;
  return Array.from({ length: count }, (_, k) => {
    const a = (2 * Math.PI * k) / count - Math.PI / 2; // pin 0 at top
    return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
  });
}

export function classicGreedy(
  target: Float32Array,
  o: ClassicOptions,
): ClassicResult {
  const n = o.pins.length,
    size = o.size;
  // Error map: how much darkness is still missing at each pixel.
  const err = new Float32Array(size * size);
  for (let i = 0; i < err.length; i++)
    err[i] =
      Math.pow(1 - target[i], o.darknessGamma ?? 1) *
      (o.importance ? o.importance[i] : 1);
  const weight = o.importance;

  // Lazily cached chord pixel lists.
  const cache = new Map<number, Int32Array>();
  const chord = (a: number, b: number) => {
    const k = key(a, b, n);
    let p = cache.get(k);
    if (!p) {
      p = linePixels(o.pins[a].x, o.pins[a].y, o.pins[b].x, o.pins[b].y, size);
      cache.set(k, p);
    }
    return p;
  };
  const pen = o.overdrawPenalty ?? 1;
  const used = new Map<number, number>();
  const seq = [o.startPin ?? 0];
  let cur = seq[0],
    prev = -1;
  for (let s = 0; s < o.lines; s++) {
    let best = -1,
      bestScore = -Infinity;
    for (let b = 0; b < n; b++) {
      const d = Math.abs(b - cur),
        gap = Math.min(d, n - d);
      if (gap < o.minGap || b === prev) continue;
      if ((used.get(key(cur, b, n)) ?? 0) >= o.maxChordRepeat) continue;
      const px = chord(cur, b);
      let sum = 0;
      if (o.scoring === "ls") {
        const d = o.lineDarkness;
        for (let i = 0; i < px.length; i++) {
          const e = err[px[i]],
            dd = d * (weight ? weight[px[i]] : 1);
          sum += dd * (2 * e - dd);
        }
      } else
        for (let i = 0; i < px.length; i++) {
          const e = err[px[i]];
          sum += e > 0 ? e : e * pen;
        }
      const score = sum / px.length;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    if (best < 0 || bestScore < (o.minScore ?? -Infinity)) break;
    const px = chord(cur, best);
    for (let i = 0; i < px.length; i++)
      err[px[i]] -= o.lineDarkness * (weight ? weight[px[i]] : 1);
    used.set(key(cur, best, n), (used.get(key(cur, best, n)) ?? 0) + 1);
    seq.push(best);
    prev = cur;
    cur = best;
  }
  return { sequence: seq, segments: seq.length - 1 };
}

// Physically scaled preview: white board, each segment multiplies coverage.
// boardMm: diameter of the pin circle; threadMm: thread width; opacity 0..1.
export function renderPreview(
  seq: number[],
  pins: { x: number; y: number }[],
  targetSize: number,
  outSize: number,
  boardMm: number,
  threadMm: number,
  opacity: number,
): Float32Array {
  const img = new Float32Array(outSize * outSize).fill(1);
  const scale = outSize / targetSize;
  const mmPerPx = boardMm / outSize;
  const alpha = Math.min(1, (threadMm / mmPerPx) * opacity);
  for (let s = 1; s < seq.length; s++) {
    const a = pins[seq[s - 1]],
      b = pins[seq[s]];
    const ax = a.x * scale,
      ay = a.y * scale,
      bx = b.x * scale,
      by = b.y * scale;
    const steps = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
    // Each pixel touched at most once per segment; bilinear-ish coverage.
    const touched = new Map<number, number>();
    for (let k = 0; k <= steps; k++) {
      const t = k / steps,
        x = ax + (bx - ax) * t,
        y = ay + (by - ay) * t;
      const ix = Math.floor(x),
        iy = Math.floor(y),
        fx = x - ix,
        fy = y - iy;
      const add = (px: number, py: number, w: number) => {
        if (px < 0 || py < 0 || px >= outSize || py >= outSize) return;
        const i = py * outSize + px;
        touched.set(i, Math.max(touched.get(i) ?? 0, w));
      };
      add(ix, iy, (1 - fx) * (1 - fy));
      add(ix + 1, iy, fx * (1 - fy));
      add(ix, iy + 1, (1 - fx) * fy);
      add(ix + 1, iy + 1, fx * fy);
    }
    for (const [i, w] of touched) img[i] *= 1 - alpha * w;
  }
  return img;
}
