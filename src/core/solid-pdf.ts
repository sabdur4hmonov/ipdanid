import {
  PDFDocument,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
  moveTo,
  lineTo,
  closePath,
  stroke,
  setLineWidth,
  setStrokingColor,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { validateSolidPlan, type SolidPlan } from "./solid-plan";
import type { LetteringFont } from "./lettering";
import type { Locale } from "./types";
import { solidText } from "../solid-i18n";
import type { SolidPolygon } from "./solid-geometry";
const mm = 72 / 25.4;
export async function solidPdf(
  value: SolidPlan,
  locale: Locale,
  confirmed = 0,
  fontBytes?: Uint8Array,
  fonts?: Partial<Record<LetteringFont, Uint8Array>>,
) {
  const g = await validateSolidPlan(value, fonts);
  if (
    !Number.isInteger(confirmed) ||
    confirmed < 0 ||
    confirmed > g.parts.length
  )
    throw Error("solid/progress");
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    fontBytes ??
      new Uint8Array(
        await (await fetch("/fonts/NotoSans-Regular.ttf")).arrayBuffer(),
      ),
    { subset: true },
  );
  doc.setTitle("Ip Rasm - measured 3D parts");
  doc.setSubject(g.sequenceHash);
  const t = (key: Parameters<typeof solidText>[1]) => solidText(locale, key),
    text = (
      page: ReturnType<typeof doc.addPage>,
      s: string,
      x: number,
      y: number,
      size = 9,
    ) => page.drawText(s, { x, y, size, font });
  const wrap = (page: ReturnType<typeof doc.addPage>, s: string, y: number) => {
    let line = "";
    for (const word of s.split(" ")) {
      if (font.widthOfTextAtSize(line + " " + word, 9) > 500) {
        text(page, line, 45, y);
        y -= 15;
        line = word;
      } else line += (line ? " " : "") + word;
    }
    text(page, line, 45, y);
    return y - 26;
  };
  const cover = doc.addPage([210 * mm, 297 * mm]);
  text(cover, t("title"), 45, 790, 17);
  let y = wrap(cover, t("intro"), 758);
  y = wrap(
    cover,
    t(
      g.source.kind === "frame"
        ? "frameHelp"
        : g.source.kind === "spindle"
          ? "spindleHelp"
          : "lettersHelp",
    ),
    y,
  );
  y = wrap(cover, t("physical"), y);
  if (g.source.kind !== "spindle") y = wrap(cover, t("layoutHelp"), y);
  text(
    cover,
    `${t("parts")}: ${g.parts.length}; ${t("progress")}: ${confirmed}/${g.parts.length}`,
    45,
    y,
  );
  y -= 25;
  text(
    cover,
    `${t("height")}: ${Math.max(...g.parts.map((p) => p.zMm + p.heightMm))} mm`,
    45,
    y,
  );
  text(cover, g.sequenceHash, 45, 35, 7);
  const allPoints = g.parts.flatMap((p) => p.polygons.flat(2)),
    originX = Math.min(...allPoints.map((p) => p[0])),
    originY = Math.min(...allPoints.map((p) => p[1]));
  for (let start = 0; start < g.parts.length; start += 20) {
    const page = doc.addPage([210 * mm, 297 * mm]);
    text(page, t("step"), 45, 790, 16);
    let rowY = 758;
    for (let i = start; i < Math.min(start + 20, g.parts.length); i++) {
      const p = g.parts[i],
        points = p.polygons.flat(2),
        xs = points.map((v) => v[0]),
        ys = points.map((v) => v[1]),
        w = Math.max(...xs) - Math.min(...xs),
        h = Math.max(...ys) - Math.min(...ys);
      text(
        page,
        `${i + 1}. ${p.id} / Z=${p.zMm} mm / H=${p.heightMm} mm`,
        45,
        rowY,
        10,
      );
      text(
        page,
        `${t("dimensions")}: ${w.toFixed(3)} x ${h.toFixed(3)} x ${p.heightMm} mm${g.source.kind !== "spindle" ? `; X=${(Math.min(...xs) - originX).toFixed(3)} Y=${(Math.min(...ys) - originY).toFixed(3)}` : ""}`,
        55,
        rowY - 14,
        8,
      );
      rowY -= 34;
    }
    text(page, g.sequenceHash, 45, 35, 7);
  }
  const templates: {
    id: string;
    polygons: SolidPolygon[];
    step?: number;
    zMm?: number;
    heightMm?: number;
  }[] = [
    ...(g.source.kind !== "spindle"
      ? [{ id: "assembly", polygons: g.parts.flatMap((p) => p.polygons) }]
      : []),
    ...g.parts.map((p, i) => ({ ...p, step: i + 1 })),
  ];
  for (const part of templates) {
    const label = part.step
        ? `${t("part")} ${part.step} / ${part.id}`
        : t("layoutTitle"),
      details = part.step
        ? `Z=${part.zMm} mm; H=${part.heightMm} mm; 100%`
        : "X/Y (mm); 100%";
    const points = part.polygons.flat(2),
      xs = points.map((v) => v[0]),
      ys = points.map((v) => v[1]),
      minX = Math.min(...xs),
      maxX = Math.max(...xs),
      maxY = Math.max(...ys),
      minY = Math.min(...ys),
      width = maxX - minX,
      height = maxY - minY;
    const outline = (
      page: ReturnType<typeof doc.addPage>,
      left: number,
      top: number,
      sx: number,
      sy: number,
      w: number,
      h: number,
    ) => {
      page.pushOperators(
        pushGraphicsState(),
        rectangle(left, top - h * mm, w * mm, h * mm),
        clip(),
        endPath(),
        setLineWidth(0.2 * mm),
        setStrokingColor(rgb(0.1, 0.1, 0.1)),
      );
      for (const polygon of part.polygons)
        for (const ring of polygon) {
          const path = ring.map((p, k) =>
            (k ? lineTo : moveTo)(
              left + (p[0] - minX - sx) * mm,
              top - (maxY - p[1] - sy) * mm,
            ),
          );
          page.pushOperators(...path, closePath(), stroke());
        }
      page.pushOperators(popGraphicsState());
    };
    const ruler = (page: ReturnType<typeof doc.addPage>) => {
      page.drawLine({
        start: { x: 10 * mm, y: 10 * mm },
        end: { x: 60 * mm, y: 10 * mm },
        thickness: 0.3 * mm,
      });
      for (const x of [10, 60])
        page.drawLine({
          start: { x: x * mm, y: 8 * mm },
          end: { x: x * mm, y: 12 * mm },
          thickness: 0.3 * mm,
        });
      text(page, "50 mm - 100%", 10 * mm, 4 * mm, 8);
    };
    const sheet = doc.addPage([
      Math.max(70, width + 20) * mm,
      (height + 50) * mm,
    ]);
    text(sheet, label, 10 * mm, (height + 43) * mm, 9);
    text(sheet, details, 10 * mm, (height + 36) * mm, 8);
    outline(sheet, 10 * mm, (height + 25) * mm, 0, 0, width, height);
    ruler(sheet);
    for (let sy = 0; sy < height; sy += 240)
      for (let sx = 0; sx < width; sx += 180) {
        const page = doc.addPage([210 * mm, 297 * mm]);
        text(page, `${label} - 100%`, 15 * mm, 285 * mm, 10);
        text(
          page,
          `X=${sx} Y=${sy} mm${part.step ? `; Z=${part.zMm} H=${part.heightMm} mm` : ""}`,
          15 * mm,
          279 * mm,
          8,
        );
        outline(page, 15 * mm, 272 * mm, sx, sy, 180, 240);
        for (const x of [15, 195])
          for (const y of [32, 272]) {
            page.drawLine({
              start: { x: (x - 2) * mm, y: y * mm },
              end: { x: (x + 2) * mm, y: y * mm },
              thickness: 0.15 * mm,
            });
            page.drawLine({
              start: { x: x * mm, y: (y - 2) * mm },
              end: { x: x * mm, y: (y + 2) * mm },
              thickness: 0.15 * mm,
            });
          }
        ruler(page);
        text(page, g.sequenceHash, 15 * mm, 19 * mm, 6);
      }
  }
  if (doc.getPageCount() > 180) throw Error("solid/pdf-bounds");
  return doc.save();
}
