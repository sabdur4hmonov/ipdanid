import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";

const en = {
  eyebrow: "YOUR PHOTO. YOUR HANDS. YOUR ART.",
  titleOne: "One photo.",
  titleTwo: "Thousands of threads.",
  titleThree: "Made by you.",
  intro:
    "Turn a favourite photo into a picture made of real thread. Preview it, make it your own, then follow each connection at your pace.",
  free: "Try the preview for free",
  noAccount: "No account or kit code needed to preview.",
  how: "How it works",
  shapes: "The shapes",
  questions: "Questions",
  haveKit: "I have a kit",
  artNote: "AI concept illustration of the craft process",
  artAlt:
    "A concept of a hand guiding black thread between nails on a circular board",
  craftLabel: "A little patience. Something personal.",
  craftSub: "A photo becomes a project you can hold.",
  preview: "Preview first",
  previewHint: "See your own result before committing to assembly.",
  guided: "One connection at a time",
  guidedHint: "Follow the numbered guide and save your place.",
  personal: "Made from your photo",
  personalHint: "A portrait, a pet, a car or something you love.",
  processTag: "FROM A MEMORY TO A MAKING MOMENT",
  processTitle: "Your photo is just the beginning.",
  processIntro:
    "You choose the image. We prepare the route. You bring it to life with thread.",
  photoTitle: "Choose your photo",
  photoBody:
    "Use a sharp, evenly lit photo. A plain light background helps; existing photos are welcome too.",
  adjustTitle: "Make it yours",
  adjustBody:
    "Choose a shape, move and zoom your image, and review the background before creating.",
  makeTitle: "Follow the thread",
  makeBody:
    "Inspect the preview. Use your kit code to open the exact numbered guide, then assemble at your pace.",
  shapeTag: "A SHAPE FOR YOUR STORY",
  shapeTitle: "Find the right frame.",
  shapeIntro:
    "Choose a shape here or change it while adjusting your photo. Match your physical board before assembly.",
  circleBody: "A timeless frame for a favourite face.",
  squareBody: "A little more room for the whole picture.",
  heartBody: "For someone special. Two people welcome.",
  selected: "Selected",
  choose: "Choose",
  materialsTag: "SIMPLE MATERIALS. SOMETHING MEANINGFUL.",
  materialsTitle: "Thread. Nails. A picture only you can make.",
  materialsBody:
    "The website turns your image into a route between numbered nails. A matching board and thread turn that route into a physical artwork.",
  board: "A matching board",
  nails: "Numbered nails",
  thread: "Your thread",
  guide: "A step-by-step guide",
  kitAction: "Explore kits",
  faqTitle: "Before your first thread.",
  faqPhoto: "What kind of photo works well?",
  faqPhotoBody:
    "Choose a sharp photo with visible eyes and even lighting. A plain light background is helpful, not mandatory. Keep every face inside the shape and inspect the actual thread preview before assembly. No photo is guaranteed a perfect likeness.",
  faqFree: "Can I see the result before buying?",
  faqFreeBody:
    "Yes. Upload, adjust and generate a preview without an account or code. A valid kit code opens assembly instructions and exports. The exact allowance is shown with your kit.",
  faqTime: "How long does assembly take?",
  faqTimeBody:
    "It depends on the number of connections and your pace. Your result shows an estimate based on 8 seconds per connection; it is not measured customer assembly time. Pause and continue whenever you want.",
  faqPeople: "Can I use a photo of two or three people?",
  faqPeopleBody:
    "Yes, you can upload a group photo. Keep faces large, sharp and fully inside the chosen shape. A heart can suit a pair. Inspect every face in the generated result; group-photo likeness is not guaranteed.",
  faqResume: "Can I come back to my work?",
  faqResumeBody:
    "Keep your saved project and confirm completed steps as you assemble. My projects lets you reopen local work; an optional account can also keep your unlocked works together.",
  closing: "Start with a photo that means something.",
  closingHint: "Your next creative evening starts here.",
  backUpload: "Choose my photo",
  projects: "My projects",
  footer: "From a photo to something personal.",
  stepUpload: "Photo",
  stepAdjust: "Adjust",
  stepResult: "Result",
  adjustIntro:
    "Keep the important details inside the shape. Everything here is reversible.",
  resultIntro:
    "This is your actual thread preview. Check the details before you begin.",
};
type Key = keyof typeof en;
const uz: Record<Key, string> = {
  eyebrow: "SIZNING SURATINGIZ. SIZ YARATGAN SAN’AT.",
  titleOne: "Bir surat.",
  titleTwo: "Minglab ip.",
  titleThree: "Sizning san’atingiz.",
  intro:
    "Sevimli suratingizni haqiqiy iplardan yaratiladigan rasmga aylantiring. Avval natijani ko‘ring, moslang va har bir ipni o‘z sur’atingizda torting.",
  free: "Natijani bepul sinab ko‘ring",
  noAccount: "Natijani ko‘rish uchun hisob yoki quti kodi kerak emas.",
  how: "Qanday ishlaydi",
  shapes: "Shakllar",
  questions: "Savollar",
  haveKit: "To‘plamim bor",
  artNote: "Yaratish jarayonining AI konsept tasviri",
  artAlt:
    "Qo‘l doira taxtadagi mixlar orasiga qora ip tortayotgan konsept tasvir",
  craftLabel: "Biroz sabr. Ko‘p ma’no.",
  craftSub: "Surat qo‘lingiz bilan yaratilgan asarga aylanadi.",
  preview: "Avval natijani ko‘ring",
  previewHint: "Yig‘ishdan oldin o‘z suratingizdagi natijani tekshiring.",
  guided: "Har bir ipda yo‘l-yo‘riq",
  guidedHint: "Raqamlangan qadamlarni bajaring, joyingiz saqlanadi.",
  personal: "O‘zingizga xos suratdan",
  personalHint: "Portret, jonivor, mashina yoki sevimli buyumingiz.",
  processTag: "XOTIRADAN — IJODGA",
  processTitle: "Hammasi bir suratdan boshlanadi.",
  processIntro:
    "Siz suratni tanlaysiz. Biz ip yo‘lini tayyorlaymiz. Siz unga hayot bag‘ishlaysiz.",
  photoTitle: "Suratni tanlang",
  photoBody:
    "Tiniq va tekis yoritilgan suratdan boshlang. Och, sodda fon afzal; mavjud suratlar ham mos.",
  adjustTitle: "O‘zingizga moslang",
  adjustBody:
    "Shakl tanlang, suratni suring yoki kattalashtiring. Yaratishdan oldin fonni tekshiring.",
  makeTitle: "Ip yo‘lini kuzating",
  makeBody:
    "Natijani tekshiring. Quti kodi bilan aynan shu rasmning raqamlangan yo‘riqnomasini ochib, o‘z sur’atingizda yig‘ing.",
  shapeTag: "HAR BIR XOTIRANING O‘Z SHAKLI BOR",
  shapeTitle: "Suratingizga mos shakl.",
  shapeIntro:
    "Hozir tanlang yoki suratni moslashda o‘zgartiring. Yig‘ishdan oldin haqiqiy taxtangizga mosligini tekshiring.",
  circleBody: "Sevimli chehra uchun klassik tanlov.",
  squareBody: "Butun tasvir uchun kengroq imkoniyat.",
  heartBody: "Yaqin insoningiz uchun. Ikki kishilik surat ham mos.",
  selected: "Tanlangan",
  choose: "Tanlash",
  materialsTag: "ODDIY NARSALARDAN — MA’NOLI ASAR",
  materialsTitle: "Ip. Mix. Faqat siz yaratadigan rasm.",
  materialsBody:
    "Sayt suratingizni raqamlangan mixlar orasidagi ip yo‘liga aylantiradi. Mos taxta va ip bilan esa bu yo‘l haqiqiy asarga aylanadi.",
  board: "Mos shakldagi taxta",
  nails: "Raqamlangan mixlar",
  thread: "Tanlangan ip",
  guide: "Qadamma-qadam yo‘riqnoma",
  kitAction: "To‘plamlarni ko‘rish",
  faqTitle: "Birinchi ipdan oldin.",
  faqPhoto: "Qanday surat tanlagan yaxshi?",
  faqPhotoBody:
    "Ko‘zlar ko‘rinadigan, tiniq va tekis yoritilgan surat tanlang. Och, sodda fon afzal, lekin shart emas. Har bir yuz shakl ichida qolsin. Yig‘ishdan oldin haqiqiy ipli natijani tekshiring: hech bir surat uchun mukammal o‘xshashlik kafolatlanmaydi.",
  faqFree: "Sotib olishdan oldin natijani ko‘rsam bo‘ladimi?",
  faqFreeBody:
    "Ha. Hisob yoki kodsiz surat yuklab, moslab va natijani yarata olasiz. Yig‘ish yo‘riqnomasi va eksportlar quti kodi bilan ochiladi. Imkoniyatlar soni to‘plamingizda ko‘rsatiladi.",
  faqTime: "Yig‘ish qancha vaqt oladi?",
  faqTimeBody:
    "Ip ulanishlari soni va ishlash sur’atingizga bog‘liq. Natijada har bir ulanishga 8 soniyadan hisoblangan taxmin ko‘rsatiladi; bu xaridor bilan o‘lchangan vaqt emas. Istalgan payt dam olib, davom etishingiz mumkin.",
  faqPeople: "Ikki yoki uch kishilik surat ham bo‘ladimi?",
  faqPeopleBody:
    "Ha, guruh suratini yuklashingiz mumkin. Yuzlar yirik, tiniq va tanlangan shakl ichida to‘liq ko‘rinsin. Yurak shakli juftlikka mos bo‘lishi mumkin. Natijada har bir yuzni tekshiring: guruh suratida o‘xshashlik kafolatlanmaydi.",
  faqResume: "Ishimni keyin davom ettirsam bo‘ladimi?",
  faqResumeBody:
    "Loyihangizni saqlang va yig‘ish davomida bajarilgan qadamlarni tasdiqlang. Loyihalarim orqali mahalliy ishni ochasiz; ixtiyoriy hisob esa ochilgan ishlaringizni bir joyda saqlashga yordam beradi.",
  closing: "Siz uchun qadrli suratdan boshlang.",
  closingHint: "Keyingi ijodiy oqshomingiz shu yerdan boshlanadi.",
  backUpload: "Suratimni tanlash",
  projects: "Loyihalarim",
  footer: "Suratdan — o‘zingizga xos asarga.",
  stepUpload: "Surat",
  stepAdjust: "Moslash",
  stepResult: "Natija",
  adjustIntro:
    "Muhim detallar shakl ichida qolsin. Har bir sozlamani qaytarish mumkin.",
  resultIntro:
    "Bu — haqiqiy ip yo‘lidan olingan natija. Boshlashdan oldin detallarni tekshiring.",
};
const ru: Record<Key, string> = {
  eyebrow: "ВАШЕ ФОТО. ВАШИ РУКИ. ВАШЕ ИСКУССТВО.",
  titleOne: "Одно фото.",
  titleTwo: "Тысячи нитей.",
  titleThree: "Создано вами.",
  intro:
    "Превратите любимое фото в картину из настоящих нитей. Посмотрите эскиз, настройте его и собирайте в своём темпе, соединение за соединением.",
  free: "Попробуйте эскиз бесплатно",
  noAccount: "Для эскиза не нужен аккаунт или код набора.",
  how: "Как это работает",
  shapes: "Формы",
  questions: "Вопросы",
  haveKit: "У меня есть набор",
  artNote: "ИИ-концепция процесса создания",
  artAlt:
    "Концепция: рука натягивает чёрную нить между гвоздями круглой основы",
  craftLabel: "Немного терпения. Много смысла.",
  craftSub: "Фотография становится делом ваших рук.",
  preview: "Сначала посмотрите эскиз",
  previewHint: "Проверьте результат своего фото до начала сборки.",
  guided: "По одному соединению",
  guidedHint: "Следуйте нумерованным шагам и сохраняйте прогресс.",
  personal: "Из вашей фотографии",
  personalHint: "Портрет, питомец, автомобиль или любимый предмет.",
  processTag: "ОТ ВОСПОМИНАНИЯ К ТВОРЧЕСТВУ",
  processTitle: "Всё начинается с одной фотографии.",
  processIntro:
    "Вы выбираете фото. Мы готовим путь нити. Вы воплощаете его своими руками.",
  photoTitle: "Выберите фото",
  photoBody:
    "Начните с чёткого фото с ровным светом. Светлый простой фон предпочтителен; старые снимки тоже подойдут.",
  adjustTitle: "Настройте под себя",
  adjustBody:
    "Выберите форму, переместите или увеличьте фото. Проверьте фон перед созданием эскиза.",
  makeTitle: "Следуйте за нитью",
  makeBody:
    "Проверьте эскиз. Код набора откроет точную нумерованную инструкцию; собирайте в своём темпе.",
  shapeTag: "ФОРМА ДЛЯ ВАШЕЙ ИСТОРИИ",
  shapeTitle: "Найдите свою форму.",
  shapeIntro:
    "Выберите сейчас или измените при настройке фото. Перед сборкой проверьте соответствие вашей основе.",
  circleBody: "Классическая форма для любимого лица.",
  squareBody: "Больше места для целого сюжета.",
  heartBody: "Для близкого человека. Подойдёт и фото пары.",
  selected: "Выбрано",
  choose: "Выбрать",
  materialsTag: "ПРОСТЫЕ МАТЕРИАЛЫ. ОСОБЕННЫЙ СМЫСЛ.",
  materialsTitle: "Нить. Гвозди. Картина, созданная вами.",
  materialsBody:
    "Сайт превращает фото в маршрут между пронумерованными гвоздями. Подходящая основа и нить превращают маршрут в настоящее произведение.",
  board: "Подходящая основа",
  nails: "Пронумерованные гвозди",
  thread: "Выбранная нить",
  guide: "Пошаговая инструкция",
  kitAction: "Посмотреть наборы",
  faqTitle: "Перед первой нитью.",
  faqPhoto: "Какую фотографию выбрать?",
  faqPhotoBody:
    "Выберите чёткое фото с видимыми глазами и ровным светом. Светлый простой фон желателен, но не обязателен. Все лица должны помещаться в форме. Проверьте реальный нитяной эскиз до сборки: идеальное сходство не гарантировано.",
  faqFree: "Можно увидеть результат до покупки?",
  faqFreeBody:
    "Да. Загружайте, настраивайте и создавайте эскиз без аккаунта и кода. Код набора открывает инструкцию и экспорт. Доступное количество работ указано в вашем наборе.",
  faqTime: "Сколько времени занимает сборка?",
  faqTimeBody:
    "Это зависит от числа соединений и вашего темпа. Результат показывает оценку из расчёта 8 секунд на соединение; это не измеренное время реального покупателя. Можно сделать перерыв и продолжить позже.",
  faqPeople: "Подойдёт фото двух или трёх человек?",
  faqPeopleBody:
    "Да, можно загрузить групповое фото. Лица должны быть крупными, чёткими и полностью помещаться в форме. Сердце может подойти паре. Проверьте каждое лицо в результате: сходство группового портрета не гарантируется.",
  faqResume: "Можно продолжить позже?",
  faqResumeBody:
    "Сохраняйте проект и подтверждайте выполненные шаги. Мои проекты открывают локальные работы; необязательный аккаунт также помогает хранить открытые работы вместе.",
  closing: "Начните с фотографии, которая вам дорога.",
  closingHint: "Ваш следующий творческий вечер начинается здесь.",
  backUpload: "Выбрать своё фото",
  projects: "Мои проекты",
  footer: "Из фотографии — в личное произведение.",
  stepUpload: "Фото",
  stepAdjust: "Настройка",
  stepResult: "Результат",
  adjustIntro:
    "Важные детали должны помещаться в форме. Все настройки обратимы.",
  resultIntro:
    "Это эскиз из реального пути нити. Проверьте детали перед началом.",
};
export const studioHomeText = (locale: Locale, key: Key) =>
  scriptText({ en, uz, ru }[baseLocale(locale)][key], locale);
