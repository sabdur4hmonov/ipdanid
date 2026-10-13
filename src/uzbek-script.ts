import type { Locale } from "./core/types";
export type BaseLocale = "uz" | "ru" | "en";
export const baseLocale = (locale: Locale): BaseLocale =>
  locale === "uz-Cyrl" ? "uz" : locale;
const letters: Record<string, string> = {
  a: "а",
  b: "б",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "ҳ",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  x: "х",
  y: "й",
  z: "з",
  "yo‘": "йў",
  "o‘": "ў",
  "g‘": "ғ",
  sh: "ш",
  ch: "ч",
  yo: "ё",
  yu: "ю",
  ya: "я",
  ye: "е",
  "‘": "ъ",
};
// Only authored Uzbek interface strings: user names/content never go through this function.
const protectedToken =
  /(https?:\/\/[^\s]+|\b[\w.-]+\.(?:json|pdf|txt|png|jpe?g|svg|csv|apk|wasm|ts|js)\b|\b(?:JSON|PNG|PDF|TXT|CSV|SVG|APK|API|PWA|CPU|RGB|UZS|QR|GIF|SHA-256|UTF-8|Android|iOS|Ip Rasm)\b|\b[a-z][a-z-]+\/\d+\b)/g;
function convert(text: string) {
  return text
    .replace(/[’ʻʼ']/g, "‘")
    .replace(/yo‘|o‘|g‘|sh|ch|yo|yu|ya|ye|[a-z‘]/gi, (part, index, source) => {
      const lower = part.toLowerCase();
      const wordStart = index === 0 || !/[a-zа-яё‘]/i.test(source[index - 1]);
      const value = lower === "e" && wordStart ? "э" : (letters[lower] ?? part);
      if (part.length > 1 && part === part.toUpperCase())
        return value.toUpperCase();
      return /[a-z]/i.test(part[0]) && part[0] === part[0].toUpperCase()
        ? value[0].toUpperCase() + value.slice(1)
        : value;
    });
}
export function uzbekCyrillic(text: string): string {
  return text
    .split(protectedToken)
    .map((part, index) => (index % 2 ? part : convert(part)))
    .join("");
}
export const scriptText = (text: string, locale: Locale) =>
  locale === "uz-Cyrl" ? uzbekCyrillic(text) : text;
