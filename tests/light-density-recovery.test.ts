import { it, expect } from "vitest";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { createProfile } from "../src/core/geometry";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { validateInstruction } from "../src/core/validation";
it("fresh legacy-profile light fit versions its corrected initial loss and exactly recovers without rewriting the checkpoint", async () => {
  const profile = createProfile("circle", 32, "light");
  profile.threadMm = 0.1;
  const options = {
    profile,
    mode: "light" as const,
    resolution: 32,
    lines: 200,
    portrait: { ...DEFAULT_PORTRAIT, enabled: true },
    pixels: new Uint8Array(32 * 32 * 3).fill(170),
  };
  let checkpoint!: DensityCheckpoint;
  const tuning = {
    edgeWeight: 2,
    sweeps: 1,
    physical: defaultPhysicalContrast(),
  };
  const full = await generateDensity(options, {
    ...tuning,
    onCheckpoint: (s) => {
      checkpoint = s;
    },
  });
  await validateInstruction(full);
  const unchanged = JSON.stringify(checkpoint);
  expect(checkpoint.initialObjective).toBe("consistent-undershoot/1");
  expect(full.params.optimization?.initialObjective).toBe(
    "consistent-undershoot/1",
  );
  const recovered = await generateDensity(options, {
    ...tuning,
    resume: checkpoint,
    materializeOnly: true,
  });
  expect(recovered.sequenceHash).toBe(full.sequenceHash);
  expect(recovered.segments).toEqual(full.segments);
  expect(JSON.stringify(checkpoint)).toBe(unchanged);
  const bad = structuredClone(checkpoint);
  delete bad.initialObjective;
  await expect(
    generateDensity(options, { ...tuning, resume: bad }),
  ).rejects.toThrow("Incompatible");
  const invalid = structuredClone(full);
  invalid.params.optimization!.initialObjective = "fake" as any;
  await expect(validateInstruction(invalid)).rejects.toThrow(
    "initial objective",
  );
});
