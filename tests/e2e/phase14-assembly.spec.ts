import { newEvidenceRoot } from "../helpers/evidence-paths";
import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
  pinLabel,
} from "../../src/core/standard-kit";
import { progressFor } from "../../src/core/validation";
import { DEFAULT_EDITS } from "../../src/core/types";
import { flatten } from "../../src/core/engine";
import { unlockKitGuide } from "./kit-access";
test("offline assembly resumes exact position after restart; one-hand controls, screen lease and three TTS languages", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const i = await generateClassicLeastSquares({
    pixels: Uint8Array.from({ length: 64 * 64 * 3 }, (_, k) => 80 + (k % 150)),
    profile: leastSquaresProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
      true,
    ),
    resolution: 64,
    lines: 300,
    mode: "dark",
    accessPolicy: "kit-build/1",
  });
  const project = {
    id: "assembly-14",
    name: "Assembly14",
    instruction: i,
    progress: progressFor(i),
    edits: { ...DEFAULT_EDITS },
  };
  await page.addInitScript((project) => {
    if (!localStorage.getItem("iprasm.projects.v1")) {
      localStorage.setItem("iprasm.projects.v1", JSON.stringify([project]));
      localStorage.setItem(
        "iprasm.assembly-session.v1",
        JSON.stringify({
          version: 1,
          projectId: project.id,
          sequenceHash: project.instruction.sequenceHash,
          current: 17,
          pace: 8,
        }),
      );
      localStorage.setItem("iprasm.locale", "en");
      localStorage.setItem("iprasm.guide.locale", "en");
    }
    const w = window as any;
    w.__awake = { requests: 0, releases: 0, live: 0 };
    w.__spoken = [];
    w.__visible = true;
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (w.__visible ? "visible" : "hidden"),
    });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async () => {
          w.__awake.requests++;
          w.__awake.live++;
          let released = false;
          return {
            release: async () => {
              if (!released) {
                released = true;
                w.__awake.releases++;
                w.__awake.live--;
              }
            },
          };
        },
      },
    });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () =>
          ["uz", "ru", "en"].map((lang) => ({
            name: lang,
            voiceURI: lang,
            lang: lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-US",
            localService: true,
            default: lang === "en",
          })),
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => {},
        speak: (u: any) => w.__spoken.push({ text: u.text, lang: u.lang }),
      },
    });
    w.SpeechSynthesisUtterance = class {
      constructor(public text: string) {}
    };
  }, project);
  await page.goto("/");
  await unlockKitGuide(page);
  await expect(page.getByTestId("assembly-focus")).toBeVisible();
  const route = (step: number) =>
    pinLabel(i.profile, flatten(i)[step - 1].from) +
    " → " +
    pinLabel(i.profile, flatten(i)[step - 1].to);
  await expect(page.getByTestId("assembly-current-route")).toHaveText(
    route(17),
  );
  await expect(page.getByTestId("assembly-awake")).toContainText(
    "Screen stays on",
  );
  expect(
    await page
      .getByTestId("assembly-confirm")
      .evaluate((e) => e.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(56);
  if (info.project.name === "mobile-browser")
    await expect(page.getByTestId("assembly-confirm")).toBeInViewport({
      ratio: 1,
    });
  await page.getByTestId("assembly-next").click();
  await expect(page.getByTestId("assembly-current-route")).toHaveText(
    route(18),
  );
  await page.getByTestId("assembly-previous").click();
  await expect(page.getByTestId("assembly-current-route")).toHaveText(
    route(17),
  );
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/300");
  await page.getByTestId("assembly-confirm").click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("17/300");
  await expect(page.getByTestId("assembly-save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await expect(page.getByTestId("assembly-percent")).toContainText("5%");
  const voice = page.getByRole("checkbox", {
    name: "Voice guidance",
    exact: true,
  });
  await voice.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await voice.check();
  for (const lang of ["uz", "ru", "en"]) {
    await page
      .getByLabel("Guide language", { exact: true })
      .evaluate((e) => e.scrollIntoView({ block: "center" }));
    await page.getByLabel("Guide language", { exact: true }).selectOption(lang);
    await expect
      .poll(() =>
        page.evaluate(
          (lang) =>
            (window as any).__spoken.some(
              (s: any) => s.lang.startsWith(lang) && s.text.includes(", "),
            ),
          lang,
        ),
      )
      .toBe(true);
  }
  expect(
    await page.evaluate(() =>
      (window as any).__spoken.some((s: any) => /undefined/.test(s.text)),
    ),
  ).toBe(false);
  await page.evaluate(() => {
    (window as any).__visible = false;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__awake.live))
    .toBe(0);
  await page.evaluate(() => {
    (window as any).__visible = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__awake.live))
    .toBe(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("iprasm.assembly-session.v1")!)
            .current,
      ),
    )
    .toBe(18);
  await page.getByTestId("assembly-rest").click();
  await expect(page.getByTestId("assembly-rest-status")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await expect(page.getByTestId("assembly-rest-status")).toContainText("18");
  await expect
    .poll(() => page.evaluate(() => (window as any).__awake.live))
    .toBe(0);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("iprasm.assembly-session.v1")!)
            .resting,
      ),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("assembly-current-route")).toHaveText(
    route(18),
  );
  await expect(page.getByTestId("confirmed-step")).toHaveText("17/300");
  await expect(page.getByTestId("assembly-rest-status")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await expect(page.getByTestId("assembly-rest-status")).toContainText(
    route(18),
  );
  await page.getByTestId("assembly-rest").click();
  await expect(page.getByTestId("assembly-rest-status")).toHaveCount(0);
  await page.getByTestId("assembly-confirm").click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("18/300");
  await expect(page.getByTestId("assembly-save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  const out = newEvidenceRoot("output/current-product/assembly/") + info.project.name;
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: out + "/offline-resumed.png", fullPage: true });
  await context.setOffline(false);
});
