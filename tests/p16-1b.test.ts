import { expect, test } from "vitest";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
} from "../src/core/standard-kit";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../src/core/classic-least-squares";
import {
  featureMask,
  FeatureScoreCache,
  fitResearch,
  researchGeometry,
  sketchTarget,
  assertResearchRoute,
} from "../scripts/p16-1b/candidates";
import { safety } from "../scripts/p16-1b/review";

const profiles = standardProfiles(structuredClone(DEFAULT_STANDARD_KIT)).map(
  (p) => leastSquaresProfile(p, true),
);
const faces = [{ left: 0.25, top: 0.2, width: 0.5, height: 0.6 }];
const make = (index: number) => ({
  profile: profiles[index],
  resolution: 64,
  lines: 3000,
  mode: "dark" as const,
  pixels: Uint8Array.from({ length: 64 * 64 * 3 }, (_, k) =>
    Math.round(180 + 50 * Math.sin(Math.floor(k / 3) * 0.1)),
  ),
});

test.each([0, 1, 2])(
  "research control is exactly unchanged classic3 and A preserves2550-prefix on shape%d",
  async (index) => {
    const o = make(index),
      geometry = researchGeometry(o.profile, 64);
    const base = await generateClassicLeastSquares(o, geometry);
    const control = await fitResearch(o, undefined, geometry);
    const a = await fitResearch(o, "A", geometry);
    expect(control.path).toEqual(base.segments[0].path);
    expect(a.path.slice(0, 2551)).toEqual(control.path.slice(0, 2551));
    assertResearchRoute(o.profile, a.path);
  },
  30000,
);

test("weighted incremental objective matches independent recomputation without changing Float32 dose", () => {
  const o = make(0),
    g = researchGeometry(o.profile, 64);
  const err = Float32Array.from(
      { length: 4096 },
      (_, k) => 0.3 + Math.sin(k) * 0.2,
    ),
    expected = err.slice();
  const dd = new Float64Array(4096).fill(0.08),
    w = Float32Array.from(featureMask(64, faces, true), (v) => 1 + 3 * v);
  const c = new FeatureScoreCache(g, err, dd, w),
    keys = g.lines.flatMap((l, k) => (l ? [k] : []));
  for (let step = 0; step < 12; step++) {
    const key = keys[step * 113];
    for (const p of g.lines[key]!) expected[p] -= dd[p];
    c.apply(key);
    expect(err).toEqual(expected);
    for (let i = 0; i < 10; i++) {
      const probe = keys[i * 193],
        line = g.lines[probe]!;
      const sum = line.reduce(
        (s, p) => s + w[p] * dd[p] * (2 * expected[p] - dd[p]),
        0,
      );
      expect(c.score(probe)).toBeCloseTo(sum / line.length, 11);
    }
  }
});

test("B only changes nose/eye compact support and is deterministic, without injected contours", () => {
  const n = 64,
    pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) =>
      Math.floor(k / 3) % n < 32 ? 80 : 245,
    );
  const mask = featureMask(n, faces, false),
    out = sketchTarget(pixels, n, faces);
  expect(out).toEqual(sketchTarget(pixels, n, faces));
  expect(out.some((v, k) => v !== pixels[k])).toBe(true);
  for (let k = 0; k < pixels.length; k++)
    if (!mask[Math.floor(k / 3)]) expect(out[k]).toBe(pixels[k]);
  expect(
    sketchTarget(new Uint8Array(pixels.length).fill(255), n, faces),
  ).toEqual(new Uint8Array(pixels.length).fill(255));
});

test.each([0, 1, 2])(
  "C is a distinct deterministic continuous3000 route on shape%d",
  async (index) => {
    const o = make(index),
      g = researchGeometry(o.profile, 64);
    const a = await fitResearch(o, "C", g),
      b = await fitResearch(o, "C", g),
      control = await fitResearch(o, undefined, g);
    expect(a.path).toEqual(b.path);
    expect(a.path).not.toEqual(control.path);
    assertResearchRoute(o.profile, a.path);
    expect(() => assertResearchRoute(o.profile, a.path.slice(1))).toThrow(
      "route-size",
    );
    const repeated = [...a.path];
    repeated[3] = repeated[1];
    expect(() => assertResearchRoute(o.profile, repeated)).toThrow(
      "illegal-chord",
    );
  },
  30000,
);

test("safety is not an improvement gate and rejects face, eyes, mouth, time and missing data independently", () => {
  const base = { face: 0.6, nose: 0.4, eyes: 0.7, mouth: 0.7 };
  const run = (delta: Partial<typeof base>, ratio = 1) =>
    safety([{ baseline: [base], candidate: [{ ...base, ...delta }], ratio }]);
  expect(run({ face: 0.595, nose: 0.39 }).eligible).toBe(true);
  expect(run({ face: 0.589 }).reasons).toContain("average-face-loss-over-0.01");
  expect(run({ eyes: 0.67 }).eligible).toBe(false);
  expect(run({ mouth: 0.67 }).eligible).toBe(false);
  expect(run({}, 1.51).eligible).toBe(false);
  expect(safety([]).eligible).toBe(false);
  expect(run({ face: NaN }).eligible).toBe(false);
});

test("cold single-fit cache omission preserves all three exact routes", async () => {
  const o = make(0),
    g = researchGeometry(o.profile, 64);
  for (const candidate of ["A", "B", "C"] as const) {
    const indexed = await fitResearch(o, candidate, g),
      cold = await fitResearch(o, candidate, false);
    expect(cold.path).toEqual(indexed.path);
  }
}, 30000);
