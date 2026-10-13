import { baseLocale, scriptText } from "./uzbek-script";
import type { Locale } from "./core/types";
const en = {
  title: "What is in the photo?",
  people: "People (1–3)",
  animal: "Animal",
  vehicle: "Vehicle",
  object: "Object",
  "whole-image": "Keep full image",
  hint: "Choose the subject before preparing the image. Objects and animals keep the original background until you correct it manually.",
  manual:
    "Manual background correction. Inspect the whole subject before generating.",
  keep: "Keep subject",
  background: "Apply manual background mask",
  local:
    "Processing stays on this device. Automatic person separation is not applied to this subject.",
  personCount: "Number of people",
  add: "Add person",
  remove: "Remove selected person",
  review: "I checked this person’s regions",
  reviewed: "Reviewed",
  needsReview: "Needs review",
  thirdHint:
    "Add a missed person and check each face separately. Estimated boxes are not detected anatomy.",
};
const uz: typeof en = {
  title: "Suratda nima bor?",
  people: "Odamlar (1–3)",
  animal: "Hayvon",
  vehicle: "Mashina",
  object: "Buyum",
  "whole-image": "Suratni to‘liq saqlash",
  hint: "Suratga ishlov berishdan oldin turini tanlang. Hayvon va buyumlarning foni qo‘lda tuzatmaguningizcha saqlanadi.",
  manual:
    "Fon qo‘lda tuzatiladi. Hisoblashdan oldin obyektni to‘liq tekshiring.",
  keep: "Obyektni saqlash",
  background: "Qo‘lda chizilgan fon niqobini qo‘llash",
  local:
    "Ishlov qurilmada bajariladi. Bu suratga odam ajratish avtomatik qo‘llanmaydi.",
  personCount: "Odamlar soni",
  add: "Odam qo‘shish",
  remove: "Tanlangan odamni olib tashlash",
  review: "Bu odamning yuz chegaralarini tekshirdim",
  reviewed: "Tekshirilgan",
  needsReview: "Tekshirish kerak",
  thirdHint:
    "Topilmagan odamni qo‘shing va har bir yuzni alohida tekshiring. Taxminiy chegaralar aniqlangan yuz qismlari emas.",
};
const ru: typeof en = {
  title: "Что на фотографии?",
  people: "Люди (1–3)",
  animal: "Животное",
  vehicle: "Автомобиль",
  object: "Предмет",
  "whole-image": "Сохранить всё фото",
  hint: "Выберите тип перед обработкой. Фон животных и предметов сохраняется до ручного исправления.",
  manual: "Ручная коррекция фона. Проверьте весь объект перед расчётом.",
  keep: "Сохранить объект",
  background: "Применить ручную маску фона",
  local:
    "Обработка выполняется на устройстве. Автоматическое выделение людей к этому фото не применяется.",
  personCount: "Количество людей",
  add: "Добавить человека",
  remove: "Удалить выбранного человека",
  review: "Я проверил области этого лица",
  reviewed: "Проверено",
  needsReview: "Нужно проверить",
  thirdHint:
    "Добавьте пропущенного человека и проверьте каждое лицо. Примерные рамки не являются обнаруженной анатомией.",
};
export function subjectText(locale: Locale, key: keyof typeof en) {
  return scriptText(({ en, uz, ru }[baseLocale(locale)] ?? en)[key], locale);
}
