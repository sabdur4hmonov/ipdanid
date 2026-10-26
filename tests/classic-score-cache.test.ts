import { expect, test } from "vitest";
import {
  ClassicScoreCache,
  ClassicScoreGeometry,
} from "../src/core/classic-score-cache";
import {
  classicPins,
  referenceLinePixels,
} from "../src/core/classic-reference";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
  squareChordExcluded,
} from "../src/core/classic-least-squares";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
} from "../src/core/standard-kit";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import { validateInstruction } from "../src/core/validation";

const raw = standardProfiles(structuredClone(DEFAULT_STANDARD_KIT));
test("incremental LS sums preserve Float32 residuals and agree with independent ordered recomputation", () => {
  const p = leastSquaresProfile(raw[0], true),
    n = 64,
    geometry = new ClassicScoreGeometry(p, n, (a, b) =>
      squareChordExcluded(p, a, b),
    ),
    residual = Float32Array.from(
      { length: n * n },
      (_, k) => 0.4 + 0.5 * Math.sin(k * 0.1),
    ),
    expected = residual.slice(),
    darkness = Float64Array.from(residual, (_, k) => 0.08 + (k % 19) / 240),
    scores = new ClassicScoreCache(geometry, residual, darkness),
    keys = geometry.lines.flatMap((line, key) => (line ? [key] : [])),
    pins = classicPins(p, n);
  expect(geometry.references.length).toBeLessThan(
    geometry.lines.reduce((s, l) => s + (l?.length ?? 0), 0) * 0.7,
  );
  expect(geometry.buckets.some((bucket, k) => bucket !== k)).toBe(true);
  for (let step = 0; step < 30; step++) {
    const key = keys[(step * 317) % keys.length],
      a = Math.floor(key / 240),
      b = key % 240,
      independent = referenceLinePixels(pins[a], pins[b], n);
    expect(geometry.lines[key]).toEqual(independent);
    for (const pixel of independent) expected[pixel] -= darkness[pixel];
    scores.apply(key);
    expect(residual).toEqual(expected);
    for (let q = 0; q < 10; q++) {
      const probe = keys[(q * 173 + step * 51) % keys.length],
        line = geometry.lines[probe]!;
      let sum = 0;
      for (const pixel of line) {
        const dd = darkness[pixel];
        sum += dd * (2 * expected[pixel] - dd);
      }
      expect(scores.score(probe)).toBeCloseTo(sum / line.length, 11);
    }
  }
});
for (const [index, shape] of ["circle", "rectangle", "heart"].entries())
  test(`cached ${shape} routing, reverse-order ties and seeded replay exactly match ordinary3`, async () => {
    const p = leastSquaresProfile(raw[index], true),
      n = 64,
      transform = frameFreePhoto(
        "people",
        [{ left: 0.31, top: 0.23, width: 0.37, height: 0.5 }],
        p.shape,
        1,
      ),
      geometry = new ClassicScoreGeometry(p, n, (a, b) =>
        squareChordExcluded(p, a, b),
      ),
      pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
        const at = Math.floor(k / 3),
          x = (at % n) / (n - 1) - 0.5,
          y = Math.floor(at / n) / (n - 1) - 0.5;
        return Math.round(130 + 65 * Math.cos((x * x + y * y) * 17));
      }),
      options = {
        pixels,
        profile: p,
        resolution: n,
        lines: 320,
        mode: "dark" as const,
        kitPreparation: {
          version: "standard-preparation/9" as const,
          sourceHash: "0".repeat(64),
          sourceAspect: 1,
          whiteBackground: "original" as const,
          transform,
        },
      };
    const direct = await generateClassicLeastSquares(options),
      fast = await generateClassicLeastSquares(options, geometry);
    expect(fast.sequenceHash).toBe(direct.sequenceHash);
    expect(fast.segments).toEqual(direct.segments);
    const changed = Uint8Array.from(pixels, (v) => 255 - v),
      directChanged = await generateClassicLeastSquares({
        ...options,
        pixels: changed,
      }),
      fastChanged = await generateClassicLeastSquares(
        { ...options, pixels: changed },
        geometry,
      );
    expect(fastChanged.sequenceHash).toBe(directChanged.sequenceHash);
    const partial = await generateClassicLeastSquares({
      ...options,
      lines: 160,
    });
    expect(
      (
        await generateClassicLeastSquares(
          { ...options, seed: partial },
          geometry,
        )
      ).sequenceHash,
    ).toBe(direct.sequenceHash);
    await validateInstruction(fast);
    await validateInstruction(fastChanged);
  }, 60000);
test("geometry cannot be reused for a different profile and respects cancellation", async () => {
  const p = leastSquaresProfile(raw[0], true),
    geometry = new ClassicScoreGeometry(p, 64, () => false);
  await expect(
    generateClassicLeastSquares(
      {
        pixels: new Uint8Array(64 * 64 * 3),
        profile: structuredClone(p),
        resolution: 64,
        lines: 50,
        mode: "dark",
      },
      geometry,
    ),
  ).rejects.toThrow("cache-binding");
  expect(
    () =>
      new ClassicScoreGeometry(
        p,
        64,
        () => false,
        () => true,
      ),
  ).toThrow("Cancelled");
});
