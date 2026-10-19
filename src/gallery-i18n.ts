import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  title: ["Mijozlar galereyasi", "Галерея клиентов", "Customer gallery"],
  intro: [
    "Mijozlar tayyorlagan ishlar va ularning fikrlari. Yangi ishlar avval ko‘rib chiqiladi.",
    "Готовые работы и отзывы клиентов. Новые публикации сначала проходят проверку.",
    "Finished customer crafts and their feedback. New submissions are reviewed first.",
  ],
  empty: [
    "Hali tasdiqlangan ish yo‘q.",
    "Одобренных работ пока нет.",
    "No approved crafts yet.",
  ],
  refresh: ["Yangilash", "Обновить", "Refresh gallery"],
  more: ["Yana ko‘rsatish", "Показать ещё", "More gallery posts"],
  count: ["Nashr qilingan ishlar", "Опубликованные работы", "Published crafts"],
  rating: ["Baho", "Оценка", "Rating"],
  average: [
    "Fikr bildirganlarning o‘rtacha bahosi",
    "Средняя оценка оставивших отзыв",
    "Average of submitted ratings",
  ],
  mine: ["Mening yuborgan ishlarim", "Мои публикации", "My submissions"],
  share: [
    "Tayyor ishni yuborish",
    "Отправить готовую работу",
    "Submit finished craft",
  ],
  photo: [
    "Tayyor ishning fotosurati",
    "Фото готовой работы",
    "Finished craft photo",
  ],
  photoHelp: [
    "Tayyor buyum rasmini tanlang. Shaxsiy ma’lumotlar ko‘rinmasin. Ilova tanlangan rasmni kichraytirib serverga yuboradi.",
    "Выберите фото готового изделия без личных данных в кадре. Приложение уменьшит выбранное фото и отправит на сервер.",
    "Choose a photo of the finished item, keeping personal details out of view. The app resizes this selected photo and sends it to the server.",
  ],
  name: ["Ish nomi", "Название работы", "Craft title"],
  alias: [
    "Hammaga ko‘rinadigan taxallus",
    "Публичное имя",
    "Public display name",
  ],
  review: [
    "Fikringiz (ixtiyoriy)",
    "Отзыв (необязательно)",
    "Feedback (optional)",
  ],
  finished: [
    "Bu tayyor qo‘l ishimning rasmi.",
    "Это фотография моей готовой работы.",
    "This is a photo of my finished craft.",
  ],
  rights: [
    "Bu rasmni tarqatish huquqim bor; undagi odamlarning roziligini olganman.",
    "У меня есть право опубликовать фото и согласие изображённых людей.",
    "I have the right to share this photo and the consent of anyone shown.",
  ],
  consent: [
    "Rasm, taxallus va fikrim tasdiqlangach 365 kungacha hammaga ko‘rinishiga roziman. Istalgan payt o‘chiraman; boshqalar saqlagan nusxalar qolishi mumkin.",
    "Согласен публиковать фото, имя и отзыв до 365 дней после одобрения. Могу удалить в любое время; сохранённые другими копии могут остаться.",
    "I agree to publish this image, display name and feedback for up to 365 days after approval. I can withdraw any time; copies saved by others may remain.",
  ],
  account: [
    "Yuborish uchun kit kodi yoki hisobingiz bilan kiring.",
    "Для отправки войдите по коду набора или в свой аккаунт.",
    "Sign in with a kit code or registered account to submit.",
  ],
  openAccount: ["Hisobga o‘tish", "Открыть аккаунт", "Open account"],
  pending: ["Tekshirilmoqda", "На проверке", "Pending review"],
  approved: ["Nashr qilindi", "Опубликовано", "Published"],
  rejected: ["Nashr qilinmadi", "Не опубликовано", "Not published"],
  deleted: ["O‘chirildi", "Удалено", "Withdrawn"],
  submitted: [
    "Ish tekshirishga yuborildi. Hali hammaga ko‘rinmaydi.",
    "Работа отправлена на проверку и пока не видна публично.",
    "Submitted for review. It is not public yet.",
  ],
  withdraw: [
    "Nashrni bekor qilish va o‘chirish",
    "Отозвать и удалить",
    "Withdraw and delete",
  ],
  withdrawHelp: [
    "O‘chirish rasm va fikrni galereyadan darhol olib tashlaydi.",
    "Удаление сразу убирает фото и отзыв из галереи.",
    "Withdrawal immediately removes the image and feedback from the gallery.",
  ],
  expires: ["Saqlash muddati", "Срок хранения", "Retention deadline"],
  retention: [
    "Tekshirilmagan yoki rad etilgan ish ko‘pi bilan 30 kun saqlanadi. Tasdiqlangan ish birinchi tasdiqdan 365 kun o‘tib olib tashlanadi.",
    "Неодобренные работы хранятся не более 30 дней. Одобренная работа удаляется через 365 дней после первого одобрения.",
    "Unapproved submissions are kept for at most 30 days. Approved posts expire 365 days after their first approval.",
  ],
  error: [
    "Amal bajarilmadi. Aloqani tekshiring va qayta urining.",
    "Не удалось выполнить действие. Проверьте связь и повторите.",
    "The action failed. Check your connection and retry.",
  ],
  imageError: [
    "JPEG yoki PNG tanlang: 15 MBgacha, 24 megapikselgacha. Kichraytirilgach ikkala tomoni kamida 96 piksel bo‘lsin.",
    "Выберите JPEG или PNG до 15 МБ и 24 Мп. После уменьшения обе стороны должны быть не менее 96 пикселей.",
    "Choose JPEG or PNG up to 15 MB and 24 MP. Both sides must remain at least 96 pixels after resizing.",
  ],
  conflict: [
    "Holat boshqa oynada o‘zgargan. Yangilab qayta ko‘ring.",
    "Состояние изменилось в другом окне. Обновите и проверьте.",
    "The state changed in another window. Refresh before trying again.",
  ],
  limited: [
    "Yuborish chegarasiga yetdingiz. Keyinroq urinib ko‘ring.",
    "Достигнут лимит публикаций. Попробуйте позже.",
    "The submission limit was reached. Try again later.",
  ],
  larger: ["Kattaroq ko‘rish", "Посмотреть крупнее", "View larger"],
  close: ["Yopish", "Закрыть", "Close image"],
  moderation: [
    "Galereyani tekshirish",
    "Проверка галереи",
    "Gallery moderation",
  ],
  filter: ["Ishlar holati", "Статус работ", "Submission state"],
  approve: [
    "Nashrga ruxsat berish",
    "Одобрить публикацию",
    "Approve publication",
  ],
  reject: ["Nashrni rad etish", "Отклонить публикацию", "Reject publication"],
  reason: ["Rad etish sababi", "Причина отказа", "Rejection reason"],
  privacy: ["Shaxsiy ma’lumotlar", "Личные данные", "Personal information"],
  "not-finished": [
    "Tayyor ish ko‘rsatilmagan",
    "Не показано готовое изделие",
    "Finished craft not shown",
  ],
  rightsReason: [
    "Tarqatish huquqi aniqlanmagan",
    "Не подтверждены права",
    "Sharing rights unclear",
  ],
  other: ["Boshqa sabab", "Другая причина", "Other reason"],
  moderateHelp: [
    "Rasmni kattalashtirib ko‘ring. Tayyor ish, tarqatish huquqi va shaxsiy ma’lumotlarni tekshiring. Faqat tasdiqlangan rasm va fikr ommaga chiqadi.",
    "Откройте фото крупнее. Проверьте готовое изделие, права и личные данные. Публичны только одобренные фото и отзывы.",
    "Open the larger photo. Review the finished craft, sharing rights and personal details. Only approved images and feedback become public.",
  ],
} as const;
export function galleryText(locale: Locale, key: keyof typeof words) {
  return scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
}
