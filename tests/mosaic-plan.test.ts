import { expect, it } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import {
  generateGrid,
  newGridProject,
  mosaicLayout,
  validateGridProject,
  gridFile,
  parseGridProject,
  replaceGridCell,
  gridCounts,
} from "../src/core/grid-craft";
import {
  mosaicPlan,
  mosaicPlanSvg,
  EXTENDED_GRID_COLORS,
} from "../src/core/mosaic-plan";
import { mosaicPdf } from "../src/core/mosaic-pdf";
async function fixture() {
  const g = await generateGrid(
    Uint8Array.from({ length: 10 * 9 * 3 }, (_, i) =>
      Math.floor(i / 3) % 2 ? 245 : 18,
    ),
    10,
    9,
    {
      kind: "mosaic",
      pitchMm: 8,
      sparePercent: 10,
      provisional: true,
      palette: [
        { code: "BLACK", hex: "#111111", stock: 100 },
        { code: "WHITE", hex: "#fafafa", stock: 100 },
      ],
    },
  );
  const p = newGridProject(g, "Local mosaic");
  p.layout = await mosaicLayout(g, 4, 4, 9);
  return p;
}
it("covers each genuine serpentine step exactly once with local coordinates, per-plate inventory and global progress", async () => {
  const p = await fixture();
  p.progress.confirmed = 17;
  const plan = mosaicPlan(p);
  expect(plan.required).toBe(9);
  expect(plan.unusedStuds).toBe(54);
  expect(plan.boardWidthMm).toBe(96);
  expect(plan.pictureWidthMm).toBe(80);
  expect(plan.plates.reduce((sum, plate) => sum + plate.confirmed, 0)).toBe(17);
  const actual = plan.plates
    .flatMap((plate) => plate.steps.map((s) => s.step))
    .sort((a, b) => a - b);
  expect(actual).toEqual(Array.from({ length: 90 }, (_, i) => i + 1));
  expect(plan.steps[10]).toMatchObject({
    step: 11,
    globalRow: 2,
    globalColumn: 10,
    plate: "A3",
    row: 2,
    column: 2,
  });
  for (const color of gridCounts(p.guide))
    expect(
      plan.plates.reduce(
        (sum, plate) =>
          sum + plate.counts.find((c) => c.code === color.code)!.used,
        0,
      ),
    ).toBe(color.used);
  expect(plan.inventory.reduce((n, c) => n + c.spares, 0)).toBe(10);
});
it("refuses missing stock and layout/provenance edits while preserving old projects and exact guide hashes", async () => {
  const p = await fixture(),
    hash = p.guide.sequenceHash;
  await expect(mosaicLayout(p.guide, 4, 4, 8)).rejects.toThrow(/Insufficient/);
  await expect(mosaicLayout(p.guide, 0, 4, 100)).rejects.toThrow(/Invalid/);
  expect(JSON.parse(gridFile(p)).schema).toBe("iprasm.grid-project/2");
  expect((await parseGridProject(gridFile(p))).guide.sequenceHash).toBe(hash);
  const altered = structuredClone(p);
  altered.layout!.stock++;
  await expect(validateGridProject(altered)).rejects.toThrow(/provenance/);
  const old = newGridProject(p.guide, "Old guide");
  expect(JSON.parse(gridFile(old)).schema).toBe("iprasm.grid-project/1");
  await expect(parseGridProject(gridFile(old))).resolves.toMatchObject({
    guide: { sequenceHash: hash },
  });
  const cell = p.guide.cells[0] === 0 ? 1 : 0,
    edited = await replaceGridCell(p.guide, 0, cell);
  await expect(validateGridProject({ ...p, guide: edited })).rejects.toThrow();
  expect(p.guide.sequenceHash).toBe(hash);
});
it("keeps a finite original 24-color palette and exact physical SVG dimensions/calibration", async () => {
  expect(EXTENDED_GRID_COLORS).toHaveLength(24);
  expect(new Set(EXTENDED_GRID_COLORS).size).toBe(24);
  const p = await fixture(),
    svg = mosaicPlanSvg(p);
  expect(svg).toContain('width="96mm" height="118mm"');
  expect(svg).toContain(p.guide.sequenceHash);
  expect(svg).toContain(p.layout!.hash);
  expect(svg).toContain("h50");
  expect(svg).not.toMatch(/script|onload|foreignObject/);
});
it("produces a bounded localized cover, global inventory and one genuine chart per baseplate", async () => {
  const p = await fixture(),
    bytes = await mosaicPdf(
      p,
      "uz-Cyrl",
      readFileSync("public/fonts/NotoSans-Regular.ttf"),
    ),
    doc = await PDFDocument.load(bytes);
  expect(doc.getPageCount()).toBe(11);
  expect(doc.getSubject()).toContain(p.layout!.hash);
  mkdirSync("output/current-mosaic", { recursive: true });
  writeFileSync("output/current-mosaic/unit-baseplates.pdf", bytes);
});
