import { test, expect } from "vitest";
import {
  classicGreedy,
  renderPreview,
} from "../AGENT/reference/classic-string-art";
import {
  generateClassicReference,
  classicPins,
  referenceProfile,
  referenceImportance,
  referenceRaster,
} from "../src/core/classic-reference";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { validateInstruction } from "../src/core/validation";
import { hash, sequencePayload } from "../src/core/engine";
import {
  distinctSourceFaces,
  type SourceFace,
} from "../src/core/face-features";
import { addHeartAccent } from "../src/core/heart-accent";
import {
  faceFillReference,
  referenceClahe,
  referenceTones,
} from "../src/core/reference-preparation";

const p = referenceProfile(
  standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
);
test("orientation scoring counts distinct faces without dropping two adjacent people", () => {
  const make = (left: number, top: number, width: number, height: number) =>
      ({ face: { left, top, width, height } }) as SourceFace,
    first = make(0.29, 0.26, 0.42, 0.48),
    duplicate = make(0.33, 0.37, 0.27, 0.35),
    second = make(0.72, 0.25, 0.2, 0.3);
  expect(distinctSourceFaces([first, duplicate, second])).toEqual([
    first,
    second,
  ]);
});
test("reference2 exactly reproduces supplied DDA residual decisions and fixed negative-score budget", async () => {
  const n = 64,
    gray = Float32Array.from(
      { length: n * n },
      (_, k) => Math.round(255 * (0.2 + 0.8 * ((k % n) / n))) / 255,
    ),
    pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) =>
      Math.round(gray[Math.floor(k / 3)] * 255),
    );
  const options = {
    pixels,
    profile: p,
    resolution: n,
    lines: 300,
    mode: "dark" as const,
  };
  const actual = await generateClassicReference(options),
    reference = classicGreedy(gray, {
      size: n,
      pins: classicPins(p, n),
      lines: 300,
      minGap: 25,
      lineDarkness: 0.15,
      maxChordRepeat: 1,
      importance: referenceImportance(n, []),
      overdrawPenalty: 3,
      darknessGamma: 1.6,
    });
  expect(actual.segments[0].path).toEqual(reference.sequence);
  expect(actual.metrics.lines).toBe(300);
  await validateInstruction(actual);
  const resumed = await generateClassicReference({
    ...options,
    lines: 320,
    seed: actual,
  });
  expect(resumed.segments[0].path.slice(0, 301)).toEqual(
    actual.segments[0].path,
  );
  await expect(
    generateClassicReference({
      ...options,
      pixels: new Uint8Array(pixels.length),
      seed: actual,
    }),
  ).rejects.toThrow("seed-identity");
  const broken = structuredClone(actual);
  Reflect.set(broken.params.classic!, "lineDarkness", 0.2);
  broken.sequenceHash = await hash(sequencePayload(broken));
  await expect(validateInstruction(broken)).rejects.toThrow("contract");
}, 30000);
test("typed physical renderer equals the supplied multiplicative coverage at every pixel", async () => {
  const n = 64,
    i = await generateClassicReference({
      pixels: new Uint8Array(n * n * 3).fill(160),
      profile: p,
      resolution: n,
      lines: 80,
      mode: "dark",
    }),
    actual = referenceRaster(i, 96),
    reference = renderPreview(
      i.segments[0].path,
      classicPins(p, n),
      n,
      96,
      460,
      0.12,
      0.9,
    );
  for (let k = 0; k < reference.length; k++)
    expect(actual[k * 3]).toBe(reference[k]);
  const building=structuredClone(i),prefix=referenceRaster(building,96,30),incremental=referenceRaster(building,96,80,{pixels:prefix,completed:30});
  expect(incremental).toEqual(actual);
});
test("CLAHE, masked percentiles and reference head framing preserve real pixels and face provenance", () => {
  const n = 64,
    rgba = new Uint8ClampedArray(n * n * 4);
  for (let k = 0; k < n * n; k++) {
    rgba[k * 4] = rgba[k * 4 + 1] = rgba[k * 4 + 2] = (k % n) * 4;
    rgba[k * 4 + 3] = 255;
  }
  const mask = {
      width: n,
      height: n,
      values: Float32Array.from({ length: n * n }, (_, k) =>
        k % n < 32 ? 1 : 0,
      ),
    },
    tones = referenceTones(rgba, n, n, mask);
  expect(tones.gray.every(Number.isFinite)).toBe(true);
  expect(tones.gray[60]).toBe(1);
  expect(tones.high).toBeGreaterThan(tones.low);
  expect(referenceClahe(new Uint8Array(n * n).fill(128), n, n).length).toBe(
    n * n,
  );
  const f = faceFillReference(
    [{ left: 0.3, top: 0.2, width: 0.4, height: 0.5 }],
    "circle",
    1,
  );
  expect(Math.max(f.targetBounds.width, f.targetBounds.height)).toBeCloseTo(
    0.7,
  );
  expect(f.targetFaces).toHaveLength(1);
  expect(() => faceFillReference([], "circle", 1)).toThrow();
});
test("500px/2500 continuous kit connections remain full-budget, legal, cancellable and checkpointed", async () => {
  const n = 500,
    pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
      const i = Math.floor(k / 3),
        x = ((i % n) - 250) / 150,
        y = (Math.floor(i / n) - 250) / 200;
      return Math.round(255 * (1 - 0.7 * Math.exp(-x * x - y * y)));
    });
  const checkpoints: number[] = [];
  const i = await generateClassicReference({
    pixels,
    profile: p,
    resolution: n,
    lines: 2500,
    mode: "dark",
    onCheckpoint: (s) => checkpoints.push(s.metrics.lines),
  });
  expect(i.metrics.lines).toBe(2500);
  expect(checkpoints).toEqual([500, 1000, 1500, 2000]);
  await validateInstruction(i);
  await expect(
    generateClassicReference({
      pixels,
      profile: p,
      resolution: n,
      lines: 2500,
      mode: "dark",
      cancelled: () => true,
    }),
  ).rejects.toThrow("Cancelled");
}, 60000);
test("new Heart body and optional real red thread retain old accessory compatibility and exact imports", async () => {
  const profile = referenceProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[2],
    ),
    n = 64,
    pixels = new Uint8Array(n * n * 3).fill(180),
    body = await generateClassicReference({
      pixels,
      profile,
      resolution: n,
      lines: 120,
      mode: "dark",
    }),
    accented = await addHeartAccent(body, pixels, "#b31e35");
  expect(accented.algorithm).toBe("standard-accent/21");
  expect(accented.segments[0]).toEqual(body.segments[0]);
  expect(accented.params.accent!.bodySequenceHash).toBe(body.sequenceHash);
  expect(accented.metrics.lines).toBeGreaterThan(120);
  await validateInstruction(accented);
  const altered = structuredClone(accented);
  altered.segments[0].path[1] = altered.segments[0].path[0];
  altered.sequenceHash = await hash(sequencePayload(altered));
  await expect(validateInstruction(altered)).rejects.toThrow();
}, 30000);
