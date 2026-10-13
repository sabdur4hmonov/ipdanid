import { baseLocale, scriptText } from "./uzbek-script";
import type { Locale } from "./core/types";
const en = {
  variant: "Variant",
  more: "More",
  startTitle: "Turn your photo into string art",
  startHint:
    "Take a photo or choose one from your gallery. Photos stay on your device.",
  adjustTitle: "Check your photo",
  adjustHint:
    "Move or zoom the photo, check the white background, then create your preview.",
  background: "White background and face review",
  preparing: "Preparing photo…",
  people: "One or more people",
  advancedPhoto: "Detailed photo adjustments",
  advancedGeneration: "More creation settings",
};
type Key = keyof typeof en;
const uz: Record<Key, string> = {
  variant: "Natija",
  more: "Menyu",
  startTitle: "Suratingizdan ipli rasm yarating",
  startHint:
    "Rasmga oling yoki galereyadan tanlang. Suratlar qurilmangizda qoladi.",
  adjustTitle: "Suratingizni tekshiring",
  adjustHint:
    "Suratni surib yoki kattalashtirib moslang, oq fonni tekshiring va natijani yarating.",
  background: "Oq fon va yuzlarni tekshirish",
  preparing: "Surat tayyorlanmoqda…",
  people: "Bir yoki bir nechta odam",
  advancedPhoto: "Suratni batafsil sozlash",
  advancedGeneration: "Qo‘shimcha yaratish sozlamalari",
};
const ru: Record<Key, string> = {
  variant: "Вариант",
  more: "Меню",
  startTitle: "Создайте картину из нитей",
  startHint:
    "Сделайте снимок или выберите фото из галереи. Фотографии остаются на устройстве.",
  adjustTitle: "Проверьте фотографию",
  adjustHint:
    "Настройте положение и масштаб, проверьте белый фон и создайте эскиз.",
  background: "Белый фон и проверка лиц",
  preparing: "Подготовка фотографии…",
  people: "Один или несколько человек",
  advancedPhoto: "Подробная настройка фотографии",
  advancedGeneration: "Дополнительные настройки",
};
export const simpleText = (locale: Locale, key: Key) =>
  scriptText(({ en, uz, ru })[baseLocale(locale)][key], locale);
