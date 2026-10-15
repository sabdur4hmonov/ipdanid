import { describe, it, expect } from "vitest";
import { generateClassic } from "../src/core/classic";
import {
  classicCircleProfile,
  faceFill,
} from "../src/core/standard-preparation";
import { createProfile, inside } from "../src/core/geometry";
import { rasterSequence } from "../src/core/optical";
import { validateInstruction } from "../src/core/validation";

describe("independent classic baseline", () => {
  function options() {
    const profile = {
      ...createProfile("circle", 32),
      baseColor: "#ffffff",
      colors: ["#000000"],
      threadMm: 0.12,
    };
    return {
      profile,
      resolution: 32,
      pixels: Uint8Array.from({ length: 32 * 32 * 3 }, (_, k) => {
        const x = Math.floor(k / 3) % 32,
          y = Math.floor(k / 3 / 32);
        return (x - 16) ** 2 / 70 + (y - 16) ** 2 / 110 < 1 ? 70 : 255;
      }),
      mode: "dark" as const,
      lines: 40,
    };
  }
  it("recovery reproduces the exact uninterrupted guarded physical path", async () => {
    const o = options(),
      prefix = await generateClassic({ ...o, lines: 17 });
    const full = await generateClassic(o),
      resumed = await generateClassic({ ...o, seed: prefix });
    expect(resumed.segments).toEqual(full.segments);
    expect(resumed.sequenceHash).toBe(full.sequenceHash);
    expect(resumed.metrics.estimatedMeters).toBe(full.metrics.estimatedMeters);
    await validateInstruction(resumed);
    const raster = rasterSequence(full);
    let sum = 0,
      count = 0;
    for (let k = 0; k < 32 * 32; k++)
      if (inside("circle", (k % 32) / 31, Math.floor(k / 32) / 31))
        for (let c = 0; c < 3; c++) {
          sum += (raster[k * 3 + c] - o.pixels[k * 3 + c] / 255) ** 2;
          count++;
        }
    // Optimizer target is Float32; independent reconstruction uses RGB/255 doubles.
    expect(full.metrics.reconstructionMse).toBeCloseTo(sum / count, 7);
    expect(full.metrics.reconstructionMse).toBeLessThan(
      full.metrics.baselineMse,
    );
    const changed = o.pixels.slice();
    changed[100] = 0;
    await expect(
      generateClassic({ ...o, pixels: changed, seed: prefix }),
    ).rejects.toThrow("identity");
    const altered = structuredClone(full);
    altered.params.optimization!.lookahead = 8;
    await expect(validateInstruction(altered)).rejects.toThrow("classic");
  });
  it("bounded cancellation never returns a fabricated guide", async () => {
    await expect(
      generateClassic({ ...options(), cancelled: () => true }),
    ).rejects.toThrow("Cancelled");
    expect(classicCircleProfile().pins[0].y * 500).toBeCloseTo(20, 9);
    expect(classicCircleProfile().threadMm).toBe(0.12);
  });
  it("fills real face unions without clipping and refuses missing/three-face heart input", () => {
    const faces = [
      { left: 0.15, top: 0.2, width: 0.2, height: 0.35 },
      { left: 0.58, top: 0.25, width: 0.2, height: 0.3 },
    ];
    const crop = faceFill(faces, "heart", 1, 0.78);
    expect(crop.faces).toEqual(faces);
    for (const f of faces)
      for (const x of [f.left, f.left + f.width])
        for (const y of [f.top, f.top + f.height]) {
          const dx =
            crop.targetBounds.left +
            ((x - crop.sourceBounds.left) / crop.sourceBounds.width) *
              crop.targetBounds.width;
          const dy =
            crop.targetBounds.top +
            ((y - crop.sourceBounds.top) / crop.sourceBounds.height) *
              crop.targetBounds.height;
          expect(
            inside("heart", 0.5 + (dx - 0.5) / 0.78, 0.5 + (dy - 0.5) / 0.78),
          ).toBe(true);
        }
    expect(() => faceFill([], "circle")).toThrow();
    expect(() => faceFill([...faces, faces[0]], "heart")).toThrow();
  });
});
