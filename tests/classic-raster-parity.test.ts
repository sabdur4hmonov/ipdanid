import { expect, test } from "vitest";
import { referenceRaster } from "../src/core/classic-reference";
import { frozenReferenceRaster } from "./helpers/frozen-classic-raster";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { leastSquaresProfile } from "../src/core/classic-least-squares";
type Raster = Parameters<typeof referenceRaster>[0];
const make = (shape: number, colors = ["#000000"]): Raster =>
  ({
    profile: leastSquaresProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[shape],
      true,
    ),
    params: { resolution: 500 },
    metrics: { lines: 600 },
    segments: colors.map((color, j) => ({
      color,
      path: Array.from(
        { length: 600 / colors.length + 1 },
        (_, k) => (k * 71 + j * 37) % 240,
      ),
    })),
  }) as Raster;
function exact(actual: Float32Array, expected: Float32Array) {
  expect(
    Buffer.from(actual.buffer, actual.byteOffset, actual.byteLength).equals(
      Buffer.from(expected.buffer, expected.byteOffset, expected.byteLength),
    ),
  ).toBe(true);
}
for (const shape of [0, 1, 2])
  test(`black physical raster preserves every Float32 channel on kit shape ${shape}`, () => {
    for (const size of [32, 160, 1000]) {
      const i = make(shape);
      for (const completed of [0, 1, 600])
        exact(
          referenceRaster(i, size, completed),
          frozenReferenceRaster(i, size, completed),
        );
    }
  });
test("colored and incremental physical rasters preserve their previous arithmetic", () => {
  for (const colors of [
    ["#000000"],
    ["#000000", "#ff0000"],
    ["#ff0000", "#0000ff"],
  ]) {
    const i = make(2, colors),
      old = frozenReferenceRaster(i, 160, 60),
      current = referenceRaster(i, 160, 60);
    exact(current, old);
    exact(
      referenceRaster(i, 160, 90, { pixels: current, completed: 60 }),
      frozenReferenceRaster(i, 160, 90, { pixels: old, completed: 60 }),
    );
  }
});
test("immutable black guides share cached completed rasters without corrupting partial frames", () => {
  const i = Object.freeze(make(0));
  const first = referenceRaster(i, 160, 20);
  expect(referenceRaster(i, 160, 20)).toBe(first);
  const complete = referenceRaster(i, 160);
  exact(complete, frozenReferenceRaster(i, 160));
  expect(referenceRaster(i, 160)).toBe(complete);
});
