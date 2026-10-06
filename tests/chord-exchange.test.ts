import { expect, it } from "vitest";
import { createProfile } from "../src/core/geometry";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { generate } from "../src/core/engine";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { validateInstruction } from "../src/core/validation";
import { toTxt, fromFile } from "../src/core/validation";
import { strandFootprint } from "../src/core/optical";
import { contains, portraitRegions } from "../src/core/portrait";
it("compares exact equal gain budgets, preserves routing legality and resumes paired state without accumulated tolerance", async () => {
  const profile = createProfile("circle", 32);
  profile.threadMm = 0.1;
  const o = {
    profile,
    resolution: 32,
    pixels: Uint8Array.from(
      { length: 32 * 32 * 3 },
      (_, k) => 120 + (Math.floor(k / 3) % 100),
    ),
    mode: "dark" as const,
    lines: 800,
    portrait: { ...DEFAULT_PORTRAIT, enabled: true },
  };
  const basis = await generate({ ...o, lines: 40, guarded: true });
  const physical = defaultPhysicalContrast(),
    root = await generateDensity(
      { ...o, seed: basis },
      { edgeWeight: 2, sweeps: 2, physical },
    );
  const seed = JSON.stringify(root),
    options = { ...o, seed: root };
  const settings = {
    version: "chord-exchange/1" as const,
    evaluationLimit: 500,
    poolSize: 16,
    selection: "initial-full-objective-gain/1" as const,
  };
  const tuning = {
    edgeWeight: 2,
    sweeps: 1,
    physical,
    exchange: { ...settings, mode: "paired" as const },
  };
  const paired = await generateDensity(options, tuning);
  const single = await generateDensity(options, {
    ...tuning,
    exchange: { ...settings, mode: "single" },
  });
  expect(paired.metrics.exchange!.evaluations).toBe(500);
  expect(single.metrics.exchange!.evaluations).toBe(500);
  expect(paired.metrics.exchange!.poolEvaluations).toBe(
    single.metrics.exchange!.poolEvaluations,
  );
  expect(paired.metrics.densityFit!.sweeps).toBe(0);
  let cp: DensityCheckpoint | undefined;
  await expect(
    generateDensity(
      { ...options, cancelled: () => !!cp },
      {
        ...tuning,
        onCheckpoint: (s) => {
          cp = s;
        },
      },
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  const resumed = await generateDensity(options, { ...tuning, resume: cp });
  expect(resumed.sequenceHash).toBe(paired.sequenceHash);
  expect(resumed.segments).toEqual(paired.segments);
  expect(JSON.stringify(root)).toBe(seed);
  await validateInstruction(paired);
  expect((await fromFile(toTxt(paired))).sequenceHash).toBe(
    paired.sequenceHash,
  );
  await expect(
    generateDensity(options, {
      ...tuning,
      exchange: { ...settings, mode: "single" },
      resume: cp,
    }),
  ).rejects.toThrow("Incompatible");
  const bad = structuredClone(paired);
  bad.metrics.exchange!.evaluations--;
  await expect(validateInstruction(bad)).rejects.toThrow("exchange");
});
it("region-qualified pool actually touches corrected nose/lip pixels and binds that selection", async () => {
  const profile = createProfile("circle", 32);
  profile.threadMm = 0.1;
  const o = {
    profile,
    resolution: 32,
    pixels: Uint8Array.from(
      { length: 32 * 32 * 3 },
      (_, k) => 120 + (Math.floor(k / 3) % 100),
    ),
    mode: "dark" as const,
    lines: 800,
    portrait: { ...DEFAULT_PORTRAIT, enabled: true },
  };
  const basis = await generate({ ...o, lines: 40, guarded: true }),
    physical = defaultPhysicalContrast();
  const root = await generateDensity(
    { ...o, seed: basis },
    { edgeWeight: 2, sweeps: 2, physical },
  );
  let state: DensityCheckpoint | undefined;
  const exchange = {
    version: "chord-exchange/1" as const,
    mode: "paired" as const,
    evaluationLimit: 300,
    poolSize: 32,
    selection: "nose-lip-residual/1" as const,
  };
  const paired = await generateDensity(
    { ...o, seed: root },
    {
      physical,
      sweeps: 1,
      edgeWeight: 2,
      exchange,
      onCheckpoint: (s) => {
        state = s;
      },
    },
  );
  expect(paired.metrics.exchange!.evaluations).toBe(300);
  expect(state!.exchange!.proposals.length).toBeGreaterThan(0);
  const regions = portraitRegions(o.portrait);
  for (const pair of state!.exchange!.proposals)
    for (const id of pair) {
      const f = strandFootprint(profile, Math.floor(id / 32), id % 32, 32);
      expect(
        f.pixels.some(
          (i) =>
            contains(regions.nose, (i % 32) / 31, Math.floor(i / 32) / 31) ||
            contains(regions.mouth, (i % 32) / 31, Math.floor(i / 32) / 31),
        ),
      ).toBe(true);
    }
  await expect(
    generateDensity(
      { ...o, seed: root },
      {
        physical,
        sweeps: 1,
        edgeWeight: 2,
        exchange: { ...exchange, selection: "initial-full-objective-gain/1" },
        resume: state,
      },
    ),
  ).rejects.toThrow("Incompatible");
});
