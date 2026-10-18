import { expect, it } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { bookPdf } from "../src/core/book-pdf";
import {
  makeBookPlan,
  validateBookPlan,
  reflectPoint,
  DEFAULT_BOOK,
  bookElevationSvg,
  bookLeafSvg,
  bookCsv,
} from "../src/core/book-folding";
import { LETTERING_FONTS } from "../src/core/lettering";
const fonts = Object.fromEntries(
  Object.entries(LETTERING_FONTS).map(([id, f]) => [
    id,
    new Uint8Array(readFileSync("public" + f.path)),
  ]),
);
it("creates actual per-leaf crease geometry inside the spine margin, preserving all source bands and mm marks", async () => {
  const g = await makeBookPlan({ kind: "heart" });
  expect(g.lanes).toBe(1);
  expect(g.leaves).toHaveLength(80);
  expect(g.startLeaf).toBe(161);
  expect(g.accessPolicy).toBe("kit-build/1");
  for (const leaf of g.leaves) {
    expect(leaf.pageFace).toBe(leaf.leaf * 2 - 1);
    if (!leaf.band) {
      expect(leaf.insetCreaseX).toBe(135);
      continue;
    }
    for (const fold of [leaf.top!, leaf.bottom!]) {
      const [a, b] = fold.crease,
        p = fold.reflected,
        dot =
          (p[0] - fold.corner[0]) * (b[0] - a[0]) +
          (p[1] - fold.corner[1]) * (b[1] - a[1]);
      expect(Math.abs(dot)).toBeLessThan(0.0002);
      expect(p[0]).toBeGreaterThanOrEqual(g.params.spineMarginMm);
      expect(p[1]).toBeGreaterThanOrEqual(0);
      expect(p[1]).toBeLessThanOrEqual(g.params.pageHeightMm);
      expect(reflectPoint(p, a, b)[0]).toBeCloseTo(fold.corner[0], 5);
      expect(reflectPoint(p, a, b)[1]).toBeCloseTo(fold.corner[1], 5);
    }
    expect(leaf.top!.reflected[1]).toBeLessThanOrEqual(leaf.band[0]);
    expect(leaf.bottom!.reflected[1]).toBeGreaterThanOrEqual(leaf.band[1]);
  }
  expect(bookElevationSvg(g)).toContain(g.sequenceHash);
  expect(bookLeafSvg(g, 1)).toContain("stroke-dasharray");
  expect(bookCsv(g).split("\n")).toHaveLength(81);
  expect(
    (await validateBookPlan(JSON.parse(JSON.stringify(g)))).sequenceHash,
  ).toBe(g.sequenceHash);
});
it("supports Latin/Cyrillic/Arabic and dates with fixed alternate leaves for every separate dark band", async () => {
  for (const text of ["ALI", "2026", "МИР", "علي", "Ali سلام"]) {
    const g = await makeBookPlan({ kind: "text", text }, DEFAULT_BOOK, fonts);
    expect(g.leaves.length).toBe(g.params.columns * g.lanes);
    for (let x = 0; x < g.params.columns; x++) {
      const actual = g.leaves.filter((l) => l.column === x),
        seen = new Set(
          actual
            .filter((l) => l.band)
            .flatMap((l) => {
              const [a, b] = l.band!;
              const first = Math.round((a - 50) / 1.5),
                end = Math.round((b - 50) / 1.5);
              return Array.from({ length: end - first }, (_, i) => first + i);
            }),
        );
      for (let y = 0; y < g.params.rows; y++)
        expect(seen.has(y)).toBe(!!g.sourceBits[y * g.params.columns + x]);
    }
    expect((await validateBookPlan(g, fonts)).sequenceHash).toBe(
      g.sequenceHash,
    );
  }
});
it("rejects insufficient leaves, sub-mm bands, impossible materials and forged plans instead of inventing folds", async () => {
  for (const changed of [
    { availableLeaves: 40 },
    { artHeightMm: 50, rows: 80 },
    { pageWidthMm: 70 },
    { insetMm: 100 },
    { spineMarginMm: 0 },
    { artWidthMm: 1000 },
    { paperThicknessMm: 0.5 },
  ])
    await expect(
      makeBookPlan({ kind: "heart" }, { ...DEFAULT_BOOK, ...changed }),
    ).rejects.toThrow(/book\//);
  const g = await makeBookPlan({ kind: "heart" }),
    bad = structuredClone(g);
  bad.leaves.find((l) => l.top)!.top!.reflected[0] = -5;
  await expect(validateBookPlan(bad)).rejects.toThrow("book/provenance");
  const altered = structuredClone(g);
  altered.sourceBits[0] = 1;
  await expect(validateBookPlan(altered)).rejects.toThrow("book/provenance");
  expect(() => bookLeafSvg(g, 0)).toThrow("book/step");
});
it("exports the same leaf marks in localized PDF and a physical SVG with a 50 mm calibration", async () => {
  const g = await makeBookPlan({ kind: "heart" });
  const bytes = await bookPdf(g, "uz-Cyrl", fonts.sans),
    doc = await PDFDocument.load(bytes);
  expect(doc.getSubject()).toBe(g.sequenceHash);
  expect(doc.getPages()).toHaveLength(7);
  expect(doc.getPages()[1].getWidth()).toBeCloseTo((170 * 72) / 25.4);
  expect(doc.getPages()[1].getHeight()).toBeCloseTo((265 * 72) / 25.4);
  expect(bookLeafSvg(g, 1)).toContain('width="160mm"');
  expect(bookLeafSvg(g, 1)).toContain("h50");
  mkdirSync("output/current-book/unit", { recursive: true });
  writeFileSync("output/current-book/unit/book-cyrl.pdf", bytes);
});
