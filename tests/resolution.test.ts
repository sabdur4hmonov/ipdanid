import { expect, it } from "vitest";
import { generate, hash, sequencePayload } from "../src/core/engine";
import { generateDensity } from "../src/core/density";
import { createProfile } from "../src/core/geometry";
import {
  rasterSequence,
  rasterSequenceAtResolution,
  strandFootprint,
} from "../src/core/optical";
import { DEFAULT_PORTRAIT, contains } from "../src/core/portrait";
import {
  regionPixels,
  displayBox,
  displayToSample,
} from "../src/core/coordinates";
it("physical area is preserved across 160/192 sampling; peak cell alpha can differ", () => {
  const p = createProfile("circle", 240);
  p.threadMm = 0.1;
  for (const [a, b] of [
    [0, 120],
    [14, 85],
    [170, 32],
  ]) {
    const u = p.pins[a],
      v = p.pins[b];
    const mm = Math.hypot((u.x - v.x) * 400, (u.y - v.y) * 400);
    for (const n of [160, 192]) {
      const f = strandFootprint(p, a, b, n);
      const covered =
        (f.alpha.reduce((s, a) => s + a, 0) * 400 * 400) / (n - 1) ** 2;
      expect(covered).toBeCloseTo(p.opacity * 0.1 * mm, 5);
    }
  }
});
it("normalized regions map through actual 192 sample centers and display inversion", () => {
  const b = { left: 0.32, top: 0.655, width: 0.29, height: 0.1 };
  for (const n of [160, 192]) {
    const r = regionPixels(b, n),
      d = displayBox(b, n);
    expect(displayToSample(d.left, n)).toBeCloseTo(b.left, 12);
    expect(displayToSample(d.left + d.width, n)).toBeCloseTo(
      b.left + b.width,
      12,
    );
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        expect(contains(b, x / (n - 1), y / (n - 1))).toBe(
          x >= r.left && x <= r.right && y >= r.top && y <= r.bottom,
        );
  }
});
it("common-grid reconstruction uses actual strands, preserves hashes and isolates progress caches; foreign-resolution seeds rejected", async () => {
  const p = createProfile("circle", 48);
  p.threadMm = 0.1;
  const portrait = { ...DEFAULT_PORTRAIT, enabled: true };
  const i = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(160),
    resolution: 32,
    profile: p,
    lines: 20,
    mode: "dark",
    guarded: true,
    portrait,
  });
  const payload = sequencePayload(i),
    own = rasterSequence(i),
    common = rasterSequenceAtResolution(i, 192);
  expect(common).toHaveLength(192 * 192 * 3);
  expect(rasterSequenceAtResolution(i, 32)).toEqual(own);
  expect(rasterSequence(i, 0)[0]).toBeCloseTo(
    parseInt(p.baseColor.slice(1, 3), 16) / 255,
    7,
  );
  expect(rasterSequenceAtResolution(i, 192)).toEqual(common);
  expect(rasterSequence(i)).toEqual(own);
  expect(rasterSequenceAtResolution(i, 512)).toHaveLength(512 * 512 * 3);
  expect(() => rasterSequenceAtResolution(i, 513)).toThrow();
  expect(rasterSequence(i)).toEqual(own);
  expect(sequencePayload(i)).toEqual(payload);
  expect(await hash(sequencePayload(i))).toBe(i.sequenceHash);
  const options = {
    pixels: new Uint8Array(192 * 192 * 3).fill(160),
    resolution: 192,
    profile: p,
    lines: 20,
    mode: "dark" as const,
    guarded: true,
    portrait,
    seed: i,
  };
  await expect(generate(options)).rejects.toThrow();
  await expect(
    generateDensity(options, { edgeWeight: 2, sweeps: 8, multiscale: true }),
  ).rejects.toThrow("same portrait");
  expect(() => rasterSequenceAtResolution(i, 1000)).toThrow();
});
