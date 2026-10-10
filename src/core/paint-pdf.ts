import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  paintCoverage,
  paintEdges,
  validatePaintProject,
  type PaintProject,
} from "./paint";
import { paintText } from "../paint-i18n";
import type { Locale } from "./types";
export async function paintPdf(
  project: PaintProject,
  locale: Locale = "en",
  fontBytes?: Uint8Array,
) {
  await validatePaintProject(project);
  const g = project.guide,
    t = (k: Parameters<typeof paintText>[1]) => paintText(locale, k),
    doc = await PDFDocument.create(),
    mm = 72 / 25.4;
  doc.registerFontkit(fontkit);
  if (!fontBytes) {
    const response = await fetch("/fonts/NotoSans-Regular.ttf");
    if (!response.ok) throw Error("Print font unavailable");
    fontBytes = new Uint8Array(await response.arrayBuffer());
  }
  const font = await doc.embedFont(fontBytes, { subset: true }),
    page = () => doc.addPage([595.276, 841.89]);
  const text = (p: PDFPage, s: string, x: number, y: number, size = 9) =>
    p.drawText(s, { x, y, size, font });
  const wrap = (p: PDFPage, s: string, y: number) => {
    let line = "";
    for (const word of s.split(" ")) {
      if (font.widthOfTextAtSize(line + (line ? " " : "") + word, 9) > 490) {
        text(p, line, 45, y);
        line = word;
        y -= 15;
      } else line += (line ? " " : "") + word;
    }
    text(p, line, 45, y);
    return y - 24;
  };
  const cover = page();
  text(cover, "Ip Rasm · " + t("title"), 45, 792, 18);
  let y = 760;
  for (const s of [
    project.name,
    `${g.columns * g.pitchMm} x ${g.rows * g.pitchMm} mm · ${g.columns} x ${g.rows} · ${g.regions.length} ${t("region")}`,
    `${t("completed")}: ${project.progress.completed.length}/${g.regions.length}`,
    t("physical"),
    t("print"),
    t("intro"),
    ...(g.regions.some((r) => !r.labelFits) ? [t("missing")] : []),
  ])
    y = wrap(cover, s, y);
  text(cover, t("coverage"), 45, y, 12);
  y -= 25;
  for (const c of paintCoverage(g)) {
    text(
      cover,
      `${c.number}. ${c.code} ${c.hex} - ${c.areaCm2.toFixed(2)} cm² - ${c.regions} ${t("region")}`,
      45,
      y,
      9,
    );
    y -= 18;
  }
  const edges = paintEdges(g),
    width = g.columns * g.pitchMm,
    height = g.rows * g.pitchMm;
  // A4 true-size 170x220mm tiles with 5mm overlap, never scaled to fit.
  for (let top = 0; top < height; top += 215)
    for (let left = 0; left < width; left += 165) {
      const p = page(),
        tw = Math.min(170, width - left),
        th = Math.min(220, height - top),
        px = 45,
        py = 738;
      text(p, t("contours"), 45, 795, 13);
      text(
        p,
        `X ${left}..${left + tw} mm; Y ${top}..${top + th} mm`,
        45,
        773,
        10,
      );
      for (const e of edges) {
        let [x1, y1, x2, y2] = e.map((v) => v * g.pitchMm);
        if (y1 === y2) {
          if (y1 < top || y1 > top + th) continue;
          x1 = Math.max(x1, left);
          x2 = Math.min(x2, left + tw);
          if (x2 <= x1) continue;
        } else {
          if (x1 < left || x1 > left + tw) continue;
          y1 = Math.max(y1, top);
          y2 = Math.min(y2, top + th);
          if (y2 <= y1) continue;
        }
        p.drawLine({
          start: { x: px + (x1 - left) * mm, y: py - (y1 - top) * mm },
          end: { x: px + (x2 - left) * mm, y: py - (y2 - top) * mm },
          thickness: 0.18 * mm,
          color: rgb(0, 0, 0),
        });
      }
      for (const r of g.regions) {
        if (!r.labelFits) continue;
        const s = String(r.color + 1),
          size = 2.5 * mm,
          textWidth = font.widthOfTextAtSize(s, size),
          x = ((r.anchor % g.columns) + 0.5) * g.pitchMm,
          y = (Math.floor(r.anchor / g.columns) + 0.5) * g.pitchMm;
        if (
          x - textWidth / (2 * mm) < left ||
          x + textWidth / (2 * mm) > left + tw ||
          y - 1.25 < top ||
          y + 1.25 > top + th
        )
          continue;
        text(
          p,
          s,
          px + (x - left) * mm - textWidth / 2,
          py - (y - top) * mm - size * 0.35,
          size,
        );
      }
      // Corner crosses and matching absolute coordinates give verifiable alignment.
      for (const [x, y] of [
        [0, 0],
        [tw, 0],
        [0, th],
        [tw, th],
      ]) {
        const cx = px + x * mm,
          cy = py - y * mm;
        p.drawLine({
          start: { x: cx - 3, y: cy },
          end: { x: cx + 3, y: cy },
          thickness: 0.4,
        });
        p.drawLine({
          start: { x: cx, y: cy - 3 },
          end: { x: cx, y: cy + 3 },
          thickness: 0.4,
        });
      }
      p.drawLine({
        start: { x: 45, y: 77 },
        end: { x: 45 + 50 * mm, y: 77 },
        thickness: 1,
      });
      for (const x of [45, 45 + 50 * mm])
        p.drawLine({ start: { x, y: 73 }, end: { x, y: 81 }, thickness: 1 });
      text(p, "50 mm", 45, 88, 9);
    }
  let ref: PDFPage | undefined;
  for (let index = 0; index < g.regions.length; index++) {
    const offset = index % 25,
      r = g.regions[index];
    if (offset === 0) {
      ref = page();
      text(ref, t("instructions"), 45, 793, 13);
      wrap(ref, `${t("position")} · ${t("color")} · ${t("area")}`, 764);
    }
    const x = ((r.anchor % g.columns) + 0.5) * g.pitchMm,
      y = (Math.floor(r.anchor / g.columns) + 0.5) * g.pitchMm;
    text(
      ref!,
      `${r.id + 1}. #${r.color + 1} ${g.palette[r.color].code} | X${x.toFixed(1)} Y${y.toFixed(1)} mm | ${((r.cells.length * g.pitchMm ** 2) / 100).toFixed(2)} cm²`,
      45,
      710 - offset * 24,
      9,
    );
    text(
      ref!,
      `${t("label")}: ${t(r.labelFits ? "yes" : "no")} | ${project.progress.completed.includes(r.id) ? "[X]" : "[ ]"}`,
      45,
      700 - offset * 24,
      7,
    );
  }
  doc.setTitle("Ip Rasm " + t("title"));
  doc.setSubject("Paint SHA-256: " + g.sequenceHash);
  const pages = doc.getPages();
  pages.forEach((p, j) => {
    text(p, g.sequenceHash, 45, 38, 7);
    text(p, `${j + 1}/${pages.length}`, 510, 23, 8);
  });
  return doc.save();
}
