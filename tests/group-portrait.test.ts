import { it, expect } from "vitest";
import {
  DEFAULT_PORTRAIT,
  portraitRegionSets,
  processPortrait,
  regionMeasurements,
  validPortrait,
} from "../src/core/portrait";
import {
  estimatedPairPortrait,
  reviewedPeoplePortrait,
} from "../src/core/face-features";
import { anatomicalImportance } from "../src/core/anatomical-importance";
import { createProfile } from "../src/core/geometry";
import { generate, hash, sequencePayload } from "../src/core/engine";
import { rasterSequence } from "../src/core/optical";
import { validateInstruction, progressFor } from "../src/core/validation";
import { Distribution } from "../src/core/distribution";
import { remapPortrait } from "../src/core/shape-crop";
import { DEFAULT_EDITS } from "../src/core/types";
import { photoQualityAdvice } from "../src/core/photo-quality";
const manual = () => {
  const p = estimatedPairPortrait(DEFAULT_PORTRAIT);
  p.people!.faces.forEach((f) => (f.regions.placement = "manual"));
  p.regions!.placement = "manual";
  return p;
};
it("both people's features get equal importance; the gap between their noses is not anatomy", () => {
  const p = manual(),
    weight = anatomicalImportance(p);
  for (const f of p.people!.faces) {
    const b = f.regions.nose;
    expect(weight(b.left + b.width / 2, b.top + b.height / 2)).toBe(16);
  }
  expect(weight(0.51, 0.5)).toBe(1);
  const pixels = new Uint8Array(64 * 64 * 3).fill(180),
    profile = createProfile("rectangle", 32);
  const measured = regionMeasurements(
    pixels,
    new Float32Array(pixels.length).fill(0.7),
    64,
    profile,
    p,
  );
  const sets = portraitRegionSets(p);
  expect(measured["person2.nose"].pixels).toBeGreaterThan(0);
  expect(measured["person1.nose"].pixels).toBeGreaterThan(0);
  expect(sets.nose).toHaveLength(2);
  const first = regionMeasurements(
    pixels,
    new Float32Array(pixels.length).fill(0.7),
    64,
    profile,
    { ...p, people: undefined },
  );
  expect(measured.nose.pixels).toBeGreaterThan(first.nose.pixels);
});
it("crop rotation/resolution maps both independent facial references, not just the first one", () => {
  const p = manual();
  const rotated = remapPortrait(
    p,
    DEFAULT_EDITS,
    { ...DEFAULT_EDITS, rotation: 180 },
    640,
    640,
    1,
    192,
    1,
    160,
  );
  expect(rotated.people!.faces).toHaveLength(2);
  const a = p.people!.faces[1].regions.nose,
    b = rotated.people!.faces[1].regions.nose;
  expect(b.left).toBeCloseTo(1 - a.left - a.width, 2);
  expect(b.top).toBeCloseTo(1 - a.top - a.height, 2);
  expect(rotated.regions).toEqual(rotated.people!.faces[0].regions);
});
it("estimated group windows require explicit review; each actual generation has winding safeguards and exact replay", async () => {
  const pixels = Uint8Array.from(
    { length: 48 * 48 * 3 },
    (_, k) => 100 + (Math.floor(k / 3) % 130),
  );
  const profile = createProfile("rectangle", 24);
  profile.threadMm = 0.1;
  profile.stockMeters = 0;
  await expect(
    generate({
      pixels,
      profile,
      resolution: 48,
      lines: 120,
      mode: "dark",
      portrait: estimatedPairPortrait(DEFAULT_PORTRAIT),
    }),
  ).rejects.toThrow("Review every person");
  const instruction = await generate({
    pixels,
    profile,
    resolution: 48,
    lines: 120,
    mode: "dark",
    portrait: manual(),
  });
  expect(instruction.algorithm).toBe("group-optical/15");
  await validateInstruction(instruction);
  expect(await hash(sequencePayload(instruction))).toBe(
    instruction.sequenceHash,
  );
  expect(progressFor(instruction).confirmed).toBe(0);
  expect(instruction.metrics.stockShortfallMeters).toBe(
    instruction.metrics.estimatedMeters,
  );
  const d = new Distribution(profile.pins.length, instruction.segments);
  expect(Math.max(...d.degree)).toBeLessThanOrEqual(160);
  expect(Math.max(...d.pairs.values())).toBeLessThanOrEqual(32);
  expect(rasterSequence(instruction)).toEqual(
    rasterSequence(structuredClone(instruction)),
  );
});
it("white/flat and clipped/small features are advice, never an accepted quality score", () => {
  const p = manual(),
    pixels = new Uint8Array(32 * 32 * 3).fill(255);
  const advice = photoQualityAdvice(pixels, 32, "heart", p);
  expect(advice).toHaveLength(2);
  expect(
    advice.every((a) => a.small && a.flat && a.acceptedQuality === false),
  ).toBe(true);
  const rgb = new Uint8Array(64 * 64 * 3).fill(110);
  const processed = processPortrait(rgb, 64, p);
  expect(new Set(processed).size).toBe(1);
  expect(processed[0]).toBe(110);
  expect(() =>
    validPortrait({ ...p, people: { ...p.people!, faces: [] } }),
  ).toThrow();
});
