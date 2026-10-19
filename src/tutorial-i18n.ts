import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
export type TutorialWords = readonly [string, string, string];
export const tutorialPhrase = (words: TutorialWords, locale: Locale) =>
  scriptText(
    words[baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
export const tutorialWords = {
  title: ["Bepul ustaxona", "Бесплатная мастерская", "Free workshop"],
  intro: [
    "Materiallarni tayyorlang va qadamlarni bajaring. Jarayon shu qurilmada saqlanadi.",
    "Подготовьте материалы и следуйте шагам. Прогресс сохраняется на этом устройстве.",
    "Prepare the materials and follow the steps. Progress stays on this device.",
  ],
  open: [
    "Boshlash yoki davom etish",
    "Начать или продолжить",
    "Start or resume",
  ],
  materials: ["Kerakli narsalar", "Материалы", "Materials"],
  step: ["Qadam", "Шаг", "Step"],
  done: ["Bajardim", "Готово", "Mark done"],
  previous: ["Oldingi", "Назад", "Previous"],
  next: ["Keyingi", "Далее", "Next"],
  play: ["Qadamlarni ko‘rsatish", "Показать шаги", "Play steps"],
  pause: ["To‘xtatish", "Пауза", "Pause steps"],
  playback: [
    "Har 8 soniyada keyingi chizma ko‘rsatiladi. Bajarilganini o‘zingiz belgilang.",
    "Схемы сменяются каждые 8 секунд. Выполненные шаги отмечайте сами.",
    "The next diagram appears every 8 seconds. Mark completed work yourself.",
  ],
  complete: [
    "Barcha qadamlar bajarildi",
    "Все шаги выполнены",
    "All steps completed",
  ],
  saved: ["Saqlangan qadamlar", "Сохранённые шаги", "Saved steps"],
  export: ["Loyiha JSON", "Проект JSON", "Workshop JSON"],
  import: ["Loyihani ochish", "Открыть проект", "Import workshop"],
  library: ["Saqlangan ishlar", "Сохранённые работы", "Saved workshops"],
  resume: ["Davom etish", "Продолжить", "Resume workshop"],
  remove: ["O‘chirish", "Удалить", "Delete workshop"],
  pdf: ["Qo‘llanma PDF", "Инструкция PDF", "Workshop PDF"],
  svg: ["Andoza SVG", "Шаблон SVG", "Workshop template SVG"],
  scale: [
    "100% o‘lchamda chop eting. 50 mm belgini chizg‘ich bilan tekshiring.",
    "Печатайте в масштабе 100%. Проверьте отметку 50 мм линейкой.",
    "Print at 100% scale. Check the 50 mm mark with a ruler.",
  ],
  key: [
    "Qora: kesish yoki qog‘oz cheti. Ko‘k uzilgan: buklash. Qizil: navbatdagi belgi.",
    "Чёрный: разрез или край бумаги. Синий пунктир: сгиб. Красный: текущая отметка.",
    "Black: cut or paper edge. Blue dashes: crease. Red: current mark.",
  ],
  illustration: [
    "Chizma mashq tartibini ko‘rsatadi. Haqiqiy materialdagi natijani kichik namunada tekshiring.",
    "Схема показывает порядок работы. Проверьте материал на небольшом образце.",
    "The drawing explains the steps. Test your materials on a small sample.",
  ],
  error: [
    "Loyiha ochilmadi yoki saqlanmadi. Faylni va bo‘sh joyni tekshiring.",
    "Не удалось открыть или сохранить проект. Проверьте файл и свободное место.",
    "The project could not be opened or saved. Check the file and available space.",
  ],
  conflict: [
    "Bu loyiha boshqa oynada o‘zgargan. Boshlash yoki davom etish orqali yangisini oching.",
    "Проект изменён в другом окне. Нажмите «Начать или продолжить», чтобы открыть свежую версию.",
    "This project changed in another window. Use Start or resume to open the latest version.",
  ],
  media: ["Muallif qo‘shgan namuna", "Пример автора", "Owner-provided example"],
  mediaError: [
    "Qo‘shimcha namuna ochilmadi. Chizmalar orqali davom eting.",
    "Дополнительный пример недоступен. Продолжайте по схемам.",
    "The optional example is unavailable. Continue with the diagrams.",
  ],
} satisfies Record<string, TutorialWords>;
export const tutorialText = (locale: Locale, key: keyof typeof tutorialWords) =>
  tutorialPhrase(tutorialWords[key], locale);
