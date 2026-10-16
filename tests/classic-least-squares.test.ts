import { test, expect } from "vitest";
import { classicGreedy } from "../AGENT/reference/classic-string-art";
import {
  generateClassicLeastSquares,
  leastSquaresImportance,
  leastSquaresProfile,
  isSquareCentreAxis,
} from "../src/core/classic-least-squares";
import {
  generateClassicReference,
  referenceProfile,
  classicPins,
  referenceRaster,
} from "../src/core/classic-reference";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { frameCustomerHeads } from "../src/core/customer-framing";
import { validateInstruction, toTxt } from "../src/core/validation";
import { hash, sequencePayload } from "../src/core/engine";
import { viewingSsim } from "./helpers/viewing-ssim";

const raw = standardProfiles(structuredClone(DEFAULT_STANDARD_KIT)),
  p = leastSquaresProfile(raw[0]);
const transform = frameCustomerHeads(
  [{ left: 0.3, top: 0.2, width: 0.4, height: 0.5 }],
  "circle",
  1,
);
const proof = {
  version: "standard-preparation/4" as const,
  sourceHash: "0".repeat(64),
  sourceAspect: 1,
  whiteBackground: "automatic" as const,
  transform,
};
test("LS3 matches supplied weighted least-squares decisions exactly; old2 seed/settings cannot enter3", async () => {
  const n = 64,
    pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) =>
      Math.round(50 + 200 * ((Math.floor(k / 3) % n) / n)),
    ),
    gray = Float32Array.from({ length: n * n }, (_, k) => pixels[k * 3] / 255),
    options = {
      pixels,
      profile: p,
      resolution: n,
      lines: 320,
      mode: "dark" as const,
      kitPreparation: proof,
    },
    i = await generateClassicLeastSquares(options),
    expected = classicGreedy(gray, {
      size: n,
      pins: classicPins(p, n),
      lines: 320,
      minGap: 25,
      lineDarkness: 0.08,
      maxChordRepeat: 1,
      darknessGamma: 1.6,
      scoring: "ls",
      importance: leastSquaresImportance(n, transform.targetFaces!),
    });
  expect(i.segments[0].path).toEqual(expected.sequence);
  await validateInstruction(i);
  expect(i.params.classic).not.toHaveProperty("overdrawPenalty");
  expect(p.pins).toEqual(raw[0].pins);
  expect(toTxt(i)).toContain("B-");
  const resumed = await generateClassicLeastSquares({
    ...options,
    lines: 340,
    seed: i,
  });
  expect(resumed.segments[0].path.slice(0, 321)).toEqual(i.segments[0].path);
  const old = await generateClassicReference({
    ...options,
    profile: referenceProfile(raw[0]),
  });
  await expect(
    generateClassicLeastSquares({ ...options, seed: old }),
  ).rejects.toThrow("seed-identity");
  const forged = structuredClone(i);
  Reflect.set(forged.params.classic!, "lineDarkness", 0.15);
  forged.sequenceHash = await hash(sequencePayload(forged));
  await expect(validateInstruction(forged)).rejects.toThrow("contract");
  await expect(
    generateClassicLeastSquares({ ...options, cancelled: () => true }),
  ).rejects.toThrow("Cancelled");
}, 60000);
test("Square3 excludes exact axis chords at centre while retaining diagonals, peripheral axes and real kit pins", async () => {
  const q = leastSquaresProfile(raw[1]),
    pairs: [number, number][] = [];
  for (let a = 0; a < 240; a++)
    for (let b = a + 1; b < 240; b++)
      if (isSquareCentreAxis(q, a, b)) pairs.push([a, b]);
  expect(pairs.length).toBeGreaterThan(0);
  expect(isSquareCentreAxis(p, 0, 120)).toBe(false);
  expect(isSquareCentreAxis(q, 0, 120)).toBe(false);
  const i = await generateClassicLeastSquares({
    pixels: new Uint8Array(64 * 64 * 3).fill(180),
    profile: q,
    resolution: 64,
    lines: 600,
    mode: "dark",
  });
  for (let j = 1; j < i.segments[0].path.length; j++)
    expect(
      isSquareCentreAxis(q, i.segments[0].path[j - 1], i.segments[0].path[j]),
    ).toBe(false);
  expect(i.profile.pins).toEqual(raw[1].pins);
  await validateInstruction(i);
}, 60000);

// Procedural analytic faces, not photos or owner-derived assets. The real local
// three synthetic portrait JPEGs additionally pass the UI/report quality gate.
for (let variant = 0; variant < 3; variant++)
  test(`synthetic face ${variant + 1}: native500 physical3000 LS3 face SSIM is at least2`, async () => {
    const n = 500,
      b = transform.targetFaces![0],
      cx = b.left + b.width / 2,
      cy = b.top + b.height / 2,
      pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
        const at = Math.floor(k / 3),
          x = ((at % n) / n - cx) / b.width,
          y = (Math.floor(at / n) / n - cy) / b.height;
        let v = 1;
        if ((x / 0.56) ** 2 + ((y + 0.17) / 0.77) ** 2 < 1) {
          v = 0.69 + 0.04 * variant + 0.08 * x - 0.025 * Math.cos(y * 8);
          if (y < -0.34 + 0.035 * Math.sin(x * 15 + variant))
            v = 0.14 + 0.045 * Math.sin(x * 51 + y * 23 + variant);
          for (const ex of [-0.23, 0.23]) {
            const q = ((x - ex) / 0.12) ** 2 + ((y + 0.04) / 0.055) ** 2;
            v -= 0.42 * Math.exp(-q * 2);
            v -=
              0.2 *
              Math.exp(
                -(((x - ex) / 0.15) ** 2 + ((y + 0.13) / 0.03) ** 2) * 2,
              );
          }
          v -=
            0.2 *
            Math.exp(-(((x - 0.035) / 0.055) ** 2) - ((y - 0.17) / 0.17) ** 2);
          v -=
            0.35 *
            Math.exp(
              -((x / 0.23) ** 2) -
                ((y - 0.34 + 0.06 * (x / 0.23) ** 2) / 0.035) ** 2,
            );
          v +=
            0.1 *
            Math.exp(-(((x + 0.08) / 0.08) ** 2) - ((y - 0.13) / 0.15) ** 2);
        }
        return Math.round(255 * Math.max(0, Math.min(1, v)));
      }),
      gray = Float32Array.from(
        { length: n * n },
        (_, k) => pixels[k * 3] / 255,
      ),
      opts = {
        pixels,
        resolution: n,
        lines: 3000,
        mode: "dark" as const,
        kitPreparation: proof,
      },
      old = await generateClassicReference({
        ...opts,
        profile: referenceProfile(raw[0]),
      }),
      next = await generateClassicLeastSquares({ ...opts, profile: p });
    const grayRender = (i: typeof old) => {
        const rgb = referenceRaster(i, 1000);
        return Float32Array.from({ length: 1000 * 1000 }, (_, k) => rgb[k * 3]);
      },
      a = viewingSsim(gray, n, grayRender(old), 1000, {
        faces: transform.targetFaces,
      }),
      c = viewingSsim(gray, n, grayRender(next), 1000, {
        faces: transform.targetFaces,
      });
    expect(c.face.ssim).toBeGreaterThanOrEqual(a.face.ssim);
    await validateInstruction(next);
  }, 90000);
