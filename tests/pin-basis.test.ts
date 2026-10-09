import { expect, it } from "vitest";
import { createProfile, connectionAllowed } from "../src/core/geometry";
import { withPinBasis, validatePinBasis } from "../src/core/pin-basis";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { validateInstruction, fromFile, toTxt } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
import { simplifySequence } from "../src/core/simplify";

it("new 240/320 bases preserve materials/angular exclusion and legacy geometry; invalid circles, spacing, coordinates and versions refused", () => {
  const legacy = createProfile("circle", 240);
  legacy.threadMm = 0.1;
  const before = JSON.stringify(legacy),
    a = withPinBasis(legacy, 240),
    b = withPinBasis(legacy, 320);
  expect(a.pins).toEqual(legacy.pins);
  expect(a.pinBasis!.minimumAngularGapDegrees).toBe(7.5);
  expect(b.pinBasis!.minimumAngularGapDegrees).toBe(7.5);
  expect(b.minPinGap).toBe(7);
  expect(connectionAllowed(b, 0, 6)).toBe(false);
  expect(connectionAllowed(b, 0, 7)).toBe(true);
  expect(b.widthMm).toBe(400);
  expect(b.threadMm).toBe(0.1);
  expect(JSON.stringify(legacy)).toBe(before);
  expect(() => createProfile("circle", 320)).toThrow("24–240");
  expect(() => withPinBasis(createProfile("heart", 240), 320)).toThrow("basis");
  expect(() =>
    withPinBasis(createProfile("circle", 240, "color"), 320),
  ).toThrow("basis");
  const crowded = structuredClone(legacy);
  crowded.widthMm = crowded.heightMm = 100;
  expect(() => withPinBasis(crowded, 320)).toThrow("spacing");
  const wrong = structuredClone(b);
  wrong.pins[11].x += 0.001;
  expect(() => validatePinBasis(wrong)).toThrow("coordinates");
  const gap = structuredClone(b);
  gap.minPinGap = 5;
  expect(() => validatePinBasis(gap)).toThrow("basis");
});
for (const mode of ["dark", "light"] as const)
  it(`a fresh ${mode} 320-pin loss is bound to exact recovery/materials; complete replay, imports and pruning retain all geometry and guards`, async () => {
    const source = createProfile("circle", 240, mode);
    source.threadMm = 0.1;
    const profile = withPinBasis(source, 320),
      pixels = Uint8Array.from(
        { length: 32 * 32 * 3 },
        (_, k) => 120 + (Math.floor(k / 3) % 100),
      ),
      o = {
        profile,
        pixels,
        resolution: 32,
        mode,
        lines: 500,
        portrait: { ...DEFAULT_PORTRAIT, enabled: true },
      },
      tuning = {
        physical: defaultPhysicalContrast(),
        edgeWeight: 2,
        sweeps: 2,
      };
    const full = await generateDensity(o, tuning);
    expect(full.algorithm).toBe("density-pin-basis/11");
    await validateInstruction(full);
    expect((await fromFile(toTxt(full))).sequenceHash).toBe(full.sequenceHash);
    let checkpoint: DensityCheckpoint | undefined;
    await expect(
      generateDensity(
        { ...o, cancelled: () => !!checkpoint },
        {
          ...tuning,
          onCheckpoint: (s) => {
            checkpoint = s;
          },
        },
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    const resumed = await generateDensity(o, { ...tuning, resume: checkpoint });
    expect(resumed.sequenceHash).toBe(full.sequenceHash);
    expect(rasterSequence(resumed)).toEqual(rasterSequence(full));
    await expect(
      generateDensity(
        { ...o, profile: withPinBasis(source, 240) },
        { ...tuning, resume: checkpoint },
      ),
    ).rejects.toThrow("Incompatible");
    const wrong = structuredClone(full);
    wrong.algorithm = "density-physical/8";
    await expect(validateInstruction(wrong)).rejects.toThrow("Unbound");
    const missing = structuredClone(full);
    delete missing.profile.pinBasis;
    await expect(validateInstruction(missing)).rejects.toThrow();
    const simplified = await simplifySequence(full, pixels, {
      maxProposals: 8,
    });
    await validateInstruction(simplified);
    expect(simplified.params.simplification!.sourceAlgorithm).toBe(
      "density-pin-basis/11",
    );
    expect(simplified.profile).toEqual(profile);
  }, 120000);
