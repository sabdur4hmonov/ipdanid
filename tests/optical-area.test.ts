import { it, expect } from "vitest";
import { areaAverageRgb } from "../src/core/optical-area";
it("aligns physical sample centers and conserves an isolated fine-cell change", () => {
  const n = 32,
    h = 2 * n - 1,
    fine = new Float32Array(h * h * 3).fill(1);
  for (const [x, y] of [
    [20, 24],
    [21, 25],
  ]) {
    const f = fine.slice();
    f[(y * h + x) * 3] = 0;
    const result = areaAverageRgb(f, n, [1, 1, 1]);
    expect(
      result.reduce((s, v, i) => s + (i % 3 === 0 ? 1 - v : 0), 0),
    ).toBeCloseTo(0.25, 12);
    if (x % 2 === 0) expect(result[(12 * n + 10) * 3]).toBe(0.75);
    else {
      expect(result[(12 * n + 10) * 3]).toBe(0.9375);
      expect(result[(13 * n + 11) * 3]).toBe(0.9375);
    }
  }
  expect(Array.from(areaAverageRgb(fine, n, [1, 1, 1]))).toEqual(
    Array.from(new Float32Array(n * n * 3).fill(1)),
  );
});
it("averages composited optical results instead of hiding overlap with average coverage", () => {
  const n = 32,
    h = 63,
    fine = new Float32Array(h * h * 3).fill(1);
  for (let y = 23; y <= 25; y++)
    for (let x = 19; x <= 21; x++)
      fine[(y * h + x) * 3] = (x === 20 ? 0.2 : 0.8) ** 2;
  const value = areaAverageRgb(fine, n, [1, 1, 1])[(12 * n + 10) * 3];
  expect(value).toBeCloseTo(0.5 * 0.2 ** 2 + 0.5 * 0.8 ** 2, 6);
  expect(Math.abs(value - 0.5 ** 2)).toBeGreaterThan(0.08);
  expect(() => areaAverageRgb(fine, 192, [1, 1, 1])).toThrow();
});
