import { baseLocale, scriptText } from "./uzbek-script";
import type { Locale } from "./core/types";
const en = {
  cleanupUnavailable:
    "Extra background cleanup unavailable; inspect and correct the prepared photo.",
  features: "Detected facial features",
  featuresHint:
    "Local model estimates, not identity recognition. Inspect every box; missing faces are possible. Applying the selected face is an explicit review and remains manually editable.",
  faceSelection: "Face to inspect",
  featuresPreview: "Source facial features",
  featureColors: "Blue: eyes · yellow: nose · pink: lips",
  useFeatures: "Use reviewed facial regions",
  featuresApplied:
    "Reviewed regions applied to the current crop. Check the exact target below.",
  fitFirst: "Fit the complete face inside the crop before applying regions.",
  faceUnavailable:
    "Facial suggestions unavailable. Manual region editing remains available.",
  fitPeople: "Fit all people inside shape",
  undoPeople: "Undo people fitting",
  peopleCropped: "Foreground cut off by shape",
  peopleFitHint:
    "Fits all foreground, including clothing. Adjust afterwards if faces are too small; a rectangular board may suit groups better.",
  manual: "Mask corrected manually. Check every person before generating.",
  title: "White background",
  automatic: "Automatically whiten background",
  loading: "Separating people on this device…",
  ready:
    "Background whitened. Check every person, hair and clothing before generating.",
  failed:
    "Automatic separation was uncertain or unavailable. Previous photo retained; correct the mask manually or retry.",
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
    "Keep all faces inside the shape. Apply all detected faces or mark each person manually; review their eyes, nose and lips.",
};
const uz: typeof en = {
  cleanupUnavailable:
    "Qo‘shimcha fon tozalash ishlamadi; tayyorlangan suratni tekshirib, kerak bo‘lsa tuzating.",
  features: "Aniqlangan yuz qismlari",
  featuresHint:
    "Qurilmadagi model taxmini, shaxsni tanish emas. Har bir chegarani tekshiring; ayrim yuzlar topilmasligi mumkin. Tanlangan yuzni tasdiqlab qo‘llang, keyin qo‘lda ham tuzatish mumkin.",
  faceSelection: "Tekshiriladigan yuz",
  featuresPreview: "Asl suratdagi yuz qismlari",
  featureColors: "Ko‘k: ko‘zlar · sariq: burun · pushti: lablar",
  useFeatures: "Tekshirilgan yuz chegaralarini qo‘llash",
  featuresApplied:
    "Chegaralar hozirgi crop’ga qo‘llandi. Pastdagi aniq nishonni tekshiring.",
  fitFirst: "Avval yuzni to‘liq crop ichiga joylashtiring.",
  faceUnavailable:
    "Yuz qismlari taxmini ishlamadi. Chegaralarni qo‘lda belgilash mumkin.",
  fitPeople: "Barcha odamlarni shaklga joylashtirish",
  undoPeople: "Odamlarni joylashtirishni qaytarish",
  peopleCropped: "Shakl kesib tashlayotgan odam qismi",
  peopleFitHint:
    "Kiyim bilan birga barcha odamlarni joylashtiradi. Yuzlar kichik bo‘lsa, keyin crop’ni moslang; guruhga to‘rtburchak doska qulayroq bo‘lishi mumkin.",
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
    "Barcha yuzlar shakl ichida qolsin. Topilgan yuzlarni qo‘llang yoki har birini qo‘lda belgilang; ko‘z, burun va lablarni tekshiring.",
};
const ru: typeof en = {
  cleanupUnavailable:
    "Дополнительная очистка фона недоступна; проверьте и исправьте подготовленное фото.",
  features: "Обнаруженные части лица",
  featuresHint:
    "Оценка локальной модели, без распознавания личности. Проверьте каждую рамку; некоторые лица могут быть пропущены. Применение выбранного лица означает явную проверку; рамки остаются редактируемыми.",
  faceSelection: "Лицо для проверки",
  featuresPreview: "Части лица на исходном фото",
  featureColors: "Синий: глаза · жёлтый: нос · розовый: губы",
  useFeatures: "Применить проверенные рамки лица",
  featuresApplied:
    "Рамки применены к текущему кадру. Проверьте точную цель ниже.",
  fitFirst: "Сначала поместите лицо целиком внутрь кадра.",
  faceUnavailable: "Подсказки лица недоступны. Можно отметить рамки вручную.",
  fitPeople: "Вместить всех людей в форму",
  undoPeople: "Отменить размещение людей",
  peopleCropped: "Часть людей за пределами формы",
  peopleFitHint:
    "Вмещает всех людей вместе с одеждой. Если лица малы, отрегулируйте кадр; прямоугольная доска может лучше подходить группе.",
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
    "Оставьте все лица внутри формы. Примените найденные лица или отметьте каждое вручную; проверьте глаза, нос и губы.",
};
export const backgroundText = (locale: Locale, key: keyof typeof en) =>
  scriptText(({ en, uz, ru })[baseLocale(locale)][key], locale);
