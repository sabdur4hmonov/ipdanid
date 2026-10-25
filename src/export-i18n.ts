import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
const words = {
  segment: [
    "# Bo‘lak {0}: {1} ipni {2} mixga bog‘lang; tartibdagi qadamlarni ipni kesmay bajaring; {3} mixda yakuniy tugun qiling.",
    "# Сегмент {0}: привяжите нить {1} к гвоздю {2}; следуйте шагам по порядку без обрезания; закрепите конечный узел на гвозде {3}.",
    "# Segment {0}: tie {1} to pin {2}; follow its ordered steps without cutting; secure a finishing knot at pin {3}.",
  ],
  columns: [
    "# Tartibdagi qadamlar: qadam boshlanish tugash rang",
    "# Шаги по порядку: шаг откуда куда цвет",
    "# Ordered steps: step from to color",
  ],
} as const;
export function exportText(
  locale: Locale,
  key: keyof typeof words,
  fields: readonly (string | number)[] = [],
) {
  // Translate the literal before substituting immutable labels/color IDs.
  return scriptText(
    words[key][{ uz: 0, ru: 1, en: 2 }[baseLocale(locale)]],
    locale,
  ).replace(/\{(\d+)\}/g, (_, n) => String(fields[Number(n)]));
}
