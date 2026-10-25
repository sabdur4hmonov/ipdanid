import { expect, test } from "vitest";
import { globalChordDiagnostic } from "../scripts/global-chord-diagnostic";
import { leastSquaresProfile } from "../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { connectionAllowed } from "../src/core/geometry";
test("unrouted diagnostic keeps actual unique legal chords and reports graph topology honestly", () => {
  const p = leastSquaresProfile(
      standardProfiles(DEFAULT_STANDARD_KIT)[2],
      true,
    ),
    pixels = Uint8Array.from({ length: 32 * 32 * 3 }, (_, k) => 40 + (k % 180));
  const r = globalChordDiagnostic(p, pixels, 32, 120, []),
    seen = new Set<number>(),
    degree = new Uint16Array(240);
  expect(r.edges.length).toBe(120);
  for (const [a, b] of r.edges) {
    const k = a * 240 + b;
    expect(seen.has(k)).toBe(false);
    seen.add(k);
    expect(connectionAllowed(p, a, b)).toBe(true);
    expect(Math.min(b - a, 240 - b + a)).toBeGreaterThanOrEqual(25);
    degree[a]++;
    degree[b]++;
  }
  expect(r.oddVertices).toBe(Array.from(degree).filter((v) => v % 2).length);
  expect(r.components).toBeGreaterThan(0);
  expect(r.maxDegree).toBe(Math.max(...degree));
  expect(() =>
    globalChordDiagnostic(p, pixels, 32, 120, [], () => true),
  ).toThrow("Cancelled");
});
