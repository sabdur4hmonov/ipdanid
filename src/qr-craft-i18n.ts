import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  holePlan: ["Teshik andozasi", "Шаблон отверстий", "Hole template"],
  title: [
    "QR ip naqshi (tajriba)",
    "QR из ленты (эксперимент)",
    "QR ribbon craft (experimental)",
  ],
  intro: [
    "Bu alohida teshikli oq karton va 1.4 mm yassi qora lenta uchun. Oddiy 240 mixli kitga mos emas. Bitta uzilmagan lenta: qora chiziqlar oldinda, o‘tishlar orqada.",
    "Для отдельного белого перфорированного листа и плоской чёрной ленты 1.4 мм. Не подходит набору с 240 гвоздями. Одна непрерывная лента: штрихи спереди, переходы сзади.",
    "Uses a separate white perforated sheet and 1.4 mm flat black ribbon. Incompatible with the 240-nail kit. One uncut ribbon: dark strokes on the front, transfers on the back.",
  ],
  payload: [
    "QR ichidagi matn yoki havola",
    "Текст или ссылка в QR",
    "QR text or link",
  ],
  create: ["QR reja yaratish", "Создать план QR", "Create QR plan"],
  physical: [
    "Andozani 100% chop etib, 50 mm belgisini o‘lchang. Tayyor buyum har telefonda skanerlanishini alohida tekshiring. Lenta cheti tekis, oq chegara toza qolsin; dumaloq ip o‘rnini bosmaydi.",
    "Печатайте шаблон в 100%, измерьте отметку 50 мм. Готовое изделие проверьте камерой телефона. Нужна плоская лента с ровным краем и чистое белое поле; круглая нить не заменяет ленту.",
    "Print at 100% and measure the 50 mm mark. Scan the finished physical piece separately. Keep flat ribbon edges straight and the white margin clear; round cord is not a substitute.",
  ],
  holes: ["Teshiklar", "Отверстия", "Holes"],
  front: ["Old tomoni", "Спереди", "Front"],
  back: ["Orqa tomoni", "Сзади", "Back"],
  step: ["Qadam", "Шаг", "Step"],
  confirm: [
    "Shu qadamgacha bajardim",
    "Выполнено до этого шага",
    "Confirm through this step",
  ],
  previous: ["Oldingi", "Назад", "Previous"],
  next: ["Keyingi", "Далее", "Next"],
  completed: ["Bajarilgan", "Выполнено", "Completed"],
  partial: [
    "Faqat bajarilganini ko‘rsatish",
    "Показать только выполненное",
    "Show completed only",
  ],
  json: ["QR loyiha JSON", "Проект QR JSON", "QR project JSON"],
  csv: ["QR qadamlar CSV", "Шаги QR CSV", "QR steps CSV"],
  svg: ["QR lenta SVG", "Лента QR SVG", "QR ribbon SVG"],
  template: [
    "Teshik andozasi SVG",
    "Шаблон отверстий SVG",
    "Hole template SVG",
  ],
  pdf: [
    "QR andoza va qadamlar PDF",
    "Шаблон и шаги QR PDF",
    "QR template and steps PDF",
  ],
  library: [
    "Saqlangan QR loyihalar",
    "Сохранённые проекты QR",
    "Saved QR projects",
  ],
  open: ["QR loyihani ochish", "Открыть проект QR", "Open QR project"],
  remove: ["QR loyihani o‘chirish", "Удалить проект QR", "Delete QR project"],
  import: ["QR loyiha importi", "Импорт проекта QR", "Import QR project"],
  error: [
    "Matnni qisqartiring (ko‘pi bilan 80 UTF-8 bayt, QR versiya 5). Reja yoki saqlash ma’lumotini tekshiring.",
    "Сократите текст (до 80 байт UTF-8, QR до версии 5). Проверьте план и сохранение.",
    "Shorten the text (at most 80 UTF-8 bytes, QR version 5). Check the plan or saved data.",
  ],
  conflict: [
    "Boshqa oynada holat o‘zgardi. Saqlangan loyihani qayta oching.",
    "Состояние изменено в другом окне. Откройте сохранённый проект снова.",
    "Progress changed in another window. Open the saved project again.",
  ],
  limit: [
    "Ko‘pi bilan 5 loyiha. Avval bittasini o‘chiring.",
    "Не более 5 проектов. Сначала удалите один.",
    "Maximum 5 projects. Delete one first.",
  ],
} as const;
export const qrCraftText = (locale: Locale, key: keyof typeof words) =>
  scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
