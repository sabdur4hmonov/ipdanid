import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  farTitle: [
    "Yuz juda uzoqda",
    "Лицо слишком далеко",
    "The face is too far away",
  ],
  far: [
    "Yuz juda uzoqda. Natija sifati past bo'ladi. Yuzni yaqinroq qiling yoki yaqindan olingan rasm tanlang.",
    "Лицо слишком далеко. Качество результата будет низким. Приблизьте лицо или выберите фотографию крупным планом.",
    "The face is too far away. The result will be less clear. Zoom in on the face or choose a close-up photo.",
  ],
  crop: ["Yuzga yaqinlashtirish", "Приблизить лицо", "Zoom to face"],
  another: [
    "Boshqa rasm tanlash",
    "Выбрать другое фото",
    "Choose another photo",
  ],
  anyway: ["Baribir davom etish", "Всё равно продолжить", "Continue anyway"],
  low: [
    "Asl suratda yuz juda kichik. Yaqinlashtirish yangi detal qo'shmaydi. Tiniqroq surat yaxshiroq natija beradi.",
    "В исходном фото лицо слишком маленькое. Увеличение не добавит деталей. Более чёткое фото даст лучший результат.",
    "The face has too few pixels in the original photo. Zooming cannot add detail. A sharper photo will give a better result.",
  ],
  buy: ["Sotib olish", "Купить набор", "Buy a kit"],
  terms: [
    "Bitta quti kodi bilan 3 ta to'liq portretni bosqichma-bosqich yig'asiz. Tayyor ko'rinishlarni bepul sinab ko'ravering. Avval ochilgan ishni qayta ochish bepul.",
    "Один код набора открывает 3 полных портрета с пошаговыми инструкциями. Пробуйте готовые изображения бесплатно. Повторное открытие уже доступной работы бесплатно.",
    "One kit code opens 3 complete portraits with step-by-step instructions. Try final previews for free. Reopening an unlocked work is free.",
  ],
  telegram: ["Telegramda yozish", "Написать в Telegram", "Message on Telegram"],
  call: ["Qo'ng'iroq qilish", "Позвонить", "Call us"],
  haveCode: ["Kodim bor", "У меня есть код", "I have a code"],
  login: [
    "Kirish / Ro'yxatdan o'tish",
    "Вход / Регистрация",
    "Sign in / Register",
  ],
  works: ["Mening ishlarim", "Мои работы", "My works"],
  remaining: ["Qolgan imkoniyatlar", "Осталось работ", "Builds remaining"],
  identity: [
    "Telefon, foydalanuvchi nomi yoki email",
    "Телефон, имя пользователя или email",
    "Phone, username or email",
  ],
  identityHint: [
    "Telefonni +998 bilan yoki 3–32 belgili lotincha nom kiriting. Parol kamida 12 belgidan iborat.",
    "Введите телефон с кодом страны или имя из 3–32 латинских символов. Пароль: не менее 12 символов.",
    "Use a phone with country code or a 3–32 character Latin username. Password: at least 12 characters.",
  ],
  optional: [
    "Rasmni sinash uchun kirish shart emas. Hisobingiz bilan ishlaringizni boshqa qurilmada ham ochasiz.",
    "Вход не нужен для просмотра результата. С аккаунтом ваши работы доступны на других устройствах.",
    "No sign-in is needed to preview. Sign in to access your works on another device.",
  ],
  work: ["Ish raqami", "Номер работы", "Work ID"],
} as const;
export function websiteText(locale: Locale, key: keyof typeof words) {
  return scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
}
