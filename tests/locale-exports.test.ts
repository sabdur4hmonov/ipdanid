import { expect, test } from "vitest";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import {
  PDFDocument,
  PDFName,
  PDFArray,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { standardKitPdf } from "../src/core/standard-kit-pdf";
import fontkit from "@pdf-lib/fontkit";
import { generateClassic } from "../src/core/classic";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
} from "../src/core/standard-kit";
import { toTxt, fromFile } from "../src/core/validation";
import { exportPdf } from "../src/core/pdf";
import { exportText } from "../src/export-i18n";
import { uiText } from "../src/ui-i18n";
import { customerError } from "../src/errors";
test("all four TXT/PDF languages preserve exact hash, numeric steps, Latin sectors and thread color IDs", async () => {
  const guide = await generateClassic({
    profile: standardProfiles(DEFAULT_STANDARD_KIT)[0],
    pixels: new Uint8Array(32 * 32 * 3).fill(150),
    resolution: 32,
    lines: 40,
    mode: "dark",
  });
  const fontBytes = new Uint8Array(
      readFileSync("public/fonts/NotoSans-Regular.ttf"),
    ),
    font = fontkit.create(fontBytes);
  const out = "output/current-locale-exports";
  mkdirSync(out, { recursive: true });
  const original = toTxt(guide),
    steps = original.split("\n").filter((l) => /^\d+ /.test(l));
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    const txt = toTxt(guide, locale);
    expect(txt.split("\n")[0]).toBe("IP_RASM_TXT_V1");
    expect(txt.split("\n")[1]).toBe(original.split("\n")[1]);
    expect(txt.split("\n").filter((l) => /^\d+ /.test(l))).toEqual(steps);
    expect((await fromFile(txt)).sequenceHash).toBe(guide.sequenceHash);
    expect(txt).toContain(exportText(locale, "columns"));
    const comment = exportText(locale, "segment", [
      1,
      "#ff0000",
      "B-17 [76]",
      "C-42 [161]",
    ]);
    expect(comment).toContain("#ff0000");
    expect(comment).toContain("B-17 [76]");
    expect(comment).toContain("C-42 [161]");
    expect(comment).not.toMatch(/\{\d+\}/);
    const errors = customerError(
      "Synthetic unseen diagnostic containing private implementation details",
      locale,
    );
    expect(errors).not.toContain("Synthetic");
    if (locale === "uz-Cyrl") expect(errors).toMatch(/[ЎҚҒҲўқғҳ]/);
    for (const char of uiText(locale, "top") + errors)
      if (/\p{L}/u.test(char))
        expect(font.glyphForCodePoint(char.codePointAt(0)!).id).toBeGreaterThan(
          0,
        );
    const pdf = await exportPdf(guide, locale, { fontBytes });
    const doc = await PDFDocument.load(pdf);
    expect(doc.getSubject()).toContain(guide.sequenceHash);
    writeFileSync(`${out}/${locale}.pdf`, pdf);
    writeFileSync(`${out}/${locale}.txt`, txt);
  }
});
test.each(["sheet", "tiles", "stickers"] as const)(
  "localized %s retains every exact physical path and Latin sector label",
  async (kind) => {
    const fontBytes = new Uint8Array(
      readFileSync("public/fonts/NotoSans-Regular.ttf"),
    );
    const paths = (doc: PDFDocument) =>
      doc.getPages().map((p) => {
        const streams = p.node.lookup(PDFName.of("Contents"), PDFArray);
        const content = streams
          .asArray()
          .map((s) =>
            Buffer.from(
              decodePDFRawStream(
                doc.context.lookup(s) as PDFRawStream,
              ).decode(),
            ).toString(),
          )
          .join("\n");
        return content.split("\n").filter((l) => / (?:m|l|c|re)$/.test(l));
      });
    const baseline = await PDFDocument.load(
      await standardKitPdf(DEFAULT_STANDARD_KIT, kind),
    );
    const exact = paths(baseline);
    for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
      const bytes = await standardKitPdf(DEFAULT_STANDARD_KIT, kind, {
          locale,
          fontBytes,
        }),
        doc = await PDFDocument.load(bytes);
      expect(paths(doc)).toEqual(exact);
      expect(doc.getPages().map((p) => p.getSize())).toEqual(
        baseline.getPages().map((p) => p.getSize()),
      );
      mkdirSync("output/current-locale-exports", { recursive: true });
      writeFileSync(
        `output/current-locale-exports/board-${kind}-${locale}.pdf`,
        bytes,
      );
    }
  },
  30000,
);
