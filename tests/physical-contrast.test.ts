import { it, expect } from "vitest";
import {
  PhysicalContrast,
  defaultPhysicalContrast,
  physicalOffset,
} from "../src/core/physical-contrast";
import { generateDensity } from "../src/core/density";
import type { DensityCheckpoint } from "../src/core/density";
import {generate} from '../src/core/engine';
import { createProfile } from "../src/core/geometry";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { validateInstruction, toTxt, fromFile } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";

it("integer reference objective equals v7 forward pairs; fractional sparse gain equals whole-objective change", () => {
  for (const [n, height] of [
    [160, 400],
    [192, 400],
    [192, 600],
  ]) {
    const size = n * n,
      mask = new Uint8Array(size).fill(1),
      w = Float64Array.from({ length: size }, (_, i) => 1 + (i % 7)),
      r = Float64Array.from(
        { length: size },
        (_, i) => Math.sin(i * 0.13) * 0.2,
      ),
      zero = new Float64Array(size);
    mask[34 * n + 34] = 0;
    const op = new PhysicalContrast(
      n,
      { widthMm: 400, heightMm: height },
      mask,
      w,
      2,
      defaultPhysicalContrast(),
    );
    expect(op.legacyEquivalent).toBe(n === 160);
    if (n === 160) {
      let legacy = 0;
      for (let i = 0; i < size; i++)
        if (mask[i])
          for (const d of [1, 2, 4])
            for (const j of [
              (i % n) + d < n ? i + d : -1,
              Math.floor(i / n) + d < n ? i + d * n : -1,
            ])
              if (j >= 0 && mask[j])
                legacy +=
                  (((w[i] + w[j]) * 0.5 * 2) / d ** 2) * (r[i] - r[j]) ** 2;
      expect(op.objective(r)).toBeCloseTo(legacy, 8);
    }
    const sparse = new Float64Array(size),
      marks = new Uint32Array(size),
      indices = Uint32Array.from([32 * n + 32, 32 * n + 33, 33 * n + 34]);
    for (const i of indices) {
      marks[i] = 1;
      sparse[i] = 0.01 * ((i % 5) + 1);
    }
    const gain = op.gain(r, zero, sparse, marks, 1, indices),
      next = Float64Array.from(r, (x, i) => x + sparse[i]);
    expect(gain).toBeCloseTo(op.objective(r) - op.objective(next), 9);
    expect(
      op.a
        .slice(0, op.terms)
        .every((i, t) => mask[i] && mask[op.b[t]] && mask[op.c[t]]),
    ).toBe(true);
  }
  expect(physicalOffset(400 / 159, 400, 192)).toBeCloseTo(191 / 159, 12);
  expect(physicalOffset(400 / 159, 600, 192)).toBeCloseTo(
    ((191 / 159) * 2) / 3,
    12,
  );
});
it("physical version preserves equivalent integer sequence, strict imports, complete routing and cancellation", async () => {
  const n = 32,
    p = createProfile("circle", 32);
  p.threadMm = 0.1;
  p.widthMm = p.heightMm = (400 * 31) / 159;
  const o = {
    pixels: Uint8Array.from(
      { length: n * n * 3 },
      (_, i) => 120 + (Math.floor(i / 3) % 100),
    ),
    resolution: n,
    profile: p,
    lines: 200,
    mode: "dark" as const,
    portrait: { ...DEFAULT_PORTRAIT, enabled: true },
  };
  const legacy = await generateDensity(o, {
    edgeWeight: 2,
    sweeps: 2,
    multiscale: true,
  });
  const physical = await generateDensity(o, {
    edgeWeight: 2,
    sweeps: 2,
    physical: defaultPhysicalContrast(),
  });
  expect(physical.segments).toEqual(legacy.segments);
  expect(physical.sequenceHash).not.toBe(legacy.sequenceHash);
  expect(rasterSequence(physical)).toEqual(rasterSequence(legacy));
  expect(
    physical.metrics.densityFit!.routingPairs!.reduce((s, r) => s + r.count, 0),
  ).toBe(physical.metrics.densityFit!.routingConnections);
  await validateInstruction(physical);
  expect((await fromFile(toTxt(physical))).sequenceHash).toBe(
    physical.sequenceHash,
  );
  const bad = structuredClone(physical);
  bad.params.optimization!.contrastPhysical!.distancesMm[1] = 0;
  await expect(validateInstruction(bad)).rejects.toThrow("physical contrast");
  await expect(
    generateDensity(
      { ...o, cancelled: () => true },
      { edgeWeight: 2, sweeps: 2, physical: defaultPhysicalContrast() },
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
});
it("cancellation at a completed sweep resumes the identical executable route; corrupted/foreign checkpoints refused", async () => {
  const n = 32,
    p = createProfile("circle", 32);
  p.threadMm = 0.1;
  const o = {
    pixels: new Uint8Array(n * n * 3).fill(170),
    resolution: n,
    profile: p,
    lines: 200,
    mode: "dark" as const,
    portrait: { ...DEFAULT_PORTRAIT, enabled: true },
  };
  const tuning = {
    edgeWeight: 2,
    sweeps: 3,
    physical: defaultPhysicalContrast(),
  };
  const seed=await generate({...o,lines:40,guarded:true}),seeded={...o,seed};
  const full = await generateDensity(seeded, tuning);
  let cp: DensityCheckpoint | undefined;
  await expect(
    generateDensity(
      { ...seeded, cancelled: () => !!cp },
      {
        ...tuning,
        onCheckpoint: (s) => {
          cp = s;
        },
      },
    ),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(cp?.sweeps).toBe(1);
  await expect(generateDensity({...seeded,lines:seed.params.requestedLines},{...tuning,resume:cp})).rejects.toThrow('Incompatible');
  const resumed = await generateDensity(seeded, { ...tuning, resume: cp });
  expect(resumed.sequenceHash).toBe(full.sequenceHash);
  expect(resumed.segments).toEqual(full.segments);
  const bad = structuredClone(cp!);
  bad.density[100] *= 0.5;
  await expect(generateDensity(seeded, { ...tuning, resume: bad })).rejects.toThrow(
    "corrupt",
  );
  await expect(
    generateDensity({ ...seeded, lines: 201 }, { ...tuning, resume: cp }),
  ).rejects.toThrow("Incompatible");
});
