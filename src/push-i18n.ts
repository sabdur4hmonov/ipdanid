import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  title: ["Bildirishnomalar", "Уведомления", "Notifications"],
  enable: [
    "Shu qurilmada yoqish",
    "Включить на этом устройстве",
    "Enable on this device",
  ],
  disable: [
    "Shu qurilmada o‘chirish",
    "Отключить на этом устройстве",
    "Disable on this device",
  ],
  enabled: ["Yoqilgan", "Включены", "Enabled"],
  fallback: [
    "E’lonlar ilovada ko‘rinadi. Qurilma xabarlari hali sozlanmagan.",
    "Объявления доступны в приложении. Push ещё не настроен.",
    "Announcements are available in the app. Device notifications are not configured yet.",
  ],
  consent: [
    "Yoqish uchun ruxsat so‘raladi. Reklama faqat alohida roziligingiz bilan keladi.",
    "Будет запрошено разрешение. Реклама — только с отдельного согласия.",
    "Permission will be requested. Promotions require your separate consent.",
  ],
  error: [
    "Amal yakunlanmadi. Ruxsat va internetni tekshirib qayta urinib ko‘ring.",
    "Не удалось завершить. Проверьте разрешение и интернет и повторите.",
    "Could not finish. Check permission and your connection, then retry.",
  ],
  send: [
    "Bildirishnoma yuborish",
    "Отправить уведомление",
    "Send notification",
  ],
  queued: ["Navbatga qo‘shildi", "Добавлено в очередь", "Queued"],
  mock: [
    "Sinov: haqiqiy xabar yuborilmaydi",
    "Тест: реальные сообщения не отправляются",
    "Test: no real messages are sent",
  ],
  connected: [
    "Ro‘yxatdagi qurilmalar",
    "Зарегистрированные устройства",
    "Registered devices",
  ],
} as const;
export const pushText = (locale: Locale, key: keyof typeof words) =>
  scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
