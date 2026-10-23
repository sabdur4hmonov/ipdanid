import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  title: [
    "Suratni keyin davom ettirish",
    "Продолжить фото позже",
    "Continue editing later",
  ],
  info: [
    "Bitta surat, qirqilgan fon va joylashuv shu qurilmada 30 kun saqlanadi. Yangi nusxa eskisini almashtiradi. Serverga yuborilmaydi.",
    "Одно фото, вырезанный фон и положение хранятся на этом устройстве 30 дней. Новая копия заменяет старую. На сервер не отправляется.",
    "One photo, cutout and placement stay on this device for 30 days. Saving replaces the previous copy. Nothing is uploaded.",
  ],
  save: [
    "Shu qurilmada saqlash",
    "Сохранить на устройстве",
    "Save on this device",
  ],
  open: [
    "Saqlangan suratni ochish",
    "Открыть сохранённое фото",
    "Open saved photo",
  ],
  remove: [
    "Saqlangan suratni o‘chirish",
    "Удалить сохранённое фото",
    "Delete saved photo",
  ],
  saved: ["Saqlandi", "Сохранено", "Saved"],
  empty: ["Saqlangan surat yo‘q", "Нет сохранённого фото", "No saved photo"],
  removed: [
    "Saqlangan nusxa o‘chirildi",
    "Сохранённая копия удалена",
    "Saved copy deleted",
  ],
  failed: [
    "Bajarilmadi. Joy yetarliligini tekshiring. Eski yoki buzilgan nusxa tiklanmaydi.",
    "Не удалось. Проверьте свободное место. Просроченная или повреждённая копия не восстанавливается.",
    "Could not finish. Check free space. Expired or damaged copies cannot be restored.",
  ],
  close: ["Yopish", "Закрыть", "Close"],
} as const;
export function photoDraftText(locale: Locale, key: keyof typeof words) {
  return scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
}
