import type { Locale, MaterialProfile } from "./core/types";
import { spokenPin } from "./i18n";
import { pinLabel } from "./core/standard-kit";
export function spokenKitPin(locale: Locale, p: MaterialProfile, id: number) {
  if (!p.standardKit) return spokenPin(locale, id);
  const [letter, number] = pinLabel(p, id).split("-");
  return `${letter}, ${spokenPin(locale, Number(number))}`;
}
