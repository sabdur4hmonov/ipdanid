import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  quadrants: ["4 TA A3 ANDOZA", "4 ШАБЛОНА A3", "4 A3 TEMPLATES"],
  quadrantPrint: [
    "2–5-betlarni A3 qog‘ozga 100% o‘lchamda chop eting.",
    "Печатайте страницы 2–5 на A3 в масштабе 100%.",
    "Print pages 2–5 on A3 at 100% scale.",
  ],
  quadrantFrame: [
    "Ramka bo‘ylab qirqing. Ochiq chiziqlar markazda tutashadi.",
    "Вырежьте по рамке. Светлые линии стыкуются в центре.",
    "Trim on the frame. Join the light seam lines at the board centre.",
  ],
  quadrantLayout: [
    "Taxtaning oldi: A — yuqori o‘ng, B — pastki o‘ng, C — pastki chap, D — yuqori chap.",
    "Лицевая сторона: A — верх справа, B — низ справа, C — низ слева, D — верх слева.",
    "Front view: A top right, B bottom right, C bottom left, D top left.",
  ],
  quadrantBoardEdges: [
    "{0} VARAQ — to‘q chiziqlarni taxtaning tashqi chetlariga tekislang.",
    "ЛИСТ {0} — совместите тёмные линии с краями доски.",
    "SHEET {0} — align dark frame lines to the outer board edges.",
  ],
  quadrantCut: [
    "Ichki uzukni ochish ixtiyoriy: qizil uzuq chiziq bo‘ylab qirqing.",
    "При желании вырежьте середину по красному пунктиру.",
    "Optional inner cutout: cut along the red dashed line.",
  ],
  calibration100: ["100 mm tekshirish belgisi", "Проверка 100 мм", "100 mm calibration"],
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
