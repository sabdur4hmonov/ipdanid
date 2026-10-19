import type { Page } from "@playwright/test";
export async function mockCraftVoices(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__craftSpoken = [];
    w.__craftStops = 0;
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        addEventListener: () => {},
        removeEventListener: () => {},
        getVoices: () =>
          ["uz-UZ", "ru-RU", "en-US"].map((lang) => ({
            voiceURI: lang,
            name: lang,
            lang,
            localService: true,
            default: false,
          })),
        cancel: () => w.__craftStops++,
        speak: (u: any) =>
          w.__craftSpoken.push({
            text: u.text,
            lang: u.lang,
            voice: u.voice?.voiceURI,
          }),
      },
    });
    w.SpeechSynthesisUtterance = class {
      constructor(public text: string) {}
    };
  });
}
