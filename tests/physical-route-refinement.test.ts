import { test, expect } from "vitest";
import {
  PhysicalRouteObjective,
  ExactViewObjective,
  refinePhysicalRoute,
  physicalScoreImproves,
} from "../scripts/physical-route-refinement";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { referenceRaster } from "../src/core/classic-reference";
import { connectionAllowed } from "../src/core/geometry";
import { frameCustomerHeads } from "../src/core/customer-framing";
import { viewingImage } from "./helpers/viewing-ssim";
test("higher board or average face score cannot hide one person's regression", () => {
  const score = (all: number, ...faces: number[]) => ({
    all: { ssim: all },
    faces: faces.map((ssim) => ({ ssim })),
  });
  const previous = score(0.48, 0.63, 0.63);
  expect(physicalScoreImproves(previous, score(0.49, 0.631, 0.635))).toBe(true);
  expect(physicalScoreImproves(previous, score(0.51, 0.7, 0.62))).toBe(false);
  expect(physicalScoreImproves(previous, score(0.47, 0.7, 0.7))).toBe(false);
  expect(physicalScoreImproves(previous, previous)).toBe(false);
  expect(physicalScoreImproves(previous, score(0.51, 0.7))).toBe(false);
  expect(physicalScoreImproves(previous, score(NaN, 0.7, 0.7))).toBe(false);
  expect(physicalScoreImproves(previous, score(0.51, 0.7, NaN))).toBe(false);
});
test("physical route local delta matches full independent rerender and preserves its parent", async () => {
  const n = 64,
    pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) =>
      Math.floor(k / 3) % n < 32 ? 60 : 245,
    ),
    profile = leastSquaresProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
    );
  const guide = await generateClassicLeastSquares({
    pixels,
    resolution: n,
    profile,
    mode: "dark",
    lines: 120,
  });
  const old = JSON.stringify(guide),
    objective = new PhysicalRouteObjective(guide, pixels, n),
    path = [...guide.segments[0].path],
    a = path[9],
    b = path[10],
    c = path[11],
    d = (b + 37) % 240;
  const before = objective.loss(),
    gain = objective.change(
      [
        [a, b],
        [b, c],
      ],
      [
        [a, d],
        [d, c],
      ],
      true,
    );
  path[10] = d;
  const render = referenceRaster(
    { ...guide, segments: [{ color: "#000000", path }] },
    n,
  );
  let error = 0,
    loss = 0;
  for (let k = 0; k < n * n; k++) {
    error = Math.max(error, Math.abs(objective.image[k] - render[k * 3]));
    loss += (render[k * 3] - pixels[k * 3] / 255) ** 2;
  }
  expect(error).toBeLessThan(2e-6);
  expect(before - gain).toBeCloseTo(loss, 4);
  const refined = await refinePhysicalRoute(guide, pixels, {
    size: n,
    proposals: 700,
  });
  expect(refined.after).toBeLessThanOrEqual(refined.before);
  expect(refined.path).toHaveLength(121);
  expect(refined.path[0]).toBe(guide.segments[0].path[0]);
  expect(refined.path.at(-1)).toBe(guide.segments[0].path.at(-1));
  const used = new Set<string>(),
    degrees = new Uint16Array(240);
  for (let j = 1; j < refined.path.length; j++) {
    const a = refined.path[j - 1],
      b = refined.path[j],
      key = [a, b].sort((a, b) => a - b).join();
    expect(used.has(key)).toBe(false);
    used.add(key);
    expect(connectionAllowed(profile, a, b)).toBe(true);
    expect(
      Math.min(Math.abs(a - b), 240 - Math.abs(a - b)),
    ).toBeGreaterThanOrEqual(25);
    degrees[a]++;
    degrees[b]++;
  }
  expect(Math.max(...degrees)).toBeLessThanOrEqual(160);
  expect(JSON.stringify(guide)).toBe(old);
  await expect(
    refinePhysicalRoute(guide, pixels, { size: n, cancelled: () => true }),
  ).rejects.toThrow("Cancelled");
}, 30000);
test("1000px physical sparse update matches independent full viewing-distance loss", async () => {
  const profile = leastSquaresProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
    ),
    pixels = new Uint8Array(64 * 64 * 3).fill(180);
  const guide = await generateClassicLeastSquares({
      pixels,
      resolution: 64,
      profile,
      mode: "dark",
      lines: 80,
    }),
    target = new Uint8Array(500 * 500 * 3).fill(180),
    objective = new ExactViewObjective(guide, target);
  const path = [...guide.segments[0].path],
    a = path[9],
    b = path[10],
    c = path[11],
    d = (b + 37) % 240;
  const before = objective.loss(),
    gain = objective.change(
      [
        [a, b],
        [b, c],
      ],
      [
        [a, d],
        [d, c],
      ],
      true,
    );
  path[10] = d;
  const render = referenceRaster(
      { ...guide, segments: [{ color: "#000000", path }] },
      1000,
    ),
    view = viewingImage(
      render.filter((_, k) => k % 3 === 0),
      1000,
    ),
    goal = viewingImage(new Float32Array(500 * 500).fill(180 / 255), 500);
  let error = 0;
  for (let k = 0; k < view.length; k++) error += (view[k] - goal[k]) ** 2;
  expect(before - gain).toBeCloseTo(error, 3);
  expect(objective.loss()).toBeCloseTo(error, 3);
}, 30000);
test("viewing refinement preserves each face's independent area-averaged error", async () => {
  const profile = leastSquaresProfile(
    standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
  );
  const transform = frameCustomerHeads(
    [{ left: 0.3, top: 0.2, width: 0.4, height: 0.5 }],
    "circle",
    1,
  );
  const pixels = Uint8Array.from({ length: 64 * 64 * 3 }, (_, k) =>
    Math.floor(k / 3) % 64 < 32 ? 60 : 245,
  );
  const guide = await generateClassicLeastSquares({
    pixels,
    resolution: 64,
    profile,
    mode: "dark",
    lines: 100,
    kitPreparation: {
      version: "standard-preparation/4",
      sourceHash: "0".repeat(64),
      sourceAspect: 1,
      whiteBackground: "automatic",
      transform,
    },
  });
  const target = Uint8Array.from({ length: 500 * 500 * 3 }, (_, k) =>
    Math.floor(k / 3) % 500 < 250 ? 60 : 245,
  );
  const result = await refinePhysicalRoute(guide, target, {
    regionalView: true,
    proposals: 700,
  });
  const before = referenceRaster(guide, 500),
    after = referenceRaster(
      { ...guide, segments: [{ color: "#000000", path: result.path }] },
      500,
    ),
    face = transform.targetFaces![0];
  const error = (rgb: Float32Array) => {
    let sum = 0;
    for (let y = 0; y < 125; y++)
      for (let x = 0; x < 125; x++) {
        if (
          (((x + 0.5) / 125 - face.left - face.width / 2) / (face.width / 2)) **
            2 +
            (((y + 0.5) / 125 - face.top - face.height / 2) /
              (face.height / 2)) **
              2 >
          1
        )
          continue;
        let v = 0,
          t = 0;
        for (let dy = 0; dy < 4; dy++)
          for (let dx = 0; dx < 4; dx++) {
            const k = ((y * 4 + dy) * 500 + x * 4 + dx) * 3;
            v += rgb[k] / 16;
            t += target[k] / 255 / 16;
          }
        sum += (v - t) ** 2;
      }
    return sum;
  };
  expect(error(after)).toBeLessThanOrEqual(error(before) + 1e-5);
  let difference = 0;
  for (let k = 0; k < 500 * 500; k++)
    difference = Math.max(difference, Math.abs(result.image[k] - after[k * 3]));
  expect(difference).toBeLessThan(2e-6);
  expect(result.after).toBeLessThanOrEqual(result.before);
}, 30000);
