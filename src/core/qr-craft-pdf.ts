import {
  PDFDocument,
  rgb,
  rectangle,
  fill,
  setFillingColor,
  pushGraphicsState,
  popGraphicsState,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { validateQrCraft, type QrCraft } from "./qr-craft";
import type { Locale } from "./types";
import { qrCraftText } from "../qr-craft-i18n";
const mm = 72 / 25.4;
export async function qrCraftPdf(
  value: QrCraft,
  locale: Locale,
  fontBytes?: Uint8Array,
) {
  const g = await validateQrCraft(value),
    doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(
    fontBytes ??
      new Uint8Array(
        await (await fetch("/fonts/NotoSans-Regular.ttf")).arrayBuffer(),
      ),
    { subset: true },
  );
  doc.setSubject(g.sequenceHash);
  doc.setTitle("Ip Rasm - " + qrCraftText(locale,"title"));
  const text = (
    p: ReturnType<typeof doc.addPage>,
    value: string,
    x: number,
    y: number,
    size = 9,
  ) => p.drawText(value, { x, y, size, font });
  const wrap = (
    p: ReturnType<typeof doc.addPage>,
    value: string,
    y: number,
  ) => {
    let line = "";
    for (const word of value.split(" ")) {
      if (font.widthOfTextAtSize(line + " " + word, 9) > 495) {
        text(p, line, 45, y);
        line = word;
        y -= 15;
      } else line += (line ? " " : "") + word;
    }
    text(p, line, 45, y);
    return y - 24;
  };
  const cover = doc.addPage([595.276, 841.89]),
    t = (key: Parameters<typeof qrCraftText>[1]) => qrCraftText(locale, key);
  text(cover, t("title"), 45, 790, 17);
  let y = wrap(cover, t("intro"), 758);
  y = wrap(cover, t("physical"), y);
  text(
    cover,
    `${g.widthMm} x ${g.widthMm} mm; ${g.holes.length} ${t("holes")}; ${g.threadMetres} m`,
    45,
    y,
  );
  y -= 25;
  const scale = Math.min(440 / g.widthMm, (y - 90) / g.widthMm),
    ox = 65,
    oy = 85;
  cover.pushOperators(
    pushGraphicsState(),
    setFillingColor(rgb(0, 0, 0)),
    ...g.moves
      .filter((m) => m.side === "front")
      .map((move) => {
        const a = g.holes[move.from],
          b = g.holes[move.to];
        return rectangle(
          ox + Math.min(a.x, b.x) * scale,
          oy + (g.widthMm - a.y - g.material.threadMm / 2) * scale,
          Math.abs(a.x - b.x) * scale,
          g.material.threadMm * scale,
        );
      }),
    fill(),
    popGraphicsState(),
  );
  text(cover, g.sequenceHash, 45, 35, 7);
  // Full-size custom sheet plus full-size A4 tiles. Hole centres are the exact
  // guide coordinates. No QR modules, payload image or decorative strands.
  const template = (
    p: ReturnType<typeof doc.addPage>,
    left: number,
    top: number,
    startX: number,
    startY: number,
    w: number,
    h: number,
  ) => {
    for (const hole of g.holes)
      if (
        hole.x >= startX &&
        hole.y >= startY &&
        hole.x < startX + w &&
        hole.y < startY + h
      )
        p.drawCircle({
          x: left + (hole.x - startX) * mm,
          y: top - (hole.y - startY) * mm,
          size: (g.material.holeMm / 2) * mm,
          borderWidth: 0.1 * mm,
          borderColor: rgb(0, 0, 0),
        });
    p.drawLine({
      start: { x: 15 * mm, y: 15 * mm },
      end: { x: 65 * mm, y: 15 * mm },
      thickness: 0.25 * mm,
    });
    text(p, "50 mm - 100%", 15 * mm, 8 * mm);
    text(p, g.sequenceHash, 15 * mm, 3 * mm, 5);
  };
  const sheet = doc.addPage([(g.widthMm + 20) * mm, (g.widthMm + 40) * mm]);
  text(sheet, t("holePlan"), 10 * mm, (g.widthMm + 30) * mm, 10);
  template(sheet, 10 * mm, (g.widthMm + 25) * mm, 0, 0, g.widthMm, g.widthMm);
  for (let sy = 0; sy < g.widthMm; sy += 240)
    for (let sx = 0; sx < g.widthMm; sx += 180) {
      const p = doc.addPage([210 * mm, 297 * mm]);
      text(p, `${t("holePlan")} X=${sx} Y=${sy} mm`, 15 * mm, 283 * mm, 10);
      template(p, 15 * mm, 275 * mm, sx, sy, 180, 240);
    }
  let page = cover;
  for (let i = 0; i < g.moves.length; i++) {
    const row = i % 40;
    if (!row) {
      page = doc.addPage([595.276, 841.89]);
      text(page, t("step") + " · mm", 45, 790, 14);
      text(page, g.sequenceHash, 45, 35, 7);
    }
    const move = g.moves[i],
      a = g.holes[move.from],
      b = g.holes[move.to];
    text(
      page,
      `${i + 1}. ${t(move.side)} P${a.id + 1} (${a.x}, ${a.y}) > P${b.id + 1} (${b.x}, ${b.y})`,
      45,
      755 - row * 17,
      8,
    );
  }
  return doc.save();
}
