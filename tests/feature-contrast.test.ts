import { it, expect } from "vitest";
import {
  featureContrast,
  DEFAULT_FEATURE_CONTRAST,
  validFeatureContrast,
} from "../src/core/feature-contrast";
import { createProfile } from "../src/core/geometry";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import {
  PhysicalContrast,
  defaultPhysicalContrast,
} from "../src/core/physical-contrast";
for (const n of [64, 160, 320])
  it(`source-derived narrow contrast sparse gain equals independent full loss at${n}`, () => {
    const p = createProfile("rectangle", 32);
    p.heightMm = 600;
    const portrait = {
      ...DEFAULT_PORTRAIT,
      enabled: true,
      regions: {
        placement: "manual" as const,
        reference: "processed-target/sample-centers-v1" as const,
        eyes: { left: 0.2, top: 0.25, width: 0.6, height: 0.12 },
        nose: { left: 0.35, top: 0.4, width: 0.3, height: 0.2 },
        mouth: { left: 0.3, top: 0.65, width: 0.4, height: 0.15 },
      },
    };
    const size = n * n,
      mask = new Uint8Array(size).fill(1),
      weight = new Float64Array(size).fill(16),
      target = Float64Array.from(
        { length: size },
        (_, k) =>
          0.5 +
          0.07 * Math.sin((k % n) * 0.21) +
          0.04 * Math.cos(Math.floor(k / n) * 0.34),
      );
    const { operator, weights, active } = featureContrast(
      n,
      p,
      portrait,
      target,
      mask,
      weight,
      DEFAULT_FEATURE_CONTRAST,
    );
    expect(operator.legacyEquivalent).toBe(false);
    expect(operator.terms).toBeGreaterThan(0);
    expect(weights[0]).toBe(0);
    expect(active[Math.floor(n * 0.3) * n + Math.floor(n * 0.5)]).toBe(0);
    const density = new Float64Array(size).fill(0.7),
      changes = new Float64Array(size),
      marks = new Uint32Array(size);
    const pixels = Uint32Array.from([
      Math.floor(n * 0.5) * n + Math.floor(n * 0.48),
      Math.floor(n * 0.5) * n + Math.floor(n * 0.5),
      Math.floor(n * 0.72) * n + Math.floor(n * 0.5),
    ]);
    for (const k of pixels) {
      changes[k] = -0.04;
      marks[k] = 7;
    }
    const residual = Float64Array.from(density, (v, k) => v - target[k]);
    const gain = operator.gain(density, target, changes, marks, 7, pixels);
    // Independent direct sum over stored physical terms, not operator.objective().
    const loss = (r: Float64Array) => {
      let sum = 0;
      for (let t = 0; t < operator.terms; t++) {
        const f = operator.beta[t],
          e =
            r[operator.a[t]] -
            (1 - f) * r[operator.b[t]] -
            f * r[operator.c[t]];
        sum += operator.weight[t] * e * e;
      }
      return sum;
    };
    expect(gain).toBeCloseTo(
      loss(residual) -
        loss(Float64Array.from(residual, (v, k) => v + changes[k])),
      10,
    );
    expect(operator.objective(residual)).toBeCloseTo(loss(residual), 10);
  });
it("rejects unsupported source/version/scale choices instead of modifying an existing objective", () => {
  expect(() =>
    validFeatureContrast({ ...DEFAULT_FEATURE_CONTRAST, distanceMm: 0 }),
  ).toThrow("Invalid");
  expect(
    () =>
      new PhysicalContrast(
        32,
        { widthMm: 400, heightMm: 400 },
        new Uint8Array(1024).fill(1),
        new Float64Array(1024).fill(1),
        1,
        defaultPhysicalContrast(),
        [0, 0],
      ),
  ).toThrow("scale");
  const p = createProfile("circle", 32);
  expect(() =>
    featureContrast(
      32,
      p,
      { ...DEFAULT_PORTRAIT, enabled: true },
      new Float64Array(1024),
      new Uint8Array(1024),
      new Float64Array(1024),
      DEFAULT_FEATURE_CONTRAST,
    ),
  ).toThrow("reviewed");
});
