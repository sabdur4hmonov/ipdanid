import { uiText } from "../ui-i18n";
import { usesOpticalRaster } from "./render-model";
import {
  PDFDocument,
  rgb as pdfRgb,
  type PDFPage,
  pushGraphicsState,
  popGraphicsState,
  rectangle,
  clip,
  endPath,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Instruction, Locale } from "./types";
import { flatten } from "./engine";
import { translate } from "../i18n";
import { validateInstruction } from "./validation";
import { previewPng } from "./preview-png";
import { templateLabel } from "./pin-layout";
import { pinLabel } from "./standard-kit";
const MM = 72 / 25.4;
export async function exportPdf(
  i: Instruction,
  locale: Locale = "uz",
  options: {
    paper?: "A4" | "Letter";
    textSize?: number;
    fontBytes?: Uint8Array;
    confirmed?: number;
  } = {},
): Promise<Uint8Array> {
  await validateInstruction(i);
  const confirmed = options.confirmed ?? 0;
  if (
    !Number.isInteger(confirmed) ||
    confirmed < 0 ||
    confirmed > i.metrics.lines
  )
    throw new Error("Invalid PDF progress");
  const t = translate(locale),
    doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes =
    options.fontBytes ??
    new Uint8Array(
      await (await fetch("/fonts/NotoSans-Regular.ttf")).arrayBuffer(),
    );
  const font = await doc.embedFont(fontBytes, { subset: true });
  const [pw, ph] =
      options.paper === "Letter" ? [612, 792] : [210 * MM, 297 * MM],
    size = Math.max(9, Math.min(14, options.textSize ?? 10)),
    margin = 18 * MM;
  doc.setTitle(t("pdfTitle"));
  doc.setSubject(`Sequence SHA-256: ${i.sequenceHash}`);
  doc.setKeywords([i.sequenceHash, i.algorithm]);
  const page = () => doc.addPage([pw, ph]);
  const text = (p: PDFPage, s: string, x: number, y: number, fontSize = size) =>
    p.drawText(s, {
      x,
      y,
      size: fontSize,
      font,
      color: pdfRgb(0.1, 0.22, 0.18),
    });
  const wrapped = (p: PDFPage, s: string, y: number) => {
    let line = "";
    for (const word of s.split(" ")) {
      if (
        font.widthOfTextAtSize(`${line} ${word}`, size) > pw - 2 * margin &&
        line
      ) {
        text(p, line, margin, y);
        y -= size * 1.6;
        line = word;
      } else line += (line ? " " : "") + word;
    }
    if (line) {
      text(p, line, margin, y);
      y -= size * 1.6;
    }
    return y;
  };
  const footer = (p: PDFPage) => {
    text(p, `SHA-256 ${i.sequenceHash.slice(0, 32)}`, margin, 25, 7);
    text(p, i.sequenceHash.slice(32), margin, 15, 7);
  };
  const cover = page();
  text(cover, t("pdfTitle"), margin, ph - margin, 20);
  let y = ph - margin - 40;
  for (const s of [
    t("provisional"),
    `${t(i.profile.shape)} · ${i.profile.widthMm} × ${i.profile.heightMm} mm · ${i.profile.pins.length} ${t("pdfPin")}`,
    `${t("threadMm")}: ${i.profile.threadMm}`,
    `${i.metrics.lines} ${t("lines")} · ${i.metrics.estimatedMeters.toFixed(1)} ${t("meters")}`,
    `${t("stockMeters")}: ${i.profile.stockMeters.toFixed(1)} m · ${t("stockShortfall")}: ${(Math.ceil(Math.max(0, i.metrics.estimatedMeters - i.profile.stockMeters) * 10) / 10).toFixed(1)} m`,
    `${t("confirmed")}: ${confirmed}/${i.metrics.lines}`,
    t("pdfNeed"),
    t("pdfWrap"),
    t("startKnot"),
    t("repair"),
    t("finish"),
    t("pdfPrint"),
    `${t("integrity")}: ${i.algorithm}`,
  ])
    y = wrapped(cover, s, y - 10);
  for (const [color, meters] of Object.entries(i.metrics.perColorMeters))
    text(cover, `${color}: ${meters.toFixed(1)} m`, margin, (y -= 24));
  // Cover preview is derived directly from the exact same sequence, in physical aspect ratio.
  const ps = Math.min(200, ((y - 70) / i.profile.heightMm) * i.profile.widthMm),
    phs = (ps * i.profile.heightMm) / i.profile.widthMm,
    bottom = 60;
  const hex = (s: string) =>
    pdfRgb(
      ...([1, 3, 5].map((k) => parseInt(s.slice(k, k + 2), 16) / 255) as [
        number,
        number,
        number,
      ]),
    );
  if (phs > 30) {
    cover.drawRectangle({
      x: margin,
      y: bottom,
      width: ps,
      height: phs,
      color: hex(i.profile.baseColor),
    });
    if (usesOpticalRaster(i.algorithm)) {
      cover.drawImage(await doc.embedPng(previewPng(i)), {
        x: margin,
        y: bottom,
        width: ps,
        height: phs,
      });
    } else
      for (const s of flatten(i)) {
        const a = i.profile.pins[s.from],
          b = i.profile.pins[s.to];
        cover.drawLine({
          start: { x: margin + a.x * ps, y: bottom + (1 - a.y) * phs },
          end: { x: margin + b.x * ps, y: bottom + (1 - b.y) * phs },
          color: hex(s.color),
          opacity: i.profile.opacity,
          thickness: (i.profile.threadMm / i.profile.widthMm) * ps,
        });
      }
  }
  footer(cover);
  if (i.profile.pinLayout) {
    const layout = i.profile.pinLayout,
      p = page(),
      pin0 = i.profile.pins[0];
    text(p, t("pdfTemplate"), margin, ph - margin, 18);
    let yy = ph - margin - 35;
    for (const line of [
      t("layoutNotice") + ` ${layout.phaseDegreesClockwise}°`,
      `${layout.version} / ${layout.templateVersion}; profile ${i.profile.id} v${i.profile.version}`,
      `TOP = y 0 mm. Origin (0,0) = board top-left. +x right; +y down.`,
      `Pin 0: x ${(pin0.x * i.profile.widthMm).toFixed(6)} mm; y ${(pin0.y * i.profile.heightMm).toFixed(6)} mm.`,
      `Nail radius: ${(0.48 * i.profile.widthMm).toFixed(3)} mm. Spacing: ${(360 / i.profile.pins.length).toFixed(3)}°.`,
      `IDs: 0..${i.profile.pins.length - 1}, clockwise when viewed from the FRONT. Never flip the template.`,
      `Pin 0 is an orientation reference. Starting knot: pin ${i.segments[0].path[0]}.`,
      `Use only these tiles for this new board. ${t("confirmed")}: ${confirmed}/${i.metrics.lines}.`,
      `Photo/crop stays upright. The rotated perimeter does not rotate the photo.`,
    ])
      yy = wrapped(p, line, yy - 7);
    const side = Math.min(pw - 2 * margin, yy - 110),
      left = margin,
      bottom = 65;
    p.drawRectangle({
      x: left,
      y: bottom,
      width: side,
      height: side,
      borderWidth: 0.6,
      borderColor: pdfRgb(0.2, 0.3, 0.2),
    });
    p.drawLine({
      start: { x: left + side / 2, y: bottom + side },
      end: { x: left + side / 2, y: bottom + side / 2 },
      thickness: 0.5,
      color: pdfRgb(0.5, 0.5, 0.5),
    });
    text(p, uiText(locale,"top") + " / y=0", left + side / 2 - 25, bottom + side + 10, 9);
    text(p, t("orientationMap"), margin, bottom + side + 27, 8);
    for (const pin of i.profile.pins) {
      const x = left + pin.x * side,
        y = bottom + (1 - pin.y) * side;
      p.drawCircle({
        x,
        y,
        size: pin.id === 0 ? 2.5 : 1,
        color: pdfRgb(0.1, 0.25, 0.18),
      });
      if (pin.id % 30 === 0)
        text(
          p,
          pinLabel(i.profile,pin.id),
          x + (pin.x > 0.5 ? -22 : 5),
          y + (pin.y > 0.5 ? 7 : -12),
          8,
        );
    }
    footer(p);
  }
  // Tile board coordinates in millimeters with 10 mm overlap. Never scale the board to page.
  const tileW = (pw - 2 * margin) / MM,
    tileH = (ph - 2 * margin - 40) / MM,
    overlap = 10,
    strideX = tileW - overlap,
    strideY = tileH - overlap;
  const cols = Math.max(1, Math.ceil((i.profile.widthMm - overlap) / strideX)),
    rows = Math.max(1, Math.ceil((i.profile.heightMm - overlap) / strideY));
  // Rendering improvement only: retain legacy profiles/coordinates/hashes.
  // New physical/pruned guides on the exact canonical unrotated perimeter can
  // use separated leaders without inventing layout metadata for old boards.
  const canonicalNewCircle =
    [
      "group-optical/15",
      "density-physical/8",
      "density-anatomy/10",
      "density-pin-basis/11",
      "density-resolved/12",
      "density-head/13",
      "hair-cycles/14",
      "assembly-prune/9",
    ].includes(i.algorithm) &&
    i.profile.shape === "circle" &&
    i.profile.pins.every((pin, id) => {
      const a = (id / i.profile.pins.length) * Math.PI * 2;
      return (
        Math.abs(pin.x - (0.5 + 0.48 * Math.sin(a))) < 1e-10 &&
        Math.abs(pin.y - (0.5 - 0.48 * Math.cos(a))) < 1e-10
      );
    });
  const heartLabels = i.profile.shape === "heart";
  const radialLabels =
    !!i.profile.pinLayout || canonicalNewCircle || heartLabels;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const p = page(),
        ox = col * strideX,
        oy = row * strideY,
        top = ph - margin - 35;
      text(
        p,
        `${t("pdfTemplate")} ${col + 1}/${cols} · ${row + 1}/${rows}`,
        margin,
        ph - margin,
        14,
      );
      text(
        p,
        t("pdfAlign") +
          (heartLabels
            ? ` | TOP y=0; clockwise FRONT; ${pinLabel(i.profile,0)} notch; knot ${pinLabel(i.profile,i.segments[0].path[0])}; heart-normal-leaders/1`
            : canonicalNewCircle && !i.profile.pinLayout
              ? ` | TOP y=0; clockwise FRONT; ${pinLabel(i.profile,0)} filled; knot ${pinLabel(i.profile,i.segments[0].path[0])}; radial-leaders/1`
              : i.profile.pinLayout
                ? ` | TOP y=0; pin 0: +${i.profile.pinLayout.phaseDegreesClockwise}° clockwise`
                : ""),
        margin,
        ph - margin - 20,
        radialLabels ? 6 : 8,
      );
      if (radialLabels) {
        // Clip board-space marks/leaders to tile. The 10 mm overlap exceeds a
        // complete 6 pt label, so every ID has an intact copy on some tile.
        p.pushOperators(
          pushGraphicsState(),
          rectangle(margin, top - tileH * MM, tileW * MM, tileH * MM),
          clip(),
          endPath(),
        );
        for (const pin of i.profile.pins) {
          const x = margin + (pin.x * i.profile.widthMm - ox) * MM,
            y = top - (pin.y * i.profile.heightMm - oy) * MM;
          const label = templateLabel(i.profile, pin.id),
            lx = margin + (label.x - ox) * MM,
            ly = top - (label.y - oy) * MM;
          p.drawLine({
            start: { x, y },
            end: { x: lx, y: ly },
            thickness: 0.35,
            color: pdfRgb(0.3, 0.3, 0.3),
          });
          p.drawCircle({
            x,
            y,
            size: (i.profile.shaftMm / 2) * MM,
            borderWidth: 0.5,
            borderColor: pdfRgb(0, 0, 0),
            ...(pin.id === 0 ? { color: pdfRgb(0, 0, 0) } : {}),
          });
          const labelText = pinLabel(i.profile,pin.id);
          text(
            p,
            labelText,
            lx - font.widthOfTextAtSize(labelText, 6) / 2,
            ly - 2,
            6,
          );
        }
        p.pushOperators(popGraphicsState());
      } else
        for (const pin of i.profile.pins) {
          const x = pin.x * i.profile.widthMm - ox,
            y = pin.y * i.profile.heightMm - oy;
          if (x < 0 || x > tileW || y < 0 || y > tileH) continue;
          const px = margin + x * MM,
            py = top - y * MM;
          p.drawCircle({
            x: px,
            y: py,
            size: (i.profile.shaftMm / 2) * MM,
            borderWidth: 0.5,
            borderColor: pdfRgb(0, 0, 0),
          });
          text(p, pinLabel(i.profile,pin.id), px + 3, py + 3, 7);
          if (pin.id === 0) text(p, `${pinLabel(i.profile,0)} / ${t("pdfStart")}`, px + 3, py - 8, 5);
        }
      // Board-space 50 mm grid crosses match neighboring overlapping tiles.
      const xMarks = [
        ...Array.from(
          { length: Math.floor(i.profile.widthMm / 50) + 1 },
          (_, j) => j * 50,
        ),
        ...Array.from(
          { length: cols - 1 },
          (_, j) => (j + 1) * strideX + overlap / 2,
        ),
      ].filter((x) => x >= ox && x <= ox + tileW && x <= i.profile.widthMm);
      const yMarks = [
        ...Array.from(
          { length: Math.floor(i.profile.heightMm / 50) + 1 },
          (_, j) => j * 50,
        ),
        ...Array.from(
          { length: rows - 1 },
          (_, j) => (j + 1) * strideY + overlap / 2,
        ),
      ].filter((y) => y >= oy && y <= oy + tileH && y <= i.profile.heightMm);
      for (const gx of xMarks)
        for (const gy of yMarks) {
          // Alignment labels must not obscure the pin IDs or physical holes.
          // Decide in board space so overlapping tiles omit the same mark.
          if (
            radialLabels &&
            i.profile.pins.some((pin) => {
              const label = templateLabel(i.profile, pin.id);
              return (
                Math.hypot(gx - label.x, gy - label.y) < 10 ||
                Math.hypot(
                  gx - pin.x * i.profile.widthMm,
                  gy - pin.y * i.profile.heightMm,
                ) < 5
              );
            })
          )
            continue;
          const x = margin + (gx - ox) * MM,
            y = top - (gy - oy) * MM;
          p.drawLine({
            start: { x: x - 4, y },
            end: { x: x + 4, y },
            thickness: 0.4,
            color: pdfRgb(0.5, 0.5, 0.5),
          });
          p.drawLine({
            start: { x, y: y - 4 },
            end: { x, y: y + 4 },
            thickness: 0.4,
            color: pdfRgb(0.5, 0.5, 0.5),
          });
          text(
            p,
            `${Number(gx.toFixed(1))},${Number(gy.toFixed(1))}`,
            x + 5,
            y - 6,
            5,
          );
        }
      p.drawLine({
        start: { x: margin, y: 48 },
        end: { x: margin + 50 * MM, y: 48 },
        thickness: 1,
      });
      for (const x of [margin, margin + 50 * MM])
        p.drawLine({ start: { x, y: 44 }, end: { x, y: 52 }, thickness: 1 });
      text(p, t("pdfRuler"), margin, 35, 8);
      footer(p);
    }
  const steps = flatten(i);
  let p = page();
  text(p, t("pdfSequence"), margin, ph - margin, 17);
  y = ph - margin - 30;
  for (const s of steps) {
    if (y < margin + 30) {
      footer(p);
      p = page();
      text(p, t("pdfSequence"), margin, ph - margin, 17);
      y = ph - margin - 30;
    }
    if (s.segmentStart) {
      y = wrapped(
        p,
        `${s.color} · ${s.segment === 0 ? t("startKnot") : t("colorChange")}`,
        y,
      );
    }
    p.drawRectangle({
      x: margin,
      y: y - 1,
      width: 8,
      height: 8,
      borderWidth: 0.5,
      borderColor: pdfRgb(0.3, 0.3, 0.3),
    });
    if (s.index <= confirmed) {
      p.drawLine({
        start: { x: margin + 1, y: y },
        end: { x: margin + 7, y: y + 6 },
        thickness: 0.7,
      });
      p.drawLine({
        start: { x: margin + 1, y: y + 6 },
        end: { x: margin + 7, y: y },
        thickness: 0.7,
      });
    }
    text(
      p,
      `${s.index}.   ${s.fromLabel?`${s.fromLabel} [${s.from}]`:s.from} -> ${s.toLabel?`${s.toLabel} [${s.to}]`:s.to}     ${s.color}`,
      margin + 16,
      y,
      size,
    );
    y -= size * 1.55;
  }
  footer(p);
  return doc.save();
}
