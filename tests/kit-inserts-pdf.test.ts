import { test, expect } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { kitInsertsPdf } from "../src/kit-inserts-pdf";
import type { KitBatch } from "../src/kit-inserts";
import { newEvidenceRoot } from "./helpers/evidence-paths";
import { join } from "node:path";
const batch: KitBatch = {
  id: "SYNTHETIC-PDF-ONLY",
  profile: "standard-base-r1",
  codes: Array.from({ length: 7 }, (_, k) => ({
    code: ("FAKE-KIT-PDF-" + String(k).padStart(3, "0") + "-").padEnd(32, "X"),
    quota: k === 6 ? 4 : 3,
    expiresAt: null,
    creditDays: [0, 30, 3650][k % 3],
  })),
};
test("kit inserts are paginated A4 PDFs with actual vector QR and embedded four-locale text", async () => {
  const bytes = new Uint8Array(
    readFileSync("public/fonts/NotoSans-Regular.ttf"),
  );
  const root = newEvidenceRoot("output/current-kit-inserts");
  mkdirSync(root, { recursive: true });
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    const data = await kitInsertsPdf(batch, locale, bytes),
      pdf = await PDFDocument.load(data);
    expect(pdf.getPageCount()).toBe(2);
    expect(pdf.getPages()[0].getWidth()).toBeCloseTo((210 * 72) / 25.4);
    expect(pdf.getPages()[0].getHeight()).toBeCloseTo((297 * 72) / 25.4);
    writeFileSync(join(root, "kit-inserts-" + locale + ".pdf"), data);
  }
  await expect(
    kitInsertsPdf(
      { ...batch, codes: [batch.codes[0], batch.codes[0]] },
      "uz",
      bytes,
    ),
  ).rejects.toThrow();
  await expect(
    kitInsertsPdf(
      { ...batch, codes: [{ ...batch.codes[0], code: "bad" }] },
      "uz",
      bytes,
    ),
  ).rejects.toThrow();
}, 30000);

test("partner cards preserve actual codes and A4 pagination while encoding recipient links", async () => {
  const font = new Uint8Array(
      readFileSync("public/fonts/NotoSans-Regular.ttf"),
    ),
    root = newEvidenceRoot("output/current-kit-inserts");
  mkdirSync(root, { recursive: true });
  const data = await kitInsertsPdf(batch, "en", font, "https://craft.example"),
    pdf = await PDFDocument.load(data);
  expect(pdf.getPageCount()).toBe(2);
  writeFileSync(join(root, "partner-claim-links.pdf"), data);
  await expect(
    kitInsertsPdf(batch, "en", font, "http://external.example"),
  ).rejects.toThrow("origin");
}, 30000);
