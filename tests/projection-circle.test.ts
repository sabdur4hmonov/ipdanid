import { expect, test } from "vitest";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
} from "../src/core/standard-kit";
import { connectionAllowed } from "../src/core/geometry";
import {
  generateProjectionCircle,
  normalizedChordDarkness,
  projectionChord,
  stripeResponse,
  PROJECTION_CIRCLE,
} from "../scripts/projection-circle";

test("analytic stripe adaptation agrees with the independent published division form", () => {
  const p = PROJECTION_CIRCLE;
  for (let k = 0; k < 60; k++) {
    const angle = (v: number) => ({ x: Math.cos(v), y: Math.sin(v) }),
      a = projectionChord(angle(k * 0.17), angle(k * 0.17 + 1.4)),
      b = projectionChord(angle(k * 0.23 + 0.1), angle(k * 0.23 + 2.1)),
      alpha = Math.atan2(a.ny, a.nx),
      alpha0 = Math.atan2(b.ny, b.nx),
      region = (t: number) =>
        (a.s ** 2 + b.s ** 2 - 2 * a.s * b.s * Math.cos(alpha - alpha0)) /
          (Math.sin(alpha - alpha0) ** 2 + (t / 2) ** 2) -
        1;
    let mask = region(p.tStart) < 0 ? 1 : 0;
    for (let i = 0; i < 3; i++) {
      const low = p.tStart + ((p.tEnd - p.tStart) * i) / 3,
        high = p.tStart + ((p.tEnd - p.tStart) * (i + 1)) / 3;
      if (region(low) > 0 && region(high) < 0)
        mask = (p.tEnd - low) / (p.tEnd - p.tStart);
    }
    const expected =
      (mask * p.d * p.pMin) /
      ((p.d * a.length - p.pMin) * Math.abs(Math.sin(alpha - alpha0)) + p.pMin);
    expect(stripeResponse(a, b)).toBeCloseTo(expected, 11);
    expect(
      stripeResponse({ ...a, nx: -a.nx, ny: -a.ny, s: -a.s }, b),
    ).toBeCloseTo(expected, 11);
  }
});

test("normalized chord quadrature matches constant and affine source integrals", () => {
  const n = 64,
    pixels = new Uint8Array(n * n * 3).fill(102),
    a = { x: 2.2, y: 3.1 };
  for (const b of [
    { x: 51.8, y: 49.7 },
    { x: 10.4, y: 7.3 },
  ])
    expect(normalizedChordDarkness(pixels, n, a, b)).toBeCloseTo(0.6, 12);
  const affine = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
    const pixel = Math.floor(k / 3);
    return 2 * (pixel % n) + Math.floor(pixel / n);
  });
  const b = { x: 51.8, y: 49.7 },
    exact = 1 - (a.x + b.x + (a.y + b.y) / 2) / 255;
  expect(normalizedChordDarkness(affine, n, a, b)).toBeCloseTo(exact, 12);
});

test("parallel stripes preserve the published plateau, two fade levels and finite support", () => {
  const selected = { nx: 0, ny: 1, s: 0.2, length: 1.8 };
  for (const [delta, mask] of [
    [0.0001, 1],
    [0.002, 1],
    [0.004, 2 / 3],
    [0.0065, 1 / 3],
    [0.01, 0],
  ])
    expect(
      stripeResponse({ ...selected, s: selected.s + delta }, selected),
    ).toBeCloseTo(PROJECTION_CIRCLE.d * mask, 11);
});

const profile = () =>
  standardProfiles({ ...structuredClone(DEFAULT_STANDARD_KIT), nails: 64 })[0];
test("fixed-budget projection path is deterministic, continuous, unique and respects kit guards", () => {
  const p = profile(),
    n = 64,
    pixels = new Uint8Array(n * n * 3).fill(128),
    a = generateProjectionCircle(p, pixels, n, { lines: 40 }),
    b = generateProjectionCircle(p, pixels, n, { lines: 40 });
  expect(a.complete).toBe(true);
  expect(a.path).toEqual(b.path);
  expect(a.importable).toBe(false);
  const used = new Set<string>(),
    degree = new Uint16Array(64);
  for (let k = 1; k < a.path.length; k++) {
    const x = a.path[k - 1],
      y = a.path[k],
      gap = Math.abs(x - y),
      key = [x, y].sort((u, v) => u - v).join(":");
    expect(Math.min(gap, 64 - gap)).toBeGreaterThanOrEqual(25);
    expect(connectionAllowed(p, x, y)).toBe(true);
    expect(used.has(key)).toBe(false);
    used.add(key);
    degree[x]++;
    degree[y]++;
  }
  expect(Math.max(...degree)).toBe(a.metrics.maxIncident);
});

test("a saturated current pin stops instead of teleporting to fill the budget", () => {
  const r = generateProjectionCircle(
    profile(),
    new Uint8Array(64 * 64 * 3),
    64,
    { lines: 40, maxIncident: 1 },
  );
  expect(r.complete).toBe(false);
  expect(r.path).toHaveLength(2);
  expect(r.reason).toBe("no-legal-continuation");
});

test("negative projection scores do not invoke the author's disabled early stop", () => {
  const r = generateProjectionCircle(
    profile(),
    new Uint8Array(64 * 64 * 3).fill(255),
    64,
    { lines: 30 },
  );
  expect(r.complete).toBe(true);
  expect(r.metrics.thresholdCrossingAt).toBe(0);
  expect(r.metrics.minimumSelectedScore).toBeLessThan(0);
});

test("cancellation and malformed input are refused before publishing a route", () => {
  const p = profile(),
    pixels = new Uint8Array(64 * 64 * 3);
  expect(() =>
    generateProjectionCircle(p, pixels, 64, { cancelled: () => true }),
  ).toThrow("Cancelled");
  expect(() =>
    generateProjectionCircle({ ...p, shape: "heart" }, pixels, 64),
  ).toThrow("input");
  pixels[0] = 123;
  expect(() => generateProjectionCircle(p, pixels, 64)).toThrow("grayscale");
});
