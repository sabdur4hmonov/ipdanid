import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  diamondStyle: ["Dona shakli", "Форма элемента", "Piece shape"],
  round: ["Dumaloq", "Круглая", "Round"],
  square: ["Kvadrat", "Квадратная", "Square"],
  pieceSize: ["Dona eni (mm)", "Ширина элемента (мм)", "Piece width (mm)"],
  magnetic: [
    "Magnit taglik + po‘lat asosli donalar (tajriba)",
    "Магнитная основа + элементы со стальным основанием (эксперимент)",
    "Magnetic backing + steel-backed pieces (experimental)",
  ],
  adhesive: ["Yelimli taglik", "Клеевая основа", "Adhesive backing"],
  backingMm: [
    "Magnit taglik qalinligi (mm)",
    "Толщина магнитной основы (мм)",
    "Magnetic backing thickness (mm)",
  ],
  backingColor: ["Taglik rangi", "Цвет основы", "Backing color"],
  diamondError: [
    "Dona eni qadamdan katta bo‘lmasin. Shakl va taglik qalinligini tekshiring.",
    "Ширина элемента не должна превышать шаг. Проверьте форму и толщину основы.",
    "Piece width must not exceed the pitch. Check shape and backing thickness.",
  ],
  boundaryPlan: [
    "Chegara va maydon rejasi",
    "План границ и площади",
    "Boundary and area plan",
  ],
  boundarySvg: [
    "Yopiq chegaralar SVG",
    "SVG замкнутых границ",
    "Closed boundaries SVG",
  ],
  boundaryJson: ["Chegaralar JSON", "JSON границ", "Boundary JSON"],
  loops: ["Yopiq chiziqlar", "Замкнутые линии", "Closed loops"],
  holes: ["Ichki bo‘shliqlar", "Внутренние отверстия", "Inner holes"],
  painted: ["Bo‘yalgan maydon", "Закрашенная площадь", "Painted area"],
  labelsMissing: [
    "Ichiga raqam sig‘magan hududlar",
    "Области без места для номера",
    "Regions without room for a label",
  ],
  boundaryHint: [
    "Ichki bo‘shliq ham chegarada qoladi. Kichik hududning rangini JSONdagi markaz koordinatasidan toping; unga sig‘maydigan raqam bosilmaydi.",
    "Внутренние отверстия сохраняются. Цвет мелкой области найдите по координатам центра в JSON; слишком крупный номер не печатается.",
    "Inner holes are preserved. Find small regions by their anchor coordinates in JSON; labels that do not fit are omitted.",
  ],
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
    "Rasm tashqarisidagi joylar bo‘sh qoladi. Global qadam tartibi o‘zgarmaydi; har taglikdagi qator va ustun 1 dan boshlanadi. O‘lcham va materialni amalda tekshiring.",
    "Места вне рисунка остаются пустыми. Общий порядок шагов сохранён; строки и столбцы каждой пластины начинаются с 1. Проверьте материалы и размеры.",
    "Studs outside the picture remain empty. Global step order is unchanged; each baseplate uses local rows and columns starting at 1. Check actual materials and dimensions.",
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
