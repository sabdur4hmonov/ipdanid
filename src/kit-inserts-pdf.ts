import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import { kitClaimLink } from "./kit-claim-link";
import type { KitBatch } from "./kit-inserts";
import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  uz: {
    code: "Kit kodi",
    quota: "Tayyorlashlar",
    help: "Ilovani oching va kodni kiriting. Bir qo‘llanma uchun bir kredit. Kodni maxfiy saqlang.",
    unlimited: "Kirish muddati cheklanmagan",
    expires: "Kirish muddati",
    title: "Kit uchun kartochkalar",
  },
  ru: {
    code: "Код набора",
    quota: "Сборок",
    help: "Откройте приложение и введите код. Одна инструкция стоит один кредит. Храните код в тайне.",
    unlimited: "Без срока активации",
    expires: "Активация до",
    title: "Карточки набора",
  },
  en: {
    code: "Kit code",
    quota: "Builds",
    help: "Open the app and enter this code. One guide uses one credit. Keep the code private.",
    unlimited: "No activation expiry",
    expires: "Activate by",
    title: "Kit inserts",
  },
};
export async function kitInsertsPdf(
  batch: KitBatch,
  locale: Locale,
  fontBytes?: Uint8Array,
  claimOrigin?: string,
) {
  if (
    !batch ||
    typeof batch.id !== "string" ||
    batch.id.length > 120 ||
    !batch.codes.length ||
    batch.codes.length > 100 ||
    new Set(batch.codes.map((c) => c.code)).size !== batch.codes.length ||
    batch.codes.some(
      (c) =>
        !/^[-\w]{32}$/.test(c.code) ||
        !Number.isInteger(c.quota) ||
        c.quota < 1 ||
        c.quota > 100 ||
        (c.expiresAt !== null &&
          (!Number.isFinite(c.expiresAt) || c.expiresAt < 0)),
    )
  )
    throw Error("Invalid kit batch");
  const t = (k: keyof typeof words.en) =>
      scriptText(words[baseLocale(locale)][k], locale),
    doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle("Ip Rasm - " + t("title"));
  doc.setSubject("Private kit login codes; keep this file private");
  const font = await doc.embedFont(
      fontBytes ??
        new Uint8Array(
          await (await fetch("/fonts/NotoSans-Regular.ttf")).arrayBuffer(),
        ),
      { subset: true },
    ),
    mono = await doc.embedFont(StandardFonts.Courier),
    mm = 72 / 25.4;
  const wrap = (text: string, width: number, size: number) => {
    const lines: string[] = [];
    let line = "";
    for (const word of text.split(/\s+/)) {
      const next = line ? line + " " + word : word;
      if (line && font.widthOfTextAtSize(next, size) > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };
  const count = Math.ceil(batch.codes.length / 6);
  for (let pageIndex = 0; pageIndex < count; pageIndex++) {
    const page = doc.addPage([210 * mm, 297 * mm]);
    page.drawText("Ip Rasm | " + batch.id, {
      x: 12 * mm,
      y: 289 * mm,
      size: 7,
      font,
      color: rgb(0.3, 0.36, 0.44),
    });
    for (let slot = 0; slot < 6; slot++) {
      const item = batch.codes[pageIndex * 6 + slot];
      if (!item) break;
      const x = (12 + (slot % 2) * 97) * mm,
        y = (297 - 16 - 84 - Math.floor(slot / 2) * 92) * mm,
        w = 89 * mm,
        h = 84 * mm;
      page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderColor: rgb(0.7, 0.75, 0.8),
        borderWidth: 0.5,
      });
      const centre = (
        text: string,
        baseline: number,
        size: number,
        code = false,
      ) => {
        const f = code ? mono : font;
        page.drawText(text, {
          x: x + (w - f.widthOfTextAtSize(text, size)) / 2,
          y: baseline,
          size,
          font: f,
          color: rgb(0.08, 0.17, 0.27),
        });
      };
      centre("Ip Rasm", y + h - 7 * mm, 15);
      centre(t("code"), y + h - 12 * mm, 8);
      const matrix = QRCode.create(
          claimOrigin ? kitClaimLink(claimOrigin, item.code) : item.code,
          {
            errorCorrectionLevel: "M",
          },
        ).modules,
        quiet = 4,
        qrSide = 40 * mm,
        unit = qrSide / (matrix.size + quiet * 2),
        qx = x + (w - qrSide) / 2,
        qy = y + h - 55 * mm;
      for (let row = 0; row < matrix.size; row++)
        for (let col = 0; col < matrix.size; col++)
          if (matrix.data[row * matrix.size + col])
            page.drawRectangle({
              x: qx + (col + quiet) * unit,
              y: qy + (matrix.size + quiet - row - 1) * unit,
              width: unit,
              height: unit,
              color: rgb(0, 0, 0),
            });
      centre(item.code, qy - 3 * mm, 8, true);
      centre(t("quota") + ": " + item.quota, qy - 8 * mm, 9);
      const expiry =
        item.expiresAt === null
          ? t("unlimited")
          : t("expires") +
            ": " +
            new Date(item.expiresAt).toISOString().slice(0, 10);
      centre(expiry, qy - 12 * mm, 7);
      const lines = wrap(t("help"), w - 10 * mm, 7);
      for (let j = 0; j < lines.length; j++)
        centre(lines[j], qy - 17 * mm - j * 9, 7);
    }
    page.drawText(pageIndex + 1 + " / " + count, {
      x: 100 * mm,
      y: 6 * mm,
      size: 8,
      font,
      color: rgb(0.3, 0.36, 0.44),
    });
  }
  return doc.save();
}
