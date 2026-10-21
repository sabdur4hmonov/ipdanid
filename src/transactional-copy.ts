import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
import type {
  TransactionalKind,
  TransactionalPayload,
} from "./transactional-types";
// Immutable copy contract: future text changes publish a new version rather
// than changing already queued external idempotency payloads.
const en: Record<TransactionalKind, [string, string]> = {
  "order-created": [
    "Order received",
    "Your order is saved. Open the app to check payment and delivery.",
  ],
  "order-paid": [
    "Payment recorded",
    "Payment is recorded. Open the app for your purchase and available build credits.",
  ],
  "order-cancelled": [
    "Order cancelled",
    "This order was cancelled. Open the app for its current details.",
  ],
  "order-sent": [
    "Order sent",
    "Dispatch was recorded by the workshop. Open the app for the tracking reference.",
  ],
  "order-return-requested": [
    "Return request received",
    "Your return request is saved. The owner will review it.",
  ],
  "order-refunded": [
    "Refund recorded",
    "A refund was recorded. Open the app for the current order details.",
  ],
  "support-replied": [
    "Support has replied",
    "There is a reply to your request. Open Support in the app to read it.",
  ],
  "commission-approved": [
    "Your artwork was reviewed",
    "The workshop approved the drawing and price. Open the app and check them before accepting.",
  ],
  "commission-declined": [
    "Artwork request reviewed",
    "The workshop left a decision on your request. Open the app for its note.",
  ],
  "commission-making": [
    "Your artwork is being made",
    "The workshop recorded the start of making your artwork.",
  ],
  "commission-ready": [
    "Your artwork is ready",
    "The workshop marked your artwork ready. Check collection or tracking in the app.",
  ],
};
const uz: typeof en = {
  "order-created": [
    "Buyurtma olindi",
    "Buyurtmangiz saqlandi. To‘lov va yetkazishni ilovada tekshiring.",
  ],
  "order-paid": [
    "To‘lov qayd qilindi",
    "To‘lov qayd qilindi. Xaridingiz va tayyorlash kreditlarini ilovada ko‘ring.",
  ],
  "order-cancelled": [
    "Buyurtma bekor qilindi",
    "Bu buyurtma bekor qilindi. Hozirgi ma’lumotni ilovada ko‘ring.",
  ],
  "order-sent": [
    "Buyurtma jo‘natildi",
    "Ustaxona jo‘natishni qayd qildi. Kuzatuv raqamini ilovada ko‘ring.",
  ],
  "order-return-requested": [
    "Qaytarish so‘rovi olindi",
    "Qaytarish so‘rovingiz saqlandi. Egasi uni ko‘rib chiqadi.",
  ],
  "order-refunded": [
    "Qaytarish qayd qilindi",
    "Qaytarish qayd qilindi. Buyurtmaning hozirgi ma’lumotini ilovada ko‘ring.",
  ],
  "support-replied": [
    "Yordamdan javob keldi",
    "So‘rovingizga javob bor. Uni ilovaning Yordam bo‘limida o‘qing.",
  ],
  "commission-approved": [
    "Asaringiz ko‘rib chiqildi",
    "Ustaxona chizma va narxni tasdiqladi. Qabul qilishdan oldin ularni ilovada tekshiring.",
  ],
  "commission-declined": [
    "Asar so‘rovi ko‘rib chiqildi",
    "Ustaxona so‘rovingiz bo‘yicha qaror qoldirdi. Izohni ilovada ko‘ring.",
  ],
  "commission-making": [
    "Asaringiz tayyorlanmoqda",
    "Ustaxona asaringizni tayyorlash boshlanganini qayd qildi.",
  ],
  "commission-ready": [
    "Asaringiz tayyor",
    "Ustaxona asaringizni tayyor deb belgiladi. Olish yoki kuzatuv ma’lumotini ilovada ko‘ring.",
  ],
};
const ru: typeof en = {
  "order-created": [
    "Заказ получен",
    "Ваш заказ сохранён. Проверьте оплату и доставку в приложении.",
  ],
  "order-paid": [
    "Оплата записана",
    "Оплата записана. Покупка и доступные кредиты находятся в приложении.",
  ],
  "order-cancelled": [
    "Заказ отменён",
    "Этот заказ отменён. Текущие сведения доступны в приложении.",
  ],
  "order-sent": [
    "Заказ отправлен",
    "Мастерская записала отправку. Номер отслеживания находится в приложении.",
  ],
  "order-return-requested": [
    "Запрос возврата получен",
    "Ваш запрос сохранён. Владелец рассмотрит его.",
  ],
  "order-refunded": [
    "Возврат записан",
    "Возврат записан. Текущие сведения о заказе находятся в приложении.",
  ],
  "support-replied": [
    "Поддержка ответила",
    "На ваш запрос есть ответ. Прочитайте его в разделе поддержки приложения.",
  ],
  "commission-approved": [
    "Картина рассмотрена",
    "Мастерская одобрила рисунок и цену. Проверьте их в приложении перед подтверждением.",
  ],
  "commission-declined": [
    "Заявка рассмотрена",
    "Мастерская оставила решение по заявке. Комментарий находится в приложении.",
  ],
  "commission-making": [
    "Картина изготавливается",
    "Мастерская записала начало изготовления вашей картины.",
  ],
  "commission-ready": [
    "Картина готова",
    "Мастерская отметила картину готовой. Проверьте получение или отслеживание в приложении.",
  ],
};
export function transactionalCopy(
  version: string,
  locale: Locale,
  kind: TransactionalKind,
  payload: TransactionalPayload,
) {
  if (version !== "transactional-copy/1")
    throw Error("Unsupported transactional copy");
  const [title, body] = { en, uz, ru }[baseLocale(locale)][kind];
  const amount =
    payload.amountMinor === undefined
      ? ""
      : ` · ${(payload.amountMinor / 100).toLocaleString(locale, { maximumFractionDigits: 2 })} ${payload.currency}`;
  return {
    title: scriptText(title, locale),
    body:
      scriptText(body, locale) + "\n#" + payload.reference.slice(0, 8) + amount,
  };
}
