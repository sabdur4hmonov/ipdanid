import { expect, test } from "vitest";
import {
  reverseRouteInterval,
  routeDegrees,
  continuousTwoOpt,
} from "../scripts/continuous-two-opt";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
const edges = (p: number[]) =>
  p
    .slice(1)
    .map((b, k) => [p[k], b].sort((a, b) => a - b).join("-"))
    .sort();
test("two-edge reversal preserves every incident degree, endpoints and exactly the two changed chords", () => {
  const p = [0, 1, 2, 3, 4, 5, 6],
    before = routeDegrees(p, 7);
  reverseRouteInterval(p, 1, 4);
  expect(p).toEqual([0, 1, 4, 3, 2, 5, 6]);
  expect(routeDegrees(p, 7)).toEqual(before);
  expect(edges(p)).toEqual(["0-1", "1-4", "2-3", "2-5", "3-4", "5-6"]);
  reverseRouteInterval(p, 1, 4);
  expect(p).toEqual([0, 1, 2, 3, 4, 5, 6]);
});
test("nonlocal reversals retain all240pin degrees even on routes revisiting pins", () => {
  const p = Array.from({ length: 3001 }, (_, k) => (k * 71) % 240),
    original = [...p],
    degrees = routeDegrees(p, 240);
  for (let k = 0; k < 100; k++) {
    const i = (k * 23) % 2000,
      j = i + 2 + ((k * 13) % 900);
    reverseRouteInterval(p, i, j);
  }
  expect(p[0]).toBe(original[0]);
  expect(p.at(-1)).toBe(original.at(-1));
  expect(p).toHaveLength(3001);
  expect(routeDegrees(p, 240)).toEqual(degrees);
});
test("research entry rejects malformed and repeated-edge parents instead of publishing them as old guides", () => {
  for (const [i, j] of [
    [-1, 3],
    [0, 1],
    [1, 7],
    [0.2, 4],
  ])
    expect(() => reverseRouteInterval([0, 1, 2, 3, 4, 5, 6], i, j)).toThrow(
      "cuts",
    );
  const profile = standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
    p = new Array(3001).fill(0);
  expect(() =>
    continuousTwoOpt(
      profile,
      p,
      new Float32Array(25600),
      new Float32Array(25600),
      [{ left: 0.2, top: 0.2, width: 0.4, height: 0.5 }],
    ),
  ).toThrow("parent");
  expect(p.every((x) => x === 0)).toBe(true);
});
