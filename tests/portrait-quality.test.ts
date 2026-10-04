import { it, expect } from "vitest";
import { generate, hash, sequencePayload } from "../src/core/engine";
import { generate as baseline } from "../src/core/baseline-v3";
import { createProfile } from "../src/core/geometry";
import {
  DEFAULT_PORTRAIT,
  processPortrait,
  regionMeasurements,
} from "../src/core/portrait";
import { rasterSequence } from "../src/core/optical";
import { validateInstruction, fromFile, toTxt } from "../src/core/validation";
import { MAX_FOOTPRINT_BYTES } from "../src/core/limits";
const n = 64;
const portrait = {
  ...DEFAULT_PORTRAIT,
  enabled: true,
  face: { left: 0.25, top: 0.23, width: 0.5, height: 0.61 },
};
const source = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
  const x = (Math.floor(k / 3) % n) / (n - 1),
    y = Math.floor(k / 3 / n) / (n - 1);
  const face = ((x - 0.5) / 0.24) ** 2 + ((y - 0.54) / 0.32) ** 2 < 1;
  const eyes =
    (Math.abs(x - 0.39) < 0.055 || Math.abs(x - 0.61) < 0.055) &&
    Math.abs(y - 0.43) < 0.02;
  const mouth = Math.abs(x - 0.5) < 0.1 && Math.abs(y - 0.7) < 0.018;
  const nose = Math.abs(x - 0.48) < 0.016 && y > 0.5 && y < 0.62;
  return face
    ? eyes || mouth
      ? 55
      : nose
        ? 155
        : 211
    : y < 0.3 || y > 0.83
      ? 40
      : Math.sin(x * 90 + y * 60) > 0
        ? 115
        : 250;
});
it("manual preparation is bounded, resets exactly, and does not flatten facial feature contrast", () => {
  expect(processPortrait(source, n, DEFAULT_PORTRAIT)).toEqual(source);
  const target = processPortrait(source, n, portrait);
  expect(target.length).toBe(source.length);
  const eye = (Math.round(0.43 * (n - 1)) * n + Math.round(0.39 * (n - 1))) * 3;
  const cheek =
    (Math.round(0.54 * (n - 1)) * n + Math.round(0.6 * (n - 1))) * 3;
  expect(target[cheek] - target[eye]).toBeGreaterThan(100);
  expect(() =>
    processPortrait(source, n, {
      ...portrait,
      face: { ...portrait.face, width: 1 },
    }),
  ).toThrow();
});
it("face-weighted continuous refinement improves facial regions against the same-target legacy engine and keeps old sequences importable", async () => {
  const pixels = processPortrait(source, n, portrait),
    profile = createProfile("circle", 64);
  profile.threadMm = 0.1;
  const old = await baseline({
    pixels,
    resolution: n,
    profile: { ...profile, version: 3, maxLines: 3000 },
    lines: 1400,
    mode: "dark",
  });
  const current = await generate({
    pixels,
    resolution: n,
    profile,
    lines: 1400,
    mode: "dark",
    portrait,
  });
  const before = regionMeasurements(
      pixels,
      rasterSequence(old),
      n,
      profile,
      portrait.face,
    ),
    after = current.metrics.regions!.final;
  expect(after.face.mse).toBeLessThan(before.face.mse);
  for (const name of ["eyes", "nose", "mouth"])
    expect(after[name].mse).toBeLessThan(before[name].mse);
  expect(current.metrics.peakCacheBytes).toBeLessThanOrEqual(
    MAX_FOOTPRINT_BYTES,
  );
  expect(current.metrics.refinement!.replacements).toBeGreaterThan(0);
  await validateInstruction(current);
  await validateInstruction(old);
  expect((await fromFile(toTxt(old))).sequenceHash).toBe(old.sequenceHash);
  const original = JSON.stringify(current);
  const continued = await generate({
    pixels,
    resolution: n,
    profile,
    lines: 1400,
    mode: "dark",
    portrait,
    seed: current,
  });
  expect(JSON.stringify(current)).toBe(original);
  expect(continued.params.parentSequenceHash).toBe(current.sequenceHash);
  expect(continued.metrics.weightedError!.final).toBeLessThanOrEqual(
    current.metrics.weightedError!.final + 1e-6,
  );
  await validateInstruction(continued);
  await expect(
    generate({
      pixels: new Uint8Array(pixels.length).fill(0),
      resolution: n,
      profile,
      lines: 1400,
      mode: "dark",
      portrait,
      seed: current,
    }),
  ).rejects.toThrow(/same portrait/);
}, 60000);
it("supports useful paths above 3,000 connections without stock truncation and detects accounting tampering", async () => {
  const profile = createProfile("circle", 48, "dark", {
    widthMm: 1200,
    heightMm: 1200,
  });
  profile.threadMm = 0.1;
  profile.stockMeters = 1;
  const pixels = new Uint8Array(n * n * 3).fill(40);
  const result = await generate({
    pixels,
    resolution: n,
    profile,
    lines: 3400,
    mode: "dark",
  });
  expect(result.metrics.lines).toBe(3400);
  expect(result.metrics.stoppedReason).toBe("compute-limit");
  expect(result.metrics.stockShortfallMeters).toBeGreaterThan(1);
  expect(result.metrics.reconstructionMse).toBeLessThan(
    result.metrics.baselineMse,
  );
  await validateInstruction(result);
  expect((await fromFile(toTxt(result))).segments).toEqual(result.segments);
  const tampered = structuredClone(result);
  tampered.metrics.stockShortfallMeters = 0;
  await expect(validateInstruction(tampered)).rejects.toThrow(/accounting/);
  // Player seeks must match fresh sequence replay, including returning from a later step.
  const full = rasterSequence(result);
  full[0] = 0;
  for (const step of [0, 20, 150, 12, 3400]) {
    const incremental = rasterSequence(result, step),
      fresh = rasterSequence(structuredClone(result), step);
    expect(incremental).toEqual(fresh);
  }
  const changed = structuredClone(result);
  changed.segments[0].path[1] = changed.segments[0].path[2];
  changed.sequenceHash = await hash(sequencePayload(changed));
  await expect(validateInstruction(changed)).rejects.toThrow();
}, 30000);
