import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { validateInstruction } from "../../src/core/validation";
test("continuing an older variant after changing the photo uses its recorded source/resolution and keeps old progress", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await page.getByLabel("Face region Top", { exact: true }).fill("0.2");
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await page.getByLabel("Number of pins", { exact: true }).fill("60");
  await page.getByLabel("Maximum lines", { exact: true }).fill("400");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  const oldHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("confirmed-step")).toContainText("2/");
  const old = await page.evaluate(
    (hash) =>
      JSON.parse(localStorage.getItem("iprasm.projects.v1")!).find(
        (p: any) => p.instruction.sequenceHash === hash,
      ),
    oldHash,
  );
  await page
    .locator("nav")
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("tests/fixtures/orientation-6.jpg");
  await page
    .getByLabel("Computation resolution", { exact: true })
    .selectOption("192");
  await page
    .getByRole("button", { name: "Continue path refinement", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeHidden({ timeout: 120000 });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".variant-tabs button")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const actual = JSON.parse(
    readFileSync((await (await event).path())!, "utf8"),
  ).project;
  await validateInstruction(actual.instruction);
  expect(actual.instruction.imageHash).toBe(old.instruction.imageHash);
  expect(actual.instruction.profile).toEqual(old.instruction.profile);
  expect(actual.instruction.params.portrait).toEqual(
    old.instruction.params.portrait,
  );
  expect(actual.instruction.params.resolution).toBe(160);
  expect(actual.instruction.params.parentSequenceHash).toBe(oldHash);
  expect(actual.instruction.sequenceHash).not.toBe(oldHash);
  expect(actual.progress.confirmed).toBe(0);
  const preserved = await page.evaluate(
    (id) =>
      JSON.parse(localStorage.getItem("iprasm.projects.v1")!).find(
        (p: any) => p.id === id,
      ),
    old.id,
  );
  expect(preserved).toEqual(old);
});
