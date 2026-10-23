import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  title: [
    "Hisobimdagi surat zaxirasi",
    "Резервное фото в аккаунте",
    "Private account photo",
  ],
  info: [
    "Bitta surat, qirqim va joylashuv hisobingizda 30 kungacha saqlanadi. Yangi nusxa eskisini almashtiradi. Boshqa qurilmada shu hisob bilan ochasiz. Ommaga ko‘rsatilmaydi.",
    "Одно фото, вырезанный фон и положение хранятся в аккаунте до 30 дней. Новая копия заменяет старую. Откройте её на другом устройстве с тем же аккаунтом. Публикации нет.",
    "Keep one photo, cutout and placement privately in your account for up to 30 days. Saving replaces the previous copy. Open it on another device with the same account. It is not published.",
  ],
  consent: [
    "Suratim va qirqimini shaxsiy zaxira uchun serverga yuborishga roziman",
    "Разрешаю отправить фото и вырезанный фон на сервер для личной резервной копии",
    "I agree to upload my photo and cutout for a private backup",
  ],
  login: [
    "Avval Menyu → Hisob orqali kiring",
    "Сначала войдите через Меню → Аккаунт",
    "First sign in through Menu → Account",
  ],
  refresh: [
    "Zaxira holatini tekshirish",
    "Проверить резервную копию",
    "Check backup status",
  ],
  save: ["Hisobimda saqlash", "Сохранить в аккаунте", "Save to my account"],
  open: [
    "Hisobdagi suratni ochish",
    "Открыть фото из аккаунта",
    "Open account photo",
  ],
  remove: [
    "Hisobdagi suratni o‘chirish",
    "Удалить фото из аккаунта",
    "Delete account photo",
  ],
  confirm: [
    "Hisobdagi nusxani o‘chirishni tasdiqlayman",
    "Подтверждаю удаление резервной копии",
    "I confirm deleting the account copy",
  ],
  retry: [
    "Avvalgi so‘rovni qayta yuborish",
    "Повторить прежний запрос",
    "Retry previous request",
  ],
  discard: [
    "Kutilayotgan so‘rovni unutish",
    "Забыть ожидающий запрос",
    "Discard pending request",
  ],
  pending: [
    "Javob olinmadi. Aynan avvalgi so‘rov saqlandi. Qayta yuborish mumkin. Unutish serverdagi nusxani o‘chirmaydi.",
    "Ответ не получен. Прежний запрос сохранён для повтора. Отмена не удаляет копию на сервере.",
    "No confirmed response. The exact request is kept for retry. Discarding it does not delete a server copy.",
  ],
  available: [
    "Zaxira bor. Amal qilish muddati",
    "Копия доступна до",
    "Backup available until",
  ],
  empty: ["Hisobda surat yo‘q", "В аккаунте нет фото", "No account photo"],
  saved: ["Hisobda saqlandi", "Сохранено в аккаунте", "Saved to account"],
  removed: [
    "Hisobdagi nusxa o‘chirildi",
    "Копия удалена из аккаунта",
    "Account copy deleted",
  ],
  failed: [
    "Bajarilmadi. Internet, hisob va bo‘sh joyni tekshiring. Kutilayotgan so‘rov bo‘lsa qayta yuboring.",
    "Не удалось. Проверьте интернет, аккаунт и свободное место. Ожидающий запрос можно повторить.",
    "Could not finish. Check connection, account and free space. Retry a pending request if shown.",
  ],
  conflict: [
    "Boshqa qurilmada nusxa o‘zgargan. Eski so‘rovni unuting, holatni yangilang va keyin qayta tanlang.",
    "Копия изменена на другом устройстве. Отмените старый запрос, обновите состояние и выберите действие заново.",
    "Another device changed the copy. Discard the old request, check status and choose again.",
  ],
} as const;
export function photoBackupText(locale: Locale, key: keyof typeof words) {
  return scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
}
