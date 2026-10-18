import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  validateGridProject,
  gridCounts,
  gridCell,
  gridSymbol,
  type GridProject,
} from "./grid-craft";
import { gridText } from "../grid-i18n";
import type { Locale } from "./types";
import { craftPolishText } from "../craft-polish-i18n";
export async function gridPdf(
  p: GridProject,
  locale: Locale = "en",
  fontBytes?: Uint8Array,
) {
  await validateGridProject(p);
  const g = p.guide,
    t = (k: Parameters<typeof gridText>[1]) => gridText(locale, k),
    doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    fontBytes ??
      new Uint8Array(
        await (await fetch("/fonts/NotoSans-Regular.ttf")).arrayBuffer(),
      ),
    { subset: true },
  );
  doc.setTitle("Ip Rasm " + t(g.profile.kind));
  doc.setSubject("Grid SHA-256: " + g.sequenceHash);
  const page = () => doc.addPage([595.276, 841.89]),
    text = (p: PDFPage, s: string, x: number, y: number, size = 9) =>
      p.drawText(s, { x, y, size, font }),
    hex = (s: string) =>
      rgb(
        ...([1, 3, 5].map((k) => parseInt(s.slice(k, k + 2), 16) / 255) as [
          number,
          number,
          number,
        ]),
      );
  const wrap = (p: PDFPage, s: string, y: number) => {
    let line = "";
    for (const word of s.split(" ")) {
      if (font.widthOfTextAtSize(line + " " + word, 9) > 495) {
        text(p, line, 50, y);
        line = word;
        y -= 16;
      } else line += (line ? " " : "") + word;
    }
    text(p, line, 50, y);
    return y - 25;
  };
  const cover = page();
  text(cover, "Ip Rasm · " + t(g.profile.kind), 50, 785, 18);
  let y = 755;
  for (const s of [
    p.name,
    t("physical"),
    `${g.columns} x ${g.rows} · ${g.columns * g.profile.pitchMm} x ${g.rows * g.profile.pitchMm} mm · ${g.profile.pitchMm} mm`,
    `${t("progress")}: ${p.progress.confirmed}/${g.cells.length}`,
    t("order"),
    t("chart"),
    t("print"),
    ...(g.profile.diamond
      ? [
          `${craftPolishText(locale, g.profile.diamond.style)} · ${g.profile.diamond.sizeMm} mm`,
          `${craftPolishText(locale, g.profile.diamond.attachment === "adhesive" ? "adhesive" : "magnetic")} · ${g.profile.diamond.backingMm} mm`,
        ]
      : []),
  ])
    y = wrap(cover, s, y);
  const legend = page();
  text(legend, t("counts"), 50, 790, 18);
  y = 755;
  for (const c of gridCounts(g)) {
    text(
      legend,
      `${gridSymbol(g.profile.palette.indexOf(g.profile.palette.find((v) => v.code === c.code)!))}  ${c.code}  ${c.hex}  ${t("used")}:${c.used}  ${t("extra")}:${c.spares}  ${t("stock")}:${c.stock}`,
      50,
      y,
      8,
    );
    y -= 17;
  }
  text(cover, g.sequenceHash, 50, 40, 7);
  const size = (5 * 72) / 25.4,
    tileCols = 32,
    tileRows = 40;
  for (let row = 0; row < g.rows; row += tileRows)
    for (let col = 0; col < g.columns; col += tileCols) {
      const p = page();
      text(p, t("chart"), 50, 792, 10);
      text(
        p,
        `${t("row")} ${row + 1}..${Math.min(g.rows, row + tileRows)}; ${t("column")} ${col + 1}..${Math.min(g.columns, col + tileCols)}`,
        50,
        768,
        10,
      );
      for (let y = row; y < Math.min(g.rows, row + tileRows); y++) {
        text(p, String(y + 1), 30, 725 - (y - row) * size, 7);
        for (let x = col; x < Math.min(g.columns, col + tileCols); x++) {
          const id = g.cells[y * g.columns + x],
            color = g.profile.palette[id],
            px = 50 + (x - col) * size,
            py = 720 - (y - row) * size;
          p.drawRectangle({
            x: px,
            y: py,
            width: size,
            height: size,
            color: hex(color.hex),
            borderColor: rgb(0.6, 0.6, 0.6),
            borderWidth: 0.25,
          });
          const channels = [1, 3, 5].map((k) =>
              parseInt(color.hex.slice(k, k + 2), 16),
            ),
            light =
              channels[0] * 0.2126 +
              channels[1] * 0.7152 +
              channels[2] * 0.0722;
          p.drawText(gridSymbol(id), {
            x: px + size * 0.28,
            y: py + size * 0.23,
            size: 7,
            font,
            color: light > 140 ? rgb(0, 0, 0) : rgb(1, 1, 1),
          });
          if (y === row) text(p, String(x + 1), px + size * 0.2, 743, 6);
        }
      }
      text(p, g.sequenceHash, 50, 40, 7);
    }
  let current: PDFPage | undefined;
  for (let step = 1; step <= g.cells.length; step++) {
    const offset = (step - 1) % 40;
    if (offset === 0) {
      current = page();
      text(current, t("step"), 50, 790, 12);
      wrap(current, t("order"), 768);
      text(current, g.sequenceHash, 50, 40, 7);
    }
    const c = gridCell(g, step);
    text(
      current!,
      `${step}. R${c.row} C${c.column} ${c.symbol} ${c.color.code} ${c.color.hex}`,
      50,
      700 - offset * 15,
      10,
    );
  }
  const pages = doc.getPages();
  pages.forEach((p, j) => text(p, `${j + 1}/${pages.length}`, 500, 25, 8));
  return doc.save();
}
