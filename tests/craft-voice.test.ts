import { it, expect, vi } from "vitest";
import {
  craftNumber,
  createCraftNarrator,
  type CraftVoiceDriver,
} from "../src/craft-voice";
import type { GuideVoice } from "../src/guide-speech";
const voice = (lang: string, local = true): GuideVoice => ({
  id: lang,
  name: lang,
  lang,
  native: false,
  browser: { lang, localService: local } as SpeechSynthesisVoice,
});
it("speaks actual bounded integer/decimal measurements in all locales including a thousand leaves", () => {
  expect(craftNumber("uz", 1000)).toContain("ming");
  expect(craftNumber("uz-Cyrl", 17)).toContain("o‘n yetti");
  expect(craftNumber("en", 1.25)).toBe("one point two five");
  expect(craftNumber("ru", 105)).toBe("сто пять");
  for (const invalid of [-1, 1000000, NaN, Infinity])
    expect(() => craftNumber("en", invalid)).toThrow("number");
});
it("uses a matching local device voice and prevents a stopped or superseded async voice lookup from speaking", async () => {
  let resolve!: (v: GuideVoice[]) => void;
  const driver: CraftVoiceDriver = {
      voices: vi.fn(() => new Promise<GuideVoice[]>((r) => (resolve = r))),
      stop: vi.fn(),
      queue: vi.fn(async () => {}),
    },
    narrator = createCraftNarrator(driver),
    old = narrator.speak("old step", "en");
  narrator.stop();
  resolve([voice("en-US")]);
  expect(await old).toBe(false);
  expect(driver.queue).not.toHaveBeenCalled();
  driver.voices = vi.fn(async () => [
    voice("uz-UZ"),
    voice("ru-RU"),
    voice("en-US"),
  ]);
  expect(await narrator.speak("B, o‘n yetti", "uz-Cyrl")).toBe(true);
  expect(driver.queue).toHaveBeenLastCalledWith(
    "B, o‘n yetti",
    expect.objectContaining({ id: "uz-UZ" }),
    "uz-UZ",
  );
});
it("refuses remote-only or unavailable voices, bounds text and fences a late native queue response", async () => {
  const driver: CraftVoiceDriver = {
      voices: async () => [voice("en-US", false)],
      stop: vi.fn(),
      queue: vi.fn(async () => {}),
    },
    narrator = createCraftNarrator(driver);
  expect(await narrator.speak("step", "en")).toBe(false);
  expect(driver.queue).not.toHaveBeenCalled();
  await expect(narrator.speak("x".repeat(2001), "en")).rejects.toThrow("text");
  let release!: () => void;
  driver.voices = async () => [
    { id: "offline-native", name: "local", lang: "ru-RU", native: true },
  ];
  driver.queue = () => new Promise<void>((resolve) => (release = resolve));
  const pending = narrator.speak("Шаг один", "ru");
  await Promise.resolve();
  await Promise.resolve();
  narrator.stop();
  release();
  expect(await pending).toBe(false);
});
