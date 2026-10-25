import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  uz: {
    auto: "O‘zi aniqlash",
    kind: "Rasm turi",
    people: "Odam",
    animal: "Hayvon",
    vehicle: "Avtomobil",
    object: "Buyum",
    lettering: "Yozuv",
  },
  ru: {
    auto: "Определить автоматически",
    kind: "Что на картинке",
    people: "Люди",
    animal: "Животное",
    vehicle: "Автомобиль",
    object: "Предмет",
    lettering: "Надпись",
  },
  en: {
    auto: "Detect automatically",
    kind: "Picture type",
    people: "People",
    animal: "Animal",
    vehicle: "Vehicle",
    object: "Object",
    lettering: "Lettering",
  },
};
export function productText(locale: Locale, key: keyof typeof words.en) {
  return scriptText(words[baseLocale(locale)][key], locale);
}
