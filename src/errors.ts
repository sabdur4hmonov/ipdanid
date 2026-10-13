import { baseLocale, scriptText } from "./uzbek-script";
import type { Locale } from "./core/types";
import { portraitHelp } from "./portrait-help-i18n";
import { portraitChoiceText } from "./portrait-choice-i18n";
// Domain/Worker messages remain stable for diagnostics; visible recovery text follows the chosen locale.
const messages: [RegExp, Record<Exclude<Locale, "uz-Cyrl">, string>][] = [
  [
    /\[(?:[^\]]*,)?target(?:,|\])/i,
    {
      uz: "Surat/crop tanlangan yo‘riqnomaga mos emas. Asl suratni qayta yuklang. Oldingi yo‘riqnoma va jarayon saqlanadi.",
      ru: "Фото/кадр не соответствует выбранной инструкции. Загрузите исходное фото. Инструкция и прогресс сохранены.",
      en: "This photo/crop does not match the selected guide. Reload its original photo. The previous guide and progress are preserved.",
    },
  ],
  [
    /\[(?:[^\]]*,)?profile(?:,|\])/i,
    {
      uz: "Materiallar yoki mix joylashuvi tanlangan yo‘riqnomaga mos emas. Saqlangan sozlamalarni tiklang.",
      ru: "Материалы или гвозди не соответствуют инструкции. Восстановите сохранённые параметры.",
      en: "Materials or pin coordinates do not match the selected guide. Restore its recorded settings.",
    },
  ],
  [
    /Continuation requires|Invalid portrait/i,
    {
      uz: "Yuz hududini tekshiring. Davom ettirish uchun aynan shu surat, crop va materiallar kerak.",
      ru: "Проверьте область лица. Для продолжения нужны то же фото, кадр и материалы.",
      en: "Check the face region. Continuation requires the same photograph, crop and materials.",
    },
  ],
  [
    /Maximum file size/i,
    {
      uz: "Fayl 15 MB dan katta. Kichikroq JPEG yoki PNG tanlang.",
      ru: "Файл больше 15 МБ. Выберите меньший JPEG или PNG.",
      en: "Maximum file size is 15 MB. Choose a smaller JPEG or PNG.",
    },
  ],
  [
    /valid JPEG or PNG|could not be decoded|InvalidStateError/i,
    {
      uz: "Surat ochilmadi. Haqiqiy JPEG yoki PNG faylini tanlang.",
      ru: "Изображение не открывается. Выберите корректный JPEG или PNG.",
      en: "Use a valid JPEG or PNG image. The selected image could not be opened.",
    },
  ],
  [
    /decoded dimensions|Decoded image limit|Invalid bounded RGB/i,
    {
      uz: "Surat o‘lchami xavfsiz chegaradan katta: 24 MP yoki 12 000 px. Suratni kichraytiring.",
      ru: "Размер превышает безопасный предел: 24 Мп или 12 000 px. Уменьшите изображение.",
      en: "Image exceeds safe decoded dimensions (24 MP / 12,000 px). Resize the image.",
    },
  ],
  [
    /too large/i,
    {
      uz: "Yo‘riqnoma fayli 4 MB dan katta. Boshqa zaxira faylini tanlang.",
      ru: "Файл инструкции больше 4 МБ. Выберите другую резервную копию.",
      en: "Instruction file too large: maximum 4 MB. Choose another backup.",
    },
  ],
  [
    /Unsupported.*version/i,
    {
      uz: "Bu yo‘riqnoma versiyasi qo‘llanmaydi. Mos dastur versiyasi yoki zaxira faylini tanlang.",
      ru: "Эта версия инструкции не поддерживается. Используйте совместимое приложение или резервную копию.",
      en: "Unsupported instruction version. Use a compatible app or backup.",
    },
  ],
  [
    /integrity mismatch|Different sequences/i,
    {
      uz: "Yo‘riqnoma mazmuni yoki hash mos kelmaydi. Ishonchli zaxira faylini tiklang.",
      ru: "Содержимое или хеш инструкции не совпадает. Восстановите доверенную копию.",
      en: "Sequence integrity mismatch. Restore a trusted instruction backup.",
    },
  ],
  [
    /spacing|too close|Pin count|24–240/i,
    {
      uz: "Mixlar joylashuvi mos emas. Mixlar sonini kamaytiring yoki taxtani kattalashtiring; 24–240 mix tanlang.",
      ru: "Гвозди расположены слишком близко. Уменьшите число или увеличьте основу; допустимо 24–240 гвоздей.",
      en: "Pin spacing is infeasible. Reduce pins or enlarge the board; choose 24–240 pins.",
    },
  ],
  [
    /Circle dimensions|dimensions|Invalid material profile/i,
    {
      uz: "Taxta yoki material parametrlari mos emas. 50–2000 mm tanlang; doira kengligi va balandligi teng bo‘lsin.",
      ru: "Параметры основы или материалов неверны. Размер 50–2000 мм; у круга ширина и высота должны совпадать.",
      en: "Invalid material dimensions. Choose 50–2000 mm; circular width and height must match.",
    },
  ],
  [
    /No.*improv|no.*path|stock.*small|No feasible/i,
    {
      uz: "Bu rasm/material uchun mos ip yo‘li topilmadi. Crop, kontrast yoki materialni o‘zgartiring.",
      ru: "Для изображения и материалов не найден допустимый путь. Измените кадр, контраст или материалы.",
      en: "No feasible improving path. Change the crop, contrast, or materials.",
    },
  ],
  [
    /Line limit|sequence limits|Invalid generation parameters/i,
    {
      uz: "Hisoblash chegarasi mos emas. 200–20 000 chiziq tanlang. Ip zaxirasi sifatni cheklamaydi.",
      ru: "Неверный предел вычислений. Выберите 200–20 000 линий. Запас не ограничивает качество.",
      en: "Invalid computation ceiling. Choose 200–20,000 lines. Stock does not constrain quality.",
    },
  ],
  [
    /Maximum 20 presets/i,
    {
      uz: "20 ta sozlama saqlangan. Yangi sozlama uchun bittasini o‘chiring.",
      ru: "Сохранено 20 наборов настроек. Удалите один перед добавлением нового.",
      en: "Maximum 20 presets. Delete one before saving another.",
    },
  ],
  [
    /Invalid.*preset|Preset storage/i,
    {
      uz: "Saqlangan sozlama mos emas. Parametrlarni tekshirib qayta saqlang.",
      ru: "Сохранённые настройки неверны. Проверьте параметры и сохраните снова.",
      en: "Invalid saved settings. Check the parameters and save again.",
    },
  ],
  [
    /changed in another tab|Library changed/i,
    {
      uz: "Boshqa oynada loyihalar o‘zgardi. JSON zaxira oling va kutubxonani qayta yuklang.",
      ru: "Проекты изменены в другой вкладке. Сохраните JSON и перезагрузите библиотеку.",
      en: "Library changed in another tab. Export your JSON backup, then reload the library.",
    },
  ],
  [
    /not loaded|has not loaded/i,
    {
      uz: "Kutubxona hali ochilmadi. Mavjud ma’lumot saqlangan; qayta yuklang.",
      ru: "Библиотека ещё не загружена. Данные сохранены; перезагрузите страницу.",
      en: "Library has not loaded. Existing data is preserved; reload the page.",
    },
  ],
  [
    /QuotaExceeded|storage exceeds|Invalid saved library|Invalid saved project/i,
    {
      uz: "Mahalliy kutubxona ochilmadi yoki xotira to‘ldi. Ma’lumotni o‘chirmang; JSON zaxira orqali tiklang.",
      ru: "Локальная библиотека не читается или хранилище заполнено. Не удаляйте данные; восстановите JSON-копию.",
      en: "Local library is unreadable or storage is full. Preserve the data and recover from a JSON backup.",
    },
  ],
  [
    /Invalid .*progress|Invalid confirmed step/i,
    {
      uz: "Saqlangan qadam yo‘riqnomaga mos emas. Ishonchli zaxirani yoki aniq qadamni tanlang.",
      ru: "Сохранённый шаг не соответствует инструкции. Выберите доверенную копию или точный шаг.",
      en: "Saved progress does not match the instruction. Choose a trusted backup or valid step.",
    },
  ],
  [
    /Invalid instruction|Invalid project|Invalid crop|Invalid pin geometry|Invalid palette|Invalid color segments|Invalid thread segment|prohibited pin|SyntaxError/i,
    {
      uz: "Yo‘riqnoma fayli buzilgan yoki parametrlari mos emas. Ishonchli JSON/TXT zaxirasini tanlang.",
      ru: "Файл инструкции повреждён или содержит неверные параметры. Выберите доверенный JSON/TXT.",
      en: "Invalid instruction file or parameters. Choose a trusted JSON/TXT backup.",
    },
  ],
];
export function customerError(message: string, locale: Locale): string {
  if (/^(Error: )?local-input\/missing$/.test(message))
    return portraitChoiceText(locale, "missingInput");
  if (message === "portrait-choice/off")
    return portraitChoiceText(locale, "off");
  if (message === "portrait-config/group")
    return portraitHelp(locale, "groupConfiguration");
  if (message === "portrait-config/basis")
    return portraitHelp(locale, "basisConfiguration");
  if (
    /Review every person's facial regions|Missing multiple portrait regions/.test(
      message,
    )
  )
    return portraitHelp(locale, "reviewRegions");
  return scriptText(
    messages.find(([pattern]) => pattern.test(message))?.[1][
      baseLocale(locale)
    ] ??
      {
        uz: "Amal bajarilmadi. Qayta urinib ko‘ring; loyihangizni JSON zaxira orqali saqlang.",
        ru: "Не удалось выполнить действие. Повторите попытку и сохраните JSON-копию проекта.",
        en: "The action could not be completed. Retry and preserve your project with a JSON backup.",
      }[baseLocale(locale)],
    locale,
  );
}
