import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { validateGridProject, type GridProject } from "./grid-craft";
import { mosaicPlan } from "./mosaic-plan";
import { craftPolishText } from "../craft-polish-i18n";
import { gridText } from "../grid-i18n";
import type { Locale } from "./types";
export async function mosaicPdf(
  project: GridProject,
  locale: Locale,
  fontBytes?: Uint8Array,
) {
  await validateGridProject(project);
  const plan = mosaicPlan(project),
    doc = await PDFDocument.create(),
    t = (k: Parameters<typeof craftPolishText>[1]) =>
      craftPolishText(locale, k),
    g = project.guide;
  doc.registerFontkit(fontkit);
  if (!fontBytes) {
    const r = await fetch("/fonts/NotoSans-Regular.ttf");
    if (!r.ok) throw Error("Print font unavailable");
    fontBytes = new Uint8Array(await r.arrayBuffer());
  }
  const font = await doc.embedFont(fontBytes, { subset: true }),
    color = (hex: string) =>
      rgb(
        ...([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
          number,
          number,
          number,
        ]),
      );
  doc.setTitle("Ip Rasm - " + t("plates"));
  doc.setSubject(`Grid:${plan.sequenceHash}; Layout:${plan.layoutHash}`);
  const page = (title: string) => {
    const p = doc.addPage([595.276, 841.89]);
    p.drawText(title, {
      x: 40,
      y: 790,
      size: 18,
      font,
      color: rgb(0.09, 0.21, 0.32),
    });
    p.drawText(plan.sequenceHash, { x: 40, y: 23, size: 6, font });
    p.drawText(String(doc.getPageCount()), { x: 540, y: 23, size: 8, font });
    return p;
  };
  const text = (p: PDFPage, s: string, x: number, y: number, size = 10) =>
    p.drawText(s, { x, y, size, font });
  const wrap = (p: PDFPage, s: string, y: number) => {
    let line = "";
    for (const c of s.split(/\s+/)) {
      if (line && font.widthOfTextAtSize(line + " " + c, 10) > 500) {
        text(p, line, 40, y);
        y -= 16;
        line = c;
      } else line += (line ? " " : "") + c;
    }
    text(p, line, 40, y);
    return y - 26;
  };
  const cover = page(t("plates"));
  let y = 752;
  y = wrap(
    cover,
    `${plan.required}/${plan.stock} · ${plan.plateColumns} x ${plan.plateRows} · ${g.profile.pitchMm} mm`,
    y,
  );
  y = wrap(
    cover,
    `${t("board")}: ${plan.boardWidthMm} x ${plan.boardHeightMm} mm`,
    y,
  );
  y = wrap(
    cover,
    `${gridText(locale, "size")}: ${plan.pictureWidthMm} x ${plan.pictureHeightMm} mm`,
    y,
  );
  y = wrap(cover, `${t("unused")}: ${plan.unusedStuds}`, y);
  y = wrap(cover, t("blank"), y);
  y = wrap(cover, t("diagram"), y);
  const scale = Math.min(
      500 / plan.boardWidthMm,
      Math.min(240, y - 95) / plan.boardHeightMm,
    ),
    pitch = g.profile.pitchMm;
  cover.drawRectangle({
    x: 40,
    y: y - plan.boardHeightMm * scale,
    width: plan.boardWidthMm * scale,
    height: plan.boardHeightMm * scale,
    color: rgb(0.93, 0.93, 0.93),
  });
  g.cells.forEach((v, i) =>
    cover.drawRectangle({
      x: 40 + (i % g.columns) * pitch * scale,
      y: y - (Math.floor(i / g.columns) + 1) * pitch * scale,
      width: pitch * scale,
      height: pitch * scale,
      color: color(g.profile.palette[v].hex),
    }),
  );
  for (const plate of plan.plates) {
    const x = 40 + plate.column * plan.plateColumns * pitch * scale,
      top = y - plate.row * plan.plateRows * pitch * scale;
    cover.drawRectangle({
      x,
      y: top - plan.plateRows * pitch * scale,
      width: plan.plateColumns * pitch * scale,
      height: plan.plateRows * pitch * scale,
      borderWidth: 0.8,
      borderColor: rgb(0.09, 0.21, 0.32),
    });
    const labelSize = Math.min(8, (plan.plateColumns * pitch * scale) / 3.5),
      labelWidth = font.widthOfTextAtSize(plate.id, labelSize) + 4;
    cover.drawRectangle({
      x: x + 1,
      y: top - labelSize - 4,
      width: labelWidth,
      height: labelSize + 3,
      color: rgb(1, 1, 1),
      borderWidth: 0.3,
      borderColor: rgb(0.09, 0.21, 0.32),
    });
    text(cover, plate.id, x + 3, top - labelSize - 2, labelSize);
  }
  const inventory = page(gridText(locale, "counts"));
  y = 750;
  for (const c of plan.inventory) {
    inventory.drawRectangle({
      x: 40,
      y: y - 2,
      width: 10,
      height: 10,
      color: color(c.hex),
      borderWidth: 0.4,
      borderColor: rgb(0.4, 0.4, 0.4),
    });
    text(
      inventory,
      `${c.code}  ${c.hex}   ${gridText(locale, "used")}:${c.used}  +${c.spares}   /${c.stock}`,
      60,
      y,
      9,
    );
    y -= 19;
  }
  for (const plate of plan.plates) {
    const p = page(`${t("plate")} ${plate.id}`);
    text(
      p,
      `${plate.confirmed}/${plate.steps.length} · ${plan.plateColumns} x ${plan.plateRows}`,
      40,
      751,
    );
    text(p, t("diagram"), 40, 730, 9);
    const size = Math.min(460 / plan.plateColumns, 285 / plan.plateRows),
      x = 68,
      top = 700;
    p.drawRectangle({
      x,
      y: top - plan.plateRows * size,
      width: plan.plateColumns * size,
      height: plan.plateRows * size,
      color: rgb(0.94, 0.94, 0.94),
    });
    for (let i = 1; i <= plan.plateColumns; i++)
      text(
        p,
        String(i),
        x + (i - 0.8) * size,
        top + 5,
        Math.min(7, size * 0.55),
      );
    for (let i = 1; i <= plan.plateRows; i++)
      text(
        p,
        String(i),
        x - 19,
        top - (i - 0.2) * size,
        Math.min(7, size * 0.55),
      );
    for (const step of plate.steps) {
      const cx = x + (step.column - 1) * size,
        cy = top - step.row * size;
      p.drawRectangle({
        x: cx,
        y: cy,
        width: size,
        height: size,
        color: color(step.hex),
        borderWidth: 0.2,
        borderColor: rgb(0.5, 0.5, 0.5),
      });
      const luminance = [1, 3, 5]
        .map((i) => parseInt(step.hex.slice(i, i + 2), 16))
        .reduce((a, b) => a + b, 0);
      p.drawText(step.symbol, {
        x: cx + size * 0.2,
        y: cy + size * 0.2,
        size: Math.min(10, size * 0.6),
        font,
        color: luminance < 380 ? rgb(1, 1, 1) : rgb(0, 0, 0),
      });
    }
    y = top - plan.plateRows * size - 26;
    text(
      p,
      `${gridText(locale, "row")}: ${plate.row * plan.plateRows + 1}..${Math.min(g.rows, (plate.row + 1) * plan.plateRows)}  ${gridText(locale, "column")}: ${plate.column * plan.plateColumns + 1}..${Math.min(g.columns, (plate.column + 1) * plan.plateColumns)}`,
      40,
      y,
      9,
    );
    y -= 22;
    plate.counts
      .filter((c) => c.used)
      .forEach((c, i) =>
        text(
          p,
          `${c.code} ${c.hex}: ${c.used}`,
          40 + (i % 2) * 250,
          y - Math.floor(i / 2) * 14,
          9,
        ),
      );
  }
  return doc.save();
}
