import { test, expect } from "vitest";
import {
  frameFreePhoto,
  freePhotoSourcePoint,
  maskFreePhotoPixels,
} from "../src/core/free-photo-framing";
import { withPortraitCaption } from "../src/core/portrait-caption";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../src/core/classic-least-squares";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
} from "../src/core/standard-kit";
import { validateInstruction } from "../src/core/validation";
import { turnPoint } from "../src/core/customer-framing";
import { inside } from "../src/core/geometry";
test("cached fixed-shape raster is byte-identical to the original pixel-centre rule, including caption and reuse", () => {
  const rgba = Uint8ClampedArray.from(
      { length: 500 * 500 * 4 },
      (_, i) => i % 256,
    ),
    caption = Uint8Array.from(
      { length: 500 * 500 * 3 },
      (_, i) => (i * 11) % 256,
    );
  for (const shape of ["circle", "rectangle", "heart"] as const) {
    const expected = new Uint8Array(500 * 500 * 3);
    for (let k = 0; k < 500 * 500; k++) {
      const keep = inside(
        shape,
        ((k % 500) + 0.5) / 500,
        (Math.floor(k / 500) + 0.5) / 500,
      );
      for (let ch = 0; ch < 3; ch++)
        expected[k * 3 + ch] = keep
          ? Math.min(rgba[k * 4 + ch], caption[k * 3 + ch])
          : 255;
    }
    expect(
      maskFreePhotoPixels(rgba.slice(), shape, caption).every(
        (v, i) => v === expected[i],
      ),
    ).toBe(true);
    expect(
      maskFreePhotoPixels(rgba.slice(), shape, caption).every(
        (v, i) => v === expected[i],
      ),
    ).toBe(true);
  }
}, 20000); // The oracle deliberately repeats the old full polygon walk at 500px.
const face = { left: 0.3, top: 0.2, width: 0.4, height: 0.5 };
test("free composition preserves entire source, shoulders and relative placement regardless of detections", () => {
  for (const shape of ["circle", "rectangle", "heart"] as const) {
    const a = frameFreePhoto("people", [], shape, 1.5),
      b = frameFreePhoto("people", [face], shape, 1.5);
    expect(a.sourceBounds).toEqual({ left: 0, top: 0, width: 1, height: 1 });
    expect(a.targetBounds).toEqual(b.targetBounds);
    expect(b.framing).toMatchObject({
      keepShoulders: true,
      heads: [],
      fadePx: 0,
    });
    expect(b.targetBounds.width / b.targetBounds.height).toBeCloseTo(1.5);
  }
});
test("wide zoom/pan range and rotated inverse retain exact brush source coordinates", () => {
  for (const rotation of [0, 1, 2, 3] as const) {
    const f = frameFreePhoto(
        "people",
        [face],
        "heart",
        1.2,
        { zoom: 3, x: 0.6, y: -0.5 },
        rotation,
      ),
      t = f.targetBounds;
    const p = turnPoint(
      t.left + t.width * 0.37,
      t.top + t.height * 0.61,
      rotation,
    );
    const source = freePhotoSourcePoint(f, p.x, p.y);
    expect(source.x).toBeCloseTo(0.37);
    expect(source.y).toBeCloseTo(0.61);
  }
  for (const a of [
    { zoom: NaN, x: 0, y: 0 },
    { zoom: 5, x: 0, y: 0 },
    { zoom: 1, x: 2, y: 0 },
  ])
    expect(() => frameFreePhoto("people", [], "circle", 1, a)).toThrow();
});
test("free-photo guides including caption round-trip, reject tampering/downgrade and use same composition", async () => {
  for (const caption of ["", "Ali علي"]) {
    const f = frameFreePhoto("people", [face], "heart", 1, {
      zoom: 1.7,
      x: 0.1,
      y: 0,
    });
    const transform = withPortraitCaption(f, "heart", caption, "bidi/2");
    expect(transform.targetBounds).toEqual(f.targetBounds);
    expect(transform.targetFaces).toEqual(f.targetFaces);
    const i = await generateClassicLeastSquares({
      pixels: new Uint8Array(64 * 64 * 3).fill(160),
      profile: leastSquaresProfile(
        standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[2],
        true,
      ),
      resolution: 64,
      lines: 40,
      mode: "dark",
      kitPreparation: {
        version: "standard-preparation/9",
        sourceHash: "0".repeat(64),
        sourceAspect: 1,
        whiteBackground: "manual",
        transform,
      },
    });
    await validateInstruction(JSON.parse(JSON.stringify(i)));
    const altered = structuredClone(i);
    altered.params.kitPreparation!.transform.targetBounds.top += 0.1;
    await expect(validateInstruction(altered)).rejects.toThrow();
    const old = structuredClone(i);
    old.params.kitPreparation!.version = "standard-preparation/5";
    await expect(validateInstruction(old)).rejects.toThrow();
  }
});
