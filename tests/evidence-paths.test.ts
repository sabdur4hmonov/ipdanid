import { test, expect } from "vitest";
import { newEvidenceRoot } from "./helpers/evidence-paths";
test("current evidence cannot overwrite historical reports, served builds or escape the artifact tree", () => {
  for (const value of [
    "output/phase9",
    "output/phase10/desktop",
    "output/phase11",
    "output/phase12/anything",
    "output/phase13",
    "output/phase14-dist",
    "output/current/../phase10",
    "dist",
    "src",
    "output",
  ])
    expect(() => newEvidenceRoot(value)).toThrow();
  expect(newEvidenceRoot("output/current-reference")).toMatch(
    /current-reference$/,
  );
  expect(newEvidenceRoot("output/phase14/screens")).toMatch(/screens$/);
  expect(newEvidenceRoot("test-results/phase14-new")).toMatch(/phase14-new$/);
});
