import { expect, test } from "vitest";
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { boardCoordinateCsv } from "../scripts/board-coordinate-csv";
import {
  combinedHoles, DEFAULT_STANDARD_KIT, standardProfiles, threadMeasurementWarning,
} from "../src/core/standard-kit";
import { standardKitPdf } from "../src/core/standard-kit-pdf";
import { KitStore } from "../server/kit-store";

const mm = 72 / 25.4;
const csv = boardCoordinateCsv(combinedHoles(standardProfiles(DEFAULT_STANDARD_KIT)));
test.each(["circle", "rectangle", "heart"] as const)("A3 %s pin paths match the exported CSV", async (shape) => {
  const rows = csv.trimEnd().split("\n").slice(1).map(row => row.split(","));
  const expected = new Map(rows.filter(row => row[0] === shape).map(([, id, , label, x, y]) =>
    [Number(id), { label, x: Number(x), y: Number(y) }]));
  const pdf = await PDFDocument.load(await standardKitPdf(DEFAULT_STANDARD_KIT, "quadrants", { shape }));
  const pages = pdf.getPages();
  expect(pages).toHaveLength(5);
  expect(expected.size).toBe(240);
  let checked = 0;
  for (const [i, page] of pages.slice(1).entries()) {
    const [col, row] = [[1,0],[1,1],[0,1],[0,0]][i];
    expect(page.getWidth() / mm).toBeCloseTo(297, 6);
    expect(page.getHeight() / mm).toBeCloseTo(420, 6);
    const content = (page.node.Contents() as PDFArray).asArray().map(ref =>
      new TextDecoder().decode(decodePDFRawStream(pdf.context.lookup(ref) as PDFRawStream).decode()),
    ).join("\n");
    const fullFrame = `${23.5 * mm} ${85 * mm} ${250 * mm} ${250 * mm} re`;
    expect(content).toContain(fullFrame);
    // These are the actual cubic Bézier path extremities of each pin mark,
    // so drift in the printed x/y (even with correct metadata) fails.
    for (const [, id, circle] of content.matchAll(/\/Pin-(\d+) BMC\s+([\s\S]*?)EMC/g)) {
      const pin = expected.get(Number(id));
      expect(pin).toBeDefined();
      const edges = [...circle.matchAll(/^([\d.]+) ([\d.]+).*? [mc]$/gm)]
        .map((match) => Number(match[1]));
      const [xLeft, yMid] = circle.match(/^([\d.]+) ([\d.]+) m$/m)!.slice(1).map(Number);
      const xRight = Math.max(...edges);
      const x = ((xLeft + xRight) / 2) / mm - 23.5 + col * 250;
      const y = 420 - yMid / mm - 85 + row * 250;
      expect(Math.hypot(x - pin!.x, y - pin!.y), pin!.label).toBeLessThanOrEqual(0.01);
      expected.delete(Number(id));
      checked++;
    }
  }
  expect(checked).toBe(240);
  expect(expected.size).toBe(0);
});

test("measured thread is versioned metadata and keeps every physical setting", () => {
  const store = new KitStore(":memory:", "sandbox-measurement-pepper".repeat(2), "sandbox-measurement-payment".repeat(2));
  try {
    const original = store.standardKit();
    const saved = store.setStandardKit("admin", { ...original, measuredThreadMm: 0.22 });
    expect(saved.revision).toBe(2);
    expect(store.standardKit(1)).toEqual(original);
    expect(store.standardKit(2).measuredThreadMm).toBe(0.22);
    expect(standardProfiles(saved).map(p => ({ pins: p.pins, thread: p.threadMm, opacity: p.opacity })))
      .toEqual(standardProfiles(original).map(p => ({ pins: p.pins, thread: p.threadMm, opacity: p.opacity })));
    expect(threadMeasurementWarning(0.08999)).toBe("measuredThinner");
    expect(threadMeasurementWarning(0.15001)).toBe("measuredThicker");
    expect(threadMeasurementWarning(0.09)).toBeUndefined();
    expect(threadMeasurementWarning(0.15)).toBeUndefined();
    expect(() => store.setStandardKit("admin", { ...saved, measuredThreadMm: -1 })).toThrow();
    expect(() => store.setStandardKit("admin", { ...saved, measuredThreadMm: 0.51 })).toThrow();
  } finally { store.close(); }
});
