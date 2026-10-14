import { unlockIfNeeded } from "./kit-access";
import { openMore, revealControl } from "./navigation";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { validateInstruction, progressFor } from "../../src/core/validation";
test("global Worker bootstrap preserves comparison, cancellation, legal exports and separate confirmed progress", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await revealControl(page.getByLabel("Prioritize portrait", { exact: true }));
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await revealControl(page.getByLabel("Portrait optimization", { exact: true }));
  await page.getByLabel("Portrait optimization", { exact: true }).selectOption("global");
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await revealControl(page.getByLabel("Number of pins", { exact: true }));
  await page.getByLabel("Number of pins", { exact: true }).fill("48");
  await revealControl(page.getByLabel("Thread thickness (mm)", { exact: true }));
  await page.getByLabel("Thread thickness (mm)", { exact: true }).fill("0.1");
  await revealControl(page.getByLabel("Available thread (m)", { exact: true }));
  await page.getByLabel("Available thread (m)", { exact: true }).fill("1");
  await revealControl(page.getByLabel("Maximum lines", { exact: true }));
  await page.getByLabel("Maximum lines", { exact: true }).fill("1200");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator(".variant-tabs button")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  await expect(page.locator(".variant-tabs button")).toHaveCount(2);
  const globalHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  await page.locator(".variant-tabs button").first().click();
  const baselineHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  expect(globalHash).not.toBe(baselineHash);
  await page.locator(".variant-tabs button").last().click();
  await page.screenshot({
    path: `output/fidelity/global-ui-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await unlockIfNeeded(page);
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const project = JSON.parse(
    readFileSync((await (await d).path())!, "utf8"),
  ).project;
  const i = await validateInstruction(project.instruction);
  expect(i.algorithm).toBe("density-optical/5");
  expect(i.params.parentSequenceHash).toBe(baselineHash);
  expect(i.sequenceHash).toBe(globalHash);
  expect(project.progress.confirmed).toBe(0);
  expect(progressFor(i).confirmed).toBe(0);
  expect(i.profile.threadMm).toBe(0.1);
  expect(i.metrics.stockShortfallMeters).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Confirm completed through this step" })
    .click();
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    globalHash!,
  );
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.context().setOffline(true);
  const pdf = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "PDF guide", exact: true })
    .first()
    .click();
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/);
  await page.context().setOffline(false);
});
