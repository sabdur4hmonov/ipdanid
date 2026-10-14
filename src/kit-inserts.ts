import QRCode from "qrcode";
import type { Locale } from "./core/types";
import { kitText } from "./kit-i18n";
export type KitBatch = {
  id: string;
  profile: string;
  codes: {
    code: string;
    quota: number;
    expiresAt: number | null;
    creditDays: number;
  }[];
};
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function kitInserts(batch: KitBatch, locale: Locale) {
  if (
    !batch.codes.length ||
    batch.codes.length > 100 ||
    batch.codes.some((c) => !/^[-\w]{32}$/.test(c.code))
  )
    throw Error("Invalid kit batch");
  const cards = await Promise.all(
    batch.codes.map(
      async (c) =>
        `<article><h1>Ip Rasm</h1><p>${escape(kitText(locale, "code"))}</p>${await QRCode.toString(c.code, { type: "svg", errorCorrectionLevel: "M", margin: 4, width: 180 })}<code>${escape(c.code)}</code><p>${escape(kitText(locale, "quota"))}: ${c.quota}</p><p>${escape(kitText(locale, "codeDays"))}: ${c.expiresAt === null ? "0" : new Date(c.expiresAt).toISOString().slice(0, 10)}</p><p>${escape(kitText(locale, "creditDays"))}: ${c.creditDays}</p><p>${escape(kitText(locale, "insertHelp"))}</p></article>`,
    ),
  );
  return `<!doctype html><html lang="${locale}"><meta charset="utf-8"><title>Ip Rasm kit inserts</title><style>body{font:14px system-ui;color:#163354;margin:10mm;display:grid;grid-template-columns:repeat(2,1fr);gap:8mm}article{break-inside:avoid;border:1px dashed #888;padding:6mm;text-align:center}svg{display:block;width:40mm;height:40mm;margin:auto}code{font:13px monospace;overflow-wrap:anywhere;display:block}h1{margin:0}p{margin:6px 0}@media print{body{margin:0}@page{size:A4;margin:10mm}}</style>${cards.join("")}<footer>${escape(batch.id)}</footer></html>`;
}
export function kitCodeCsv(batch: KitBatch) {
  return (
    "code,builds,redeem_expiry,credit_days\n" +
    batch.codes
      .map((c) =>
        [
          c.code,
          c.quota,
          c.expiresAt === null ? "" : new Date(c.expiresAt).toISOString(),
          c.creditDays,
        ].join(","),
      )
      .join("\n")
  );
}
