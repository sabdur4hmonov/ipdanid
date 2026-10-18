import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  title: ["Ipdan video", "Видео из нитей", "Thread animation"],
  hint: [
    "Ipning haqiqiy tartibidan taxminan 7 soniyali ovozsiz video. Shu oynada kuting. GIF kichikroq, ranglari soddalashtiriladi; qurilmada video ishlamasa GIFni tanlang.",
    "Около 7 секунд без звука, по реальному порядку нитей. Оставайтесь в этом окне. GIF меньше и упрощает цвета; выберите его, если запись видео недоступна.",
    "About 7 silent seconds from the actual ordered strands. Keep this window open. GIF is smaller with reduced colors; choose it if video recording is unavailable.",
  ],
  video: ["Video yuklab olish", "Скачать видео", "Download thread video"],
  gif: ["GIF yuklab olish", "Скачать GIF", "Download thread GIF"],
  cancel: ["Videoni bekor qilish", "Отменить анимацию", "Cancel animation"],
  busy: [
    "Ipdan video tayyorlanyapti",
    "Готовится анимация нитей",
    "Preparing thread animation",
  ],
  unsupported: [
    "Bu qurilmada video yozish mavjud emas. GIFdan foydalaning.",
    "Запись видео недоступна. Используйте GIF.",
    "Video recording is unavailable on this device. Use GIF.",
  ],
  error: [
    "Video saqlanmadi. Shu oynada GIF bilan qayta urining.",
    "Не удалось сохранить анимацию. Повторите с GIF в этом окне.",
    "Animation could not be saved. Retry with GIF while keeping this window open.",
  ],
  done: [
    "Fayl tayyor. Video qurilmaga saqlanadi yoki ulashish oynasi ochiladi.",
    "Файл готов. Он сохраняется на устройство или открывается окно отправки.",
    "File ready. It downloads to this device or opens its share sheet.",
  ],
} as const;
export const animationText = (locale: Locale, key: keyof typeof words) =>
  scriptText(
    words[key][baseLocale(locale) === "uz" ? 0 : locale === "ru" ? 1 : 2],
    locale,
  );
