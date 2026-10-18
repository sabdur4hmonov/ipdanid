import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  title: [
    "Kitob buklash (tajriba)",
    "Складывание книги (эксперимент)",
    "Book folding (experimental)",
  ],
  intro: [
    "Bitta varaq - ikki sahifa tomoni. Har varaqqa alohida buklash chizig‘i beriladi; kesish kerak emas. Bir ustunda bir nechta oraliq bo‘lsa, ular qo‘shni varaqlarga taqsimlanadi. Ko‘rinish haqiqiy belgilar chizmasi, tayyor kitob surati emas.",
    "Один лист имеет две страницы. Для каждого листа заданы линии сгиба без разрезания. Несколько участков в столбце распределяются по соседним листам. Показана схема реальных отметок, не фотография готовой книги.",
    "One leaf has two page faces. Every leaf has explicit creases; no cutting. Separate bands in one column use adjacent alternating leaves. The preview is an elevation of actual marks, not a finished-book photograph.",
  ],
  source: ["Naqsh turi", "Тип рисунка", "Pattern type"],
  heart: ["Yurak", "Сердце", "Heart"],
  text: ["Ism yoki sana", "Имя или дата", "Name or date"],
  height: ["Varaq bo‘yi (mm)", "Высота листа (мм)", "Page height (mm)"],
  width: ["Varaq eni (mm)", "Ширина листа (мм)", "Page width (mm)"],
  leaves: ["Mavjud varaqlar soni", "Число листов в книге", "Available leaves"],
  artWidth: [
    "Ochilgan naqsh eni (mm)",
    "Ширина раскрытого рисунка (мм)",
    "Spread artwork width (mm)",
  ],
  artHeight: ["Naqsh bo‘yi (mm)", "Высота рисунка (мм)", "Artwork height (mm)"],
  columns: ["Naqsh ustunlari", "Столбцы рисунка", "Pattern columns"],
  rows: ["Naqsh qatorlari", "Строки рисунка", "Pattern rows"],
  margin: [
    "Muqova yonidagi zaxira (mm)",
    "Отступ от корешка (мм)",
    "Spine clearance (mm)",
  ],
  inset: [
    "Bo‘sh varaq chetini bukish (mm)",
    "Подгиб пустого листа (мм)",
    "Blank-leaf inset (mm)",
  ],
  paper: [
    "Bitta varaq qalinligi (mm)",
    "Толщина одного листа (мм)",
    "One-leaf thickness (mm)",
  ],
  create: [
    "Buklash rejasi yaratish",
    "Создать план сгибов",
    "Create folding plan",
  ],
  physical: [
    "Faqat o‘zingizga tegishli keraksiz kitobdan foydalaning. Belgilar varaq tepasidan mmda o‘lchanadi. Qizil chiziq bo‘yicha buklang: yuqori/pastki chetdagi ikkinchi belgi ham kerak. Buklama burchagi doim 45° emas. Varaqlarni ko‘rsatilgan eniga asta oching; qalinlik va ko‘rinishni eski qog‘ozda tekshiring. Kitob materiali kit kodiga kirmaydi.",
    "Используйте только свою ненужную книгу. Отметки в мм от верха листа. Сгибайте по красной линии, учитывая вторую отметку на верхнем/нижнем крае. Угол не всегда 45°. Осторожно раскройте до заданной ширины; сначала проверьте бумагу. Книга не входит в комплект кода.",
    "Use your own unwanted book. Measure marks in mm from the page top. Fold along the red crease, including its second mark on the top/bottom edge. Angles are not always 45°. Gently fan to the stated width; test paper first. Book materials are separate from a kit credit.",
  ],
  used: ["Kerakli varaqlar", "Нужно листов", "Required leaves"],
  start: ["Boshlash varag‘i", "Первый лист", "Starting leaf"],
  lane: ["Har ustundagi varaqlar", "Листов на столбец", "Leaves per column"],
  step: ["Buklash qadami", "Шаг сгибания", "Folding step"],
  leaf: ["Varaq", "Лист", "Leaf"],
  face: ["Toq sahifa tomoni", "Нечётная страница", "Odd page face"],
  top: ["Yuqori belgi", "Верхняя отметка", "Top mark"],
  bottom: ["Pastki belgi", "Нижняя отметка", "Bottom mark"],
  edge: [
    "Chet bo‘yicha ikkinchi belgi",
    "Вторая отметка вдоль края",
    "Second mark along edge",
  ],
  blank: [
    "Bo‘sh ustun: tashqi chetni ichkariga buklang",
    "Пустой столбец: подогните внешний край внутрь",
    "Blank column: fold the outer edge inward",
  ],
  confirm: [
    "Shu varaqqacha bukladim",
    "Согнуто до этого листа",
    "Confirm through this leaf",
  ],
  previous: ["Oldingi", "Назад", "Previous"],
  next: ["Keyingi", "Далее", "Next"],
  progress: ["Buklangan varaqlar", "Согнуто листов", "Folded leaves"],
  pdf: ["Buklash PDF", "Сгибы PDF", "Folding PDF"],
  json: ["Buklash loyiha JSON", "Проект сгибов JSON", "Folding project JSON"],
  csv: ["Buklash belgilar CSV", "Отметки сгибов CSV", "Folding marks CSV"],
  svg: ["Hozirgi varaq SVG", "Текущий лист SVG", "Current leaf SVG"],
  library: [
    "Saqlangan buklash loyihalari",
    "Сохранённые проекты сгибов",
    "Saved folding projects",
  ],
  open: [
    "Buklash loyihasini ochish",
    "Открыть проект сгибов",
    "Open folding project",
  ],
  remove: [
    "Buklash loyihasini o‘chirish",
    "Удалить проект сгибов",
    "Delete folding project",
  ],
  import: [
    "Buklash loyiha importi",
    "Импорт проекта сгибов",
    "Import folding project",
  ],
  error: [
    "Varaq o‘lchami, qalinligi, naqsh yoki saqlangan rejani tekshiring. Qator balandligi kamida 1 mm bo‘lsin.",
    "Проверьте размер, толщину листа, рисунок или сохранённый план. Высота строки не меньше 1 мм.",
    "Check page size, thickness, pattern or saved plan. Pattern rows must be at least 1 mm high.",
  ],
  shortage: [
    "Varaqlar yetmaydi yoki juda zich. Ustunlarni kamaytiring, naqsh enini yoki varaqlar sonini oshiring.",
    "Недостаточно листов или слишком плотно. Уменьшите столбцы, увеличьте ширину рисунка или число листов.",
    "Not enough leaves or too tightly packed. Reduce columns, increase artwork width or available leaves.",
  ],
  conflict: [
    "Boshqa oynada jarayon o‘zgardi. Loyihani qayta oching.",
    "Ход работы изменён в другом окне. Откройте проект снова.",
    "Progress changed in another window. Open the project again.",
  ],
  limit: [
    "Beshta loyiha chegarasi. Avval bittasini o‘chiring.",
    "Не более пяти проектов. Сначала удалите один.",
    "Maximum five projects. Delete one first.",
  ],
} as const;
export const bookText = (locale: Locale, key: keyof typeof words) =>
  scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
