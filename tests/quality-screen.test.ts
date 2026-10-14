import { expect, it } from "vitest";
import { regionQuality, screenQuality } from "../src/core/quality-screen";
const n = 32,
  profile = { widthMm: 400, heightMm: 400 },
  mask = new Uint8Array(n * n).fill(1);
it("separates unsupported crossing texture from identical target tone", () => {
  const target = new Float64Array(n * n).fill(0.8);
  const exact = regionQuality(target, target, mask, n, profile);
  expect(exact.toneError).toBe(0);
  expect(exact.excessTextureEnergy).toBe(0);
  const striped = Float64Array.from(target, (_, k) =>
    (k % n) % 2 ? 0.7 : 0.9,
  );
  const q = regionQuality(target, striped, mask, n, profile);
  expect(q.excessTextureEnergy).toBeGreaterThan(0);
  expect(q.coarseToneError).toBeLessThanOrEqual(q.toneError + 1e-14);
});
it("protects each eye, fixed masks and nonaccumulating light-tone allowance", () => {
  const target = new Float64Array(n * n).fill(0.8),
    exact = regionQuality(target, target, mask, n, profile);
  const worse = regionQuality(
    target,
    new Float64Array(n * n).fill(0.79),
    mask,
    n,
    profile,
  );
  const screen = screenQuality(
    { leftEye: exact, rightEye: exact, skin: exact },
    { leftEye: exact, rightEye: exact, skin: worse },
  );
  expect(screen.metricsPass).toBe(false);
  expect(screen.failures.some((f) => f.metric === "meanDarkExcess")).toBe(true);
  expect(() =>
    screenQuality({ leftEye: exact, rightEye: exact }, { leftEye: exact }),
  ).toThrow("complete regional");
  expect(() =>
    screenQuality({ leftEye: exact }, { leftEye: { ...exact, pixels: 1 } }),
  ).toThrow("fixed populated");
  expect(() =>
    screenQuality({ leftEye: exact }, { leftEye: { ...exact, maskReference: "different" } }),
  ).toThrow("fixed populated");
});
