import { it, expect } from "vitest";
import { Distribution } from "../src/core/distribution";
import { generate } from "../src/core/engine";
import { generateDensity } from "../src/core/density";
import { createProfile, inside } from "../src/core/geometry";
import {
  DEFAULT_PORTRAIT,
  portraitRegions,
  contains,
} from "../src/core/portrait";
import { validateInstruction, toTxt, fromFile } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";

it("preserves the v4 numerical/hash fixture replayed from actual checkpoint 6c128d2 source", async () => {
  const n = 32,
    profile = createProfile("circle", 32);
  profile.threadMm = 0.1;
  const pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
    const i = Math.floor(k / 3);
    return i % n > 10 && i % n < 22 && i / n > 8 && i / n < 25 ? 140 : 230;
  });
  const instruction = await generate({
    pixels,
    resolution: n,
    profile,
    lines: 180,
    mode: "dark",
    portrait: { ...DEFAULT_PORTRAIT, enabled: true },
  });
  expect(instruction.algorithm).toBe("greedy-optical/4");
  expect(instruction.sequenceHash).toBe(
    "c0ed28ac2e6d02eb6fa4a381f7c3f4c4b65a197b676fcb7128d8f363ae819f29",
  );
});

it("counts reversed traversals, simultaneous lookahead and replacement net deltas across segments", () => {
  const d = new Distribution(24);
  for (let j = 0; j < 31; j++) d.apply([[j % 2, 1 - (j % 2)]]);
  expect(d.canChange([[1, 0]])).toBe(true);
  expect(
    d.canChange([
      [1, 0],
      [0, 1],
    ]),
  ).toBe(false);
  d.apply([[1, 0]]);
  expect(d.canChange([[0, 1]])).toBe(false);
  expect(
    d.canChange(
      [
        [0, 2],
        [2, 1],
      ],
      [[0, 1]],
    ),
  ).toBe(true);
  d.apply(
    [
      [0, 2],
      [2, 1],
    ],
    [[0, 1]],
  );
  expect(d.degree[0]).toBe(32);
  expect(d.degree[2]).toBe(2);
  const capacity = new Distribution(24);
  for (let j = 1; j <= 5; j++)
    for (let k = 0; k < 32; k++) capacity.apply([[0, j]]);
  expect(capacity.degree[0]).toBe(160);
  expect(capacity.canChange([[0, 6]])).toBe(false);
  expect(
    capacity.canChange(
      [
        [1, 0],
        [0, 6],
      ],
      [
        [1, 0],
        [0, 2],
      ],
    ),
  ).toBe(true);
  expect(
    capacity.canChange(
      [
        [1, 6],
        [6, 2],
      ],
      [
        [1, 0],
        [0, 2],
      ],
    ),
  ).toBe(true);
  expect(
    () =>
      new Distribution(24, [
        { color: "#000000", path: Array.from({ length: 34 }, (_, k) => k % 2) },
      ]),
  ).toThrow(/guards/);
  expect(
    () =>
      new Distribution(24, [
        { color: "#000000", path: [0, 1] },
        { color: "#ffffff", path: Array.from({ length: 33 }, (_, k) => k % 2) },
      ]),
  ).toThrow(/guards/);
});

