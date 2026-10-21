import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { audioFixture } from "./assembly-audio-fixture";
import { unlockKitGuide } from "./kit-access";
import { assemblyAudioText } from "../../src/assembly-audio-i18n";
import { flatten } from "../../src/core/engine";
import { pinLabel } from "../../src/core/standard-kit";
test.use({ trace: "off" });
test("native opt-in owns offline background steps and lock-screen pause without confirming; restart restores newer exact cursor with mode off", async ({
  page,
  context,
}, info) => {
  const instruction = await audioFixture(page);
  await page.goto("/");
  await unlockKitGuide(page);
  const out = newEvidenceRoot(
    "output/current-assembly-audio/" + info.project.name,
  );
  mkdirSync(out, { recursive: true });
  const bg = page
    .getByTestId("assembly-background-audio")
    .getByRole("checkbox");
  await expect(bg).not.toBeChecked();
  await expect(bg).toBeDisabled();
  await page
    .getByRole("checkbox", { name: "Voice guidance", exact: true })
    .check();
  await expect(bg).toBeEnabled();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as any).__nativeAudioCalls.filter(
          (c: any) => c.method === "start",
        ).length,
    ),
  ).toBe(0);
  await page.evaluate(() => (window as any).__setVisible(false));
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => (window as any).__setVisible(true));
  await bg.check();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeEnabled();
  const program = await page.evaluate(() => (window as any).__audioProgram);
  expect(program).toMatchObject({
    version: "assembly-audio/1",
    projectId: "native-audio-test",
    sequenceHash: instruction.sequenceHash,
    current: 1,
    advance: true,
    language: "en",
  });
  expect(program.steps).toHaveLength(80);
  expect(program.steps[0].route).toMatch(/[A-D]-\d+ → [A-D]-\d+/);
  await context.setOffline(true);
  await page.evaluate(() => {
    (window as any).__setVisible(false);
    (window as any).__nativeAudioStep(9, true);
  });
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
  await page.evaluate(() => (window as any).__setVisible(true));
  const flat = flatten(instruction),
    route = (n: number) =>
      `${pinLabel(instruction.profile, flat[n - 1].from)} → ${pinLabel(instruction.profile, flat[n - 1].to)}`;
  await expect(page.getByTestId("assembly-current-route")).toHaveText(route(9));
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await expect(bg).toBeChecked();
  await page.evaluate(() => (window as any).__nativeAudioStep(10, false));
  await expect(page.getByTestId("assembly-current-route")).toHaveText(
    route(10),
  );
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
  await page.screenshot({
    path: out + "/background-paused-en.png",
    fullPage: true,
  });
  await page
    .getByTestId("assembly-background-audio")
    .screenshot({ path: out + "/background-control-en.png" });
  await page.evaluate(() => {
    (window as any).__setVisible(false);
    (window as any).__nativeAudioStep(17, false);
  });
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByTestId("assembly-current-route")).toHaveText(
    route(17),
  );
  await expect(bg).not.toBeChecked();
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
  expect(
    await page.evaluate(
      () =>
        (window as any).__nativeAudioCalls.filter(
          (c: any) => c.method === "start",
        ).length,
    ),
  ).toBe(0);
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    await page
      .getByLabel("Language", { exact: true })
      .filter({ visible: true })
      .first()
      .selectOption(locale);
    await expect(bg).toHaveAccessibleName(assemblyAudioText(locale, "enable"));
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (locale === "uz-Cyrl") {
      await page.screenshot({
        path: out + "/restart-cyrillic.png",
        fullPage: true,
      });
      await page
        .getByTestId("assembly-background-audio")
        .screenshot({ path: out + "/background-control-cyrillic.png" });
    }
  }
  await page.getByTestId("assembly-confirm").click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("17/80");
  writeFileSync(
    out + "/result.json",
    JSON.stringify(
      {
        nativeMock: true,
        offlineBackground: true,
        exactCursor17: true,
        manualConfirmationOnly: true,
        defaultOffAfterRestart: true,
        locales: 4,
      },
      null,
      2,
    ),
  );
});
test("late native start after navigation cannot resume or publish an old project", async ({
  page,
}, info) => {
  await audioFixture(page);
  await page.goto("/");
  await unlockKitGuide(page);
  await page
    .getByRole("checkbox", { name: "Voice guidance", exact: true })
    .check();
  const bg = page
    .getByTestId("assembly-background-audio")
    .getByRole("checkbox");
  await expect(bg).toBeEnabled();
  await bg.check();
  await page.evaluate(() => ((window as any).__holdAudio = true));
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => typeof (window as any).__releaseAudio))
    .toBe("function");
  await page
    .getByRole("navigation", { name: "Main", exact: true })
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page.evaluate(() => (window as any).__releaseAudio());
  await expect(page.getByTestId("assembly-focus")).not.toBeVisible();
  expect(
    await page.evaluate(() => (window as any).__audioState?.playing ?? false),
  ).toBe(false);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem("CapacitorStorage.iprasm.projects.v1")!,
        )[0].progress.confirmed,
    ),
  ).toBe(0);
  const calls = await page.evaluate(() => (window as any).__nativeAudioCalls);
  expect(
    calls.findLast((c: any) => c.method === "stop").requestId,
  ).toBeGreaterThan(calls.find((c: any) => c.method === "start").requestId);
  const out = newEvidenceRoot(
    "output/current-assembly-audio/" + info.project.name,
  );
  mkdirSync(out, { recursive: true });
  await page.screenshot({
    path: out + "/retired-start-library.png",
    fullPage: true,
  });
});

