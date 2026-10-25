import { test, expect } from "./legacy-test";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  requiredVoiceClips,
  INSTRUCTOR_IDS,
} from "../../src/core/voice-catalog";
import { generate } from "../../src/core/engine";
import { createProfile } from "../../src/core/geometry";
import { progressFor } from "../../src/core/validation";
import { DEFAULT_EDITS } from "../../src/core/types";
// Synthetic media routes must reach Playwright, rather than the offline SW.
test.use({ serviceWorkers: "block" });
function tone(frequency: number) {
  const b = Buffer.alloc(12044);
  b.write("RIFF");
  b.writeUInt32LE(b.length - 8, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(24000, 24);
  b.writeUInt32LE(48000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36);
  b.writeUInt32LE(12000, 40);
  for (let k = 0; k < 6000; k++)
    b.writeInt16LE(
      Math.round(1500 * Math.sin((2 * Math.PI * frequency * k) / 24000)),
      44 + k * 2,
    );
  return b;
}
for (const corrupt of [false, true])
  test(`real WebAudio synthetic recording ${corrupt ? "integrity fallback" : "order cancellation and cached replay"}`, async ({
    page,
    context,
  }, info) => {
    test.setTimeout(120000);
    const audio = INSTRUCTOR_IDS.map((_, j) => tone(220 + j * 220)),
      manifest = {
        version: "recorded-instructors/1",
        profiles: INSTRUCTOR_IDS.map((id, j) => ({
          id,
          name: `Synthetic tone ${j + 1} (test only)`,
          clips: {
            en: Object.fromEntries(
              Object.keys(requiredVoiceClips("en")).map((clip) => [
                clip,
                {
                  path: `/voices/en/${id}/${clip}.wav`,
                  sha256: createHash("sha256").update(audio[j]).digest("hex"),
                  bytes: audio[j].length,
                  durationMs: 250,
                },
              ]),
            ),
          },
        })),
      };
    await page.route("**/voices/manifest.json", (r) =>
      r.fulfill({ json: manifest }),
    );
    await page.route(/\/voices\/en\/instructor-[ab]\/[a-z0-9-]+\.wav$/, (r) => {
      const j = r.request().url().includes("instructor-b") ? 1 : 0,
        b = Buffer.from(audio[j]);
      if (corrupt) b[100] ^= 1;
      return r.fulfill({ contentType: "audio/wav", body: b });
    });
    await page.addInitScript(() => {
      const Native = window.AudioContext;
      (window as any).__recordedEvents = [];
      window.AudioContext = class extends Native {
        createBufferSource() {
          const s = super.createBufferSource(),
            start = s.start.bind(s),
            stop = s.stop.bind(s);
          s.start = ((when: number) => {
            (window as any).__recordedEvents.push({ kind: "start", when });
            start(when);
          }) as any;
          s.stop = (() => {
            (window as any).__recordedEvents.push({ kind: "stop" });
            stop();
          }) as any;
          return s;
        }
      };
      const calls: any[] = [];
      (window as any).__fallbackCalls = calls;
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          getVoices: () => [
            {
              voiceURI: "synthetic-device-en",
              name: "Device fallback test",
              lang: "en-US",
            },
          ],
          addEventListener() {},
          removeEventListener() {},
          cancel() {},
          speak: (u: any) => calls.push(u.text),
        },
        configurable: true,
      });
      (window as any).SpeechSynthesisUtterance = class {
        constructor(public text: string) {}
      };
    });
    const i = await generate({
        pixels: new Uint8Array(32 * 32 * 3).fill(180),
        resolution: 32,
        profile: createProfile("circle", 24),
        mode: "dark",
        lines: 40,
      }),
      file = info.outputPath("synthetic-guide.json");
    writeFileSync(
      file,
      JSON.stringify({
        schema: "iprasm.project/1",
        project: {
          id: crypto.randomUUID(),
          name: "Synthetic playback only",
          instruction: i,
          progress: progressFor(i),
          edits: DEFAULT_EDITS,
        },
      }),
    );
    await page.goto("/");
    await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
    await page
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    await page.locator('input[accept=".json,.txt"]').setInputFiles(file);
    await page.getByLabel("Guide language", { exact: true }).selectOption("en");
    await expect(page.getByTestId("recorded-voice-availability")).toContainText(
      "Installed recorded voices: 2",
    );
    await page
      .getByRole("checkbox", { name: "Voice guidance", exact: true })
      .check();
    if (corrupt) {
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "recording could not be played" }),
      ).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => (window as any).__fallbackCalls.length))
        .toBeGreaterThan(0);
      expect(
        await page.evaluate(
          () =>
            (window as any).__recordedEvents.filter(
              (v: any) => v.kind === "start",
            ).length,
        ),
      ).toBe(0);
    } else {
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as any).__recordedEvents.filter(
                (v: any) => v.kind === "start",
              ).length,
          ),
        )
        .toBeGreaterThan(3);
      const first = await page.evaluate(() =>
        (window as any).__recordedEvents
          .filter((v: any) => v.kind === "start")
          .map((v: any) => v.when),
      );
      for (let k = 1; k < first.length; k++)
        expect(first[k]).toBeGreaterThan(first[k - 1]);
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as any).__recordedEvents.filter(
                (v: any) => v.kind === "stop",
              ).length,
          ),
        )
        .toBeGreaterThan(0);
      await page
        .getByRole("checkbox", { name: "Voice guidance", exact: true })
        .uncheck();
      await page.unrouteAll();
      await context.setOffline(true);
      await page.getByRole("button", { name: "Repeat", exact: true }).click();
      await page
        .getByRole("checkbox", { name: "Voice guidance", exact: true })
        .check();
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (window as any).__recordedEvents.filter(
                (v: any) => v.kind === "start",
              ).length,
          ),
        )
        .toBeGreaterThan(first.length);
      await page
        .getByRole("checkbox", { name: "Voice guidance", exact: true })
        .uncheck();
    }
  });
