import { it, expect } from "vitest";
import {
  peopleBounds,
  fitAllPeople,
  croppedPeopleFraction,
} from "../src/core/people-fit";
import { DEFAULT_EDITS } from "../src/core/types";
import type { PersonMask } from "../src/core/person-mask";
const mask: PersonMask = {
  width: 40,
  height: 20,
  values: new Float32Array(800),
};
for (let y = 2; y < 18; y++)
  for (const start of [2, 25])
    for (let x = start; x < start + 12; x++) mask.values[y * 40 + x] = 1;
it("retains disconnected people and soft edges in one padded source union", () => {
  const soft = { ...mask, values: mask.values.slice() };
  soft.values[0] = 0.3;
  const b = peopleBounds(soft);
  expect(b.left).toBe(0);
  expect(b.top).toBe(0);
  expect(b.left + b.width).toBeGreaterThanOrEqual(37 / 40);
  expect(() =>
    peopleBounds({ ...mask, values: new Float32Array(800) }),
  ).toThrow();
});
it("fits both people inside every board shape, including rotated non-square crops", () => {
  for (const shape of ["circle", "heart", "rectangle"] as const) {
    const initial = { ...DEFAULT_EDITS, rotation: 13 };
    expect(
      croppedPeopleFraction(mask, shape, initial, 1.2, 924, 462, 192),
    ).toBeGreaterThan(0.1);
    const fit = fitAllPeople(
      shape,
      mask,
      initial,
      1.2,
      480,
      400,
      924,
      462,
      192,
    );
    expect(
      croppedPeopleFraction(mask, shape, fit.edits, 1.2, 924, 462, 192),
    ).toBe(0);
    expect(fit.edits.rotation).toBe(13);
    expect(fit.edits.brightness).toBe(initial.brightness);
    expect(fit.edits.contrast).toBe(initial.contrast);
    expect(mask.values.filter((v) => v === 1)).toHaveLength(384);
  }
});
it("can fit the entire original when the model is unavailable, without inventing a mask", () => {
  const fit = fitAllPeople(
    "circle",
    undefined,
    DEFAULT_EDITS,
    1,
    400,
    400,
    924,
    462,
  );
  expect(fit.sourceBounds).toEqual({ left: 0, top: 0, width: 1, height: 1 });
  expect(
    croppedPeopleFraction(undefined, "circle", fit.edits, 1, 924, 462),
  ).toBeUndefined();
});
