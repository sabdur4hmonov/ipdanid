import { baseLocale, scriptText } from "./uzbek-script";
import type { Locale } from "./core/types";
const words = {
  heart: [
    "Yurak shakli uchun ikki kishilik surat ham mos. Ikkala yuz shakl ichida to‘liq ko‘rinsin.",
    "Для сердца подойдёт фото двух людей. Оба лица должны полностью помещаться в форме.",
    "A two-person photo can suit a heart. Keep both faces fully inside the shape.",
  ],
  rotateLeft: ["Chapga aylantirish", "Повернуть влево", "Turn left"],
  rotateRight: ["O‘ngga aylantirish", "Повернуть вправо", "Turn right"],
  usePeople: [
    "Barcha yuzlarni hisobga olish",
    "Учитывать все лица",
    "Use all faces",
  ],
  manualPeople: [
    "Ikki yuzni qo‘lda belgilash",
    "Отметить два лица вручную",
    "Mark two faces manually",
  ],
  person: ["Odam", "Человек", "Person"],
  confirm: [
    "Yuz zonalarini tekshirdim",
    "Зоны лиц проверены",
    "I checked the facial regions",
  ],
  reviewRegions: ["Har bir odamning ko‘z, burun va lab zonasini tekshirib, tasdiqlang. Avvalgi yo‘riqnomalar saqlanadi.","Проверьте и подтвердите глаза, нос и губы каждого человека. Прежние инструкции сохранены.","Review and confirm every person's eye, nose and lip regions. Existing guides remain preserved."],
  title: ["Suratni tekshiring", "Проверьте фотографию", "Check your photo"],
  groupSolver: ["Bir nechta yuz uchun cheklovli ip yo‘li (v15)","Непрерывный путь для нескольких лиц (v15)","Guarded multiple-face path (v15)"],
  groupConfiguration: ["Bu guruh generatori hozir 160/192 piksel va 240 tagacha perimetr mixini qo‘llaydi. Yuqori aniqlikdagi tajriba yoki boshqa mix bazasi o‘zgartirilmadi; mos konfiguratsiyani o‘zingiz tanlang.", "Этот групповой движок поддерживает 160/192 пикселя и до 240 гвоздей периметра. Экспериментальное разрешение и схема гвоздей сохранены; выберите совместимую конфигурацию явно.", "This group engine supports 160/192 samples and up to 240 perimeter pins. Your experimental resolution and pin basis were preserved; explicitly choose compatible settings."],
  basisConfiguration: ["Hozirgi tajriba mix bazasi doira, bir rang va yoqilgan portretni talab qiladi. Material va mixlar saqlandi; sozlamalarni tekshiring.", "Текущая экспериментальная схема требует круга, одного цвета и включённого портрета. Материалы и гвозди сохранены; проверьте настройки.", "This experimental pin basis requires a circle, monochrome mode and enabled portrait. Materials and pins were preserved; review settings."],
  eyes: ["Ko‘zlar","Глаза","Eyes"],
  nose: ["Burun","Нос","Nose"],
  mouth: ["Lablar","Губы","Lips"],
  estimated: [
    "Zonalar taxminiy. Maslahatga tayanishdan oldin ularni haqiqiy ko‘z, burun va labga moslang.",
    "Зоны приблизительные. Совместите их с настоящими глазами, носом и губами перед оценкой.",
    "Regions are estimates. Align them with actual eyes, nose and lips before relying on advice.",
  ],
  review: [
    "Avval ipli natijani asl surat bilan solishtiring. Yuzlar o‘xshamasa, yig‘ishni boshlamang; joylashuvni yoki suratni o‘zgartiring. Ko‘proq ip sifat kafolati emas.",
    "Сначала сравните нитяной результат с оригиналом. Если сходство слабое, измените кадр или фото перед сборкой. Больше нити не гарантирует качество.",
    "Compare the strand preview with the original before assembly. If likeness is weak, revise the crop or photograph. More thread does not guarantee quality.",
  ],
  hint: [
    "Maslahatlar aynan tayyorlangan suratga tegishli. Ular o‘xshashlik yoki fizik sifat kafolati emas.",
    "Советы относятся к подготовленному фото и не гарантируют сходство или физическое качество.",
    "Advice uses the exact prepared target; it does not guarantee likeness or physical quality.",
  ],
  clipped: [
    "Yuz detali shakldan tashqarida: suratni suring yoki kichraytiring.",
    "Часть лица вне формы: переместите или уменьшите фото.",
    "A facial feature is outside the shape: reposition or zoom out.",
  ],
  small: [
    "Ko‘z, burun yoki lab juda kam piksel egallaydi. Yuzni kattaroq joylashtiring yoki hisoblash aniqligini tekshiring.",
    "На глаза, нос или губы приходится мало пикселей. Увеличьте лицо или проверьте разрешение расчёта.",
    "Eyes, nose or lips occupy few samples. Enlarge the face or review computation resolution.",
  ],
  flat: [
    "Ba’zi detallar kontrasti past: tiniqroq va tekis yoritilgan suratni sinang.",
    "Контраст некоторых деталей слабый: попробуйте более чёткое фото с ровным светом.",
    "Some facial detail has low contrast: try a sharper, evenly lit photograph.",
  ],
  clear: [
    "Bu tekshiruvda kesilgan yoki juda kichik zona topilmadi. Natijani baribir ko‘rib chiqing.",
    "Срезанных или слишком маленьких зон не найдено. Всё равно проверьте результат.",
    "This check found no clipped or very small region. Still inspect the result.",
  ],
} as const;
export const portraitHelp = (locale: Locale, key: keyof typeof words) =>
  scriptText(
    words[key][
      baseLocale(locale) === "uz" ? 0 : baseLocale(locale) === "ru" ? 1 : 2
    ],
    locale,
  );
