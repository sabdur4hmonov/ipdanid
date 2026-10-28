import { test, expect } from "vitest";
import { reviewedKitPins } from "../server/generation-pins";
import { leastSquaresProfile } from "../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
  validateStandardProfile,
} from "../src/core/standard-kit";
const profile = leastSquaresProfile(
  standardProfiles(DEFAULT_STANDARD_KIT)[0],
  true,
);
function snapshot() {
  return {
    version: "kit-pin-snapshot/1",
    coordinates: profile.pins.map((p) => [p.x, p.y]),
  };
}
test("only runtime rounding of the same reviewed holes is retained verbatim; server IDs/sectors/materials remain authoritative", () => {
  const s = snapshot();
  s.coordinates[21][1] += Number.EPSILON;
  const result = reviewedKitPins(profile, s);
  expect(result.pins[21].y).toBe(s.coordinates[21][1]);
  expect(result.pins[21].y).not.toBe(profile.pins[21].y);
  expect(
    result.pins.map(({ id, sectorLabel }) => ({ id, sectorLabel })),
  ).toEqual(profile.pins.map(({ id, sectorLabel }) => ({ id, sectorLabel })));
  expect(result.standardKit).toEqual(profile.standardKit);
  expect(result.threadMm).toBe(profile.threadMm);
  validateStandardProfile(result);
  expect(reviewedKitPins(profile, undefined)).toBe(profile);
});
test("reject displacement beyond the fixed absolute epsilon band, reordered/short/malformed arrays and metadata injection", () => {
  for (const mutate of [
    (s: ReturnType<typeof snapshot>) => {
      s.coordinates[21][1] += 9 * Number.EPSILON;
    },
    (s: ReturnType<typeof snapshot>) => {
      s.coordinates[21][1] += 1e-12;
    },
    (s: ReturnType<typeof snapshot>) => {
      s.coordinates[0][0] = NaN;
    },
    (s: ReturnType<typeof snapshot>) => {
      s.coordinates[0][0] = Infinity;
    },
    (s: ReturnType<typeof snapshot>) => {
      s.coordinates.reverse();
    },
    (s: ReturnType<typeof snapshot>) => {
      s.coordinates.pop();
    },
    (s: ReturnType<typeof snapshot>) => {
      s.coordinates[0].push(0.5);
    },
    (s: ReturnType<typeof snapshot>) => {
      Object.assign(s, { opacity: 0.1 });
    },
    (s: ReturnType<typeof snapshot>) => {
      Object.assign(s, { version: "arbitrary-layout" });
    },
  ]) {
    const s = snapshot();
    mutate(s);
    expect(() => reviewedKitPins(profile, s)).toThrow();
  }
});
