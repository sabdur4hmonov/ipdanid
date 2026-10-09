import { expect, it } from "vitest";
import {
  anatomicalImportance,
  DEFAULT_ANATOMICAL_IMPORTANCE,
} from "../src/core/anatomical-importance";
import {
  PhysicalContrast,
  defaultPhysicalContrast,
} from "../src/core/physical-contrast";
import {
  DEFAULT_PORTRAIT,
  portraitRegions,
  contains,
} from "../src/core/portrait";
import { createProfile, inside } from "../src/core/geometry";
import { generate, hash, sequencePayload } from "../src/core/engine";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { fromFile, toTxt, validateInstruction } from "../src/core/validation";
import { rasterSequence, strandFootprint } from "../src/core/optical";
import { simplifySequence } from "../src/core/simplify";

const portrait = {
  ...DEFAULT_PORTRAIT,
  enabled: true,
  regions: {
    reference: "processed-target/sample-centers-v1" as const,
    placement: "manual" as const,
    eyes: { left: 0.25, top: 0.25, width: 0.5, height: 0.1 },
    nose: { left: 0.4, top: 0.4, width: 0.2, height: 0.2 },
    mouth: { left: 0.3, top: 0.65, width: 0.4, height: 0.1 },
  },
};
it("tapers only manually marked nose/lips; leaves target, eye, face and background weights unchanged", () => {
  const base = anatomicalImportance(portrait),
    next = anatomicalImportance(portrait, DEFAULT_ANATOMICAL_IMPORTANCE),
    before = JSON.stringify(portrait),
    regs = portraitRegions(portrait);
  expect(next(0.5, 0.5)).toBeCloseTo(48, 12);
  expect(next(0.5, 0.7)).toBeCloseTo(48, 12);
  expect(next(0.4, 0.5)).toBeCloseTo(base(0.4, 0.5), 12);
  expect(next(0.4 + 1e-6, 0.5) - base(0.4 + 1e-6, 0.5)).toBeLessThan(1e-7);
  for (let y = 0; y <= 100; y++)
    for (let x = 0; x <= 100; x++) {
      const xx = x / 100,
        yy = y / 100;
      if (
        contains(regs.eyes, xx, yy) ||
        (!contains(regs.nose, xx, yy) && !contains(regs.mouth, xx, yy))
      )
        expect(next(xx, yy)).toBe(base(xx, yy));
      expect(next(xx, yy)).toBeGreaterThanOrEqual(base(xx, yy));
      expect(next(xx, yy)).toBeLessThanOrEqual(48);
    }
  expect(JSON.stringify(portrait)).toBe(before);
  expect(() =>
    anatomicalImportance(
      {
        ...portrait,
        regions: { ...portrait.regions, placement: "proportional-estimate" },
      },
      DEFAULT_ANATOMICAL_IMPORTANCE,
    ),
  ).toThrow("manual");
  for (const value of [0, 5, NaN, Infinity])
    expect(() =>
      anatomicalImportance(portrait, {
        ...DEFAULT_ANATOMICAL_IMPORTANCE,
        noseMultiplier: value,
      }),
    ).toThrow("settings");
});
it("anatomical sparse optical gain equals independent complete tone and physical contrast objective", () => {
  for (const [n, mm] of [
    [32, (400 * 31) / 159],
    [32, 400],
  ]) {
    const p = createProfile("circle", 32);
    p.widthMm = p.heightMm = mm;
    p.threadMm = 0.1;
    const size = n * n,
      importanceAt = anatomicalImportance(
        portrait,
        DEFAULT_ANATOMICAL_IMPORTANCE,
      ),
      mask = Uint8Array.from(
        { length: size },
        (_, i) =>
          +inside(p.shape, (i % n) / (n - 1), Math.floor(i / n) / (n - 1)),
      ),
      weights = Float64Array.from({ length: size }, (_, i) =>
        mask[i]
          ? importanceAt((i % n) / (n - 1), Math.floor(i / n) / (n - 1))
          : 0,
      ),
      target = Float64Array.from(
        { length: size },
        (_, i) => 0.4 + 0.3 * Math.sin(i * 0.07),
      ),
      density = Float64Array.from(
        { length: size },
        (_, i) => 0.6 + 0.15 * Math.cos(i * 0.11),
      ),
      op = new PhysicalContrast(
        n,
        p,
        mask,
        weights,
        2,
        defaultPhysicalContrast(),
      ),
      f = strandFootprint(p, 4, 19, n),
      marks = new Uint32Array(size),
      sparse = new Float64Array(size);
    expect(op.legacyEquivalent).toBe(mm !== 400);
    for (let k = 0; k < f.pixels.length; k++) {
      const i = f.pixels[k];
      marks[i] = 1;
      sparse[i] = density[i] * Math.expm1(-f.density[k]);
    }
    const penalty = (r: number, t: number) => {
      const e = r - t;
      return (
        e *
        e *
        (e < 0 ? 1 + 1.5 * Math.max(0, Math.min(1, (t - 0.35) / 0.45)) ** 2 : 1)
      );
    };
    const complete = (d: Float64Array) =>
      d.reduce((s, r, i) => s + weights[i] * penalty(r, target[i]), 0) +
      op.objective(Float64Array.from(d, (r, i) => r - target[i]));
    const next = Float64Array.from(density, (r, i) => r + sparse[i]);
    const sparseGain =
      f.pixels.reduce(
        (s, i) =>
          s +
          weights[i] *
            (penalty(density[i], target[i]) - penalty(next[i], target[i])),
        0,
      ) + op.gain(density, target, sparse, marks, 1, f.pixels);
    expect(sparseGain).toBeCloseTo(complete(density) - complete(next), 9);
  }
});
it("binds objective to imports and recovery, replays immutable routes, rejects objective drift and preserves legacy seed", async () => {
  const p = createProfile("circle", 32);
  p.threadMm = 0.1;
  const o = {
    pixels: Uint8Array.from(
      { length: 32 * 32 * 3 },
      (_, k) => 120 + (Math.floor(k / 3) % 100),
    ),
    resolution: 32,
    profile: p,
    portrait,
    lines: 300,
    mode: "dark" as const,
  };
  const seed = await generate({ ...o, lines: 40, guarded: true }),
    seeded = { ...o, seed },
    preserved = JSON.stringify(seed),
    pixels = o.pixels.slice();
  const tuning = {
    edgeWeight: 2,
    sweeps: 3,
    physical: defaultPhysicalContrast(),
    anatomy: DEFAULT_ANATOMICAL_IMPORTANCE,
  };
  const full = await generateDensity(seeded, tuning);
  expect(full.algorithm).toBe("density-anatomy/10");
  await validateInstruction(full);
  expect((await fromFile(toTxt(full))).sequenceHash).toBe(full.sequenceHash);
  expect(
    full.metrics.densityFit!.fittedConnections +
      full.metrics.densityFit!.routingConnections,
  ).toBe(full.metrics.lines);
  let cp: DensityCheckpoint | undefined;
  await expect(
    generateDensity(
      { ...seeded, cancelled: () => !!cp },
      {
        ...tuning,
        onCheckpoint: (s) => {
          cp = s;
        },
      },
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  const resumed = await generateDensity(seeded, { ...tuning, resume: cp });
  expect(resumed.sequenceHash).toBe(full.sequenceHash);
  expect(rasterSequence(resumed)).toEqual(rasterSequence(full));
  await expect(
    generateDensity(seeded, {
      ...tuning,
      anatomy: { ...tuning.anatomy, noseMultiplier: 2 },
      resume: cp,
    }),
  ).rejects.toThrow("Incompatible");
  await expect(
    generateDensity(seeded, { ...tuning, anatomy: undefined, resume: cp }),
  ).rejects.toThrow("Incompatible");
  const tampered = structuredClone(full);
  tampered.params.optimization!.anatomy!.noseMultiplier = 2;
  await expect(validateInstruction(tampered)).rejects.toThrow("integrity");
  const mislabelled = structuredClone(full);
  mislabelled.algorithm = "density-physical/8";
  mislabelled.sequenceHash = await hash(sequencePayload(mislabelled));
  await expect(validateInstruction(mislabelled)).rejects.toThrow("Unbound");
  expect(JSON.stringify(seed)).toBe(preserved);
  expect(o.pixels).toEqual(pixels);
  const simplified = await simplifySequence(full, o.pixels, {
    maxProposals: 16,
  });
  await validateInstruction(simplified);
  expect(simplified.params.simplification!.sourceAlgorithm).toBe(
    "density-anatomy/10",
  );
  expect(simplified.params.optimization!.anatomy).toEqual(tuning.anatomy);
});
