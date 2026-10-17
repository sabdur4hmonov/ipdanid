import { it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import fontkit from "@pdf-lib/fontkit";
import { bidiTextRuns } from "../src/core/bidi-runs";
import { shapeText } from "../src/core/mixed-lettering";
import {
  LETTERING_FONTS,
  shapeLettering,
  rasterLettering,
} from "../src/core/lettering";
import {
  letteringProduct,
  generateGlyphOutline,
} from "../src/core/lettering-guide";
import { validLetteringProduct } from "../src/core/lettering-contract";
import { validateInstruction, toTxt, fromFile } from "../src/core/validation";
import { hash, sequencePayload } from "../src/core/engine";
const fonts = Object.fromEntries(
  Object.entries(LETTERING_FONTS).map(([id, f]) => [
    id,
    new Uint8Array(readFileSync("public" + f.path)),
  ]),
) as Record<keyof typeof LETTERING_FONTS, Uint8Array>;
it("UAX9 orders visual runs while numeric strings remain LTR and Arabic input stays logical", () => {
  expect(bidiTextRuns("Ali سلام").runs.map((r) => r.text)).toEqual([
    "Ali ",
    "سلام",
  ]);
  expect(
    bidiTextRuns("سلام Ali")
      .runs.map((r) => r.text)
      .join(""),
  ).toBe("Ali سلام");
  const r = bidiTextRuns("علي ٢٠٢٦");
  expect(r.direction).toBe("rtl");
  expect(r.runs[0].text).toBe("٢٠٢٦");
  expect(r.runs[0].direction).toBe("ltr");
  expect(r.runs.at(-1)!.text).toBe("علي");
  expect(r.runs.at(-1)!.direction).toBe("rtl");
});
for (const text of [
  "Ali سلام 2026",
  "سلام Али 2026",
  "علي ٢٠٢٦",
  "Али (علي) 12-34",
  "بِسْمِ Ali",
]) {
  it(`${text}: pinned per-run fonts, contextual joining and deterministic real raster/provenance`, async () => {
    const board = { widthMm: 600, heightMm: 300, shape: "rectangle" as const },
      g = await shapeText(text, board, fonts),
      p = letteringProduct(g, "target");
    expect(g.version).toBe("shaped-bidi-paths/2");
    expect(g.fontRuns!.length).toBeGreaterThan(1);
    validLetteringProduct(p);
    expect(rasterLettering(g, 160)).toEqual(
      rasterLettering(await shapeText(text, board, fonts), 160),
    );
    const number = g.fontRuns!.find((r) => r.text === "٢٠٢٦");
    if (number)
      expect(number.glyphs).toEqual(
        fontkit
          .create(fonts.arabic)
          .glyphsForString("٢٠٢٦")
          .map((g) => g.id),
      );
    for (const change of [
      (x: typeof p) => {
        x.fontRuns![0].fontHash = "0".repeat(64);
      },
      (x: typeof p) => {
        x.fontRuns![0].direction =
          x.fontRuns![0].direction === "rtl" ? "ltr" : "rtl";
      },
      (x: typeof p) => {
        x.fontRuns![0].end++;
      },
    ]) {
      const altered = structuredClone(p);
      change(altered);
      expect(() => validLetteringProduct(altered)).toThrow();
    }
  });
}
it("mixed glyph outline keeps one actual continuous sequence through all old export guards", async () => {
  const i = await generateGlyphOutline({
    text: "A علي",
    fontBytes: fonts.arabic,
    fallbackFontBytes: fonts.sans,
    bidi: true,
    widthMm: 1200,
    heightMm: 600,
    count: 48,
    resolution: 64,
  });
  expect(i.params.product!.version).toBe("thread-lettering/2");
  await validateInstruction(i);
  expect((await fromFile(toTxt(i))).sequenceHash).toBe(i.sequenceHash);
  const bad = structuredClone(i);
  bad.params.product!.fontRuns![0].start++;
  bad.sequenceHash = await hash(sequencePayload(bad));
  await expect(validateInstruction(bad)).rejects.toThrow();
});
it("legacy single-script geometry and already issued caption1 guides remain valid", async () => {
  const g = await shapeLettering("سلام", fonts.arabic, {
    widthMm: 500,
    heightMm: 500,
    shape: "circle",
  });
  expect(g.version).toBe("shaped-glyph-paths/1");
  validLetteringProduct(letteringProduct(g, "target"));
  for (const shape of ["circle", "rectangle", "heart"]) {
    const file = `output/phase15/caption-v1/desktop/${shape}/guide.json`;
    if (existsSync(file))
      await validateInstruction(JSON.parse(readFileSync(file, "utf8")));
  }
  await expect(
    shapeText(
      "سلام😀",
      { widthMm: 500, heightMm: 500, shape: "circle" },
      fonts,
    ),
  ).rejects.toThrow();
});