it("guarded basis/refinement and multiscale routing retain exact raster, guards, immutable seeds and supply accounting", async () => {
  const n = 32,
    profile = createProfile("circle", 32);
  profile.threadMm = 0.1;
  profile.stockMeters = 0;
  const pixels = Uint8Array.from({ length: n * n * 3 }, (_, k) => {
    const i = Math.floor(k / 3),
      x = i % n,
      y = Math.floor(i / n);
    return x > 10 && x < 22 && y > 9 && y < 25
      ? y === 14 || y === 22
        ? 80
        : 180
      : 230;
  });
  const o = {
    pixels,
    resolution: n,
    profile,
    lines: 800,
    mode: "dark" as const,
    portrait: { ...DEFAULT_PORTRAIT, enabled: true },
    guarded: true,
  };
  const first = await generate(o),
    saved = JSON.stringify(first),
    next = await generate({ ...o, seed: first });
  expect(first.algorithm).toBe("continuous-guarded/6");
  expect(JSON.stringify(first)).toBe(saved);
  expect(next.params.parentSequenceHash).toBe(first.sequenceHash);
  const global = await generateDensity(
    { ...o, seed: next },
    { edgeWeight: 1, sweeps: 2, multiscale: true },
  );
  expect(global.algorithm).toBe("density-multiscale/7");
  expect(global.params.optimization!.contrastScales).toEqual([1, 2, 4]);
  for (const i of [first, next, global]) {
    await validateInstruction(i);
    const d = new Distribution(32, i.segments);
    expect(Math.max(...d.degree)).toBeLessThanOrEqual(160);
    expect(Math.max(...d.pairs.values())).toBeLessThanOrEqual(32);
    expect(i.metrics.stockShortfallMeters).toBe(i.metrics.estimatedMeters);
    const r = rasterSequence(i);
    let e = 0,
      c = 0;
    for (let k = 0; k < n * n; k++)
      if (inside(profile.shape, (k % n) / (n - 1), Math.floor(k / n) / (n - 1)))
        for (let ch = 0; ch < 3; ch++) {
          e += (r[k * 3 + ch] - pixels[k * 3 + ch] / 255) ** 2;
          c++;
        }
    expect(e / c).toBeCloseTo(i.metrics.reconstructionMse, 7);
    expect((await fromFile(toTxt(i))).sequenceHash).toBe(i.sequenceHash);
  }
  expect(
    global.metrics.densityFit!.fittedConnections +
      global.metrics.densityFit!.routingConnections,
  ).toBe(global.metrics.lines);
  // Independently recompute the complete multiscale objective after parity/component routing.
  const actual = rasterSequence(global),
    boxes = portraitRegions(o.portrait);
  const weights = new Float64Array(n * n),
    tone = new Float64Array(n * n),
    target = new Float64Array(n * n);
  let objective = 0,
    weightSum = 0;
  for (let i = 0; i < n * n; i++)
    if (inside(profile.shape, (i % n) / (n - 1), Math.floor(i / n) / (n - 1))) {
      const x = (i % n) / (n - 1),
        y = Math.floor(i / n) / (n - 1);
      weights[i] = ["eyes", "nose", "mouth"].some((k) =>
        contains(boxes[k], x, y),
      )
        ? 16
        : contains(boxes.face, x, y)
          ? 8
          : 1;
      tone[i] = (actual[i * 3] + actual[i * 3 + 1] + actual[i * 3 + 2]) / 3;
      target[i] = (pixels[i * 3] + pixels[i * 3 + 1] + pixels[i * 3 + 2]) / 765;
      const error = tone[i] - target[i],
        overshoot =
          1 + 1.5 * Math.max(0, Math.min(1, (target[i] - 0.35) / 0.45)) ** 2;
      objective += weights[i] * error ** 2 * (error < 0 ? overshoot : 1);
      weightSum += weights[i];
    }
  for (let i = 0; i < n * n; i++)
    if (weights[i])
      for (const step of [1, 2, 4])
        for (const delta of [step, step * n]) {
          const j = i + delta;
          if (
            j < n * n &&
            weights[j] &&
            (delta !== step || (i % n) + step < n)
          ) {
            const error = tone[i] - tone[j] - (target[i] - target[j]);
            objective +=
              (((weights[i] + weights[j]) * 0.5) / (step * step)) * error ** 2;
          }
        }
  expect(global.metrics.weightedError!.final).toBeCloseTo(
    objective / weightSum,
    6,
  );
  const bad = structuredClone(first);
  delete bad.params.optimization!.pairLimit;
  await expect(validateInstruction(bad)).rejects.toThrow(/guards/);
  const supplied = await generate({
    ...o,
    profile: { ...profile, stockMeters: 10000 },
  });
  expect(supplied.segments).toEqual(first.segments);
  let cancelled = false;
  await expect(
    generate({
      ...o,
      onProgress: () => {
        cancelled = true;
      },
      cancelled: () => cancelled,
    }),
  ).rejects.toMatchObject({ name: "AbortError" });
}, 60000);
