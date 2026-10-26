import { HEART_POLYGON, inside } from "./geometry";
import type { Shape } from "./types";
const cache = new Map<string, Uint8Array>();
export function viewingMask(shape: Shape, n: number) {
  if (!Number.isInteger(n) || n < 32 || n > 1000) throw Error("view-mask/size");
  const key = `${shape}/${n}`,
    cached = cache.get(key);
  if (cached) return cached;
  const mask = new Uint8Array(n * n);
  if (shape !== "heart") {
    for (let k = 0; k < mask.length; k++)
      mask[k] = +inside(
        shape,
        ((k % n) + 0.5) / n,
        (Math.floor(k / n) + 0.5) / n,
      );
  } else {
    // Exactly the canonical polygon's even/odd rule, scan-converted by row.
    // Avoid walking720edges for every one of a million physical pixels.
    for (let row = 0; row < n; row++) {
      const y = (row + 0.5) / n,
        cuts: number[] = [];
      for (
        let i = 0, j = HEART_POLYGON.length - 1;
        i < HEART_POLYGON.length;
        j = i++
      ) {
        const a = HEART_POLYGON[i],
          b = HEART_POLYGON[j];
        if (a.y > y !== b.y > y)
          cuts.push(((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x);
      }
      cuts.sort((a, b) => a - b);
      for (let j = 0; j + 1 < cuts.length; j += 2) {
        const start = Math.max(0, Math.ceil(cuts[j] * n - 0.5)),
          end = Math.min(n, Math.ceil(cuts[j + 1] * n - 0.5));
        mask.fill(1, row * n + start, row * n + end);
      }
    }
  }
  if (cache.size >= 6) cache.delete(cache.keys().next().value!);
  cache.set(key, mask);
  return mask;
}
