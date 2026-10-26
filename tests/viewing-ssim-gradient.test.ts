import { expect, test } from "vitest";
import { ssimObjective } from "../scripts/viewing-ssim-gradient";

test("SSIM gradient matches independent finite differences at edges and interior", () => {
  const n = 12,
    image = Float64Array.from(
      { length: n * n },
      (_, k) => 0.3 + 0.2 * Math.sin(k * 0.29),
    ),
    target = Float64Array.from(
      image,
      (_, k) => 0.5 + 0.15 * Math.cos(k * 0.14),
    ),
    objective = ssimObjective(
      n,
      target,
      Float64Array.from(image, (_, k) => 1 + (k % 7) / 7),
    ),
    { gradient } = objective(image),
    h = 0.000001;
  for (const k of [0, 1, 11, 12, 39, 78, 130, 143]) {
    const plus = image.slice(),
      minus = image.slice();
    plus[k] += h;
    minus[k] -= h;
    expect(gradient[k]).toBeCloseTo(
      (objective(plus).score - objective(minus).score) / (2 * h),
      7,
    );
  }
  const exact = objective(target);
  expect(exact.score).toBeCloseTo(1, 10);
  expect(Math.max(...exact.gradient.map(Math.abs))).toBeLessThan(1e-10);
});
