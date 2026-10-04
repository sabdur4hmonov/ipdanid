import { it, expect } from "vitest";
import { generateDensity } from "../src/core/density";
import { createProfile, connectionAllowed, inside } from "../src/core/geometry";
import { DEFAULT_PORTRAIT, processPortrait } from "../src/core/portrait";
import { rasterSequence } from "../src/core/optical";
import { validateInstruction, fromFile, toTxt } from "../src/core/validation";
import { MAX_FOOTPRINT_BYTES } from "../src/core/limits";
const n = 48,
  portrait = { ...DEFAULT_PORTRAIT, enabled: true };
const pixels = processPortrait(
  Uint8Array.from({ length: n * n * 3 }, (_, k) => {
    const x = (Math.floor(k / 3) % n) / (n - 1),
      y = Math.floor(k / 3 / n) / (n - 1);
    return ((x - 0.5) / 0.27) ** 2 + ((y - 0.55) / 0.35) ** 2 < 1
      ? y < 0.36
        ? 55
        : (Math.abs(y - 0.47) < 0.025 && Math.abs(x - 0.5) > 0.05) ||
            Math.abs(y - 0.76) < 0.015
          ? 85
          : 200
      : 240;
  }),
  n,
  portrait,
);
function options() {
  const profile = createProfile("circle", 48);
  profile.threadMm = 0.1;
  profile.stockMeters = 1;
  return {
    pixels,
    resolution: n,
    profile,
    lines: 1600,
    mode: "dark" as const,
    portrait,
  };
}
it("reversible global fitting produces deterministic legal routes with routing/length accounting and exact raster error", async () => {
  const o = options(),
    i = await generateDensity(o, { edgeWeight: 0.35, sweeps: 8 });
  await validateInstruction(i);
  expect(i.metrics.densityFit!.removedConnections).toBeGreaterThan(0);
  expect(
    i.metrics.densityFit!.fittedConnections +
      i.metrics.densityFit!.routingConnections,
  ).toBe(i.metrics.lines);
  expect(i.metrics.peakCacheBytes).toBeLessThanOrEqual(MAX_FOOTPRINT_BYTES);
  expect(i.metrics.reconstructionMse).toBeLessThan(i.metrics.baselineMse);
  const path = i.segments[0].path;
  const pairs = new Map<string, number>(),
    degrees = new Array(i.profile.pins.length).fill(0);
  for (let j = 1; j < path.length; j++) {
    const a = path[j - 1],
      b = path[j],
      key = [a, b].sort((a, b) => a - b).join(":");
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
    degrees[a]++;
    degrees[b]++;
  }
  expect(Math.max(...pairs.values())).toBeLessThanOrEqual(32);
  expect(Math.max(...degrees)).toBeLessThanOrEqual(160);
  for (let j = 1; j < path.length; j++)
    expect(connectionAllowed(i.profile, path[j - 1], path[j])).toBe(true);
  expect(path.at(-1)).toBe(path[0]);
  const r = rasterSequence(i);
  let error = 0,
    count = 0;
  for (let k = 0; k < n * n; k++)
    if (inside(i.profile.shape, (k % n) / (n - 1), Math.floor(k / n) / (n - 1)))
      for (let c = 0; c < 3; c++) {
        error += (r[k * 3 + c] - pixels[k * 3 + c] / 255) ** 2;
        count++;
      }
  expect(error / count).toBeCloseTo(i.metrics.reconstructionMse, 10);
  expect(i.metrics.stockShortfallMeters).toBeCloseTo(
    i.metrics.estimatedMeters - 1,
    8,
  );
  const stocked = await generateDensity(
    { ...o, profile: { ...o.profile, stockMeters: 100000 } },
    { edgeWeight: 0.35, sweeps: 8 },
  );
  expect(stocked.segments).toEqual(i.segments);
  expect(stocked.metrics.stockShortfallMeters).toBe(0);
  expect((await fromFile(toTxt(i))).sequenceHash).toBe(i.sequenceHash);
  expect(toTxt(i)).toContain(`tie ${i.segments[0].color} to pin ${path[0]}`);
  expect(toTxt(i)).toContain(`finishing knot at pin ${path.at(-1)}`);
  for (const step of [100, 3, i.metrics.lines])
    expect(rasterSequence(i, step)).toEqual(
      rasterSequence(structuredClone(i), step),
    );
  const bad = structuredClone(i);
  bad.metrics.densityFit!.routingConnections++;
  await expect(validateInstruction(bad)).rejects.toThrow(/accounting/);
  const saved = JSON.stringify(i),
    next = await generateDensity(
      { ...o, seed: i },
      { edgeWeight: 0.35, sweeps: 2 },
    );
  expect(JSON.stringify(i)).toBe(saved);
  expect(next.params.parentSequenceHash).toBe(i.sequenceHash);
  await validateInstruction(next);
}, 60000);
it("global search yields to cancellation and rejects invalid/unrepresentable inputs", async () => {
  const o = options();
  let cancel = false;
  await expect(
    generateDensity({
      ...o,
      onProgress: () => {
        cancel = true;
      },
      cancelled: () => cancel,
    }),
  ).rejects.toMatchObject({ name: "AbortError" });
  await expect(
    generateDensity({ ...o, profile: { ...o.profile, stockMeters: NaN } }),
  ).rejects.toThrow(/material/);
  await expect(
    generateDensity({
      ...o,
      profile: {
        ...createProfile("circle", 24),
        threadMm: 5,
        widthMm: 50,
        heightMm: 50,
        shaftMm: 0.1,
      },
    }),
  ).rejects.toThrow(/subpixel/);
  await expect(generateDensity({ ...o, mode: "color" })).rejects.toThrow(
    /monochrome/,
  );
});
