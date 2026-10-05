import type { Distribution } from "./distribution";
import type { MaterialProfile } from "./types";
import type { Footprint } from "./optical";

// Coordinate descent changes one interior pin, retaining both neighbours and one continuous strand.
// Density plus opaque-strand counts makes removal exact even when coverage reaches alpha=1.
export async function refinePath(o: {
  path: number[];
  n: number;
  profile: MaterialProfile;
  target: Float32Array;
  raster: Float32Array;
  mask: Uint8Array;
  weights: Float32Array;
  ink: number[];
  base: number[];
  footprint: (a: number, b: number) => Footprint;
  allowed: (a: number, b: number) => boolean;
  check: () => void;
  onProgress?: (p: number) => void;
  startAt?: number;
  distribution?: Distribution;
}) {
  const {
    path,
    n,
    profile: p,
    target,
    raster,
    mask,
    weights,
    ink,
    base,
    footprint,
    allowed,
  } = o;
  const density = new Float64Array(n * n),
    opaque = new Int32Array(n * n);
  const add = (f: Footprint, sign: number) => {
    for (let k = 0; k < f.pixels.length; k++) {
      const i = f.pixels[k],
        a = f.alpha[k];
      if (a >= 1) opaque[i] += sign;
      else density[i] += f.density[k] * sign;
    }
  };
  for (let j = 1; j < path.length; j++) add(footprint(path[j - 1], path[j]), 1);
  const cellOf = Int32Array.from(
    { length: n * n },
    (_, i) =>
      Math.floor(Math.floor(i / n) / 4) * Math.ceil(n / 4) +
      Math.floor((i % n) / 4),
  );
  const cells = Math.ceil(n / 4) ** 2,
    counts = new Int32Array(cells),
    cellWeight = new Float64Array(cells);
  const coarse = new Float64Array(cells * 3),
    coarseTarget = new Float64Array(cells * 3);
  for (let i = 0; i < n * n; i++)
    if (mask[i]) {
      const cell = cellOf[i];
      counts[cell]++;
      cellWeight[cell] += weights[i];
      for (let c = 0; c < 3; c++) {
        coarse[cell * 3 + c] += raster[i * 3 + c];
        coarseTarget[cell * 3 + c] += target[i * 3 + c];
      }
    }
  for (let cell = 0; cell < cells; cell++)
    if (counts[cell]) {
      cellWeight[cell] /= counts[cell];
      for (let c = 0; c < 3; c++) {
        coarse[cell * 3 + c] /= counts[cell];
        coarseTarget[cell * 3 + c] /= counts[cell];
      }
    }
  const loss = (v: number, t: number, c: number) =>
    (v - t) ** 2 *
    ((ink[c] < base[c] && v < t) || (ink[c] > base[c] && v > t) ? 1.7 : 1);
  const delta = new Float64Array(n * n),
    deltaOpaque = new Int32Array(n * n),
    marks = new Uint32Array(n * n),
    touched = new Int32Array(n * n);
  const cellDelta = new Float64Array(cells * 3),
    cellMarks = new Uint32Array(cells),
    touchedCells = new Int32Array(cells);
  let epoch = 0,
    length = 0,
    numCells = 0,
    evaluations = 0,
    replacements = 0,
    gainTotal = 0;
  const collect = (f: Footprint, sign: number) => {
    for (let k = 0; k < f.pixels.length; k++) {
      const i = f.pixels[k];
      if (!mask[i]) continue;
      if (marks[i] !== epoch) {
        marks[i] = epoch;
        touched[length++] = i;
        delta[i] = 0;
        deltaOpaque[i] = 0;
      }
      if (f.alpha[k] >= 1) deltaOpaque[i] += sign;
      else delta[i] += f.density[k] * sign;
    }
  };
  const value = (i: number, c: number) =>
    opaque[i] + deltaOpaque[i] > 0
      ? ink[c]
      : ink[c] +
        (base[c] - ink[c]) * Math.exp(-Math.max(0, density[i] + delta[i]));
  const evaluate = (
    oldA: Footprint,
    oldB: Footprint,
    newA: Footprint,
    newB: Footprint,
    commit = false,
  ) => {
    epoch++;
    length = 0;
    numCells = 0;
    collect(oldA, -1);
    collect(oldB, -1);
    collect(newA, 1);
    collect(newB, 1);
    let gain = 0;
    for (let j = 0; j < length; j++) {
      const i = touched[j],
        cell = cellOf[i];
      if (cellMarks[cell] !== epoch) {
        cellMarks[cell] = epoch;
        touchedCells[numCells++] = cell;
        cellDelta.fill(0, cell * 3, cell * 3 + 3);
      }
      for (let c = 0; c < 3; c++) {
        const at = i * 3 + c,
          next = value(i, c),
          old = raster[at];
        gain +=
          weights[i] * (loss(old, target[at], c) - loss(next, target[at], c));
        cellDelta[cell * 3 + c] += next - old;
        if (commit) raster[at] = next;
      }
      if (commit) {
        density[i] += delta[i];
        opaque[i] += deltaOpaque[i];
      }
    }
    for (let j = 0; j < numCells; j++) {
      const cell = touchedCells[j];
      for (let c = 0; c < 3; c++) {
        const at = cell * 3 + c,
          next = coarse[at] + cellDelta[at] / counts[cell];
        gain +=
          0.35 *
          counts[cell] *
          cellWeight[cell] *
          ((coarse[at] - coarseTarget[at]) ** 2 -
            (next - coarseTarget[at]) ** 2);
        if (commit) coarse[at] = next;
      }
    }
    return gain;
  };
  // Fixed CPU ceiling, independent of available stock. A ceiling is never reported as an optimum.
  const ceiling = 200000;
  let reason: "plateau" | "compute-limit" = "compute-limit";
  let nextAt = Math.max(1, Math.min(path.length - 2, o.startAt ?? 1));
  for (let sweep = 0; sweep < 3 && evaluations < ceiling; sweep++) {
    let changed = 0;
    const startAt = nextAt;
    let visited = 0;
    for (; visited < path.length - 2 && evaluations < ceiling; visited++) {
      const at = 1 + ((startAt - 1 + visited) % (path.length - 2));
      o.check();
      const a = path[at - 1],
        b = path[at],
        c = path[at + 1],
        oldA = footprint(a, b),
        oldB = footprint(b, c);
      let best = b,
        bestGain = 1e-5;
      for (let pin = 0; pin < p.pins.length && evaluations < ceiling; pin++) {
        if (
          pin === b ||
          pin === path[at - 2] ||
          pin === path[at + 2] ||
          a === c ||
          !allowed(a, pin) ||
          !allowed(pin, c) ||
          (o.distribution &&
            !o.distribution.canChange(
              [
                [a, pin],
                [pin, c],
              ],
              [
                [a, b],
                [b, c],
              ],
            ))
        )
          continue;
        evaluations++;
        o.check();
        const gain = evaluate(oldA, oldB, footprint(a, pin), footprint(pin, c));
        if (gain > bestGain) {
          best = pin;
          bestGain = gain;
        }
      }
      if (best !== b) {
        o.distribution?.apply(
          [
            [a, best],
            [best, c],
          ],
          [
            [a, b],
            [b, c],
          ],
        );
        evaluate(oldA, oldB, footprint(a, best), footprint(best, c), true);
        path[at] = best;
        changed++;
        replacements++;
        gainTotal += bestGain;
      }
      nextAt = at === path.length - 2 ? 1 : at + 1;
      if (at % 10 === 0) {
        o.onProgress?.(evaluations / ceiling);
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    if (!changed && visited === path.length - 2) {
      reason = "plateau";
      break;
    }
  }
  return { evaluations, replacements, gain: gainTotal, reason, nextAt };
}
