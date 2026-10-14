import { it, expect } from "vitest";
import { makeSubjectPlan } from "../src/core/subject-plan";
import { DEFAULT_EDITS } from "../src/core/types";
import { createProfile } from "../src/core/geometry";
import {
  DEFAULT_SUBJECT_OBJECTIVE,
  subjectWeightField,
  measureSubjects,
  screenSubjects,
} from "../src/core/subject-objective";
import {
  CAPABILITIES,
  capabilityMessage,
  capabilityProblem,
} from "../src/core/capabilities";
import {
  generationStrategy,
  continuationStrategy,
} from "../src/core/generation-strategy";
import { usesOpticalRaster } from "../src/core/render-model";
const plan = () => {
  const p = makeSubjectPlan("animal", "test-source", DEFAULT_EDITS);
  p.subjects = [
    {
      id: "large",
      reviewed: true,
      bounds: { left: 0.08, top: 0.1, width: 0.5, height: 0.7 },
      regions: [
        {
          role: "eyes",
          box: { left: 0.15, top: 0.2, width: 0.2, height: 0.12 },
        },
      ],
    },
    {
      id: "small",
      reviewed: true,
      bounds: { left: 0.7, top: 0.2, width: 0.2, height: 0.3 },
      regions: [
        {
          role: "detail",
          box: { left: 0.72, top: 0.25, width: 0.12, height: 0.14 },
        },
      ],
    },
  ];
  return p;
};
it("equalizes unequal subject mass and uses max through overlaps, without human preprocessing", () => {
  const p = plan(),
    n = 64,
    profile = createProfile("rectangle", 32),
    pixels = new Uint8Array(n * n * 3).fill(180),
    field = subjectWeightField(
      p,
      n,
      profile,
      pixels,
      DEFAULT_SUBJECT_OBJECTIVE,
    );
  expect(field.normalizedMasses[0]).toBeCloseTo(field.normalizedMasses[1], 8);
  expect(field.fields[1][20 * n + 48]).toBeGreaterThan(
    field.fields[0][20 * n + 20],
  );
  p.subjects[1].bounds = { ...p.subjects[0].bounds };
  p.subjects[1].regions = structuredClone(p.subjects[0].regions);
  const overlap = subjectWeightField(
    p,
    n,
    profile,
    pixels,
    DEFAULT_SUBJECT_OBJECTIVE,
  );
  for (let k = 0; k < n * n; k++)
    expect(overlap.weights[k]).toBe(
      Math.max(overlap.board[k], overlap.fields[0][k], overlap.fields[1][k]),
    );
  p.subjects[1].reviewed = false;
  expect(() =>
    subjectWeightField(p, n, profile, pixels, DEFAULT_SUBJECT_OBJECTIVE),
  ).toThrow("review");
});
it("worst-subject screen rejects a lost small subject even when the large subject is exact", () => {
  const p = plan(),
    n = 64,
    profile = createProfile("rectangle", 32),
    target = new Float64Array(n * n).fill(0.7),
    candidate = new Float64Array(target);
  for (let y = 13; y < 32; y++)
    for (let x = 45; x < 58; x++) candidate[y * n + x] = 0.5;
  const exact = measureSubjects(p, target, target, n, profile),
    after = measureSubjects(p, target, candidate, n, profile),
    screen = screenSubjects(exact, after);
  expect(screen.worstSubjectPass).toBe(false);
  expect(screen.subjects).toEqual([
    { id: "large", metricsPass: true },
    { id: "small", metricsPass: false },
  ]);
  expect(Object.keys(exact)).toContain("small.detail-1");
});
it("registry preserves all legacy render/strategy mappings and refuses unsupported new combinations explicitly", () => {
  for (const algorithm of Object.keys(
    CAPABILITIES,
  ) as (keyof typeof CAPABILITIES)[]) {
    expect(usesOpticalRaster(algorithm)).toBe(
      !["greedy-optical/1", "greedy-optical/2"].includes(algorithm),
    );
  }
  const instruction = {
    algorithm: "density-subject/18",
    params: { subject: plan() },
  } as any;
  expect(generationStrategy(instruction)).toBe("subjects");
  expect(continuationStrategy(instruction)).toBe("subjects");
  expect(
    capabilityProblem(instruction.algorithm, {
      subject: plan(),
      mode: "dark",
      resolution: 320,
      shape: "heart",
    }),
  ).toBeUndefined();
  expect(
    capabilityProblem(instruction.algorithm, {
      subject: plan(),
      mode: "color",
      resolution: 320,
      shape: "heart",
    }),
  ).toBe("combination");
  expect(
    capabilityProblem(instruction.algorithm, {
      mode: "dark",
      resolution: 320,
      shape: "circle",
    }),
  ).toBe("review");
  for (const locale of ["en", "ru", "uz", "uz-Cyrl"] as const)
    expect(capabilityMessage(locale, "review").length).toBeGreaterThan(20);
});
