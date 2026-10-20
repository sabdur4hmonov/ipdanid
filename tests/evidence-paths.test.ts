import { test, expect } from "vitest";
import { newEvidenceRoot } from "./helpers/evidence-paths";
test("current evidence cannot overwrite historical reports, served builds or escape the artifact tree", () => {
  for (const value of [
    "output/phase9",
    "output/phase10/desktop",
    "output/phase11",
    "output/phase12/anything",
    "output/phase13",
    "output/phase14",
    "output/phase14-dist",
    "output/pdf/phase14",
    "output/phase15/mosaic",
    "output/phase15/push/mobile-browser",
    "output/phase15/caption-v2/desktop",
    "output/phase15/bidi",
    "output/phase15/craft/mobile-browser",
    "output/phase15/qr",
    "output/phase15/book",
    "output/phase15/animation",
    "output/phase15/animation-candidate-v1",
    "output/phase15/animation-candidate-v2",
    "output/phase15/solid-core",
    "output/phase15/solid/mobile-browser",
    "output/phase15/tutorial/mobile-browser",
    "output/phase15/gallery/mobile-browser",
    "output/phase15/offers/mobile-browser",
    "output/phase15/partners/mobile-browser",
    "output/phase15/catalog/mobile-browser",
    "output/phase15/digital/mobile-browser",
    "output/phase15/commissions/mobile-browser",
    "output/current/../phase10",
    "dist",
    "src",
    "output",
  ])
    expect(() => newEvidenceRoot(value)).toThrow();
  expect(newEvidenceRoot("output/current-reference")).toMatch(
    /current-reference$/,
  );
  expect(newEvidenceRoot("output/phase15/screens")).toMatch(/screens$/);
  expect(newEvidenceRoot("test-results/phase14-new")).toMatch(/phase14-new$/);
});
