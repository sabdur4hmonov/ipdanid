import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  code: [
    "Chegirma yoki do‘st kodi",
    "Промокод или код друга",
    "Promo or friend code",
  ],
  apply: ["Qo‘llash", "Применить", "Apply code"],
  clear: ["Kodni olib tashlash", "Убрать код", "Remove code"],
  discount: ["Chegirma", "Скидка", "Discount"],
  review: [
    "Kod kiritildi. Narxni tekshirish uchun Qo‘llashni bosing yoki kodni olib tashlang.",
    "Нажмите Применить для проверки цены или уберите код.",
    "Apply the code to review the price, or remove it.",
  ],
  stale: [
    "Savat yoki shartlar o‘zgardi yoxud vaqt tugadi. Kodni qayta qo‘llang.",
    "Корзина или условия изменились либо время истекло. Примените код снова.",
    "Cart or terms changed, or the quote expired. Apply the code again.",
  ],
  expires: [
    "Narx shu vaqtgacha amal qiladi",
    "Цена действует до",
    "Price valid until",
  ],
  failure: [
    "Tekshirilmadi. Hisob, kod, shartlar va ulanishni tekshirib qayta urining.",
    "Не удалось проверить. Проверьте аккаунт, код, условия и соединение.",
    "Could not verify. Check the account, code, terms and connection, then retry.",
  ],
  conflict: [
    "Ma’lumot o‘zgargan. Yangilang va qayta tekshiring.",
    "Данные изменились. Обновите и проверьте снова.",
    "Data changed. Refresh and review again.",
  ],
  referral: ["Do‘stni taklif qilish", "Пригласить друга", "Invite a friend"],
  create: ["Do‘st kodini olish", "Получить код друга", "Get friend code"],
  copy: ["Kodni nusxalash", "Копировать код", "Copy code"],
  copied: ["Kod nusxalandi", "Код скопирован", "Code copied"],
  off: [
    "Taklif dasturi hozir o‘chiq.",
    "Программа приглашений сейчас выключена.",
    "The referral program is currently off.",
  ],
  referralTerms: [
    "Do‘stning birinchi pulli xaridi uchun. O‘z kodingiz o‘zingizda ishlamaydi; avtomatik pul mukofoti yo‘q.",
    "Для первой оплаченной покупки друга. Свой код не действует; автоматической денежной награды нет.",
    "For a friend's first paid purchase. Your own code cannot be used by you; no automatic cash reward.",
  ],
  pending: ["Kutilmoqda", "Ожидает", "Pending"],
  qualified: ["To‘langan", "Оплачено", "Paid referrals"],
  reversed: ["Qaytarilgan", "Возвращено", "Refunded referrals"],
  refresh: ["Yangilash", "Обновить", "Refresh"],
  admin: ["Chegirmalar va xarajatlar", "Скидки и расходы", "Offers and costs"],
  promo: ["Chegirma kodi", "Промокод", "Promo code"],
  newCode: ["Yangi chegirma kodi", "Новый промокод", "New promo code"],
  policy: ["Do‘st taklifi shartlari", "Условия приглашений", "Referral policy"],
  enabled: ["Yoqilgan", "Включено", "Enabled"],
  discountType: ["Chegirma turi", "Тип скидки", "Discount type"],
  percent: ["Foiz (%)", "Процент (%)", "Percent (%)"],
  fixed: [
    "Aniq summa (UZS)",
    "Фиксированная сумма (UZS)",
    "Fixed amount (UZS)",
  ],
  value: ["Chegirma miqdori", "Размер скидки", "Discount value"],
  maxDiscount: [
    "Eng katta chegirma (UZS)",
    "Максимальная скидка (UZS)",
    "Maximum discount (UZS)",
  ],
  minSubtotal: [
    "Eng kam mahsulot summasi (UZS)",
    "Минимальная стоимость товаров (UZS)",
    "Minimum merchandise (UZS)",
  ],
  startsAt: ["Boshlanish", "Начало", "Starts at"],
  expiresAt: ["Tugash", "Окончание", "Expires at"],
  maxUses: [
    "Jami foydalanish chegarasi",
    "Общий лимит применений",
    "Total use limit",
  ],
  perAccount: [
    "Bir hisob uchun chegara",
    "Лимит на аккаунт",
    "Uses per account",
  ],
  save: ["Saqlash", "Сохранить", "Save"],
  saved: ["Saqlandi", "Сохранено", "Saved"],
  bounded: [
    "Oxirgi 200 buyurtma va 200 chegirma kodi ko‘rsatiladi.",
    "Показаны последние 200 заказов и 200 промокодов.",
    "Showing the latest 200 orders and 200 promo codes.",
  ],
  costs: [
    "Haqiqiy xarajatlar (UZS)",
    "Фактические расходы (UZS)",
    "Actual costs (UZS)",
  ],
  materialsMinor: ["Materiallar", "Материалы", "Materials"],
  packingMinor: ["Qadoqlash", "Упаковка", "Packing"],
  fulfillmentMinor: [
    "Yetkazish va bajarish",
    "Доставка и выполнение",
    "Delivery and fulfillment",
  ],
  providerFeeMinor: [
    "To‘lov xizmati haqi",
    "Комиссия платежей",
    "Payment fees",
  ],
  marketingMinor: ["Reklama", "Реклама", "Marketing"],
  referralRewardMinor: [
    "To‘langan taklif mukofoti",
    "Выплаченная награда за приглашение",
    "Paid referral reward",
  ],
  revenue: [
    "Tasdiqlangan tushum",
    "Подтверждённая выручка",
    "Recognized revenue",
  ],
  contribution: [
    "Xarajatlardan qolgan summa",
    "Остаток после расходов",
    "Revenue minus actual costs",
  ],
  unknown: [
    "Xarajatlar hali kiritilmagan",
    "Расходы ещё не введены",
    "Actual costs not entered",
  ],
  costHelp: [
    "Oltita haqiqiy xarajatni kiriting; bo‘lmasa 0 yozing. Chegirma tushumdan allaqachon chiqarilgan. Qaytarishda tushum 0, xarajatlar saqlanadi. Bu soliq yoki sof foyda hisobi emas.",
    "Введите все шесть фактических расходов, при отсутствии — 0. Скидка уже вычтена. При возврате выручка 0, расходы сохраняются. Это не налоговый учёт или чистая прибыль.",
    "Enter all six actual expenses, using 0 where none. Discount is already deducted. Refunds set revenue to 0 and retain costs. This is not tax accounting or net profit.",
  ],
  ruleHelp: [
    "Kutilayotgan buyurtma limitni band qiladi; bekor qilish uni bo‘shatadi, pulni qaytarish esa foydalanish sonini kamaytirmaydi. Chegirma dostavkaga tegmaydi.",
    "Ожидающий заказ резервирует лимит; отмена освобождает, возврат не уменьшает использования. Доставка без скидки.",
    "Pending orders reserve usage; cancellation releases it, refunds retain it. Delivery is not discounted.",
  ],
  invalid: [
    "Qiymatlarni tekshiring. Summada ko‘pi bilan ikki kasr xonasi bo‘lsin.",
    "Проверьте значения. Не более двух знаков после запятой.",
    "Check values. Amounts allow at most two decimal places.",
  ],
} as const;
export type OfferWord = keyof typeof words;
export function offersText(locale: Locale, key: OfferWord) {
  return scriptText(
    words[key][
      baseLocale(locale) === "uz" ? 0 : baseLocale(locale) === "ru" ? 1 : 2
    ],
    locale,
  );
}
