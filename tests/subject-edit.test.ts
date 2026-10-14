import { expect, it } from "vitest";
import {
  subjectRecipeKey,
  defaultSubjectMarks,
} from "../src/core/subject-edit";
import { DEFAULT_EDITS } from "../src/core/types";
import { customerError } from "../src/errors";
it("binds review to photo, category, exact crop, material aspect, grid and shape", () => {
  const key = subjectRecipeKey("a", "animal", DEFAULT_EDITS, 1, 160, "circle");
  for (const changed of [
    subjectRecipeKey("b", "animal", DEFAULT_EDITS, 1, 160, "circle"),
    subjectRecipeKey("a", "vehicle", DEFAULT_EDITS, 1, 160, "circle"),
    subjectRecipeKey(
      "a",
      "animal",
      { ...DEFAULT_EDITS, rotation: 90 },
      1,
      160,
      "circle",
    ),
    subjectRecipeKey("a", "animal", DEFAULT_EDITS, 1.5, 160, "rectangle"),
    subjectRecipeKey("a", "animal", DEFAULT_EDITS, 1, 320, "circle"),
    subjectRecipeKey("a", "animal", DEFAULT_EDITS, 1, 160, "heart"),
  ])
    expect(changed).not.toBe(key);
  const a = defaultSubjectMarks(),
    b = defaultSubjectMarks();
  a[0].reviewed = true;
  expect(b[0].reviewed).toBe(false);
  expect(
    subjectRecipeKey("a", "animal", DEFAULT_EDITS, 1, 160, "circle", "target1"),
  ).not.toBe(
    subjectRecipeKey("a", "animal", DEFAULT_EDITS, 1, 160, "circle", "target2"),
  );
});
it("unsupported combination/review/clipping have specific four-language visible messages", () => {
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const)
    for (const code of ["review", "combination", "clipped"]) {
      const message = customerError(`Error: subject-fit/${code}`, locale);
      expect(message).not.toContain("subject-fit/");
      expect(message.length).toBeGreaterThan(20);
    }
  expect(customerError("subject-fit/review", "uz-Cyrl")).toMatch(/[А-Яа-я]/);
});
