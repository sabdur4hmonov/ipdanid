import { test, expect } from "vitest";
import {
  framePortraitHeads,
  chinOpacity,
  defaultHeadAdjustment,
} from "../src/core/portrait-framing";
import { faceFillReference } from "../src/core/reference-preparation";
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
test("new single head fills87% without changing preparation2", () => {
  for (const shape of ["circle", "rectangle"] as const) {
    const f = framePortraitHeads(faces, shape, 1),
      h = f.framing!.heads[0];
    expect(h.target.height).toBeCloseTo(0.87);
    expect(h.chin).toBeCloseTo(0.905);
    expect(h.target.left + h.target.width / 2).toBe(0.5);
    expect(h.target.top + h.target.height / 2).toBeLessThan(0.5);
    expect(f.targetFaces![0].height).toBeGreaterThan(
      faceFillReference(faces, shape, 1).targetFaces![0].height,
    );
    expect(faceFillReference(faces, shape, 1).version).toBe(
      "reviewed-face-fill/2",
    );
  }
});
test("smooth18px below-chin fade is continuous and shoulder toggle keeps source", () => {
  expect(chinOpacity(0.9, 0.9, false)).toBe(1);
  expect(chinOpacity(0.918, 0.9, false)).toBeCloseTo(0.5);
  expect(chinOpacity(0.936, 0.9, false)).toBe(0);
  expect(chinOpacity(1, 0.9, true)).toBe(1);
});
test("Heart pair separates real heads into upper lobes, even when source order reverses", () => {
  const pair = [
    { left: 0.65, top: 0.28, width: 0.21, height: 0.33 },
    { left: 0.13, top: 0.26, width: 0.23, height: 0.38 },
  ];
  const f = framePortraitHeads(pair, "heart", 1.4545);
  const [r, l] = f.framing!.heads;
  expect(r.target.left + r.target.width / 2).toBeCloseTo(0.73);
  expect(l.target.left + l.target.width / 2).toBeCloseTo(0.27);
  for (const h of [r, l]) {
    expect(h.target.width).toBeGreaterThanOrEqual(0.4);
    expect(h.target.width).toBeLessThanOrEqual(0.42);
    expect(h.chin).toBe(0.56);
    expect(h.target.top).toBeLessThan(0.1);
  }
  const single = framePortraitHeads(faces, "heart", 1).framing!.heads[0];
  expect(single.target.height).toBeCloseTo(0.65);
  expect(single.chin).toBeCloseTo(0.73);
});
test("pan and zoom preserve aspect and require bounded reviewed options", () => {
  const a = framePortraitHeads(faces, "circle", 1).framing!.heads[0];
  const b = framePortraitHeads(faces, "circle", 1, true, [
    { zoom: 1.2, x: 0.05, y: -0.04 },
  ]).framing!.heads[0];
  expect(b.target.width / a.target.width).toBeCloseTo(1.2);
  expect(b.target.height / a.target.height).toBeCloseTo(1.2);
  expect(b.target.left + b.target.width / 2).toBeCloseTo(0.55);
  expect(() =>
    framePortraitHeads(faces, "circle", 1, false, [{ zoom: 2, x: 0, y: 0 }]),
  ).toThrow();
  expect(() => framePortraitHeads(faces, "heart", 1, false, [])).toThrow();
});
test("preparation3 binds exact geometry/options and old preparation2 still validates", async () => {
  const profile = referenceProfile(
    standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
  );
  const n = 64,
    pixels = new Uint8Array(n * n * 3).fill(180);
  for (const version of [2, 3]) {
    const guide = await generateClassicReference({
      pixels,
      profile,
      resolution: n,
      lines: 50,
      mode: "dark",
      kitPreparation: {
        version:
          version === 3 ? "standard-preparation/3" : "standard-preparation/2",
        sourceHash: "a".repeat(64),
        sourceAspect: 1,
        whiteBackground: "automatic",
        transform:
          version === 3
            ? framePortraitHeads(faces, "circle", 1, false, [
                defaultHeadAdjustment(),
              ])
            : faceFillReference(faces, "circle", 1),
      },
    });
    await expect(validateInstruction(guide)).resolves.toBeTruthy();
    if (version === 3) {
      const changed = structuredClone(guide);
      changed.params.kitPreparation!.transform.framing!.heads[0].chin -= 0.01;
      await expect(validateInstruction(changed)).rejects.toThrow();
    }
  }
});
