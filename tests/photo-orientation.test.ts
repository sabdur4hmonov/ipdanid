import { expect, it } from "vitest";
import {
  unturnBox,
  unturnFaces,
  unturnMask,
  unturnPoint,
} from "../src/core/photo-orientation";
it("maps upright-analysis boxes back to rectangular source edges for all quarter turns", () => {
  const b = { left: 0.1, top: 0.2, width: 0.3, height: 0.4 };
  const half=unturnBox(b,2);expect(half.left).toBeCloseTo(.6);expect(half.top).toBeCloseTo(.4);expect(half.width).toBeCloseTo(.3);expect(half.height).toBeCloseTo(.4);
  const a = unturnBox(b, 1);
  expect(a.left).toBeCloseTo(0.2);
  expect(a.top).toBeCloseTo(0.6);
  expect(a.width).toBeCloseTo(0.4);
  expect(a.height).toBeCloseTo(0.3);
  for (const turn of [0, 1, 2, 3] as const) {
    const inverse = ((4 - turn) % 4) as 0 | 1 | 2 | 3;
    const p = unturnPoint(0.2, 0.7, turn),
      again = unturnPoint(p.x, p.y, inverse);
    expect(again.x).toBeCloseTo(0.2);
    expect(again.y).toBeCloseTo(0.7);
    const f = {
      face: b,
      eyes: { ...b, top: 0.25 },
      nose: { ...b, top: 0.4 },
      mouth: { ...b, top: 0.5 },
    };
    const recovered = unturnFaces(unturnFaces([f], turn), inverse)[0];
    for (const key of ["face", "eyes", "nose", "mouth"] as const)
      for (const coord of ["left", "top", "width", "height"] as const)
        expect(recovered[key][coord]).toBeCloseTo(f[key][coord]);
  }
});
it("rotates non-square confidence masks exactly using pixel centers, without merging or losing people", () => {
  const original = {
    width: 3,
    height: 2,
    values: Float32Array.from([0, 0.1, 0.2, 0.3, 0.4, 1]),
  };
  for (const turn of [0, 1, 2, 3] as const) {
    const inverse = ((4 - turn) % 4) as 0 | 1 | 2 | 3;
    const rotated = unturnMask(original, turn);
    expect(rotated.width).toBe(turn % 2 ? 2 : 3);
    expect(rotated.height).toBe(turn % 2 ? 3 : 2);
    expect(unturnMask(rotated, inverse)).toEqual(original);
  }
  expect(Array.from(unturnMask(original, 2).values)).toEqual(
    Array.from(original.values).reverse(),
  );
});
