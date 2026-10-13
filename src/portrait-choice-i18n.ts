import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const en = {
  fineFeature: "Test source-derived nose/lip contrast · experimental",
  fineFeatureHint:
    "Same board, materials and target. Tests real fine gradients and crossing texture; inspect eyes, skin and likeness before assembly.",
  localInput:
    "The processed photo and calculation state are saved only on this device for exact continuation. Shared guides contain no photo pixels.",
  deleteInput: "Delete local calculation photo and state",
  continueSaved: "Continue saved calculation",
  extendedSearch: "Improve saved portrait with extended search",
  extendedHint:
    "Continues the same saved eight-sweep fit up to 24 total sweeps. Inspect likeness; additional search may not improve it.",
  missingInput:
    "Exact calculation photo is unavailable. Reload its original photo; the saved guide and assembly progress remain intact.",
  stale:
    "This is a preserved earlier result. The current photo, crop, target or materials differ; generate a new variant to evaluate these settings. Saving/exporting still uses the displayed sequence.",
  title: "Portrait quality setup",
  review: "Review eyes, nose and lips",
  hint: "First check the feature boxes on the processed target. More lines alone do not restore a face. Existing guides and progress stay unchanged.",
  keep: "Optimize with my current materials",
  detail: "Use separate 240-pin / 0.1 mm portrait profile",
  detailHint:
    "New circular 400 mm board, 240 pins, 0.1 mm thread, 320-pixel computation. Eight sweeps, including all routing strands. These materials are a proposed configuration, not supplied or physically validated. Inspect likeness before assembly; longer computation may be needed.",
  pending:
    "Review the feature boxes before choosing a portrait method. If the local detector misses a face, enable portrait mode and correct the boxes manually in detailed adjustments.",
  off: "Photo type needs review: portrait optimization is off. For a portrait, review the face regions and choose a portrait method above; otherwise explicitly enable the general image method.",
  general: "Use general image method (no portrait priority)",
};
type Key = keyof typeof en;
const uz: Record<Key, string> = {
  fineFeature: "Asl burun/lab kontrastini sinash · tajriba",
  fineFeatureHint:
    "Taxta, materiallar va nishon o‘zgarmaydi. Haqiqiy mayda detal va kesishgan ip teksturasi sinaladi; yig‘ishdan oldin ko‘zlar, teri va o‘xshashlikni tekshiring.",
  localInput:
    "Aniq davom ettirish uchun tayyorlangan surat va hisoblash holati faqat shu qurilmada saqlanadi. Ulashiladigan yo‘riqnomada surat piksellari yo‘q.",
  deleteInput: "Mahalliy hisoblash surati va holatini o‘chirish",
  continueSaved: "Saqlangan hisoblashni davom ettirish",
  extendedSearch: "Saqlangan portretni kengroq qidiruv bilan yaxshilash",
  extendedHint:
    "Aynan saqlangan 8 bosqichli hisoblash jami 24 bosqichgacha davom etadi. O‘xshashlikni tekshiring; qo‘shimcha qidiruv yaxshilashni kafolatlamaydi.",
  missingInput:
    "Aynan hisoblangan surat mavjud emas. Asl suratni qayta yuklang; yo‘riqnoma va yig‘ish jarayoni saqlanadi.",
  stale:
    "Bu oldingi saqlangan natija. Hozirgi surat, crop, nishon yoki material boshqa; bu sozlamani baholash uchun yangi variant hisoblang. Saqlash va eksport ko‘rsatilayotgan ip yo‘lidan olinadi.",
  title: "Portret sifati uchun sozlash",
  review: "Ko‘z, burun va lab zonalarini tekshirish",
  hint: "Avval ishlov berilgan nishondagi zonalarni tekshiring. Faqat chiziq qo‘shish yuzni tiklamaydi. Eski yo‘riqnoma va progress saqlanadi.",
  keep: "Hozirgi materiallarim bilan portretni hisoblash",
  detail: "Alohida 240 mix / 0.1 mm portret profilini tanlash",
  detailHint:
    "Yangi 400 mm aylana taxta, 240 mix, 0.1 mm ip, 320 piksel hisoblash. Barcha yo‘naltiruvchi iplar bilan 8 qidiruv bosqichi. Bu taklif qilingan sozlama; material yetkazilgan yoki fizik tekshirilgan emas. Yig‘ishdan oldin o‘xshashlikni tekshiring; hisoblash uzoqroq davom etishi mumkin.",
  pending:
    "Usulni tanlashdan oldin yuz zonalarini tekshiring. Qurilmadagi model yuzni topmasa, batafsil sozlashda portret rejimini yoqib, zonalarni qo‘lda tuzating.",
  off: "Surat turini tekshiring: portret hisoblash o‘chiq. Portret uchun yuz zonalarini tekshirib usulni tanlang; boshqa surat uchun oddiy rasm usulini aniq yoqing.",
  general: "Oddiy rasm usulidan foydalanish (yuz ustuvorligisiz)",
};
const ru: Record<Key, string> = {
  fineFeature: "Проверить исходный контраст носа/губ · эксперимент",
  fineFeatureHint:
    "Та же доска, материалы и цель. Проверяет реальные мелкие градиенты и текстуру пересечений; перед сборкой оцените глаза, светлые области и сходство.",
  localInput:
    "Обработанное фото и состояние расчёта сохраняются только на этом устройстве для точного продолжения. В передаваемых инструкциях нет пикселей фото.",
  deleteInput: "Удалить локальное фото расчёта и состояние",
  continueSaved: "Продолжить сохранённый расчёт",
  extendedSearch: "Улучшить сохранённый портрет расширенным поиском",
  extendedHint:
    "Продолжает тот же сохранённый расчёт из восьми проходов до 24 всего. Проверьте сходство; дополнительные проходы могут не помочь.",
  missingInput:
    "Точное фото расчёта недоступно. Загрузите исходное фото; инструкция и прогресс сборки сохранены.",
  stale:
    "Это сохранённый предыдущий результат. Текущее фото, кадр, цель или материалы отличаются; рассчитайте новый вариант. Сохранение и экспорт используют показанную последовательность.",
  title: "Настройка качества портрета",
  review: "Проверить области глаз, носа и губ",
  hint: "Сначала проверьте области на обработанной цели. Дополнительные нити сами по себе не восстанавливают лицо. Старые инструкции и прогресс сохраняются.",
  keep: "Рассчитать портрет с моими материалами",
  detail: "Выбрать отдельный профиль: 240 гвоздей / 0.1 мм",
  detailHint:
    "Новая круглая доска 400 мм, 240 гвоздей, нить 0.1 мм, расчёт 320 пикселей. Восемь проходов с учётом всех переходов. Материалы предложены, не поставлены и физически не проверены. Проверьте сходство перед сборкой; расчёт может занять больше времени.",
  pending:
    "Проверьте области лица перед выбором метода. Если локальный детектор пропустил лицо, включите портретный режим и исправьте области вручную в подробных настройках.",
  off: "Проверьте тип фото: портретный расчёт выключен. Для портрета проверьте области и выберите метод; для другого изображения явно включите обычный метод.",
  general: "Использовать обычный метод (без приоритета лица)",
};
export const portraitChoiceText = (locale: Locale, key: Key) =>
  scriptText({ en, uz, ru }[baseLocale(locale)][key], locale);
