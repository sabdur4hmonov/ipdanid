import { numberVoiceClips, requiredVoiceClips } from "./core/voice-catalog";
import { baseLocale } from "./uzbek-script";
import type { Locale, MaterialProfile } from "./core/types";
import { spokenPin } from "./i18n";
import { pinLabel } from "./core/standard-kit";
export function spokenKitPin(locale: Locale, p: MaterialProfile, id: number) {
  if (!p.standardKit) return spokenPin(locale, id);
  const [letter, number] = pinLabel(p, id).split("-");
  const lang = baseLocale(locale),
    clips = requiredVoiceClips(lang);
  return `${letter}, ${numberVoiceClips(lang, Number(number))
    .map((id) => clips[id])
    .join(" ")}`;
}
