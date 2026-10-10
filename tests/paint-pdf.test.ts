import { it, expect } from "vitest";
import { generatePaint, newPaintProject, paintFile } from "../src/core/paint";
import { paintPdf } from "../src/core/paint-pdf";
import { PDFDocument } from "pdf-lib";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
it("exports physical multi-page paint contours with embedded UZ/RU/EN fonts and a nonsequential completion snapshot", async () => {
  const columns = 24,
    rows = 32,
    pitch = 8;
  const pixels = Uint8Array.from({ length: columns * rows * 3 }, (_, k) =>
      Math.floor(k / 3) % columns < 12 ? 255 : 0,
    ),
    g = await generatePaint(pixels, columns, rows, pitch, 8, [
      { code: "W", hex: "#ffffff" },
      { code: "B", hex: "#000000" },
    ]),
    p = newPaintProject(g, "Tiled paint verification");
  p.progress.completed = [1];
  p.progress.revision = 1;
  mkdirSync("output/paint", { recursive: true });
  writeFileSync("output/paint/tiled-guide.json", paintFile(p));
  for (const locale of ["uz", "ru", "en"] as const) {
    const bytes = await paintPdf(
        p,
        locale,
        new Uint8Array(readFileSync("public/fonts/NotoSans-Regular.ttf")),
      ),
      pdf = await PDFDocument.load(bytes);
    expect(pdf.getSubject()).toBe("Paint SHA-256: " + g.sequenceHash);
    expect(pdf.getPageCount()).toBe(6);
    writeFileSync(`output/paint/tiled-${locale}-guide.pdf`, bytes);
  }
  const tampered = structuredClone(p);
  tampered.progress.completed = [2];
  await expect(paintPdf(tampered)).rejects.toThrow("progress");
});
