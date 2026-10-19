import {
  guideVoices,
  cancelGuideSpeech,
  nativeGuideSpeech,
  type GuideVoice,
} from "./guide-speech";
import { baseLocale } from "./uzbek-script";
import { numberVoiceClips, requiredVoiceClips } from "./core/voice-catalog";
import type { Locale } from "./core/types";
export function craftNumber(locale: Locale, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 999999)
    throw Error("craft-voice/number");
  const lang = baseLocale(locale),
    clips = requiredVoiceClips(lang),
    [whole, fraction] = String(Math.round(value * 1e6) / 1e6).split("."),
    words = (n: number) =>
      numberVoiceClips(lang, n)
        .map((id) => clips[id])
        .join(" ");
  return (
    words(Number(whole)) +
    (fraction
      ? " " +
        (lang === "uz" ? "butun" : lang === "ru" ? "целых" : "point") +
        " " +
        [...fraction].map((n) => words(Number(n))).join(" ")
      : "")
  );
}
export type CraftVoiceDriver = {
  voices: () => Promise<GuideVoice[]>;
  stop: () => void;
  queue: (text: string, voice: GuideVoice, language: string) => Promise<void>;
};
const defaultDriver: CraftVoiceDriver = {
  voices: guideVoices,
  stop: cancelGuideSpeech,
  queue: async (text, voice, language) => {
    if (voice.native) {
      if (!(await nativeGuideSpeech(text, voice, language, 0.9)).queued)
        throw Error("craft-voice/unavailable");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.voice = voice.browser!;
    window.speechSynthesis.speak(utterance);
  },
};
export function createCraftNarrator(driver: CraftVoiceDriver = defaultDriver) {
  let epoch = 0;
  const stop = () => {
    epoch++;
    driver.stop();
  };
  return {
    stop,
    speak: async (text: string, locale: Locale) => {
      if (typeof text !== "string" || !text.trim() || text.length > 2000)
        throw Error("craft-voice/text");
      stop();
      const request = epoch,
        lang = baseLocale(locale),
        language = lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-US",
        voices = await driver.voices();
      if (request !== epoch) return false;
      const voice = voices.find(
        (v) =>
          v.lang.toLowerCase().split(/[-_]/)[0] === lang &&
          (v.native || v.browser?.localService === true),
      );
      if (!voice) return false;
      await driver.queue(text, voice, language);
      return request === epoch;
    },
  };
}
