import { describe, it, expect } from "vitest";
import { portraitSampling } from "../src/core/portrait-sampling";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
describe("portrait sampling on the immutable target", () => {
  it("supports the direct 320 diagnostic without modifying its target or opening unbounded grids", () => {
    const portrait = { ...DEFAULT_PORTRAIT, enabled: true };
    const pixels = new Uint8Array(320 * 320 * 3).fill(200),
      before = pixels.slice();
    const result = portraitSampling(pixels, 320, "circle", portrait);
    expect(result.map((r) => r.key)).toEqual(["eyes", "nose", "mouth"]);
    expect(result.every((r) => r.samples > 0 && r.toneRange === 0)).toBe(true);
    expect(Buffer.from(pixels).equals(Buffer.from(before))).toBe(true);
    expect(() =>
      portraitSampling(new Uint8Array(321 * 321 * 3), 321, "circle", portrait),
    ).toThrow("sampling target");
  });
  it("reports source windows at each grid without inventing contrast or changing pixels", () => {
    const portrait = {
      ...DEFAULT_PORTRAIT,
      enabled: true,
      regions: {
        reference: "processed-target/sample-centers-v1" as const,
        placement: "manual" as const,
        eyes: { left: 0.3, top: 0.35, width: 0.4, height: 0.1 },
        nose: { left: 0.4, top: 0.45, width: 0.2, height: 0.12 },
        mouth: { left: 0.35, top: 0.62, width: 0.3, height: 0.04 },
      },
    };
    const pixels = new Uint8Array(160 * 160 * 3).fill(200),
      before = pixels.slice();
    const result = portraitSampling(pixels, 160, "circle", portrait);
    expect(result[2].heightPixels).toBeCloseTo(6.36);
    expect(result[2].small).toBe(true);
    expect(
      result.every(
        (r) => r.insideFraction === 1 && r.toneRange === 0 && !r.clipped,
      ),
    ).toBe(true);
    expect(pixels).toEqual(before);
    expect(
      portraitSampling(
        new Uint8Array(192 * 192 * 3).fill(200),
        192,
        "circle",
        portrait,
      )[2].heightPixels,
    ).toBeCloseTo(7.64);
  });
  it("excludes off-board samples rather than counting white pixels as usable anatomy", () => {
    const portrait = {
      ...DEFAULT_PORTRAIT,
      enabled: true,
      face: { left: 0, top: 0, width: 0.2, height: 0.2 },
    };
    const result = portraitSampling(
      new Uint8Array(32 * 32 * 3).fill(255),
      32,
      "circle",
      portrait,
    );
    expect(result.some((r) => r.clipped)).toBe(true);
    expect(result.some((r) => r.insideFraction === 0 && r.samples === 0)).toBe(
      true,
    );
    expect(() =>
      portraitSampling(new Uint8Array(9), 32, "circle", portrait),
    ).toThrow();
  });
});
