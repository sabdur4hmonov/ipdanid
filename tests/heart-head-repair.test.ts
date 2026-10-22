import { test, expect } from "vitest";
import { frameProduct } from "../src/core/product-framing";
import { inside } from "../src/core/geometry";
import { completeHeadAlpha } from "../src/core/customer-framing";
import { withPortraitCaption } from "../src/core/portrait-caption";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { validateInstruction } from "../src/core/validation";
const face = { left: 0.28, top: 0.24, width: 0.42, height: 0.51 };
const repaired = (rotation: 0 | 1 | 2 | 3 = 0) =>
  frameProduct(
    "people",
    [face],
    "heart",
    1,
    false,
    undefined,
    rotation,
    undefined,
    true,
  );

test("single Heart auto-fit retains the centre of the crown rather than cutting it with the notch", () => {
  const f = repaired();
  const h = f.framing!.heads[0].target;
  expect(inside("heart", h.left + h.width / 2, h.top + 0.01)).toBe(true);
});

test("old framing remains reproducible; new crop preserves chin and removes neck", () => {
  const old = frameProduct("people", [face], "heart", 1),
    f = repaired();
  expect(old.version).toBe("reviewed-product-framing/5");
  expect(old.framing!.heads[0].target.top).toBeCloseTo(0.08);
  const b = f.targetFaces![0],
    h = f.framing!.heads[0];
  const cx = b.left + b.width / 2;
  for (const fraction of [0, 0.3, 0.55, 0.8, 1]) {
    const y = b.top + fraction * b.height;
    expect(inside("heart", cx, y)).toBe(true);
    expect(completeHeadAlpha(cx, y, b, h.chin, false)).toBe(1);
  }
  expect(completeHeadAlpha(cx, h.chin, b, h.chin, false)).toBe(0);
  expect(completeHeadAlpha(0.1, h.chin - 0.02, b, h.chin, false)).toBe(0);
  expect(completeHeadAlpha(0.1, h.chin, b, h.chin, true)).toBe(1);
  expect(h.target.width / h.target.height).toBeCloseTo(
    h.source.width / h.source.height,
  );
});

test("new Heart framing and caption have strict guide provenance; old versions stay importable", async () => {
  for (const caption of [false, true]) {
    const transform = caption
      ? withPortraitCaption(repaired(), "heart", "Ali", "bidi/2")
      : repaired();
    const guide = await generateClassicLeastSquares({
      pixels: new Uint8Array(64 * 64 * 3).fill(180),
      profile: leastSquaresProfile(
        standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[2],
        true,
      ),
      resolution: 64,
      lines: 40,
      mode: "dark",
      kitPreparation: {
        version: caption ? "standard-preparation/8" : "standard-preparation/7",
        sourceHash: "0".repeat(64),
        sourceAspect: 1,
        whiteBackground: "automatic",
        transform,
      },
    });
    await validateInstruction(JSON.parse(JSON.stringify(guide)));
    const altered = structuredClone(guide);
    altered.params.kitPreparation!.transform.framing!.heads[0].target.top -= 0.1;
    await expect(validateInstruction(altered)).rejects.toThrow();
    const downgrade = structuredClone(guide);
    downgrade.params.kitPreparation!.version = "standard-preparation/5";
    await expect(validateInstruction(downgrade)).rejects.toThrow();
  }
});
