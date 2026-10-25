import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { validateBookPlan, type BookPlan } from "./book-folding";
import { bookText } from "../book-i18n";
import type { Locale } from "./types";
const mm = 72 / 25.4;
export async function bookPdf(
  value: BookPlan,
  locale: Locale,
  fontBytes?: Uint8Array,
) {
  const g = await validateBookPlan(value),
    doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    fontBytes ??
      new Uint8Array(
        await (await fetch("/fonts/NotoSans-Regular.ttf")).arrayBuffer(),
      ),
    { subset: true },
  );
  doc.setTitle("Ip Rasm - " + bookText(locale,"title"));
  doc.setSubject(g.sequenceHash);
  const t = (k: Parameters<typeof bookText>[1]) => bookText(locale, k);
  const text = (
    p: ReturnType<typeof doc.addPage>,
    s: string,
    x: number,
    y: number,
    size = 9,
  ) => p.drawText(s, { x, y, size, font });
  const wrap = (p: ReturnType<typeof doc.addPage>, s: string, y: number) => {
    let line = "";
    for (const word of s.split(" ")) {
      if (font.widthOfTextAtSize(line + " " + word, 9) > 500) {
        text(p, line, 45, y);
        y -= 14;
        line = word;
      } else line += (line ? " " : "") + word;
    }
    text(p, line, 45, y);
    return y - 24;
  };
  const cover = doc.addPage([595.276, 841.89]);
  text(cover, t("title"), 45, 790, 17);
  let y = wrap(cover, t("intro"), 758);
  y = wrap(cover, t("physical"), y);
  y = wrap(
    cover,
    `${t("used")}: ${g.leaves.length}/${g.params.availableLeaves}. ${t("start")}: ${g.startLeaf}. ${t("lane")}: ${g.lanes}.`,
    y,
  );
  const scale = Math.min(
      450 / g.params.artWidthMm,
      (y - 90) / g.params.pageHeightMm,
    ),
    ox = 70,
    oy = 80;
  cover.drawRectangle({
    x: ox,
    y: oy,
    width: g.params.artWidthMm * scale,
    height: g.params.pageHeightMm * scale,
    color: rgb(0.15, 0.23, 0.2),
  });
  for (const [i, leaf] of g.leaves.entries())
    if (leaf.band)
      cover.drawRectangle({
        x: ox + i * g.leafPitchMm * scale,
        y: oy + (g.params.pageHeightMm - leaf.band[1]) * scale,
        width: g.leafPitchMm * 0.9 * scale,
        height: (leaf.band[1] - leaf.band[0]) * scale,
        color: rgb(1, 0.977, 0.874),
      });
  text(cover, g.sequenceHash, 45, 35, 7);
  // One explicit 1:1 example, not a rescaled A4 illustration. All remaining
  // leaves are listed with exact crease endpoints in the following table.
  const first = g.leaves.findIndex((l) => l.band),
    leaf = g.leaves[first],
    p = g.params;
  const example = doc.addPage([
    (p.pageWidthMm + 20) * mm,
    (p.pageHeightMm + 45) * mm,
  ]);
  const left = 10 * mm,
    top = (p.pageHeightMm + 30) * mm;
  text(
    example,
    `${t("leaf")} ${leaf.leaf} / ${t("face")} ${leaf.pageFace} - 100%`,
    left,
    top + 6 * mm,
    10,
  );
  example.drawRectangle({
    x: left,
    y: top - p.pageHeightMm * mm,
    width: p.pageWidthMm * mm,
    height: p.pageHeightMm * mm,
    borderColor: rgb(0.2, 0.2, 0.2),
    borderWidth: 0.3 * mm,
  });
  for (const fold of [leaf.top!, leaf.bottom!])
    example.drawLine({
      start: {
        x: left + fold.crease[0][0] * mm,
        y: top - fold.crease[0][1] * mm,
      },
      end: {
        x: left + fold.crease[1][0] * mm,
        y: top - fold.crease[1][1] * mm,
      },
      color: rgb(0.75, 0.2, 0.15),
      thickness: 0.5 * mm,
    });
  example.drawLine({
    start: { x: left + p.spineMarginMm * mm, y: top },
    end: { x: left + p.spineMarginMm * mm, y: top - p.pageHeightMm * mm },
    thickness: 0.2 * mm,
    dashArray: [2 * mm, 2 * mm],
  });
  example.drawLine({
    start: { x: left, y: 10 * mm },
    end: { x: left + 50 * mm, y: 10 * mm },
    thickness: 0.3 * mm,
  });
  text(example, "50 mm - 100%", left, 4 * mm, 8);
  // Paired rows leave enough room for translated headings, explicit endpoints
  // and blank-leaf instructions without abbreviating the physical method.
  for (let start = 0; start < g.leaves.length; start += 18) {
    const page = doc.addPage([595.276, 841.89]);
    text(page, t("title"), 45, 790, 16);
    let rowY = wrap(
      page,
      `${t("top")} / ${t("bottom")}: mm. ${t("edge")}: mm.`,
      760,
    );
    for (let i = start; i < Math.min(start + 18, g.leaves.length); i++) {
      const l = g.leaves[i];
      text(
        page,
        `${i + 1}. ${t("leaf")} ${l.leaf} / ${t("face")} ${l.pageFace}`,
        45,
        rowY,
        10,
      );
      const detail = l.band
        ? `${l.band[0]} / ${l.band[1]} mm; ${t("edge")}: ${+(p.pageWidthMm - l.top!.crease[1][0]).toFixed(6)} / ${+(p.pageWidthMm - l.bottom!.crease[1][0]).toFixed(6)} mm`
        : `${t("blank")}: ${p.insetMm} mm`;
      text(page, detail, 55, rowY - 14, 8);
      rowY -= 35;
    }
    text(page, g.sequenceHash, 45, 35, 7);
  }
  return doc.save();
}
