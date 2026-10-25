import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  language: ["Til", "Язык", "Language"],
  main: ["Asosiy bo‘limlar", "Основные разделы", "Main sections"],
  dismissError: [
    "Xato xabarini yopish",
    "Закрыть сообщение об ошибке",
    "Dismiss error",
  ],
  development: ["Sinov versiyasi", "Тестовая версия", "Development version"],
  editedPhoto: ["Tahrirlangan surat", "Отредактированное фото", "Edited photo"],
  target: ["Hisoblash rasmi", "Изображение для расчёта", "Calculation image"],
  sequence: ["Ip ketma-ketligi", "Последовательность нитей", "Thread sequence"],
  ownerSections: [
    "Boshqaruv bo‘limlari",
    "Разделы управления",
    "Administration sections",
  ],
  top: ["Yuqori", "Верх", "Top"],
  string: ["Ipdan rasm", "Картина из нитей", "String art"],
  diamond: ["Olmos mozaika", "Алмазная мозаика", "Diamond mosaic"],
  mosaic: ["Mozaika", "Мозаика", "Mosaic"],
  paint: ["Bo‘yash", "Рисование", "Painting"],
  book: ["Kitob buklash", "Складывание книги", "Book folding"],
  digital: ["Raqamli mahsulot", "Цифровой продукт", "Digital product"],
  product: ["Mahsulot", "Товар", "Product"],
} as const;
export function uiText(locale: Locale, key: keyof typeof words) {
  return scriptText(
    words[key][{ uz: 0, ru: 1, en: 2 }[baseLocale(locale)]],
    locale,
  );
}
