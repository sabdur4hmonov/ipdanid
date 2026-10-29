import { expect, test } from "vitest";
import { closerFraming, fadeBelowChin } from "../scripts/p16-1c/framing";
import {
  framingEligible,
  smallView,
  blindOrder,
} from "../scripts/p16-1c/review";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import type { Shape } from "../src/core/types";
const face = {
  left: 0.2780861663818359,
  top: 0.27145890474319456,
  width: 0.50684068441391,
  height: 0.45076534986495975,
};
const nose = { x: 0.526, y: 0.536 };
test.each(["circle", "rectangle", "heart"] as Shape[])(
  "only existing placement controls change for%s, nose tip stays0.08above centre",
  (shape) => {
    const original = frameFreePhoto("people", [face], shape, 0.75);
    for (const level of ["F1", "F2"] as const) {
      const p = closerFraming(face, nose, shape, 0.75, level);
      expect(p.option).toBe("p16-1c/reviewed-framing/1");
      expect(p.targetNose.x).toBeCloseTo(0.5, 12);
      expect(p.targetNose.y).toBeCloseTo(0.42, 12);
      expect(p.achievedHeight).toBeCloseTo(
        shape === "heart" && level === "F2"
          ? 0.6335198108699782
          : level === "F1"
            ? 0.5
            : 0.65,
        10,
      );
      expect(p.transform.framing!.adjustments[0].zoom).toBeLessThanOrEqual(4);
      expect(p.keepShoulders).toBe(false);
      expect(p.fadePx).toBe(18);
    }
    expect(frameFreePhoto("people", [face], shape, 0.75)).toEqual(original);
    expect(original.framing!.keepShoulders).toBe(true);
  },
);
test("fade uses the existing smooth18px chin control, preserves face pixels and makes the lower canvas white", () => {
  const pixels = new Uint8Array(500 * 500 * 3).fill(50),
    out = fadeBelowChin(pixels, 0.65);
  expect(out[100 * 500 * 3]).toBe(50);
  expect(out[330 * 500 * 3]).toBeGreaterThan(50);
  expect(out.subarray(344 * 500 * 3).every((v) => v === 255)).toBe(true);
  expect(pixels.every((v) => v === 50)).toBe(true);
  expect(() => fadeBelowChin(new Uint8Array(6), 0.5)).toThrow("fade-input");
});
test("only hard constraints or1.5x runtime exclude a framing, with no SSIM input", () => {
  expect(framingEligible(true, 1499, 1000).eligible).toBe(true);
  expect(framingEligible(true, 1500, 1000).eligible).toBe(true);
  expect(framingEligible(true, 1501, 1000).reason).toBe("runtime-over-1.5x");
  expect(framingEligible(false, 100, 1000).reason).toBe("hard-constraint");
  expect(framingEligible(true, NaN, 1000).eligible).toBe(false);
});
test("blind letters are distinct and existing votes survive assembly", () => {
  const a = blindOrder(["F0", "F1", "F2"]);
  expect(new Set(a.map((v) => v.letter)).size).toBe(3);
  expect(new Set(a.map((v) => v.level))).toEqual(new Set(["F0", "F1", "F2"]));
  expect(
    blindOrder(
      ["F0", "F1", "F2"],
      Object.fromEntries(a.map((v) => [v.letter, v.level])),
    ),
  ).toEqual(a);
});
test("250px view is the same physical image box-averaged4x without enhancement", () => {
  const rgba = new Uint8Array(4000000).fill(255);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const k = (y * 1000 + x) * 4;
      rgba[k] = rgba[k + 1] = rgba[k + 2] = x < 2 ? 0 : 255;
    }
  const out = smallView(rgba);
  expect(out.length).toBe(250 * 250 * 4);
  expect([...out.subarray(0, 4)]).toEqual([128, 128, 128, 255]);
  expect([...out.subarray(4, 8)]).toEqual([255, 255, 255, 255]);
});
