import { test, expect } from "@playwright/test";
import { generate } from "../../src/core/engine";
import { createProfile } from "../../src/core/geometry";
import { circleLayout, withCircleLayout } from "../../src/core/pin-layout";
import { DEFAULT_EDITS } from "../../src/core/types";
import { progressFor, validateInstruction } from "../../src/core/validation";
import { readFileSync } from "node:fs";
test("explicit rotated board survives import, presets, reuse and actual Worker generation without progress transfer", async ({
  page,
}) => {
  test.setTimeout(180000);
  const profile = withCircleLayout(
    createProfile("circle", 48),
    circleLayout(0.75),
  );
  const instruction = await generate({
    profile,
    pixels: new Uint8Array(32 * 32 * 3).fill(130),
    resolution: 32,
    lines: 200,
    mode: "dark",
    guarded: true,
  });
  const project = {
    id: crypto.randomUUID(),
    name: "Phase test",
    edits: DEFAULT_EDITS,
    instruction,
    progress: { ...progressFor(instruction), confirmed: 3 },
  };
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({
      name: "phase.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ schema: "iprasm.project/1", project }),
      ),
    });
  await expect(page.getByTestId("board-layout")).toContainText("0.75°");
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .click();
  for (const locale of ["uz", "ru", "en"]) {
    await page.getByLabel("Language").selectOption(locale);
    await expect(page.getByTestId("layout-settings")).toContainText("0.75°");
  }
  await page.locator("summary").filter({ hasText: "Saved settings" }).click();
  await page.getByLabel("Settings name", { exact: true }).fill("Phase test");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Use default pin layout (new board)",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("layout-settings")).toHaveCount(0);
  await page
    .getByLabel("Saved settings", { exact: true })
    .selectOption({ label: "Phase test" });
  await expect(page.getByTestId("layout-settings")).toContainText("0.75°");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click({ timeout: 120000 });
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const actual = JSON.parse(
    readFileSync((await (await event).path())!, "utf8"),
  ).project;
  await validateInstruction(actual.instruction);
  expect(actual.instruction.profile).toEqual(profile);
  expect(actual.instruction.sequenceHash).not.toBe(instruction.sequenceHash);
  expect(actual.progress.confirmed).toBe(0);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("iprasm.projects.v1")!),
  );
  expect(
    saved.find(
      (p: typeof project) =>
        p.instruction.sequenceHash === instruction.sequenceHash,
    ).progress.confirmed,
  ).toBe(3);
});
