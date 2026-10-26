import { expect, test } from "vitest";
import { suggestPortraitPlacement } from "../src/core/portrait-placement";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import { unturnPoint, type QuarterTurn } from "../src/core/photo-orientation";

const faces = [{ left: 0.28, top: 0.27, width: 0.5, height: 0.45 }];
test("portrait placement is optional, reversible and does not mutate the detection", () => {
  const original = structuredClone(faces),
    base = frameFreePhoto("people", faces, "circle", 0.75),
    a = suggestPortraitPlacement(faces, "circle", 0.75, 0)!,
    focused = frameFreePhoto("people", faces, "circle", 0.75, a);
  expect(a.zoom).toBeGreaterThan(1.4);
  expect(focused.targetFaces![0].width).toBeGreaterThan(
    base.targetFaces![0].width * 1.4,
  );
  expect(faces).toEqual(original);
  expect(frameFreePhoto("people", faces, "circle", 0.75)).toEqual(base);
});
test("placement remains finite and centres the complete group under every shape and rotation", () => {
  const pair = [
    { left: 0.12, top: 0.25, width: 0.22, height: 0.35 },
    { left: 0.62, top: 0.25, width: 0.23, height: 0.35 },
  ];
  for (const shape of ["circle", "rectangle", "heart"] as const)
    for (const rotation of [0, 1, 2, 3] as QuarterTurn[]) {
      const a = suggestPortraitPlacement(pair, shape, 1.4, rotation)!;
      expect([a.zoom, a.x, a.y].every(Number.isFinite)).toBe(true);
      const f = frameFreePhoto("people", pair, shape, 1.4, a, rotation);
      expect(f.targetFaces).toHaveLength(2);
      // The expanded head group's source centre must map to the requested board centre.
      const l = 0.12 - 0.15 * 0.22,
        r = 0.62 + 1.15 * 0.23,
        top = 0.25 - 0.5 * 0.35,
        bottom = 0.25 + 1.08 * 0.35,
        x = f.targetBounds.left + ((l + r) / 2) * f.targetBounds.width,
        y = f.targetBounds.top + ((top + bottom) / 2) * f.targetBounds.height,
        p = unturnPoint(x, y, ((4 - rotation) % 4) as QuarterTurn);
      expect(p.x).toBeCloseTo(0.5, 10);
      expect(p.y).toBeCloseTo(shape === "heart" ? 0.4 : 0.49, 10);
    }
});
test("an absent or oversized group has no automatic suggestion", () => {
  expect(suggestPortraitPlacement([], "circle", 1, 0)).toBeUndefined();
  expect(
    suggestPortraitPlacement(Array(4).fill(faces[0]), "circle", 1, 0),
  ).toBeUndefined();
});
