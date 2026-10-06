import { expect, it } from "vitest";
import { createProfile } from "../src/core/geometry";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { generate } from "../src/core/engine";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { validateInstruction } from "../src/core/validation";

it("extends an exact old-budget state explicitly, preserves it, and recovers identical routing", async () => {
  const profile = createProfile("circle", 32);
  profile.threadMm = 0.1;
  const options = {
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
  const seed = await generate({ ...options, lines: 40, guarded: true });
  const o = { ...options, seed },
    physical = defaultPhysicalContrast();
  let original!: DensityCheckpoint;
  const reference = await generateDensity(o, {
    edgeWeight: 2,
    sweeps: 2,
    physical,
    onCheckpoint: (s) => {
      original = s;
    },
  });
  const preserved = JSON.stringify(original),
    root = JSON.stringify(reference);
  await expect(
    generateDensity(o, {
      edgeWeight: 2,
      sweeps: 4,
      physical,
      resume: original,
    }),
  ).rejects.toThrow("Incompatible");
  const extension = { checkpoint: original, priorSweepLimit: 2, reference };
  const tuning = { edgeWeight: 2, sweeps: 4, physical, extension };
  const full = await generateDensity(o, tuning);
  let recovery: DensityCheckpoint | undefined;
  await expect(
    generateDensity(
      { ...o, cancelled: () => !!recovery },
      {
        ...tuning,
        onCheckpoint: (s) => {
          recovery = s;
        },
      },
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(recovery!.sweeps).toBe(3);
  const snapshot = await generateDensity(o, {
    ...tuning,
    resume: recovery,
    materializeOnly: true,
  });
  expect(snapshot.metrics.densityFit!.sweeps).toBe(3);
  expect(snapshot.params.optimization!.convergence!.additionalSweeps).toBe(1);
  await validateInstruction(snapshot);
  const resumed = await generateDensity(o, { ...tuning, resume: recovery });
  expect(resumed.sequenceHash).toBe(full.sequenceHash);
  expect(resumed.segments).toEqual(full.segments);
  expect(resumed.params.optimization!.convergence).toMatchObject({
    priorSweeps: 2,
    additionalSweeps: 2,
    plannedTotalSweeps: 4,
    rootSequenceHash: reference.sequenceHash,
  });
  expect(JSON.stringify(original)).toBe(preserved);
  expect(JSON.stringify(reference)).toBe(root);
  await expect(
    generateDensity(o, { ...tuning, sweeps: 5, resume: recovery }),
  ).rejects.toThrow("Incompatible");
  await expect(
    generateDensity(o, {
      ...tuning,
      extension: { ...extension, priorSweepLimit: 3 },
    }),
  ).rejects.toThrow("extension");
  const corrupt = structuredClone(original);
  corrupt.density[100] *= 0.5;
  await expect(
    generateDensity(o, {
      ...tuning,
      extension: { ...extension, checkpoint: corrupt },
    }),
  ).rejects.toThrow("corrupt");
  const bad = structuredClone(full);
  bad.params.optimization!.convergence!.additionalSweeps++;
  await expect(validateInstruction(bad)).rejects.toThrow("convergence");
});
