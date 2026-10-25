import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
export const trialWords = {
  title: ["Sinov kodi", "Код пробной сборки", "Trial code"],
  admin: [
    "Instagram sinovi",
    "Пробная кампания Instagram",
    "Instagram trial campaign",
  ],
  terms: [
    "Bir hisobga bitta raqamli yig‘ish. Taxta va dostavka alohida to‘lanadi.",
    "Одна цифровая сборка на аккаунт. Набор и доставка оплачиваются отдельно.",
    "One digital build per account. The physical kit and delivery are paid separately.",
  ],
  login: [
    "Sinov kodini olish uchun email va parol bilan hisobingizga kiring.",
    "Для активации войдите в аккаунт с email и паролем.",
    "Sign into an email and password account to claim a trial code.",
  ],
  claim: ["Sinovni olish", "Активировать пробную сборку", "Claim trial"],
  code: ["Shaxsiy sinov kodi", "Личный пробный код", "Private trial code"],
  accepted: ["Sinov olindi", "Пробная сборка получена", "Trial claimed"],
  remaining: [
    "Qolgan raqamli sinov",
    "Осталось пробных сборок",
    "Trial builds remaining",
  ],
  expires: ["Amal qilish muddati", "Срок действия", "Expires"],
  failure: [
    "Tekshirilmadi. Hisob, kod, muddat va ulanishni tekshirib qayta urining.",
    "Не удалось проверить. Проверьте аккаунт, код, срок и соединение, затем повторите.",
    "Could not verify. Check the account, code, expiry and connection, then retry.",
  ],
  refresh: ["Yangilash", "Обновить", "Refresh"],
  manual: [
    "Obunani o‘zingiz tekshiring va kodni o‘zingiz yuboring. Avtomatik xabar yuborilmaydi.",
    "Проверьте подписку и отправьте код самостоятельно. Автоматических сообщений нет.",
    "Verify the follower and send the code yourself. No automatic messages are sent.",
  ],
  enabled: ["Kampaniyani yoqish", "Включить кампанию", "Enable campaign"],
  start: ["Boshlanish", "Начало", "Starts"],
  end: ["Tugash", "Окончание", "Ends"],
  budget: [
    "Jami sinovlar chegarasi",
    "Общий лимит пробных сборок",
    "Total trial budget",
  ],
  days: [
    "Olingandan keyin necha kun",
    "Дней после активации",
    "Days after claiming",
  ],
  save: ["Shartlarni saqlash", "Сохранить условия", "Save campaign"],
  count: ["Yangi kodlar soni", "Количество новых кодов", "New code count"],
  issue: [
    "Shaxsiy kodlar yaratish",
    "Создать личные коды",
    "Issue private codes",
  ],
  retry: [
    "Aynan shu so‘rovni qaytarish",
    "Повторить тот же запрос",
    "Retry exact request",
  ],
  once: [
    "Kodlar faqat hozir ko‘rinadi. Saqlab oling va shaxsiy yuboring.",
    "Коды видны только сейчас. Сохраните и отправьте лично.",
    "Codes are shown only now. Save them and send privately.",
  ],
  download: ["Kodlarni TXT saqlash", "Сохранить коды TXT", "Save codes as TXT"],
  clear: [
    "Kodlarni ekrandan tozalash",
    "Убрать коды с экрана",
    "Clear codes from screen",
  ],
  lost: [
    "Oldingi so‘rov holati noma’lum yoki shartlar o‘zgardi. Ro‘yxatni yangilang; yo‘qolgan partiyaning ishlatilmagan kodlarini bekor qiling. Keyin yangi so‘rov boshlang.",
    "Результат неизвестен или условия изменились. Обновите список, отмените неиспользованные коды потерянной партии, затем начните новый запрос.",
    "The result is unknown or terms changed. Refresh the list, revoke unused codes in a lost batch, then start a new request.",
  ],
  newRequest: [
    "Tekshirdim, yangi so‘rov",
    "Проверено, новый запрос",
    "Reviewed, start new request",
  ],
  revoke: [
    "Ishlatilmagan kodlarni bekor qilish",
    "Отменить неиспользованные коды",
    "Revoke unused codes",
  ],
  claimed: ["Olingan", "Получено", "Claimed"],
  pending: ["Olinishi mumkin", "Ожидает активации", "Awaiting claim"],
  used: ["Sarflangan", "Использовано", "Used"],
  revoked: ["Bekor qilingan", "Отменено", "Revoked"],
  shop: ["Do‘kon va buyurtmalar", "Магазин и заказы", "Shop and orders"],
} as const;
export type TrialWord = keyof typeof trialWords;
export function trialText(locale: Locale, key: TrialWord) {
  return scriptText(
    trialWords[key][{ uz: 0, ru: 1, en: 2 }[baseLocale(locale)]],
    locale,
  );
}
