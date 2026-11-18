import {
  beginMarkedContent, clip, endMarkedContent, endPath, popGraphicsState,
  pushGraphicsState, rectangle, rgb, type PDFDocument, type PDFFont, type PDFPage,
} from "pdf-lib";
import { kitTemplateText } from "../kit-template-i18n";
import { pinLabel, type StandardKitConfig } from "./standard-kit";
import type { Locale, MaterialProfile } from "./types";

const MM = 72 / 25.4;
const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 420;
const LEFT = 23.5;
const ink = rgb(0.07, 0.17, 0.29);
const cut = rgb(0.62, 0.24, 0.17);
const light = rgb(0.6, 0.65, 0.68);
// Clockwise from upper right, matching the manager's Circle PDF.
const quarters = [[1, 0], [1, 1], [0, 1], [0, 0]] as const;

export function drawBoardQuadrants(
  doc: PDFDocument,
  config: StandardKitConfig,
  profile: MaterialProfile,
  locale: Locale,
  font: PDFFont,
  labelFont: PDFFont,
) {
  const t = (key: Parameters<typeof kitTemplateText>[1], fields?: readonly (string | number)[]) =>
    kitTemplateText(locale, key, fields);
  const shape = t(profile.shape === "rectangle" ? "square" : profile.shape);
  const half = config.baseMm / 2;
  const top = (PAGE_HEIGHT - half) / 2;
  if (half > 250) throw Error("Board quarters larger than 250 mm cannot use this A3 layout");
  const point = (x: number, y: number) => ({ x: x * MM, y: (PAGE_HEIGHT - y) * MM });
  const newPage = () => doc.addPage([PAGE_WIDTH * MM, PAGE_HEIGHT * MM]);
  const text = (page: PDFPage, label: string, x: number, y: number, size = 11) => {
    page.drawText(label, { ...point(x, y), size, font, color: ink, maxWidth: (PAGE_WIDTH - x - 15) * MM });
  };
  const line = (page: PDFPage, x1: number, y1: number, x2: number, y2: number, color = ink, thickness = 0.7) => {
    page.drawLine({ start: point(x1, y1), end: point(x2, y2), thickness, color });
  };
  const calibration = (page: PDFPage, y: number) => {
    line(page, LEFT, y, LEFT + 100, y, ink, 1);
    for (const x of [LEFT, LEFT + 50, LEFT + 100]) line(page, x, y - 2, x, y + 2);
    text(page, t("calibration100"), LEFT, y + 9);
  };
  const cover = newPage();
  text(cover, `IP RASM / ${shape} / ${t("quadrants")}`, LEFT, 32, 22);
  text(cover, `${config.baseMm} x ${config.baseMm} mm / ${config.nails} / r${config.revision}`, LEFT, 49, 15);
  [t("actual"), t("quadrantPrint"), t("quadrantFrame"), t("quadrantLayout"), t("quadrantCut"), t("shaft", [config.shaftMm])]
    .forEach((label, n) => text(cover, label, LEFT, 74 + n * 15, 12));
  for (const [[x, y], label] of quarters.map((q, i) => [q, "ABCD"[i]] as const)) {
    cover.drawRectangle({ ...point(LEFT + 30 * x, 212 + 30 * y), width: 30 * MM, height: 30 * MM, borderColor: ink, borderWidth: 0.7 });
    text(cover, label, LEFT + 13 + 30 * x, 199 + 30 * y, 20);
  }
  calibration(cover, 295);

  for (const [index, [col, row]] of quarters.entries()) {
    const page = newPage();
    const sheet = "ABCD"[index];
    const x = (mm: number) => LEFT + mm - col * half;
    const y = (mm: number) => top + mm - row * half;
    const boardPoint = (xMm: number, yMm: number) => point(x(xMm), y(yMm));
    const right = LEFT + half, bottom = top + half;
    text(page, `${sheet} / ${index + 1}/4 / ${shape} / ${half} x ${half} mm / r${config.revision}`, LEFT, top - 16, 14);
    text(page, t("quadrantLayout"), LEFT, top - 7);
    line(page, LEFT, top, right, top, row === 0 ? ink : light);
    line(page, LEFT, bottom, right, bottom, row === 1 ? ink : light);
    line(page, LEFT, top, LEFT, bottom, col === 0 ? ink : light);
    line(page, right, top, right, bottom, col === 1 ? ink : light);
    const seamX = col === 0 ? right : LEFT;
    const seamY = row === 0 ? bottom : top;
    for (const part of [0.25, 0.5, 0.75]) {
      const tickX = LEFT + half * part, tickY = top + half * part;
      line(page, tickX, seamY - 2, tickX, seamY + 2);
      line(page, seamX - 2, tickY, seamX + 2, tickY);
    }
    const centre = boardPoint(half, half);
    page.drawLine({ start: { ...centre, x: centre.x - 4 * MM }, end: { ...centre, x: centre.x + 4 * MM }, color: ink, thickness: 0.5 });
    page.drawLine({ start: { ...centre, y: centre.y - 4 * MM }, end: { ...centre, y: centre.y + 4 * MM }, color: ink, thickness: 0.5 });
    page.pushOperators(pushGraphicsState(), rectangle(LEFT * MM, (PAGE_HEIGHT - bottom) * MM, half * MM, half * MM), clip(), endPath());
    const pins = profile.pins;
    for (const [i, pin] of pins.entries()) {
      const next = pins[(i + 1) % pins.length];
      page.drawLine({ start: boardPoint(pin.x * config.baseMm, pin.y * config.baseMm), end: boardPoint(next.x * config.baseMm, next.y * config.baseMm), color: light, thickness: 0.4 });
    }
    if (profile.shape === "circle") {
      page.drawCircle({ ...centre, size: (config.circleDiameterMm / 2 - 8) * MM, borderColor: cut, borderWidth: 0.65, borderDashArray: [3 * MM, 2 * MM] });
    } else if (profile.shape === "rectangle") {
      const side = config.squareSideMm - 16;
      page.drawRectangle({ x: centre.x - side * MM / 2, y: centre.y - side * MM / 2, width: side * MM, height: side * MM, borderColor: cut, borderWidth: 0.65, borderDashArray: [3 * MM, 2 * MM] });
    } else {
      // A conservative interior circle clears the heart notch and tip.
      page.drawCircle({ ...centre, size: config.heartEnvelopeMm * 0.15 * MM, borderColor: cut, borderWidth: 0.65, borderDashArray: [3 * MM, 2 * MM] });
    }
    page.pushOperators(popGraphicsState());
    for (const [i, pin] of pins.entries()) {
      // Points on centre seams belong to exactly one sheet. For the circle
      // these are A-1, B-1, C-1 and D-1 in clockwise order.
      const dx = pin.x - 0.5, dy = pin.y - 0.5, eps = 1e-10;
      const pinCol = Math.abs(dx) <= eps ? Number(dy < 0) : Number(dx > 0);
      const pinRow = Math.abs(dy) <= eps ? Number(dx > 0) : Number(dy > 0);
      if (pinCol !== col || pinRow !== row) continue;
      const at = boardPoint(pin.x * config.baseMm, pin.y * config.baseMm);
      page.pushOperators(beginMarkedContent(`Pin-${i}`));
      page.drawCircle({ ...at, size: config.shaftMm / 2 * MM, borderWidth: 0.65, borderColor: ink });
      page.pushOperators(endMarkedContent());
      page.drawLine({ start: { ...at, x: at.x - MM }, end: { ...at, x: at.x + MM }, color: ink, thickness: 0.35 });
      page.drawLine({ start: { ...at, y: at.y - MM }, end: { ...at, y: at.y + MM }, color: ink, thickness: 0.35 });
      const previous = pins[(i + pins.length - 1) % pins.length];
      const next = pins[(i + 1) % pins.length];
      const tx = next.x - previous.x, ty = next.y - previous.y;
      const tangent = Math.hypot(tx, ty) || 1;
      const offset = (i % 2 ? (profile.shape === "heart" ? 6.3 : 4.1) : -4.5) * MM;
      const label = pinLabel(profile, i);
      const width = labelFont.widthOfTextAtSize(label, 6.7);
      page.drawText(label, {
        x: Math.min((right - 1) * MM - width, Math.max((LEFT + 1) * MM, at.x - ty / tangent * offset - width / 2)),
        y: Math.min((PAGE_HEIGHT - top - 3) * MM, Math.max((PAGE_HEIGHT - bottom + 1) * MM, at.y - tx / tangent * offset - 2)),
        size: 6.7, font: labelFont, color: ink,
      });
    }
    text(page, t("quadrantBoardEdges", [sheet]), LEFT, bottom + 16);
    text(page, t("quadrantFrame"), LEFT, bottom + 24);
    text(page, t("actual"), LEFT, bottom + 32);
    calibration(page, bottom + 51);
    text(page, t("quadrantCut"), LEFT, bottom + 72);
  }
}
