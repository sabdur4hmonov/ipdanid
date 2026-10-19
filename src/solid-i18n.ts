import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  layoutTitle: ["Yig‘ish joylashuvi", "Схема расположения", "Assembly layout"],
  layout: [
    "Yig‘ish joylashuvi SVG",
    "Схема расположения SVG",
    "Assembly layout SVG",
  ],
  layoutHelp: [
    "Ramka va yozuv uchun umumiy joylashuv andozasi ham bor. Jadvaldagi X/Y uning pastki chap burchagidan mmda o‘lchanadi. Alohida detallarni shu joylashuvga moslang.",
    "Для рамки и текста есть общая схема. X/Y в таблице измерены в мм от её нижнего левого угла. Расположите отдельные детали по этой схеме.",
    "Frame and text include a full assembly layout. Table X/Y positions are measured in mm from its lower-left corner. Place individual parts at those positions.",
  ],
  title: [
    "3D shakllar (tajriba)",
    "3D фигуры (эксперимент)",
    "3D models (experimental)",
  ],
  kind: ["Nima yasaymiz?", "Что создаём?", "What to make?"],
  frame: ["Taxta ramkasi", "Рамка для основы", "Board frame"],
  spindle: ["Qatlamli haykal", "Слоёная скульптура", "Layered sculpture"],
  letters: ["Harf va yozuv", "Буквы и надписи", "Letters and text"],
  intro: [
    "O‘zimiz chizgan o‘lchamli modellar. Aylantirib ko‘ring; har bir detal aynan shu STL va andozadan olinadi. Kit materiallari va printer tekshiruvi alohida.",
    "Наши оригинальные модели с размерами. Поверните: каждый элемент соответствует STL и шаблону. Материалы и проверка принтера отдельно.",
    "Original measured models. Rotate the actual geometry; each part matches its STL and template. Materials and printer checks are separate.",
  ],
  widthMm: [
    "Asos yoki yozuv eni (mm)",
    "Ширина основы или текста (мм)",
    "Board or text width (mm)",
  ],
  heightMm: [
    "Asos yoki yozuv bo‘yi (mm)",
    "Высота основы или текста (мм)",
    "Board or text height (mm)",
  ],
  clearanceMm: [
    "Ramka ichidagi umumiy zaxira (mm)",
    "Общий зазор рамки (мм)",
    "Total frame clearance (mm)",
  ],
  wallMm: [
    "Ramka cheti eni (mm)",
    "Ширина планки (мм)",
    "Frame rail width (mm)",
  ],
  thicknessMm: [
    "Detal qalinligi (mm)",
    "Толщина детали (мм)",
    "Part thickness (mm)",
  ],
  layers: ["Qatlamlar soni", "Число слоёв", "Number of layers"],
  diameterMm: [
    "Haykal eni chegarasi (mm)",
    "Предельная ширина фигуры (мм)",
    "Sculpture width envelope (mm)",
  ],
  layerMm: [
    "Bitta qatlam qalinligi (mm)",
    "Толщина слоя (мм)",
    "One-layer thickness (mm)",
  ],
  boreMm: [
    "Markaziy teshikning eng tor eni (mm)",
    "Минимальный диаметр отверстия (мм)",
    "Minimum bore diameter (mm)",
  ],
  text: ["Yozuv", "Надпись", "Text"],
  create: ["3D reja yaratish", "Создать 3D план", "Create 3D plan"],
  rotate: ["Aylantirish", "Поворот", "Rotate model"],
  tilt: ["Yuqoridan ko‘rish", "Наклон", "View tilt"],
  reset: ["Ko‘rinishni qaytarish", "Сбросить вид", "Reset 3D view"],
  partOnly: [
    "Faqat hozirgi detal",
    "Только текущая деталь",
    "Show current part only",
  ],
  step: ["Yig‘ish qadami", "Шаг сборки", "Assembly step"],
  part: ["Detal", "Деталь", "Part"],
  parts: ["Detallar soni", "Число деталей", "Number of parts"],
  progress: ["Yig‘ilgan detallar", "Собрано деталей", "Assembled parts"],
  height: ["Tayyor balandlik", "Высота сборки", "Assembly height"],
  dimensions: [
    "Detalning haqiqiy o‘lchami",
    "Фактический размер детали",
    "Actual part dimensions",
  ],
  frameHelp: [
    "Haqiqiy taxtani o‘lchang. To‘rtta 45° qiya uchli detalni o‘zaro moslab yopishtiring. Qulfli ulanish yo‘q. 500 mm taxta uchun detal ko‘p kichik printerga sig‘maydi: maydonni tekshiring. Bu yuk ko‘taruvchi yoki mixlarni ushlovchi asos emas.",
    "Измерьте основу. Совместите и склейте четыре планки с торцами 45°. Защёлок нет. Деталь для основы 500 мм не помещается на многих малых принтерах. Это не несущая основа для гвоздей.",
    "Measure the actual board. Align and glue the four 45° mitred rails. No snap joints. Rails for a 500 mm board exceed many small printer beds. This is not a load-bearing nail base.",
  ],
  spindleHelp: [
    "Qatlamlarni pastdan yuqoriga raqam tartibida moslab yopishtiring. Markaziy teshikdan biroz ingichkaroq tayoqcha tanlab, avval bitta qatlamda sinang. STL har safar bitta qatlam uchun, pastki yuzi Z0da. Suv yoki oziq-ovqat idishi emas.",
    "Совместите слои снизу вверх по номерам и склейте. Подберите стержень чуть тоньше отверстия и проверьте один слой. STL содержит один слой с низом на Z0. Не ёмкость для воды или пищи.",
    "Align and glue layers bottom to top in numbered order. Trial a rod slightly smaller than the bore on one layer first. Each STL is one layer with its bottom at Z0. Not a water or food container.",
  ],
  lettersHelp: [
    "Yozuvning alohida qismlarini raqamli andozadagi joyiga yopishtiring. Nuqtalar va ichki bo‘shliqlar saqlanadi; yashirin tayanch yo‘q. Ingichka joylarni materialda avval sinang. Har STL bitta yopiq detal, harflar joylashuvi andozada bor.",
    "Приклейте отдельные части текста по шаблону. Точки и внутренние отверстия сохранены, скрытых опор нет. Сначала проверьте тонкие места. Каждый STL содержит одну замкнутую деталь; шаблон задаёт размещение.",
    "Glue separate text parts at their template positions. Dots and counters remain; there are no hidden supports. Trial thin features first. Each STL is one closed part; the template gives its placement.",
  ],
  physical: [
    "STLni mm deb oching va detalni printer maydoniga markazlang. PDF/SVGni 100%da chop etib 50 mmni o‘lchang. Bu tajriba: material, yopishtirish va haqiqiy moslikni egasi tekshiradi.",
    "Открывайте STL в мм и центрируйте деталь на столе. Печатайте PDF/SVG на 100% и проверьте 50 мм. Материал, склейку и посадку нужно проверить физически.",
    "Import STL as mm and center the part on the printer bed. Print PDF/SVG at 100% and measure50mm. Material, glue and fit require physical trials.",
  ],
  access: [
    "Ko‘rinish bepul. Bitta kit krediti aynan shu rejaning qadamlari va STL/SVG/PDF/JSON fayllarini ochadi. Printer, taxta va materiallar kit kodiga kirmaydi.",
    "Просмотр бесплатный. Один кредит открывает шаги и STL/SVG/PDF/JSON этого плана. Принтер, основа и материалы не входят в код.",
    "Preview is free. One kit credit opens this exact plan's steps and STL/SVG/PDF/JSON. Printer, board and materials are separate from the code.",
  ],
  previous: ["Oldingi detal", "Предыдущая деталь", "Previous part"],
  next: ["Keyingi detal", "Следующая деталь", "Next part"],
  confirm: [
    "Shu detaligacha yig‘dim",
    "Собрано до этой детали",
    "Confirm through this part",
  ],
  stl: ["Hozirgi detal STL", "Текущая деталь STL", "Current part STL"],
  svg: ["Hozirgi detal SVG", "Текущая деталь SVG", "Current part SVG"],
  pdf: ["Barcha detallar PDF", "Все детали PDF", "All parts PDF"],
  json: ["3D loyiha JSON", "3D проект JSON", "3D project JSON"],
  import: ["3D loyiha importi", "Импорт 3D проекта", "Import 3D project"],
  library: [
    "Saqlangan 3D loyihalar",
    "Сохранённые 3D проекты",
    "Saved 3D projects",
  ],
  open: ["3D loyihani ochish", "Открыть 3D проект", "Open 3D project"],
  remove: ["3D loyihani o‘chirish", "Удалить 3D проект", "Delete 3D project"],
  error: [
    "O‘lcham, yozuv yoki reja faylini tekshiring. Noto‘g‘ri yoki juda murakkab shakl qabul qilinmaydi.",
    "Проверьте размеры, текст или файл плана. Некорректные и слишком сложные фигуры отклоняются.",
    "Check dimensions, text or the plan file. Invalid or overly complex geometry is refused.",
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
export const solidText = (locale: Locale, key: keyof typeof words) =>
  scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
