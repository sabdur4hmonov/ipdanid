import { it, expect } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { generate } from "../src/core/engine";
import { createProfile } from "../src/core/geometry";
import { exportPdf } from "../src/core/pdf";
it("exports localized actual-size A4 tiled geometry and immutable hash metadata", async () => {
  const n = 48,
    pixels = new Uint8Array(n * n * 3).fill(110);
  const i = await generate({
    pixels,
    resolution: n,
    profile: createProfile("circle", 60),
    lines: 80,
    mode: "dark",
  });
  const bytes = await exportPdf(i, "ru", {
    confirmed: 2,
    fontBytes: new Uint8Array(
      readFileSync("public/fonts/NotoSans-Regular.ttf"),
    ),
  });
  const doc = await PDFDocument.load(bytes);
  expect(doc.getSubject()).toBe(`Sequence SHA-256: ${i.sequenceHash}`);
  expect(doc.getPageCount()).toBeGreaterThanOrEqual(9);
  await expect(
    exportPdf(i, "ru", { confirmed: i.metrics.lines + 1 }),
  ).rejects.toThrow("Invalid PDF progress");
  expect(doc.getPages()[1].getWidth()).toBeCloseTo((210 * 72) / 25.4, 3);
  mkdirSync("output/pdf", { recursive: true });
  writeFileSync("output/pdf/verification-guide.pdf", bytes);
  writeFileSync(
    "output/pdf/verification-instruction.json",
    JSON.stringify(i, null, 2),
  );
});
