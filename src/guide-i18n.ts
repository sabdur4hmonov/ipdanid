import { baseLocale, scriptText } from "./uzbek-script";
import type { Locale } from "./core/types";
const words = {
  guide: ["Qadamlar ro‘yxati", "Список шагов", "Step list"],
  page: ["Sahifa", "Страница", "Page"],
  previous: ["Oldingi sahifa", "Предыдущая страница", "Previous page"],
  next: ["Keyingi sahifa", "Следующая страница", "Next page"],
  resume: [
    "Tasdiqlanmagan birinchi qadamga o‘tish",
    "К первому неподтверждённому шагу",
    "Go to next unconfirmed step",
  ],
  note: [
    "Ro‘yxatdan qadam tanlash bajarilgan progressni o‘zgartirmaydi.",
    "Выбор шага не меняет подтверждённый прогресс.",
    "Browsing steps does not change confirmed progress.",
  ],
  bookmark: [
    "Shu qadamni belgilash",
    "Добавить закладку шага",
    "Bookmark this step",
  ],
  label: ["Bookmark izohi", "Подпись закладки", "Bookmark label"],
  bookmarks: ["Belgilar", "Закладки", "Bookmarks"],
  remove: ["Belgini olib tashlash", "Удалить закладку", "Remove bookmark"],
  search: [
    "Loyiha nomi yoki hash bo‘yicha qidirish",
    "Поиск по имени или хешу",
    "Search project name or hash",
  ],
  folder: ["Papka", "Папка", "Folder"],
  all: ["Barcha papkalar", "Все папки", "All folders"],
  archive: [
    "Arxivni ham ko‘rsatish",
    "Показать архив",
    "Include archived projects",
  ],
  rename: ["Loyihani qayta nomlash", "Переименовать проект", "Rename project"],
  saving: [
    "Lokal nusxa saqlanmoqda…",
    "Сохраняется локальная копия…",
    "Saving local copy…",
  ],
  saved: [
    "Lokal nusxa saqlandi",
    "Локальная копия сохранена",
    "Local copy saved",
  ],
  saveFailed: [
    "Lokal saqlash bajarilmadi. JSON nusxa eksport qiling.",
    "Локальное сохранение не удалось. Экспортируйте JSON.",
    "Local save failed. Export a JSON backup.",
  ],
} as const;
export function guideText(locale: Locale, key: keyof typeof words) {
  return scriptText(words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2], locale);
}
