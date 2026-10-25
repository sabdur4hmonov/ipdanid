import { expect, test } from "vitest";
import {
  ExactChordScores,
  researchLookahead,
} from "../scripts/chord-lookahead";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
  squareChordExcluded,
} from "../src/core/classic-least-squares";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
} from "../src/core/standard-kit";
import { connectionAllowed } from "../src/core/geometry";

test("exact cached mean scores match full recomputation after intersecting Float32 updates", () => {
  const chords = [
    Int32Array.of(0, 1, 3),
    Int32Array.of(1, 2, 4),
    Int32Array.of(0, 3, 4),
    undefined,
  ];
  const err = Float32Array.of(0.99, 0.2, 0.4, -0.3, 0.7),
    dd = Float64Array.of(0.08, 0.11, 0.12, 0.16, 0.15);
  const cache = new ExactChordScores(chords, err, dd);
  const direct = (key: number, residual: Float32Array) =>
    chords[key]!.reduce((s, p) => s + dd[p] * (2 * residual[p] - dd[p]), 0) /
    chords[key]!.length;
  for (let step = 0; step < 40; step++) {
    const key = step % 3,
      before = err.slice(),
      hypothetical = err.slice();
    for (const p of chords[key]!) hypothetical[p] -= dd[p];
    cache.hypothetical(key);
    for (let next = 0; next < 3; next++) {
      expect(cache.score(next)).toBeCloseTo(direct(next, before), 12);
      expect(cache.scoreAfterHypothetical(next)).toBeCloseTo(
        direct(next, hypothetical),
        12,
      );
    }
    expect(err).toEqual(before);
    cache.apply(key);
    expect(err).toEqual(hypothetical);
  }
});

test("hypothetical generations do not leak overlapping deltas between alternatives", () => {
  const cache = new ExactChordScores(
    [Int32Array.of(0, 1), Int32Array.of(1, 2), Int32Array.of(3)],
    new Float32Array(4).fill(0.5),
    new Float64Array(4).fill(0.08),
  );
  cache.hypothetical(0);
  expect(cache.scoreAfterHypothetical(1)).toBeLessThan(cache.score(1));
  cache.hypothetical(2);
  expect(cache.scoreAfterHypothetical(1)).toBe(cache.score(1));
});

for (const raw of standardProfiles(structuredClone(DEFAULT_STANDARD_KIT)))
  test(`research cache reproduces production greedy and lookahead remains legal: ${raw.shape}`, async () => {
    const profile = leastSquaresProfile(raw, true),
      n = 64,
      pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) =>
        Math.round(50 + 200 * ((Math.floor(k / 3) % n) / n)),
      );
    const baseline = await generateClassicLeastSquares({
      profile,
      pixels,
      resolution: n,
      lines: 320,
      mode: "dark",
    });
    const control = researchLookahead(profile, pixels, n, 320, [], {
      greedyControl: true,
    });
    expect(control.path).toEqual(baseline.segments[0].path);
    const result = researchLookahead(profile, pixels, n, 320, []),
      used = new Set<number>(),
      degrees = new Uint16Array(240);
    expect(result.path).toHaveLength(321);
    for (let j = 1; j < result.path.length; j++) {
      const a = result.path[j - 1],
        b = result.path[j],
        key = Math.min(a, b) * 240 + Math.max(a, b);
      expect(used.has(key)).toBe(false);
      used.add(key);
      degrees[a]++;
      degrees[b]++;
      expect(
        Math.min(Math.abs(a - b), 240 - Math.abs(a - b)),
      ).toBeGreaterThanOrEqual(25);
      expect(connectionAllowed(profile, a, b)).toBe(true);
      expect(squareChordExcluded(profile, a, b)).toBe(false);
    }
    expect(Math.max(...degrees)).toBeLessThanOrEqual(160);
    expect(result.maxCrossing).toBeLessThanOrEqual(8);
    expect(() =>
      researchLookahead(profile, pixels, n, 320, [], { cancelled: () => true }),
    ).toThrow("Cancelled");
  });
