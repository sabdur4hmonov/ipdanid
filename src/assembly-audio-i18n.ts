import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  enable: [
    "Ekran qulflanganda ham ovozni davom ettirish",
    "Продолжать голос при блокировке экрана",
    "Keep voice playing with the screen locked",
  ],
  hint: [
    "Ovozni ishga tushiring. Qulf ekranida to‘xtatish va qadamni almashtirish mumkin. Bajarilgan qadamni o‘zingiz tasdiqlaysiz.",
    "Включите воспроизведение. На экране блокировки можно остановить голос или сменить шаг. Выполнение подтверждаете вы.",
    "Start with Play. Pause or change steps on the lock screen. Only you confirm completed steps.",
  ],
  unsupported: [
    "Bu imkoniyat Android ilovasida ishlaydi. Bu yerda ilova fonga o‘tsa ovoz to‘xtaydi.",
    "Доступно в приложении Android. Здесь голос останавливается при сворачивании.",
    "Available in the Android app. Here voice pauses when the app goes into the background.",
  ],
  needVoice: [
    "Avval ovozli yo‘riqnoma va shu tildagi qurilma yoki yozilgan ovozni tanlang.",
    "Сначала включите голос и выберите голос устройства или запись на этом языке.",
    "First enable voice guidance and choose an installed or recorded voice in this language.",
  ],
  failed: [
    "Fondagi ovoz to‘xtadi. Ilovani ochib, ovozni qayta boshlang yoki oddiy ovozdan foydalaning.",
    "Фоновый голос остановлен. Откройте приложение и включите воспроизведение или используйте обычный голос.",
    "Background voice stopped. Open the app and press Play again or use foreground voice.",
  ],
} as const;
export function assemblyAudioText(locale: Locale, key: keyof typeof words) {
  const index = { uz: 0, ru: 1, en: 2 }[baseLocale(locale)];
  return scriptText(words[key][index], locale);
}
