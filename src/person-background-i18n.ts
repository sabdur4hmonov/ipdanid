import type { Locale } from "./core/types";
const en = {
  manual: "Mask corrected manually. Check every person before generating.",
  title: "White background",
  automatic: "Automatically whiten background",
  loading: "Separating people on this device…",
  ready:
    "Background whitened. Check every person, hair and clothing before generating.",
  failed:
    "Automatic separation was uncertain or unavailable. Original retained; correct the mask manually or retry.",
  local:
    "Photos stay on this device. One or several people are supported; small or hidden people may need correction.",
  original: "Original",
  prepared: "Prepared photo",
  tools: "Correct the background",
  keep: "Keep person",
  erase: "Whiten background",
  undo: "Undo brush stroke",
  reset: "Restore automatic mask",
  retry: "Retry automatic separation",
  brush: "Brush size",
  save: "Save prepared photo",
  saved:
    "For resuming a guide, reuse this prepared photo with automatic whitening off and the same crop/settings.",
  group: "Two or more people",
  groupHint:
    "Keep all people inside the crop. Single-face priority and face fitting are disabled for group photos.",
};
const uz: typeof en = {
  manual:
    "Niqob qo‘lda tuzatildi. Hisoblashdan oldin barcha odamlarni tekshiring.",
  title: "Oq fon",
  automatic: "Fonni avtomatik oqartirish",
  loading: "Odamlar shu qurilmada ajratilmoqda…",
  ready:
    "Fon oqartirildi. Hisoblashdan oldin har bir odam, soch va kiyimni tekshiring.",
  failed:
    "Avtomatik ajratish aniq chiqmadi yoki ishlamadi. Asl surat saqlandi; niqobni qo‘lda tuzating yoki qayta urinib ko‘ring.",
  local:
    "Surat qurilmada qoladi. Bitta yoki bir nechta odam saqlanadi; kichik yoki berkingan odamlarni qo‘lda tuzatish kerak bo‘lishi mumkin.",
  original: "Asl surat",
  prepared: "Tayyorlangan surat",
  tools: "Fonni tuzatish",
  keep: "Odamni saqlash",
  erase: "Fonni oqartirish",
  undo: "Oxirgi bo‘yashni qaytarish",
  reset: "Avtomatik niqobga qaytish",
  retry: "Ajratishni qayta ishlash",
  brush: "Cho‘tka o‘lchami",
  save: "Tayyorlangan suratni saqlash",
  saved:
    "Yo‘riqnomani davom ettirish uchun shu suratni avtomatik oqartirishni o‘chirib, bir xil crop va sozlamalarda qayta yuklang.",
  group: "Ikki yoki ko‘proq odam",
  groupHint:
    "Barcha odamlarni crop ichida qoldiring. Guruh suratida bitta yuz ustuvorligi va yuzga moslash o‘chiriladi.",
};
const ru: typeof en = {
  manual: "Маска исправлена вручную. До расчёта проверьте всех людей.",
  title: "Белый фон",
  automatic: "Автоматически сделать фон белым",
  loading: "Люди выделяются на этом устройстве…",
  ready:
    "Фон стал белым. До расчёта проверьте каждого человека, волосы и одежду.",
  failed:
    "Автовыделение неуверенное или недоступно. Оригинал сохранён; исправьте маску вручную или повторите.",
  local:
    "Фото остаются на устройстве. Поддерживается один или несколько человек; маленькие или скрытые люди могут потребовать правки.",
  original: "Оригинал",
  prepared: "Подготовленное фото",
  tools: "Исправить фон",
  keep: "Сохранить человека",
  erase: "Сделать фон белым",
  undo: "Отменить мазок",
  reset: "Вернуть автоматическую маску",
  retry: "Повторить выделение",
  brush: "Размер кисти",
  save: "Сохранить подготовленное фото",
  saved:
    "Для продолжения инструкции загрузите это фото с выключенным отбеливанием и теми же кадрированием и настройками.",
  group: "Два или больше человек",
  groupHint:
    "Оставьте всех людей внутри кадра. Приоритет одного лица и подгонка по лицу отключены для группы.",
};
export const backgroundText = (locale: Locale, key: keyof typeof en) =>
  ({ en, uz, ru })[locale][key];
