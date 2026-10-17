import { test, expect } from "vitest";
import { frameProduct } from "../src/core/product-framing";
import {
  polishedHeadAlpha,
  frameCustomerHeads,
} from "../src/core/customer-framing";
import {
  leastSquaresProfile,
  isSquareInteriorAxis,
  SquareWeave,
  generateClassicLeastSquares,
} from "../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../src/core/standard-kit";
import { validateInstruction } from "../src/core/validation";
const faces = [{ left: 0.3, top: 0.2, width: 0.4, height: 0.5 }];
test("polished people retain original framing contract, closed jaw and upper-heart head", () => {
  for (const shape of ["circle", "rectangle", "heart"] as const) {
    const f = frameProduct("people", faces, shape, 1);
    expect(f.version).toBe("reviewed-product-framing/5");
    const h = f.framing!.heads[0],
      b = f.targetFaces![0];
    expect(h.target.height).toBeCloseTo(shape === "heart" ? 0.65 : 0.87);
    for (const x of [0, 0.1, 0.9, 1])
      expect(polishedHeadAlpha(x, h.chin - 0.03, b, h.chin, false)).toBe(0);
    expect(polishedHeadAlpha(0.5, h.chin + 0.01, b, h.chin, false)).toBe(0);
    expect(polishedHeadAlpha(0, h.chin, b, h.chin, true)).toBe(1);
  }
  expect(frameCustomerHeads(faces, "circle", 1).version).toBe(
    "reviewed-customer-framing/4",
  );
});
test("every generic kind fits exact shape preserving aspect, rejects invalid provenance", () => {
  for (const kind of ["animal", "vehicle", "object", "lettering"] as const)
    for (const shape of ["circle", "rectangle", "heart"] as const) {
      const f = frameProduct(kind, [], shape, 1.2, false, undefined, 0, {
        left: 0.1,
        top: 0.15,
        width: 0.8,
        height: 0.7,
      });
      expect(f.faces).toEqual([]);
      expect(f.targetFaces).toEqual([]);
      expect(f.product!.kind).toBe(kind);
      expect(f.targetBounds.width / f.targetBounds.height).toBeCloseTo(
        (f.sourceBounds.width * 1.2) / f.sourceBounds.height,
      );
    }
  expect(() => frameProduct("animal", [], "circle", 1)).toThrow();
});
test("polished Square excludes full exact-axis chords at every interior level while old v3 remains importable", async () => {
  const raw = standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[1],
    p = leastSquaresProfile(raw, true);
  const i = await generateClassicLeastSquares({
    pixels: Uint8Array.from({ length: 64 * 64 * 3 }, (_, k) => k % 255),
    profile: p,
    resolution: 64,
    lines: 300,
    mode: "dark",
  });
  expect(
    (i.params.classic as { squareAxisExclusion: string }).squareAxisExclusion,
  ).toBe("axis-interior-skip/2");
  await validateInstruction(i);
  const path = i.segments[0].path;
  const weave = new SquareWeave(p);
  for (let j = 1; j < path.length; j++) {
    expect(isSquareInteriorAxis(p, path[j - 1], path[j])).toBe(false);
    expect(weave.allows(path[j - 1], path[j])).toBe(true);
    weave.add(path[j - 1], path[j]);
  }
  const old = await generateClassicLeastSquares({
    pixels: new Uint8Array(64 * 64 * 3).fill(128),
    profile: leastSquaresProfile(raw),
    resolution: 64,
    lines: 50,
    mode: "dark",
  });
  await validateInstruction(old);
  expect(
    (old.params.classic as { squareAxisExclusion: string }).squareAxisExclusion,
  ).toBe("axis-centre-skip/1");
});

test("new Square weave caps repeated physical centre crossings; old profiles are exempt", () => {
  const raw = standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[1],
    p = leastSquaresProfile(raw, true),
    w = new SquareWeave(p),
    old = new SquareWeave(leastSquaresProfile(raw));
  let pair: [number, number] | undefined;
  for (let a = 0; a < p.pins.length && !pair; a++)
    for (let b = a + 1; b < p.pins.length; b++)
      if ((p.pins[a].y - 0.5) * (p.pins[b].y - 0.5) < 0) {
        pair = [a, b];
        break;
      }
  expect(pair).toBeDefined();
  for (let k = 0; k < 8; k++) {
    expect(w.allows(...pair!)).toBe(true);
    w.add(...pair!);
    old.add(...pair!);
  }
  expect(w.allows(...pair!)).toBe(false);
  expect(old.allows(...pair!)).toBe(true);
});

test("new reviewed product proof survives real v3 guide roundtrip and rejects a changed crop", async () => {
  for (const kind of ["people", "vehicle"] as const) {
    const transform = frameProduct(
      kind,
      kind === "people" ? faces : [],
      "circle",
      1,
      false,
      undefined,
      0,
      kind === "people"
        ? undefined
        : { left: 0.1, top: 0.2, width: 0.8, height: 0.6 },
    );
    const i = await generateClassicLeastSquares({
      pixels: new Uint8Array(64 * 64 * 3).fill(160),
      profile: leastSquaresProfile(
        standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
        true,
      ),
      resolution: 64,
      lines: 70,
      mode: "dark",
      kitPreparation: {
        version: "standard-preparation/5",
        sourceHash: "0".repeat(64),
        sourceAspect: 1,
        whiteBackground: "automatic",
        transform,
      },
    });
    await validateInstruction(JSON.parse(JSON.stringify(i)));
    const bad = structuredClone(i);
    bad.params.kitPreparation!.transform.targetBounds.left += 0.01;
    await expect(validateInstruction(bad)).rejects.toThrow();
  }
});
