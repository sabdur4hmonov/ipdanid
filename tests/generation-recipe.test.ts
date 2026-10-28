import { test, expect } from "vitest";
import { randomBytes } from "node:crypto";
import {
  decodeGenerationRecipe,
  generationCapability,
} from "../server/generation-recipe";
import { DEFAULT_STANDARD_KIT } from "../src/core/standard-kit";
import { frameFreePhoto } from "../src/core/free-photo-framing";
import { withPortraitCaption } from "../src/core/portrait-caption";
export function recipe() {
  return {
    version: "protected-generation/1",
    consent: "prepared-target-transfer/1",
    shape: "circle",
    revision: 1,
    lines: 2500,
    target: Buffer.alloc(250000, 190).toString("base64url"),
    secret: randomBytes(32).toString("base64url"),
    requestKey: "test-generation-first",
    preparation: {
      version: "standard-preparation/9",
      sourceHash: "a".repeat(64),
      sourceAspect: 1,
      whiteBackground: "original",
      transform: frameFreePhoto("object", [], "circle", 1),
    },
  };
}
test("canonical prepared target uses server-selected exact kit/engine and fixed grayscale; recipe hash is stable", () => {
  const b = recipe(),
    a = decodeGenerationRecipe(b, DEFAULT_STANDARD_KIT);
  expect(a.options.pixels).toHaveLength(750000);
  expect(a.options.pixels.every((x) => x === 190)).toBe(true);
  expect(a.options.profile.pins).toHaveLength(240);
  expect(a.options.profile.standardKit?.referenceEngine).toBe(
    "classic-greedy/3",
  );
  expect(a.options.accessPolicy).toBe("kit-build/1");
  expect(decodeGenerationRecipe(b, DEFAULT_STANDARD_KIT).recipeHash).toBe(
    a.recipeHash,
  );
  expect(a.enhanced).toBe(false);
});
test("reviewed runtime pin spellings bind the recipe but cannot inject a different kit layout or material", () => {
  const b = recipe(),
    before = decodeGenerationRecipe(b, DEFAULT_STANDARD_KIT),
    pins = {
      version: "kit-pin-snapshot/1",
      coordinates: before.options.profile.pins.map((p) => [p.x, p.y]),
    };
  pins.coordinates[21][1] += Number.EPSILON;
  const after = decodeGenerationRecipe({ ...b, pins }, DEFAULT_STANDARD_KIT);
  expect(after.options.profile.pins[21].y).toBe(pins.coordinates[21][1]);
  expect(after.recipeHash).not.toBe(before.recipeHash);
  expect(after.options.profile.colors).toEqual(before.options.profile.colors);
  expect(() =>
    decodeGenerationRecipe(
      { ...b, pins: { ...pins, threadMm: 0.3 } },
      DEFAULT_STANDARD_KIT,
    ),
  ).toThrow();
  pins.coordinates[21][1] += 0.001;
  expect(() =>
    decodeGenerationRecipe({ ...b, pins }, DEFAULT_STANDARD_KIT),
  ).toThrow();
});
test("reject source/engine/profile injection, no consent, stale revision, noncanonical base64 and malformed framing", () => {
  const b = recipe();
  for (const change of [
    { profile: {} },
    { engine: "legacy" },
    { consent: false },
    { target: b.target + "==" },
    { lines: 1000000 },
    { secret: "x" },
    { preparation: { ...b.preparation, sourceAspect: Infinity } },
    {
      preparation: {
        ...b.preparation,
        transform: {
          ...b.preparation.transform,
          targetFaces: [{ left: 0, top: 0, width: 1, height: 1 }],
        },
      },
    },
  ])
    expect(() =>
      decodeGenerationRecipe({ ...b, ...change }, DEFAULT_STANDARD_KIT),
    ).toThrow();
  expect(() =>
    decodeGenerationRecipe({ ...b, revision: 2 }, DEFAULT_STANDARD_KIT),
  ).toThrow("changed");
  expect(() => generationCapability("-".repeat(33))).toThrow("unavailable");
});
test("all customer shapes and people/pet/object/vehicle/lettering recipes preserve reviewed framing; mixed captions remain canonical", () => {
  for (const shape of ["circle", "rectangle", "heart"] as const) {
    for (const kind of [
      "people",
      "animal",
      "object",
      "vehicle",
      "lettering",
    ] as const) {
      const b = recipe();
      const transform = frameFreePhoto(
        kind,
        kind === "people"
          ? [{ left: 0.3, top: 0.2, width: 0.4, height: 0.5 }]
          : [],
        shape,
        1,
      );
      const prepared = withPortraitCaption(
        transform,
        shape,
        kind === "people" ? "Ali علي Али" : "",
        "bidi/2",
      );
      const decoded = decodeGenerationRecipe(
        { ...b, shape, preparation: { ...b.preparation, transform: prepared } },
        DEFAULT_STANDARD_KIT,
      );
      expect(decoded.options.profile.shape).toBe(shape);
      expect(decoded.options.kitPreparation?.transform).toEqual(prepared);
    }
  }
});
