import { unlockIfNeeded } from "./kit-access";
import { openMore } from "./navigation";
import { test, expect } from "./legacy-test";
import { readFileSync } from "node:fs";

test("public photo-first UI explains optional light backgrounds in all three languages", async ({
  page,
}) => {
  await page.goto("/");
  for (const [locale, guidance] of [
    ["uz", "Mavjud suratlar"],
    ["ru", "существующие фотографии"],
    ["en", "Existing photographs"],
  ]) {
    await page.locator('[data-testid="locale-picker"]:visible').selectOption(locale);
    await expect(page.getByTestId("photo-actions").locator("button:visible")).toHaveCount(2);
    await expect(page.getByTestId("photo-guidance")).toContainText(guidance);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("committed original illustration generates a real immutable guide with offline progress and export", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await page.getByText("More", { exact: true }).click();
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await expect(page.getByLabel("Edited photo", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  const canvas = page.locator(".result-card canvas[data-sequence-hash]");
  await expect(canvas).toBeVisible({ timeout: 90000 });
  const hash = await canvas.getAttribute("data-sequence-hash");
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  await expect(page.getByTestId("player-hash")).toHaveText(hash!);
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("library-save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("player-hash")).toHaveText(hash!);
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Project JSON", exact: true })
      .first()
      .click(),
  ]);
  const backup = JSON.parse(readFileSync((await download.path())!, "utf8"));
  const { validateInstruction } = await import("../../src/core/validation");
  await validateInstruction(backup.project.instruction);
  expect(backup.project.instruction.sequenceHash).toBe(hash);
  expect(backup.project.instruction.metrics.lines).toBeGreaterThan(1);
  expect(backup.project.progress.confirmed).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("player-hash")).toHaveText(hash!);
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
});
