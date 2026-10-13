import { expect, it } from "vitest";
import {
  headImportance,
  mappedHeadImportance,
  validHeadImportance,
  type HeadImportance,
} from "../src/core/head-importance";
import { targetToSource } from "../src/core/coordinates";
import { DEFAULT_EDITS } from "../src/core/types";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { anatomicalImportance } from "../src/core/anatomical-importance";
import { generateDensity } from "../src/core/density";
import { createProfile } from "../src/core/geometry";
import { withPinBasis } from "../src/core/pin-basis";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";

const selection: HeadImportance = {
  version: "manual-head-importance/1",
  reference: "processed-target/sample-centers-v1",
  points: [
    { x: 0.2, y: 0.2 },
    { x: 0.5, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 0.8, y: 0.8 },
    { x: 0.5, y: 0.8 },
    { x: 0.2, y: 0.8 },
  ],
  weight: 8,
  featherMm: 4,
};
it("head importance preserves eye/nose/lip priority and tapers in physical millimeters on both board axes", () => {
  const weight = headImportance(() => 1, selection, {
    widthMm: 400,
    heightMm: 600,
  });
  expect(weight(0.5, 0.5)).toBe(8);
  expect(weight(0.1, 0.5)).toBe(1);
  expect(weight(0.2 + 2 / 400, 0.5)).toBeCloseTo(4.5, 10);
  expect(weight(0.5, 0.2 + 2 / 600)).toBeCloseTo(4.5, 10);
  const portrait = structuredClone(DEFAULT_PORTRAIT),
    base = anatomicalImportance(portrait),
    w = headImportance(base, selection, { widthMm: 400, heightMm: 400 });
  for (const [x, y] of [
    [0.5, 0.5],
    [0.5, 0.6],
    [0.5, 0.7],
    [0.1, 0.1],
  ])
    expect(w(x, y)).toBeGreaterThanOrEqual(base(x, y));
});
it("source head mapping uses the same pixel centers, pan/zoom/rotation and aspect as photograph preparation", () => {
  for (const n of [160, 192, 320])
    for (const aspect of [1, 1.4]) {
      const edits = {
        ...DEFAULT_EDITS,
        zoom: 1.4,
        panX: 0.02,
        panY: -0.03,
        rotation: 8,
      };
      const source = selection.points.map((p) => {
        const s = targetToSource(p.x, p.y, 960, 1280, edits, aspect, n);
        return { x: s.x / 960, y: s.y / 1280 };
      });
      const target = mappedHeadImportance(source, edits, 960, 1280, aspect, n);
      target.points.forEach((p, k) => {
        expect(p.x).toBeCloseTo(selection.points[k].x, 12);
        expect(p.y).toBeCloseTo(selection.points[k].y, 12);
      });
    }
  expect(() =>
    mappedHeadImportance(
      selection.points,
      { ...DEFAULT_EDITS, panX: 2 },
      960,
      1280,
      1,
      320,
    ),
  ).toThrow();
  expect(() => validHeadImportance({ ...selection, weight: 9 })).toThrow();
  expect(() =>
    validHeadImportance({
      ...selection,
      points: [...selection.points]
        .reverse()
        .map((p, k) => (k === 1 ? selection.points[0] : p)),
    }),
  ).toThrow();
});
it("unbound old engines and proportional anatomy cannot enable head optimization; bounded new work remains cancellable", async () => {
  const profile = withPinBasis(
      { ...createProfile("circle", 240), threadMm: 0.1 },
      240,
    ),
    portrait = { ...structuredClone(DEFAULT_PORTRAIT), enabled: true };
  const options = {
      profile,
      pixels: new Uint8Array(320 * 320 * 3).fill(200),
      resolution: 320,
      lines: 100,
      mode: "dark" as const,
      portrait,
      cancelled: () => true,
    },
    tuning = {
      resolved: true,
      head: selection,
      edgeWeight: 2,
      sweeps: 1,
      physical: defaultPhysicalContrast(),
    };
  await expect(generateDensity(options, tuning)).rejects.toThrow(
    "manual regions",
  );
  portrait.regions = {
    reference: selection.reference,
    placement: "manual",
    eyes: { left: 0.3, top: 0.4, width: 0.4, height: 0.1 },
    nose: { left: 0.4, top: 0.5, width: 0.2, height: 0.1 },
    mouth: { left: 0.4, top: 0.65, width: 0.2, height: 0.1 },
  };
  await expect(
    generateDensity(options, { ...tuning, resolved: false }),
  ).rejects.toThrow("separate resolved");
  await expect(generateDensity(options, tuning)).rejects.toMatchObject({
    name: "AbortError",
  });
}, 30000);
