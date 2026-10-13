import { it, expect } from "vitest";
import {
  adviceCrop,
  subjectAdvice,
  BLUR_LAPLACIAN_VARIANCE,
} from "../src/core/subject-advice";
import { DEFAULT_PORTRAIT } from "../src/core/portrait";
import { estimatedPairPortrait } from "../src/core/face-features";
import { addPerson } from "../src/core/people-edit";
import { sourceToTarget, targetToSource } from "../src/core/coordinates";
import { DEFAULT_EDITS, type PortraitSettings } from "../src/core/types";
import { boxBlur, syntheticSubject } from "./fixtures/synthetic-subjects";

const n = 160,
  off: PortraitSettings = {
    ...structuredClone(DEFAULT_PORTRAIT),
    enabled: false,
  };
const keys = (a: ReturnType<typeof subjectAdvice>) => a.items.map((i) => i.key);

it("sharp synthetic subjects get no advice; blurred ones get blur advice only", () => {
  for (const fixture of ["car", "dog", "object"] as const) {
    const sharp = subjectAdvice({
      pixels: syntheticSubject(fixture, n),
      n,
      shape: "circle",
      kind: "object",
      portrait: off,
    });
    expect(sharp.items).toEqual([]);
    expect(sharp.laplacianVariance).toBeGreaterThan(3000);
    expect(sharp.advisoryOnly).toBe(true);
    const soft = subjectAdvice({
      pixels: boxBlur(syntheticSubject(fixture, n), n, 2),
      n,
      shape: "circle",
      kind: "object",
      portrait: off,
    });
    expect(keys(soft)).toEqual(["blur"]);
    expect(soft.laplacianVariance).toBeLessThan(BLUR_LAPLACIAN_VARIANCE);
    expect(soft.items[0].fix).toBe("photo");
  }
});

it("low contrast is reported with a one-tap fix, never as rejection", () => {
  const a = subjectAdvice({
    pixels: syntheticSubject("flat", n),
    n,
    shape: "rectangle",
    kind: "whole-image",
    portrait: off,
  });
  expect(keys(a)).toEqual(["contrast"]);
  expect(a.items[0].fix).toBe("photo");
  expect(a.contrast).toBeLessThan(30);
});

it("small people features (span < 8 samples) are flagged per person on the exact target", () => {
  const pair = estimatedPairPortrait({ ...DEFAULT_PORTRAIT, enabled: true });
  const small = {
    ...pair,
    people: {
      ...pair.people!,
      faces: pair.people!.faces.map((f, k) =>
        k === 1
          ? {
              ...f,
              face: { ...f.face, width: 0.1, height: 0.12 },
              regions: {
                ...f.regions,
                eyes: {
                  left: f.face.left,
                  top: 0.3,
                  width: 0.03,
                  height: 0.02,
                },
                nose: {
                  left: f.face.left,
                  top: 0.34,
                  width: 0.02,
                  height: 0.02,
                },
                mouth: {
                  left: f.face.left,
                  top: 0.38,
                  width: 0.03,
                  height: 0.02,
                },
              },
            }
          : f,
      ),
    },
  };
  const a = subjectAdvice({
    pixels: syntheticSubject("object", n),
    n,
    shape: "rectangle",
    kind: "people",
    portrait: small,
  });
  const flagged = a.items.filter((i) => i.key === "small");
  expect(flagged.map((i) => i.person)).toEqual([2]);
  expect(flagged[0].value).toBeLessThan(8);
  expect(flagged[0].fix).toBe("zoom");
});

it("more than three people (portrait or detector) is advice with another-photo fix", () => {
  const three = addPerson(
    estimatedPairPortrait({ ...DEFAULT_PORTRAIT, enabled: true }),
    "c",
  );
  const base = {
    pixels: syntheticSubject("object", n),
    n,
    shape: "rectangle" as const,
    kind: "people" as const,
    portrait: three,
  };
  expect(keys(subjectAdvice(base))).not.toContain("many-people");
  const four = subjectAdvice({ ...base, detectedPeople: 4 });
  expect(four.items.find((i) => i.key === "many-people")).toMatchObject({
    value: 4,
    fix: "photo",
  });
  // Detector counts never apply to general subjects.
  expect(
    keys(
      subjectAdvice({
        ...base,
        kind: "object",
        portrait: off,
        detectedPeople: 5,
      }),
    ),
  ).not.toContain("many-people");
});

it("a small masked general subject is flagged and the fix centres and enlarges it", () => {
  const pixels = new Uint8Array(n * n * 3).fill(255);
  for (let y = 30; y < 50; y++)
    for (let x = 100; x < 124; x++) {
      const i = (y * n + x) * 3;
      pixels[i] = (x * 7) % 200;
      pixels[i + 1] = (y * 11) % 180;
      pixels[i + 2] = 40;
    }
  const a = subjectAdvice({
    pixels,
    n,
    shape: "rectangle",
    kind: "vehicle",
    portrait: off,
    masked: true,
  });
  const small = a.items.find((i) => i.key === "small")!;
  expect(small).toBeDefined();
  expect(a.subject!.left).toBeCloseTo(100 / (n - 1), 5);
  const next = adviceCrop(DEFAULT_EDITS, a.subject, 1, n, small.value);
  expect(next.zoom).toBeGreaterThan(1);
  const c = {
    x: a.subject!.left + a.subject!.width / 2,
    y: a.subject!.top + a.subject!.height / 2,
  };
  const src = targetToSource(c.x, c.y, 800, 800, DEFAULT_EDITS, 1, n),
    moved = sourceToTarget(src.x, src.y, 800, 800, next, 1, n);
  expect(moved.x).toBeCloseTo(0.5, 2);
  expect(moved.y).toBeCloseTo(0.5, 2);
  // Unmasked general subjects have unknown bounds: no size guess is made.
  expect(
    keys(
      subjectAdvice({
        pixels,
        n,
        shape: "rectangle",
        kind: "vehicle",
        portrait: off,
      }),
    ),
  ).not.toContain("small");
});

it("rejects a target that is not the processed sample grid", () => {
  expect(() =>
    subjectAdvice({
      pixels: new Uint8Array(10),
      n,
      shape: "circle",
      kind: "object",
      portrait: off,
    }),
  ).toThrow("Invalid advice target");
});
