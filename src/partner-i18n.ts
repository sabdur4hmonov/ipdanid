import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  quoteExpiry: [
    "Narx hisobining muddati",
    "Срок расчёта цены",
    "Quote valid until",
  ],
  reservationExpiry: [
    "Zaxira shu vaqtgacha band",
    "Запас зарезервирован до",
    "Stock reserved until",
  ],
  portal: ["Hamkor uchun", "Для партнёра", "Partner portal"],
  admin: [
    "Hamkorlar va partiyalar",
    "Партнёры и партии",
    "Partners and campaigns",
  ],
  account: [
    "Hisob raqami (egasiga bering)",
    "Номер аккаунта (передайте владельцу)",
    "Account ID (give to the owner)",
  ],
  access: [
    "Ruxsat va partiyalarni tekshirish",
    "Проверить доступ и партии",
    "Check access and campaigns",
  ],
  denied: [
    "Bu hisobga hamkor ruxsati berilmagan yoki aloqa yo‘q. Hisob raqamini egasiga bering.",
    "Нет доступа партнёра или соединения. Передайте номер аккаунта владельцу.",
    "Partner access is not enabled or the connection is unavailable. Give your account ID to the owner.",
  ],
  name: ["Hamkor nomi", "Название партнёра", "Partner name"],
  product: ["Kit mahsuloti", "Товар набора", "Kit product"],
  enabled: [
    "Hamkor ruxsati yoqilgan",
    "Доступ партнёра включён",
    "Partner access enabled",
  ],
  maxKits: [
    "Jami ajratilgan kitlar chegarasi",
    "Общий лимит выделенных наборов",
    "Lifetime allocated kit limit",
  ],
  minBatch: ["Eng kam partiya", "Минимальная партия", "Minimum batch"],
  maxBatch: ["Eng ko‘p partiya", "Максимальная партия", "Maximum batch"],
  codeDays: [
    "Kodni olish muddati (kun)",
    "Срок активации кода (дни)",
    "Code activation days",
  ],
  creditDays: [
    "Kredit muddati (kun, 0 — cheksiz)",
    "Срок кредитов (дни, 0 — бессрочно)",
    "Credit days (0 means no expiry)",
  ],
  tierCount: [
    "Shuncha kitdan boshlab",
    "Начиная с количества наборов",
    "Starting quantity",
  ],
  tierPrice: ["Bir kit narxi (UZS)", "Цена набора (UZS)", "Unit price (UZS)"],
  addTier: [
    "Narx pog‘onasini qo‘shish",
    "Добавить ценовую ступень",
    "Add price tier",
  ],
  removeTier: ["Pog‘onani olib tashlash", "Убрать ступень", "Remove tier"],
  newPartner: ["Yangi hamkor", "Новый партнёр", "New partner"],
  save: ["Saqlash", "Сохранить", "Save"],
  refresh: ["Yangilash", "Обновить", "Refresh"],
  saved: ["Saqlandi", "Сохранено", "Saved"],
  quantity: ["Kitlar soni", "Количество наборов", "Kit quantity"],
  quote: ["Narxni hisoblash", "Рассчитать цену", "Get volume quote"],
  total: ["Partiya narxi", "Стоимость партии", "Campaign price"],
  expiry: ["Shu vaqtgacha amal qiladi", "Действует до", "Valid until"],
  campaignName: ["Partiya nomi", "Название партии", "Campaign name"],
  request: [
    "Egasiga tasdiqlashga berish",
    "Отправить владельцу на утверждение",
    "Request owner authorization",
  ],
  approveConsent: [
    "Narx va miqdorni tekshirdim; shu kodlarni chiqarishga ruxsat beraman.",
    "Цена и количество проверены; разрешаю выпуск кодов.",
    "I reviewed the price and quantity and authorize issuing these codes.",
  ],
  approve: [
    "Kod chiqarishga ruxsat",
    "Разрешить выпуск кодов",
    "Authorize code issuance",
  ],
  issue: [
    "Kit kodlarini chiqarish",
    "Выпустить коды наборов",
    "Issue kit codes",
  ],
  pending: [
    "Egasi tasdig‘i kutilmoqda",
    "Ожидает утверждения владельца",
    "Awaiting owner authorization",
  ],
  approved: [
    "Tasdiqlangan, zaxira band",
    "Утверждено, запас зарезервирован",
    "Authorized, stock reserved",
  ],
  issued: ["Kodlar chiqarilgan", "Коды выпущены", "Codes issued"],
  cancelled: ["Bekor qilingan", "Отменено", "Cancelled"],
  expired: ["Muddati tugagan", "Истекло", "Expired"],
  revoked: ["Kodlar bloklangan", "Коды заблокированы", "Codes revoked"],
  cancel: ["Partiyani bekor qilish", "Отменить партию", "Cancel campaign"],
  revoke: [
    "Chiqarilgan kodlarni bloklash",
    "Заблокировать выпущенные коды",
    "Revoke issued codes",
  ],
  revokeConsent: [
    "Kodlar bloklanishini tushundim. Tarqatilgan kit zaxiraga qaytmaydi, olingan kreditlar saqlanadi.",
    "Понимаю блокировку кодов. Выданные наборы не возвращаются в запас; активированные кредиты сохраняются.",
    "I understand code revocation. Distributed kits do not return to stock; already granted credits remain.",
  ],
  claimed: ["Olingan", "Активировано", "Claimed"],
  available: ["Olinmagan", "Не активировано", "Unclaimed"],
  once: [
    "Kodlar faqat bir marta ko‘rsatiladi. Hozir PDF yoki havolalarni saqlang. Javob yo‘qolsa yoki ekran yopilsa, yangilang va egasi bilan eski partiyani bloklab yangisini yarating; qayta bosish boshqa kod yaratmaydi.",
    "Коды показываются один раз. Сохраните PDF или ссылки сейчас. При потере ответа/закрытии обновите и с владельцем заблокируйте старую партию; повтор не создаст новые коды.",
    "Codes are shown once. Save the PDF or links now. If the response is lost or this screen closes, refresh and have the owner revoke the old batch before creating another; retry does not issue duplicate codes.",
  ],
  pdf: ["Kit kartochkalari PDF", "Карточки наборов PDF", "Kit cards PDF"],
  links: [
    "Oluvchi havolalari CSV",
    "Ссылки получателей CSV",
    "Recipient links CSV",
  ],
  private: [
    "Kod va havolalar maxfiy. Har birini faqat bitta oluvchiga bering.",
    "Коды и ссылки конфиденциальны. Каждый передавайте одному получателю.",
    "Codes and links are private. Give each to only one recipient.",
  ],
  noOrigin: [
    "Havola uchun ilovaning HTTPS domeni sozlanmagan. Oddiy kit kodli PDFdan foydalaning.",
    "HTTPS-домен приложения не настроен. Используйте PDF с обычными кодами.",
    "The app HTTPS domain is not configured. Use the PDF with ordinary kit codes.",
  ],
  quoteHelp: [
    "Bu narx hisobi va kod chiqarish ruxsati; avtomatik to‘lov yoki yetkazish emas. Tasdiqlanmagan partiya zaxirani band qilmaydi. Ruxsat berilgach zaxira 7 kun saqlanadi.",
    "Это расчёт и разрешение на коды, не автоматическая оплата или доставка. Запас резервируется после утверждения на 7 дней.",
    "This is a quote and code authorization, without automatic payment or delivery. Stock is reserved for seven days after authorization.",
  ],
  failure: [
    "Bajarilmadi. Ma’lumot va ulanishni tekshirib yangilang.",
    "Не выполнено. Проверьте данные и соединение, обновите.",
    "Could not complete. Check the details and connection, then refresh.",
  ],
  conflict: [
    "Narx, zaxira yoki holat o‘zgargan. Yangilang va qayta tekshiring.",
    "Цена, запас или состояние изменились. Обновите и проверьте снова.",
    "Price, stock or status changed. Refresh and review again.",
  ],
  invalid: [
    "Qiymatlarni tekshiring; summada ko‘pi bilan ikki kasr xonasi bo‘lsin.",
    "Проверьте значения; не более двух знаков после запятой.",
    "Check values; amounts allow at most two decimal places.",
  ],
  claimTitle: ["Kitni olish", "Активировать набор", "Claim your kit"],
  claimHelp: [
    "Bu kitni hozirgi hisobingizga biriktiring. Hisob yo‘q bo‘lsa shu qurilmada kit hisobi yaratiladi. Tasdiqlamasdan kredit ishlatilmaydi.",
    "Привяжите набор к текущему аккаунту. Если аккаунта нет, он будет создан на устройстве. Без подтверждения кредит не расходуется.",
    "Attach this kit to your current account. If none exists, a kit account is created on this device. This does not spend a build credit.",
  ],
  claim: [
    "Kitni shu hisobga olish",
    "Привязать к этому аккаунту",
    "Claim kit to this account",
  ],
  dismiss: ["Yopish", "Закрыть", "Dismiss"],
  claimedNotice: [
    "Kit hisobingizga olindi. Profilni qo‘llab yaratishni boshlashingiz mumkin.",
    "Набор привязан к аккаунту. Примените профиль и начинайте создание.",
    "Kit claimed to your account. Apply its profile to start creating.",
  ],
  bounded: [
    "Oxirgi 200 hamkor va tanlangan hamkorning 100 partiyasi.",
    "Последние 200 партнёров и 100 партий выбранного партнёра.",
    "Latest 200 partners and 100 campaigns for the selected partner.",
  ],
} as const;
export type PartnerWord = keyof typeof words;
export function partnerText(locale: Locale, key: PartnerWord) {
  return scriptText(
    words[key][
      baseLocale(locale) === "uz" ? 0 : baseLocale(locale) === "ru" ? 1 : 2
    ],
    locale,
  );
}
