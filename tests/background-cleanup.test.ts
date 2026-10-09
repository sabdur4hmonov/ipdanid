import { it, expect } from "vitest";
import { cleanUncertainBackground } from "../src/core/background-cleanup";
it("keeps every opaque foreground pixel exact, including disconnected people", () => {
  const primary = {
      width: 6,
      height: 1,
      values: Float32Array.from([0.75, 1, 0.59, 0.1, 0.8, 0.95]),
    },
    semantic = { width: 6, height: 1, values: new Float32Array(6) };
  const result = cleanUncertainBackground(primary, semantic);
  for (const i of [0, 1, 4, 5])
    expect(result.values[i]).toBe(primary.values[i]);
  expect(result.values[2]).toBeLessThan(0.25);
  expect(result.values[3]).toBe(0);
  expect(primary.values[2]).toBeCloseTo(0.59);
});
it("does not remove uncertain hair or clothing supported by the person model", () => {
  const primary = {
      width: 2,
      height: 2,
      values: Float32Array.from([0.3, 0.6, 0.7, 0.99]),
    },
    semantic = { width: 1, height: 1, values: Float32Array.from([1]) };
  expect(cleanUncertainBackground(primary, semantic).values).toEqual(
    primary.values,
  );
});
it("rejects invalid model output rather than producing a destructive white mask", () => {
  const primary = { width: 1, height: 1, values: Float32Array.from([1]) };
  expect(() =>
    cleanUncertainBackground(primary, {
      ...primary,
      values: Float32Array.from([NaN]),
    }),
  ).toThrow();
});
