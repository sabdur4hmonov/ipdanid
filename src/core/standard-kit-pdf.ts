import {
  PDFDocument,
  StandardFonts,
  rgb,
  rectangle,
  clip,
  endPath,
  pushGraphicsState,
  popGraphicsState,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { kitTemplateText } from "../kit-template-i18n";
import type { MaterialProfile, Locale } from "./types";
import {
  standardProfiles,
  combinedHoles,
  pinLabel,
  type StandardKitConfig,
} from "./standard-kit";
import { hash } from "./engine";
const MM = 72 / 25.4;
const colours = [
  rgb(0.06, 0.21, 0.38),
  rgb(0.35, 0.35, 0.35),
  rgb(0.57, 0.08, 0.2),
];
export type KitPdfKind = "sheet" | "tiles" | "stickers";
export function stickerMarks(p: MaterialProfile) {
  return p.pins.map((pin, id) => {
    const before = p.pins[(id + p.pins.length - 1) % p.pins.length],
      after = p.pins[(id + 1) % p.pins.length];
    const dx = (after.x - before.x) * p.widthMm,
      dy = (after.y - before.y) * p.heightMm,
      length = Math.hypot(dx, dy),
      // The two lower heart quarters need outward ribbons: inward offsets
      // intersect at the pointed tip. Keep each ribbon section independent.
      side =
        p.shape === "rectangle" ||
        (p.shape === "heart" &&
          id >= p.pins.length / 4 &&
          id < (3 * p.pins.length) / 4)
          ? -1
          : 1;
    return {
      id,
      label: pinLabel(p, id),
      xMm: pin.x * p.widthMm,
      yMm: pin.y * p.heightMm,
      nx: (side * -dy) / length,
      ny: (side * dx) / length,
      side,
    };
  });
}
export async function standardKitPdf(
  c: StandardKitConfig,
  kind: KitPdfKind,
  options: { locale?: Locale; fontBytes?: Uint8Array } = {},
): Promise<Uint8Array> {
  const profiles = standardProfiles(c),
    holes = combinedHoles(profiles),
    digest = await hash(c);
  const doc = await PDFDocument.create(),
    font = await doc.embedFont(StandardFonts.Helvetica);
  const locale = options.locale ?? "en";
  const t = (key: Parameters<typeof kitTemplateText>[1], fields?: readonly (string|number)[]) => kitTemplateText(locale,key,fields);
  const names = [t("circle46"),t("square"),t("heart")];
  let bodyFont = font;
  if(locale !== "en") {
    doc.registerFontkit(fontkit);
    bodyFont = await doc.embedFont(options.fontBytes ?? new Uint8Array(await (await fetch("/fonts/NotoSans-Regular.ttf")).arrayBuffer()),{subset:true});
  }
  doc.setTitle(`Ip Rasm | ${t(kind)}`);
  doc.setSubject(`standard-kit/1 revision ${c.revision} SHA256 ${digest}`);
  doc.setKeywords([digest, "physical-mm/y-down/1", String(holes.length)]);
  const width = kind === "sheet" ? c.baseMm : 210,
    height = kind === "sheet" ? c.baseMm : 297;
  const margin = kind === "sheet" ? 0 : 10,
    top = kind === "sheet" ? 0 : 25,
    tileW = kind === "sheet" ? c.baseMm : 190,
    tileH = kind === "sheet" ? c.baseMm : 257;
  const strideX = tileW - 10,
    strideY = tileH - 10,
    cols = kind === "sheet" ? 1 : Math.ceil((c.baseMm - 10) / strideX),
    rows = kind === "sheet" ? 1 : Math.ceil((c.baseMm - 10) / strideY);
  function text(
    page: PDFPage,
    s: string,
    x: number,
    y: number,
    size = 6,
    fontToUse: PDFFont = bodyFont,
  ) {
    size = Math.min(size, size * ((width - x - 8) * MM) / Math.max(1,fontToUse.widthOfTextAtSize(s,size)));
    page.drawText(s, {
      x: x * MM,
      y: (height - y) * MM,
      size,
      font: fontToUse,
      color: rgb(0.06, 0.16, 0.28),
    });
  }
  for (const pattern of kind === "stickers" ? [0, 1, 2] : [-1])
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const page = doc.addPage([width * MM, height * MM]),
          ox = col * strideX,
          oy = row * strideY;
        const point = (x: number, y: number) => ({
          x: (margin + x - ox) * MM,
          y: (height - top - y + oy) * MM,
        });
        const stroke = (
          x1: number,
          y1: number,
          x2: number,
          y2: number,
          colour = rgb(0.4, 0.4, 0.4),
          thickness = 0.3,
        ) =>
          page.drawLine({
            start: point(x1, y1),
            end: point(x2, y2),
            color: colour,
            thickness,
          });
        text(
          page,
          `IP RASM | ${t(kind)} | ${pattern < 0 ? [t("circle"),t("square"),t("heart")].join(" / ").toLocaleUpperCase(locale) : names[pattern]} | r${c.revision}`,
          kind === "sheet" ? 8 : 10,
          kind === "sheet" ? 7 : 8,
          kind === "sheet" ? 7 : 9,
        );
        text(
          page,
          `${t("actual")} | ${c.baseMm} x ${c.baseMm} mm | ${kind === "sheet" ? t("single") : t("tile",[col+1,row+1,cols,rows])}`,
          kind === "sheet" ? 8 : 10,
          kind === "sheet" ? 11 : 13,
          6,
        );
        if (kind !== "sheet")
          text(
            page,
            `${t("topFront",["y=0"])} | ${digest.slice(0, 20)} | ${t("origin")} ${ox},${oy} mm`,
            10,
            18,
            6,
          );
        page.pushOperators(
          pushGraphicsState(),
          rectangle(
            margin * MM,
            (height - top - tileH) * MM,
            tileW * MM,
            tileH * MM,
          ),
          clip(),
          endPath(),
        );
        if (pattern < 0)
          for (const h of holes) {
            const x = point(h.xMm, h.yMm),
              index = ["circle", "rectangle", "heart"].indexOf(h.pattern);
            page.drawCircle({
              ...x,
              size: (c.shaftMm / 2) * MM,
              borderWidth: 0.35,
              borderColor: colours[index],
            });
            // Pattern letter distinguishes three independent sector label sets.
            if (h.pin % 5 === 0 || h.pin % (c.nails / c.sectors) === 0)
              page.drawText(`${["C", "S", "H"][index]}:${h.label}`, {
                x: x.x + 1.2 * MM,
                y: x.y + 1.3 * MM,
                size: 4,
                font,
                color: colours[index],
              });
          }
        else {
          const p = profiles[pattern],
            marks = stickerMarks(p);
          const sameRibbon = (a: number, b: number) =>
            Math.floor(a / (c.nails / c.sectors)) ===
              Math.floor(b / (c.nails / c.sectors)) &&
            marks[a].side === marks[b].side;
          for (let j = 0; j < marks.length; j++) {
            const m = marks[j],
              nextId = (j + 1) % marks.length,
              next = marks[nextId],
              a = point(m.xMm, m.yMm);
            stroke(
              m.xMm,
              m.yMm,
              m.xMm + m.nx * 4,
              m.yMm + m.ny * 4,
              colours[pattern],
              0.45,
            );
            page.drawCircle({
              ...a,
              size: 0.35 * MM,
              borderWidth: 0.35,
              borderColor: colours[pattern],
            });
            if (sameRibbon(j, nextId))
              for (const distance of [1, 11])
                stroke(
                  m.xMm + m.nx * distance,
                  m.yMm + m.ny * distance,
                  next.xMm + next.nx * distance,
                  next.yMm + next.ny * distance,
                  rgb(0.6, 0.6, 0.6),
                  0.2,
                );
            const label = point(
              m.xMm + m.nx * (j % 2 ? 8.5 : 5),
              m.yMm + m.ny * (j % 2 ? 8.5 : 5),
            );
            page.drawText(m.label, {
              x: label.x - font.widthOfTextAtSize(m.label, 5) / 2,
              y: label.y - 1.5,
              size: 5,
              font,
              color: colours[pattern],
            });
            // Close a strip between ticks, never across its endpoint's label.
            for (const [boundary, neighbour] of [
              [
                !sameRibbon(j, nextId),
                marks[(j + marks.length - 1) % marks.length],
              ],
              [!sameRibbon((j + marks.length - 1) % marks.length, j), next],
            ] as const)
              if (boundary) {
                const ex = m.xMm + (m.xMm - neighbour.xMm) / 2,
                  ey = m.yMm + (m.yMm - neighbour.yMm) / 2;
                stroke(m.xMm + m.nx, m.yMm + m.ny, ex + m.nx, ey + m.ny);
                stroke(ex + m.nx, ey + m.ny, ex + m.nx * 11, ey + m.ny * 11);
                stroke(
                  ex + m.nx * 11,
                  ey + m.ny * 11,
                  m.xMm + m.nx * 11,
                  m.yMm + m.ny * 11,
                );
              }
          }
        }
        // Same board-space registration crosses on every overlapping page.
        for (let gy = 0; gy <= c.baseMm; gy += 50)
          for (let gx = 0; gx <= c.baseMm; gx += 50) {
            if (holes.some((h) => Math.hypot(h.xMm - gx, h.yMm - gy) < 6))
              continue;
            stroke(gx - 1.5, gy, gx + 1.5, gy, rgb(0.7, 0.7, 0.7), 0.2);
            stroke(gx, gy - 1.5, gx, gy + 1.5, rgb(0.7, 0.7, 0.7), 0.2);
          }
        page.pushOperators(popGraphicsState());
        if (kind === "sheet") {
          const y = c.baseMm - 6;
          stroke(10, y, 60, y, rgb(0, 0, 0), 0.6);
          stroke(10, y - 1.5, 10, y + 1.5);
          stroke(60, y - 1.5, 60, y + 1.5);
          text(page, t("calibration"), 11, y - 2, 6);
          text(
            page,
            `C ${t("circle")} ${c.circleDiameterMm} mm | S ${t("square")} ${c.squareSideMm} mm | H ${t("heartEnvelope")} ${c.heartEnvelopeMm} mm | ${t("shaft",[c.shaftMm])} | ${t("gap",[c.minHoleGapMm])}`,
            90,
            c.baseMm - 6,
            5,
          );
        } else {
          page.drawLine({
            start: { x: 10 * MM, y: 9 * MM },
            end: { x: 60 * MM, y: 9 * MM },
            thickness: 0.6,
          });
          text(
            page,
            `${t("calibration")} | ${t("ticks")}`,
            10,
            height - 12,
            6,
          );
        }
      }
  return doc.save();
}
