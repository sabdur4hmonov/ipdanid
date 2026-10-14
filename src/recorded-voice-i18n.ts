import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
export function recordedVoiceText(
  locale: Locale,
  key: "missing" | "available" | "fallback",
) {
  const text = {
    missing: {
      uz: "Ikki yozib olingan instruktor ovozi hali o‘rnatilmagan. Qurilma ovozi yoki matnli ko‘rsatma ishlatiladi.",
      ru: "Записи двух инструкторов ещё не установлены. Доступны голос устройства или текст.",
      en: "The two recorded instructors are not installed yet. Device speech or text instructions remain available.",
    },
    available: {
      uz: "O‘rnatilgan yozma ovozlar",
      ru: "Установленные записанные голоса",
      en: "Installed recorded voices",
    },
    fallback: {
      uz: "Yozib olingan ovoz ochilmadi. Qurilma ovozi yoki matnli ko‘rsatmaga o‘tildi.",
      ru: "Запись не открылась. Используется голос устройства или текст.",
      en: "The recording could not be played. Using device speech or text instructions.",
    },
  }[key][baseLocale(locale)];
  return scriptText(text, locale);
}
