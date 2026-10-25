import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  sheet: ["BIR VARAQ", "ОДИН ЛИСТ", "SHEET"],
  tiles: ["A4 BO‘LAKLAR", "ЛИСТЫ A4", "TILES"],
  stickers: ["SEKTOR YOPISHTIRMALARI", "НАКЛЕЙКИ СЕКТОРОВ", "STICKERS"],
  circle: ["Doira", "Круг", "Circle"],
  circle46: ["Doira 46", "Круг 46", "Circle 46"],
  square: ["Kvadrat", "Квадрат", "Square"],
  heart: ["Yurak", "Сердце", "Heart"],
  heartEnvelope: [
    "Yurakning shartli chegarasi",
    "Условный габарит сердца",
    "Heart envelope",
  ],
  actual: [
    "100% / HAQIQIY O‘LCHAM - SIG‘DIRMANG",
    "100% / ФАКТИЧЕСКИЙ РАЗМЕР - БЕЗ ПОДГОНКИ",
    "100% / ACTUAL SIZE - NO FIT",
  ],
  single: ["bitta varaq", "один лист", "single sheet"],
  tile: [
    "varaq {0},{1} / {2}x{3}; ustma-ust 10 mm",
    "лист {0},{1} / {2}x{3}; нахлёст 10 mm",
    "tile {0},{1} / {2}x{3}; overlap 10 mm",
  ],
  topFront: [
    "TAXTA YUQORISI {0} | OLDI",
    "ВЕРХ ОСНОВЫ {0} | ЛИЦО",
    "BOARD TOP {0} | FRONT",
  ],
  origin: ["boshlanish", "начало", "origin"],
  calibration: [
    "50 mm tekshirish belgisi",
    "Проверка 50 mm",
    "50 mm calibration",
  ],
  ticks: [
    "kesish/yopishtirishdan oldin belgilarni moslang",
    "совместите метки перед вырезанием/наклеиванием",
    "match ticks before cutting/sticking",
  ],
  shaft: [
    "mix tanasi {0} mm; teshikni chiqindi taxtada sinang",
    "стержень гвоздя {0} mm; пробное отверстие на обрезке",
    "pin shaft {0} mm; test pilot size on scrap",
  ],
  gap: [
    "markazlar oralig‘i >={0} mm",
    "между центрами >={0} mm",
    "centre gap >={0} mm",
  ],
} as const;
export function kitTemplateText(
  locale: Locale,
  key: keyof typeof words,
  fields: readonly (string | number)[] = [],
) {
  return scriptText(
    words[key][{ uz: 0, ru: 1, en: 2 }[baseLocale(locale)]],
    locale,
  ).replace(/\{(\d+)\}/g, (_, n) => String(fields[Number(n)]));
}