test("voice, language and pace changes retire native playback and require a fresh explicit opt-in", async ({
  page,
}) => {
  await audioFixture(page);
  await page.goto("/");
  await unlockKitGuide(page);
  const voice = page.getByRole("checkbox", {
      name: "Voice guidance",
      exact: true,
    }),
    bg = page.getByTestId("assembly-background-audio").getByRole("checkbox");
  await page.evaluate(() => ((window as any).__holdForegroundSpeech = true));
  await voice.check();
  await expect
    .poll(() =>
      page.evaluate(() => typeof (window as any).__releaseForegroundSpeech),
    )
    .toBe("function");
  await expect(bg).toBeEnabled();
  const play = async () => {
    await bg.check();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeEnabled();
  };
  await play();
  await page.evaluate(() => {
    (window as any).__holdForegroundSpeech = false;
    (window as any).__releaseForegroundSpeech();
  });
  await expect(voice).toBeChecked();
  await expect(bg).toBeChecked();
  await page.getByLabel("Seconds per step", { exact: true }).fill("12");
  await expect(bg).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__audioState.playing)).toBe(
    false,
  );
  await play();
  await page.getByLabel("Guide language", { exact: true }).selectOption("uz");
  await expect(bg).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  await play();
  expect(
    await page.evaluate(() => (window as any).__audioProgram.language),
  ).toBe("uz");
  await voice.uncheck();
  await expect(bg).not.toBeChecked();
  await expect(bg).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__audioState.playing)).toBe(
    false,
  );
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
  await voice.check();
  await play();
  const starts = await page.evaluate(
    () =>
      (window as any).__nativeAudioCalls.filter(
        (c: any) => c.method === "start",
      ).length,
  );
  await page.evaluate(() => {
    const w = window as any;
    w.__audioState.error = "audio-unavailable";
    w.__nativeAudioStep(w.__audioState.current, false);
  });
  await expect(bg).not.toBeChecked();
  await expect(
    page.getByText(assemblyAudioText("en", "failed"), { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as any).__nativeAudioCalls.filter(
          (c: any) => c.method === "start",
        ).length,
    ),
  ).toBe(starts);
});
