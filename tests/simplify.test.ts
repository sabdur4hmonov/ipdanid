import { it, expect } from "vitest";
import { generateDensity } from "../src/core/density";
import { createProfile } from "../src/core/geometry";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import {
  simplifySequence,
  qualityDifferences,
  withinQualityTolerance,
  assemblyEffort,
} from "../src/core/simplify";
import { rasterSequence } from "../src/core/optical";
import {
  validateInstruction,
  progressFor,
  toTxt,
  fromFile,
} from "../src/core/validation";
it("full executable candidate is tested against immutable reference, progress zero, actual knots/length; essential repeated tone fails", async () => {
  const n = 32,
    p = createProfile("circle", 32);
  p.threadMm = 0.1;
  const target = new Uint8Array(n * n * 3).fill(170),
    source = await generateDensity(
      {
        pixels: target,
        resolution: n,
        profile: p,
        lines: 200,
        mode: "dark",
        portrait: { ...DEFAULT_PORTRAIT, enabled: true },
      },
      { edgeWeight: 2, sweeps: 2, physical: defaultPhysicalContrast() },
    );
  const before = JSON.stringify(source),
    reference = rasterSequence(source);
  const weak = Float32Array.from(reference, (x) => Math.min(1, x + 0.1));
  expect(
    withinQualityTolerance(
      qualityDifferences(reference, weak, target, n, source),
    ),
  ).toBe(false);
  const result = await simplifySequence(source, target, { maxProposals: 12 });
  await validateInstruction(result);
  expect(JSON.stringify(source)).toBe(before);
  expect(result.sequenceHash).not.toBe(source.sequenceHash);
  expect(progressFor(result).confirmed).toBe(0);
  expect(
    withinQualityTolerance(
      qualityDifferences(reference, rasterSequence(result), target, n, source),
    ),
  ).toBe(true);
  expect((await fromFile(toTxt(result))).sequenceHash).toBe(
    result.sequenceHash,
  );
  expect(assemblyEffort(result).knots).toBe(2);
  expect(assemblyEffort(result).starts).toBe(1);
  expect(assemblyEffort(result).colorChanges).toBe(0);
  expect(assemblyEffort(result).actions).toBe(result.metrics.lines + 2);
  expect(assemblyEffort(result, 8).estimatedMinutes).toBe((result.metrics.lines * 8 + 40) / 60);
  expect(assemblyEffort(result, 8).assumptions.measuredCustomerTime).toBe(false);
  expect(() => assemblyEffort(result, 0)).toThrow("pace");
  await expect(
    simplifySequence(source, target, {
      maxProposals: 12,
      cancelled: () => true,
    }),
  ).rejects.toMatchObject({ name: "AbortError" });
  await expect(
    simplifySequence(source, new Uint8Array(target.length), {
      maxProposals: 12,
    }),
  ).rejects.toThrow("exact");
});
