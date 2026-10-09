import { describe, it, expect } from "vitest";
import {
  whitePixel,
  foregroundAlpha,
  paintPersonMask,
  validatePersonMask,
} from "../src/core/person-mask";
describe("source-space people mask", () => {
  it("whitens background exactly, preserves dark hair and light clothing", () => {
    expect(whitePixel([0, 10, 20], 0)).toEqual([255, 255, 255]);
    expect(whitePixel([3, 4, 5], 0.9)).toEqual([3, 4, 5]);
    expect(whitePixel([250, 245, 240], 1)).toEqual([250, 245, 240]);
    expect(foregroundAlpha(0.5)).toBe(0.5);
  });
  it("keeps separate people without component pruning; reversible local edits leave all other pixels intact", () => {
    const values = new Float32Array(10000);
    values[1010] = 1;
    values[8080] = 1;
    const original = { width: 100, height: 100, values };
    const edited = paintPersonMask(original, 0.5, 0.5, 0.04, true);
    expect(edited.values[1010]).toBe(1);
    expect(edited.values[8080]).toBe(1);
    expect(edited.values[5050]).toBe(1);
    expect(original.values[5050]).toBe(0);
    const erased = paintPersonMask(edited, 0.5, 0.5, 0.04, false);
    expect(erased.values).toEqual(original.values);
  });
  it("rejects non-finite, malformed and oversized masks and invalid brush coordinates", () => {
    expect(() =>
      validatePersonMask({
        width: 2,
        height: 2,
        values: new Float32Array([0, 1, NaN, 0]),
      }),
    ).toThrow();
    expect(() =>
      validatePersonMask({
        width: 1025,
        height: 1025,
        values: new Float32Array(1),
      }),
    ).toThrow();
    expect(() =>
      paintPersonMask(
        { width: 2, height: 2, values: new Float32Array(4) },
        -1,
        0,
        0.05,
        true,
      ),
    ).toThrow();
  });
});
