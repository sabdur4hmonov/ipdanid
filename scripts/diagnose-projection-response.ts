// Procedural measurement ONLY. No fit, owner image, parameter sweep or new renderer.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
} from "../src/core/standard-kit";
import { leastSquaresProfile } from "../src/core/classic-least-squares";
import {
  classicFrame,
  classicPins,
  referenceRaster,
} from "../src/core/classic-reference";
import { connectionAllowed } from "../src/core/geometry";
import { frozenReferenceRaster } from "../tests/helpers/frozen-classic-raster";
import {
  projectionChord,
  stripeResponse,
  PROJECTION_CIRCLE,
} from "./projection-circle";
import type { Instruction } from "../src/core/types";
const out = "output/competitor-qbrix-china-20261027/",
  probes = [
    [0, 60],
    [0, 90],
    [0, 120],
  ] as const;
assert(
  !existsSync(out + "operator-grid-diagnosis.json"),
  "Completed grid-matched measurement is sealed",
);
mkdirSync(out, { recursive: true });
writeFileSync(
  out + "operator-grid-protocol.json",
  JSON.stringify(
    {
      version: "single-strand-projection-diagnosis/2",
      probes,
      grid: 500,
      physicalPreview: 1000,
      pins: 240,
      frameMm: 460,
      threadMm: 0.12,
      opacity: 0.9,
      fit: false,
      photoInput: false,
      projectionConstants: PROJECTION_CIRCLE,
      measurement:
        "Midpoint/bilinear average darkness on both native1000 rendering and its exact2x2area-downsample to the solver's500grid. No quantization or compositing changes. Original500pin coordinates used for solver-grid measurement.",
      nativeComparisonCaveat:
        "A native1000-to500kernel comparison alone is not a same-grid conclusion. The earlier local operator-diagnosis.json is separate and is not an input dependency.",
    },
    null,
    2,
  ),
);
const profile = leastSquaresProfile(
    standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
    true,
  ),
  pins = classicPins(profile, 500),
  center = 249.5,
  radius = 248.5,
  unit = pins.map((p) => ({
    x: (p.x - center) / radius,
    y: (p.y - center) / radius,
  }));
assert.equal(profile.opacity, 0.9);
assert.equal(profile.threadMm, 0.12);
assert.equal(profile.shape, "circle");
assert.equal(profile.pins.length, 240);
assert.equal(classicFrame(profile).mm, 460);
const began = performance.now();
const measurements = probes.map(([a, b]) => {
  assert(
    Math.min(Math.abs(a - b), 240 - Math.abs(a - b)) >= 25 &&
      connectionAllowed(profile, a, b),
  );
  // Physical evaluator fields only. This object is never saved as an Instruction.
  const i = {
    profile,
    params: { resolution: 500 },
    metrics: { lines: 1 },
    segments: [{ color: "#000000", path: [a, b] }],
  } as Instruction;
  const rgb = referenceRaster(i, 1000),
    old = frozenReferenceRaster(i, 1000);
  assert(
    Buffer.from(rgb.buffer).equals(Buffer.from(old.buffer)),
    "Frozen physical basis changed",
  );
  // The actual renderer scales its 500px coordinates by2; classicPins(1000)
  // has different margins and must NOT be substituted for these coordinates.
  const u = { x: pins[a].x * 2, y: pins[a].y * 2 },
    v = { x: pins[b].x * 2, y: pins[b].y * 2 },
    steps = Math.ceil(Math.hypot(v.x - u.x, v.y - u.y));
  const average = (
    from: { x: number; y: number },
    to: { x: number; y: number },
    value: (x: number, y: number) => number,
  ) => {
    const samples = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y));
    let sum = 0;
    for (let k = 0; k < samples; k++) {
      const t = (k + 0.5) / samples,
        x = from.x + (to.x - from.x) * t,
        y = from.y + (to.y - from.y) * t,
        ix = Math.floor(x),
        iy = Math.floor(y),
        fx = x - ix,
        fy = y - iy;
      sum +=
        1 -
        ((1 - fx) * (1 - fy) * value(ix, iy) +
          fx * (1 - fy) * value(ix + 1, iy) +
          (1 - fx) * fy * value(ix, iy + 1) +
          fx * fy * value(ix + 1, iy + 1));
    }
    return sum / samples;
  };
  const reduced = new Float64Array(500 * 500);
  for (let y = 0; y < 500; y++)
    for (let x = 0; x < 500; x++) {
      const at = (2 * y * 1000 + 2 * x) * 3;
      reduced[y * 500 + x] =
        (rgb[at] + rgb[at + 3] + rgb[at + 3000] + rgb[at + 3003]) / 4;
    }
  const native = average(u, v, (x, y) => rgb[(y * 1000 + x) * 3]),
    actual = average(pins[a], pins[b], (x, y) => reduced[y * 500 + x]),
    c = projectionChord(unit[a], unit[b]),
    predicted = stripeResponse(c, c);
  assert(Number.isFinite(actual) && actual > 0 && actual < 1);
  assert(Math.abs(predicted - 0.036) < 1e-12);
  return {
    pins: [a, b],
    native1000Samples: steps,
    predictedMeanDarkness: predicted,
    sourceGrid500PhysicalMeanDarkness: actual,
    sourceGrid500Ratio: actual / predicted,
    native1000PhysicalMeanDarkness: native,
    frozenFloat32Exact: true,
  };
});
const result = {
  version: "single-strand-projection-diagnosis/2",
  measurements,
  measurementMs: performance.now() - began,
  verdict:
    "Published fixed projection response is not calibrated to our existing physical renderer.",
  scope:
    "Three fixed procedural single-strand fixtures. This is a surrogate/display mismatch, not measured real-board optics, source-MATLAB parity or proof of the sole cause of portrait quality loss.",
  fitExecuted: false,
  ownerImageRead: false,
  kernelRetuned: false,
  appChanged: false,
  defaultChanged: false,
  newPortraitTrialAuthorizedByMeasurement: false,
};
writeFileSync(
  out + "operator-grid-diagnosis.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
