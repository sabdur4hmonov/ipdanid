import { it, expect } from "vitest";
import { createProfile } from "../src/core/geometry";
import { withPinBasis } from "../src/core/pin-basis";
import { generateDensity } from "../src/core/density";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import {
  PhysicalContrast,
  defaultPhysicalContrast,
  physicalOffset,
} from "../src/core/physical-contrast";
import { validateInstruction } from "../src/core/validation";
const profile = withPinBasis(
  { ...createProfile("circle", 240), threadMm: 0.1 },
  240,
);
const tuning = {
  resolved: true,
  physical: defaultPhysicalContrast(),
  edgeWeight: 2,
  sweeps: 1,
};
it("resolved sampling cannot reuse old-grid state or silently enable larger legacy resolution; cancellation still aborts", async () => {
  const options = {
    profile,
    pixels: new Uint8Array(320 * 320 * 3).fill(200),
    resolution: 320,
    lines: 100,
    mode: "dark" as const,
    portrait: { ...DEFAULT_PORTRAIT, enabled: true },
    cancelled: () => true,
  };
  await expect(generateDensity(options, tuning)).rejects.toMatchObject({
    name: "AbortError",
  });
  await expect(
    generateDensity(options, { ...tuning, resolved: false }),
  ).rejects.toThrow("bounded");
  await expect(
    generateDensity({ ...options, resolution: 160 }, tuning),
  ).rejects.toThrow("separate 320");
  await expect(
    generateDensity(
      { ...options, profile: createProfile("circle", 240) },
      tuning,
    ),
  ).rejects.toThrow("separate 320");
}, 30000);
it("new provenance is mandatory and older algorithms cannot carry it", async () => {
  const old = await generateDensity(
    {
      profile,
      pixels: new Uint8Array(32 * 32 * 3).fill(200),
      resolution: 32,
      lines: 100,
      mode: "dark",
      portrait: { ...DEFAULT_PORTRAIT, enabled: true },
    },
    { edgeWeight: 2, sweeps: 1, physical: defaultPhysicalContrast() },
  );
  const unbound = structuredClone(old);
  unbound.params.optimization!.sampling = {
    version: "direct-source320/1",
    grid: 320,
  };
  await expect(validateInstruction(unbound)).rejects.toThrow(
    "Unbound resolved",
  );
  const missing = structuredClone(old);
  missing.algorithm = "density-resolved/12";
  await expect(validateInstruction(missing)).rejects.toThrow(
    "resolved sampling",
  );
  const larger = structuredClone(old);
  larger.params.resolution = 320;
  await expect(validateInstruction(larger)).rejects.toThrow(
    "generation parameters",
  );
}, 30000);
it("320-grid physical distances are interpolated with correct sample-center scales; sparse gain equals full loss", () => {
  const n = 320,
    size = n * n,
    mask = new Uint8Array(size),
    importance = new Float64Array(size).fill(1),
    target = new Float64Array(size),
    density = new Float64Array(size).fill(0.8);
  for (let y = 130; y < 160; y++)
    for (let x = 130; x < 160; x++) {
      const i = y * n + x;
      mask[i] = 1;
      target[i] = 0.4 + 0.01 * Math.sin(x + y);
    }
  const contrast = new PhysicalContrast(
    n,
    { widthMm: 400, heightMm: 600 },
    mask,
    importance,
    2,
    defaultPhysicalContrast(),
  );
  expect(physicalOffset(400 / 159, 400, n)).toBeCloseTo(319 / 159, 12);
  expect(physicalOffset(400 / 159, 600, n)).toBeCloseTo(
    ((319 / 159) * 2) / 3,
    12,
  );
  const change = new Float64Array(size),
    marks = new Uint32Array(size),
    changed = Uint32Array.from([145 * n + 145, 146 * n + 145]);
  for (const i of changed) {
    change[i] = -0.025;
    marks[i] = 1;
  }
  const a = contrast.objective(
    Float64Array.from(density, (v, i) => v - target[i]),
  );
  const gain = contrast.gain(density, target, change, marks, 1, changed);
  const b = contrast.objective(
    Float64Array.from(density, (v, i) => v + change[i] - target[i]),
  );
  expect(gain).toBeCloseTo(a - b, 10);
});
