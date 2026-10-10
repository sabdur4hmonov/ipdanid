import { expect, it } from "vitest";
import { integerStrandMove } from "../scripts/integer-strand-search";
it("finds the exact bounded optimum even for a non-unimodal objective", () => {
  const values = new Map([
    [-3, 2],
    [-2, 12],
    [-1, 1],
    [1, 4],
    [2, 5],
    [3, 30],
    [4, 2],
  ]);
  const visited: number[] = [];
  expect(
    integerStrandMove(-3, 4, (d) => {
      visited.push(d);
      return values.get(d)!;
    }),
  ).toEqual({ delta: 3, gain: 30 });
  expect(visited).toEqual([-3, -2, -1, 1, 2, 3, 4]);
  expect(integerStrandMove(-32, 32, () => -1)).toEqual({ delta: 0, gain: 0 });
  expect(integerStrandMove(-2, 2, () => 4)).toEqual({ delta: -1, gain: 4 });
});
it("refuses out-of-guard counts, invalid objectives and cancellation", () => {
  for (const [a, b] of [
    [-33, 32],
    [-32, 33],
    [1, 2],
    [-2, -1],
    [-1.5, 2],
  ])
    expect(() => integerStrandMove(a, b, () => 1)).toThrow();
  expect(() => integerStrandMove(-1, 1, () => NaN)).toThrow("objective");
  expect(() =>
    integerStrandMove(
      -1,
      1,
      () => 1,
      () => true,
    ),
  ).toThrow("cancelled");
});
