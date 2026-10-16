import { test, expect } from "vitest";
import {
  frameCustomerHeads,
  customerHeadAlpha,
  turnPoint,
} from "../src/core/customer-framing";
import { framePortraitHeads } from "../src/core/portrait-framing";
import {
  generateClassicReference,
  referenceProfile,
} from "../src/core/classic-reference";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { validateInstruction } from "../src/core/validation";
const faces = [{ left: 0.28, top: 0.24, width: 0.42, height: 0.51 }];
test("customer chin cut removes high shoulder corners and all neck pixels, keeps facial centre", () => {
  const f = frameCustomerHeads(faces, "circle", 1),
    h = f.framing!.heads[0],
    b = f.targetFaces![0];
  expect(h.target.height).toBeCloseTo(0.87);
  expect(customerHeadAlpha(0.5, b.top + 0.5 * b.height, b, h.chin, false)).toBe(
    1,
  );
  expect(customerHeadAlpha(0.02, h.chin - 0.025, b, h.chin, false)).toBe(0);
  expect(customerHeadAlpha(0.5, h.chin, b, h.chin, false)).toBe(0);
  expect(
    customerHeadAlpha(b.left + b.width * 0.8, h.chin - 0.01, b, h.chin, false),
  ).toBe(0);
  expect(customerHeadAlpha(0.02, h.chin + 0.05, b, h.chin, true)).toBe(1);
  expect(framePortraitHeads(faces, "circle", 1).version).toBe(
    "reviewed-head-framing/3",
  );
});
test("90degree rotations bind exact face positions and reverse without stretching", () => {
  const base = frameCustomerHeads(faces, "circle", 1);
  for (const r of [0, 1, 2, 3] as const) {
    const f = frameCustomerHeads(faces, "circle", 1, false, undefined, r),
      b = f.targetFaces![0],
      a = base.targetFaces![0];
    const centre = turnPoint(a.left + a.width / 2, a.top + a.height / 2, r);
    expect(b.left + b.width / 2).toBeCloseTo(centre.x);
    expect(b.top + b.height / 2).toBeCloseTo(centre.y);
    expect(b.width).toBeCloseTo(r % 2 ? a.height : a.width);
  }
  expect(() =>
    frameCustomerHeads(faces, "circle", 1, false, undefined, 9 as never),
  ).toThrow();
});
test("Heart pair remains separately in upper lobes with a shoulder-free chin", () => {
  const pair = [
    { left: 0.13, top: 0.26, width: 0.23, height: 0.38 },
    { left: 0.65, top: 0.28, width: 0.21, height: 0.33 },
  ];
  const f = frameCustomerHeads(pair, "heart", 1.4545);
  expect(f.framing!.heads).toHaveLength(2);
  for (const [j, h] of f.framing!.heads.entries()) {
    expect(h.target.width).toBeCloseTo(0.42);
    expect(h.target.left + h.target.width / 2).toBeCloseTo(j ? 0.73 : 0.27);
    expect(h.chin).toBeCloseTo(0.56);
  }
});
test("new proof4 and unchanged proof3 survive imports, rotation/chin tampering is rejected", async () => {
  const profile = referenceProfile(
    standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
  );
  for (const v of [3, 4]) {
    const f =
      v === 4
        ? frameCustomerHeads(faces, "circle", 1, false, undefined, 1)
        : framePortraitHeads(faces, "circle", 1);
    const i = await generateClassicReference({
      pixels: new Uint8Array(64 * 64 * 3).fill(180),
      profile,
      resolution: 64,
      lines: 50,
      mode: "dark",
      kitPreparation: {
        version: v === 4 ? "standard-preparation/4" : "standard-preparation/3",
        sourceHash: "a".repeat(64),
        sourceAspect: 1,
        whiteBackground: "automatic",
        transform: f,
      },
    });
    await expect(validateInstruction(i)).resolves.toBeTruthy();
    if (v === 4) {
      const bad = structuredClone(i);
      bad.params.kitPreparation!.transform.framing!.rotation = 2;
      await expect(validateInstruction(bad)).rejects.toThrow();
    }
  }
});
