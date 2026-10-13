import { baseLocale, scriptText } from "./uzbek-script";
import type { Locale } from "./core/types";
const en = {
  "people-desc": "1–3 faces. Each face is checked separately.",
  "animal-desc": "Dog, cat, bird. Original pixels are kept.",
  "vehicle-desc": "Car, motorbike. Original pixels are kept.",
  "object-desc": "Any item. Original pixels are kept.",
  "whole-image-desc": "Landscape or anything else, unchanged.",
  reviewBlocked:
    "Check every person before calculating. Not yet checked: person",
  maxPeople: "Up to three people in a new composition.",
  legacyPeople:
    "This saved composition has more than three people. It still loads; quality beyond three is not tested.",
  adviceTitle: "Photo advice",
  adviceIntro: "Advice only. You can still calculate; nothing is rejected.",
  adviceSmall:
    "The face or subject is small for this shape (feature span under 8 samples). Zoom in on it.",
  adviceManyPeople:
    "More than three people. Faces become very small in thread; crop to fewer people or choose another photo.",
  adviceContrast:
    "Low contrast: the subject and background have similar brightness. Zoom/crop to the subject or choose another photo.",
  adviceBlur:
    "The photo looks soft or blurred (heuristic). A sharper photo usually gives clearer lines.",
  fixZoom: "Zoom in",
  fixCrop: "Crop to subject",
  fixPhoto: "Choose another photo",
  adviceNone: "No advice for this photo.",
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
  "people-desc": "1–3 yuz. Har bir yuz alohida tekshiriladi.",
  "animal-desc": "It, mushuk, qush. Asl piksellar saqlanadi.",
  "vehicle-desc": "Mashina, mototsikl. Asl piksellar saqlanadi.",
  "object-desc": "Istalgan buyum. Asl piksellar saqlanadi.",
  "whole-image-desc": "Manzara yoki boshqa surat, o‘zgarishsiz.",
  reviewBlocked:
    "Hisoblashdan oldin har bir odamni tekshiring. Hali tekshirilmagan: odam",
  maxPeople: "Yangi kompozitsiyada ko‘pi bilan uch odam.",
  legacyPeople:
    "Bu saqlangan kompozitsiyada uchdan ortiq odam bor. U ochiladi, lekin uchdan ortig‘i sinovdan o‘tmagan.",
  adviceTitle: "Surat bo‘yicha maslahat",
  adviceIntro:
    "Faqat maslahat. Baribir hisoblashingiz mumkin, hech narsa rad etilmaydi.",
  adviceSmall:
    "Bu shakl uchun yuz yoki obyekt kichik (qism kengligi 8 nuqtadan kam). Kattalashtiring.",
  adviceManyPeople:
    "Uchdan ortiq odam bor. Ipda yuzlar juda kichik bo‘ladi; kamroq odamni kesib oling yoki boshqa surat tanlang.",
  adviceContrast:
    "Kontrast past: obyekt va fon yorug‘ligi o‘xshash. Obyektga yaqinlashtiring yoki boshqa surat tanlang.",
  adviceBlur:
    "Surat xira yoki loyqa ko‘rinadi (taxminiy). Aniqroq surat odatda tiniqroq chiziq beradi.",
  fixZoom: "Kattalashtirish",
  fixCrop: "Obyektga kesish",
  fixPhoto: "Boshqa surat tanlash",
  adviceNone: "Bu surat uchun maslahat yo‘q.",
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
  "people-desc": "1–3 лица. Каждое лицо проверяется отдельно.",
  "animal-desc": "Собака, кошка, птица. Исходные пиксели сохраняются.",
  "vehicle-desc": "Машина, мотоцикл. Исходные пиксели сохраняются.",
  "object-desc": "Любой предмет. Исходные пиксели сохраняются.",
  "whole-image-desc": "Пейзаж или другое фото без изменений.",
  reviewBlocked:
    "Перед расчётом проверьте каждого человека. Ещё не проверен: человек",
  maxPeople: "В новой композиции не более трёх человек.",
  legacyPeople:
    "В этой сохранённой композиции больше трёх человек. Она открывается, но качество сверх трёх не проверено.",
  adviceTitle: "Совет по фото",
  adviceIntro:
    "Только совет. Рассчитать всё равно можно, ничего не отклоняется.",
  adviceSmall:
    "Лицо или объект мал для этой формы (деталь меньше 8 отсчётов). Увеличьте его.",
  adviceManyPeople:
    "Больше трёх человек. В нитях лица станут очень мелкими; обрежьте до меньшего числа людей или выберите другое фото.",
  adviceContrast:
    "Низкий контраст: объект и фон близки по яркости. Приблизьте объект или выберите другое фото.",
  adviceBlur:
    "Фото выглядит мягким или размытым (оценка). Более резкое фото обычно даёт более чёткие линии.",
  fixZoom: "Увеличить",
  fixCrop: "Обрезать по объекту",
  fixPhoto: "Выбрать другое фото",
  adviceNone: "Для этого фото советов нет.",
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
