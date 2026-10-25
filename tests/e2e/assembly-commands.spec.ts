import { test, expect, type Page } from "@playwright/test";
import { audioFixture } from "./assembly-audio-fixture";
import { unlockKitGuide } from "./kit-access";
test.use({ trace: "off" });
async function open(page: Page, playBeforeExpert = false) {
  const i = await audioFixture(page);
  await page.goto("/");
  await unlockKitGuide(page);
  await expect(page.getByTestId("assembly-commands")).toHaveCount(0);
  if(playBeforeExpert){
    await page.getByRole("checkbox",{name:"Voice guidance",exact:true}).check();
    await page.getByTestId("assembly-background-audio").getByRole("checkbox").check();
    await page.getByRole("button",{name:"Play",exact:true}).click();
    await expect(page.getByRole("button",{name:"Pause",exact:true})).toBeVisible();
  }
  await page.locator(".more-menu > summary").click();
  await page
    .locator(".more-menu")
    .getByRole("button", { name: "Expert mode", exact: true })
    .click();
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  await expect(page.locator(".more-menu")).not.toHaveAttribute("open", "");
  if(playBeforeExpert){
    await expect(page.getByRole("button",{name:"Play",exact:true})).toBeVisible();
    expect(await page.evaluate(()=>(window as any).__nativeAudioCalls.some((c:any)=>c.method==="stop"))).toBe(true);
  }
  const panel = page.getByTestId("assembly-commands");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("checkbox")).not.toBeChecked();
  expect(await page.evaluate(() => (window as any).__commandCalls.length)).toBe(
    0,
  );
  await panel.getByRole("checkbox").check();
  return panel;
}
async function listen(page: Page) {
  await page.getByRole("button", { name: "Listen once", exact: true }).click();
  await expect(page.getByTestId("command-state")).toHaveAttribute(
    "data-state",
    "preparing",
  );
  await page.evaluate(() => (window as any).__commandReady());
  await expect(page.getByTestId("command-state")).toHaveAttribute(
    "data-state",
    "listening",
  );
}
test("expert command bridge is opt-in, local and bounded; noise and forbidden confirmation cannot confirm work", async ({
  page,
}) => {
  const panel = await open(page,true);
  for (const alternatives of [
    [{ text: "next", confidence: 0.4 }],
    [
      { text: "next", confidence: 0.98 },
      { text: "previous", confidence: 0.8 },
    ],
    [{ text: "confirm completed work", confidence: 1 }],
  ]) {
    await listen(page);
    await page.evaluate(
      (v) => (window as any).__commandResult(v),
      alternatives,
    );
    await expect(page.getByTestId("command-state")).toHaveAttribute(
      "data-state",
      "manual",
    );
    await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
  }
  const before = await page.getByTestId("assembly-current-route").innerText();
  await listen(page);
  await page.evaluate(() =>
    (window as any).__commandResult([{ text: "next", confidence: 0.99 }]),
  );
  await expect(page.getByTestId("assembly-current-route")).not.toHaveText(
    before,
  );
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/80");
  await listen(page);
  await page.evaluate(() =>
    (window as any).__commandResult([{ text: "previous", confidence: 0.99 }]),
  );
  await expect(page.getByTestId("assembly-current-route")).toHaveText(before);
  await expect(page.getByTestId("command-heard")).toContainText("Previous step");
  await panel.screenshot({path:test.info().outputPath("commands.png")});
  const calls = await page.evaluate(() => (window as any).__commandCalls);
  expect(calls.filter((c: any) => c.method === "listen")).toHaveLength(5);
  expect(
    calls
      .filter((c: any) => c.method === "listen")
      .every(
        (c: any) =>
          c.language === "en" && !("projectId" in c) && !("sequenceHash" in c),
      ),
  ).toBe(true);
  await panel.getByRole("checkbox").uncheck();
  await expect(page.getByTestId("command-state")).toHaveCount(0);
});
test("late permission, ready and result are cancelled by manual confirmation, cursor and visibility changes", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => ((window as any).__holdCommandPermission = true));
  await page.getByRole("button", { name: "Listen once", exact: true }).click();
  await expect(page.getByTestId("command-state")).toHaveAttribute(
    "data-state",
    "permission",
  );
  await page.getByRole("button", { name: "Confirm step", exact: true }).click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("1/80");
  await page.evaluate(() => {
    (window as any).__releaseCommandPermission();
    (window as any).__holdCommandPermission = false;
  });
  expect(
    await page.evaluate(
      () =>
        (window as any).__commandCalls.filter((c: any) => c.method === "listen")
          .length,
    ),
  ).toBe(0);
  await listen(page);
  const route = await page.getByTestId("assembly-current-route").innerText();
  await page.getByRole("button", { name: "Confirm step", exact: true }).click();
  await expect(page.getByTestId("assembly-current-route")).not.toHaveText(
    route,
  );
  const after = await page.getByTestId("assembly-current-route").innerText();
  await page.evaluate(() => {
    (window as any).__commandReady();
    (window as any).__commandResult([{ text: "next", confidence: 1 }]);
  });
  await expect(page.getByTestId("assembly-current-route")).toHaveText(after);
  await expect(page.getByTestId("confirmed-step")).toHaveText("2/80");
  await listen(page);
  await page.evaluate(() => (window as any).__setVisible(false));
  await expect(page.getByTestId("command-state")).toHaveAttribute(
    "data-state",
    "off",
  );
  await page.evaluate(() => {
    (window as any).__setVisible(true);
    (window as any).__commandResult([{ text: "next", confidence: 1 }]);
  });
  await expect(page.getByTestId("assembly-current-route")).toHaveText(after);
  await page.reload();
  await expect(page.getByTestId("assembly-commands")).toHaveCount(0);
  await expect(page.getByTestId("confirmed-step")).toHaveText("2/80");
});
test("denied microphone and unavailable on-device model preserve manual buttons", async ({
  page,
}) => {
  await open(page);
  await page.evaluate(() => ((window as any).__commandGranted = false));
  await page.getByRole("button", { name: "Listen once", exact: true }).click();
  await expect(page.getByTestId("command-state")).toHaveAttribute(
    "data-state",
    "manual",
  );
  expect(
    await page.evaluate(
      () =>
        (window as any).__commandCalls.filter((c: any) => c.method === "listen")
          .length,
    ),
  ).toBe(0);
  await page.evaluate(() => {
    (window as any).__commandGranted = true;
    (window as any).__commandSupported = false;
  });
  await page.getByRole("button", { name: "Listen once", exact: true }).click();
  await expect(page.getByTestId("command-state")).toHaveAttribute(
    "data-state",
    "manual",
  );
  expect(
    await page.evaluate(
      () =>
        (window as any).__commandCalls.filter(
          (c: any) => c.method === "permission",
        ).length,
    ),
  ).toBe(1);
  await page.getByRole("button", { name: "Confirm step", exact: true }).click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("1/80");
});
