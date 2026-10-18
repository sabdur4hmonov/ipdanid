import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  plateColumns: [
    "Taglik eni (dona)",
    "Ширина пластины (элементы)",
    "Baseplate width (pieces)",
  ],
  plateRows: [
    "Taglik bo‘yi (dona)",
    "Высота пластины (элементы)",
    "Baseplate height (pieces)",
  ],
  plateStock: [
    "Mavjud tagliklar soni",
    "Пластин в наличии",
    "Baseplates in stock",
  ],
  plates: ["Tagliklar rejasi", "План пластин", "Baseplate plan"],
  plate: ["Taglik", "Пластина", "Baseplate"],
  richer: ["24 rangli namuna", "Пример: 24 цвета", "24-color example"],
  board: [
    "Tagliklarning jami o‘lchami",
    "Общий размер пластин",
    "Total baseplate size",
  ],
  unused: ["Bo‘sh qoladigan joylar", "Незаполненные места", "Unassigned studs"],
  blank: [
    "Rasm tashqarisidagi joylar bo‘sh qoladi. Global qadam tartibi o‘zgarmaydi; har taglikdagi qator va ustun1dan boshlanadi. O‘lcham va materialni amalda tekshiring.",
    "Места вне рисунка остаются пустыми. Общий порядок шагов сохранён; строки и столбцы каждой пластины начинаются с1. Проверьте материалы и размеры.",
    "Studs outside the picture remain empty. Global step order is unchanged; each baseplate uses local rows and columns starting at1. Check actual materials and dimensions.",
  ],
  planPdf: ["Tagliklar PDF", "PDF пластин", "Baseplate PDF"],
  planSvg: ["Tagliklar SVG", "SVG пластин", "Baseplate SVG"],
  planJson: ["Tagliklar JSON", "JSON пластин", "Baseplate JSON"],
  diagram: [
    "Joylashuv chizmasi - haqiqiy o‘lcham emas",
    "Схема размещения - не в натуральную величину",
    "Placement diagram - not to physical scale",
  ],
  error: [
    "Taglik o‘lchami, zaxirasi yoki reja ma’lumoti noto‘g‘ri.",
    "Неверные размеры, запас или данные плана.",
    "Invalid baseplate size, stock or plan data.",
  ],
} as const;
export const craftPolishText = (locale: Locale, key: keyof typeof words) =>
  scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
