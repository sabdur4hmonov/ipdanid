import { test, expect } from "./legacy-test";
import { openMore, revealControl } from "./navigation";
import { unlockKitGuide } from "./kit-access";
import { readFileSync } from "node:fs";
import { validateInstruction } from "../../src/core/validation";
test("mixed Arabic Latin outline is reachable and exports its exact shaped font runs", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page.getByRole("button", { name: "Grid crafts", exact: true }).click();
  await page
    .getByRole("button", { name: "Thread lettering", exact: true })
    .click();
  const studio = page.getByTestId("text-studio");
  await page.getByTestId("lettering-text").fill("A علي");
  await revealControl(studio.getByLabel("Number of pins", { exact: true }));
  await studio.getByLabel("Number of pins", { exact: true }).fill("48");
  await studio.getByLabel("Board width (mm)", { exact: true }).fill("1200");
  await studio.getByLabel("Board height (mm)", { exact: true }).fill("600");
  await studio
    .getByRole("combobox", { name: "Computation resolution", exact: true })
    .selectOption("64");
  await studio
    .getByRole("button", { name: "Prepare text", exact: true })
    .click();
  await expect(page.getByTestId("lettering-review")).toBeVisible();
  await page.getByTestId("lettering-review").check();
  await studio
    .getByRole("button", { name: "Calculate thread guide", exact: true })
    .click();
  await expect(
    studio.getByRole("button", { name: "Save and assemble", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await studio
    .getByRole("button", { name: "Save and assemble", exact: true })
    .click();
  await unlockKitGuide(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project JSON", exact: true })
    .last()
    .click();
  const file = await pending,
    i = JSON.parse(readFileSync((await file.path())!, "utf8")).project
      .instruction;
  await validateInstruction(i);
  expect(i.params.product.version).toBe("thread-lettering/2");
  expect(i.params.product.fontRuns.length).toBeGreaterThan(1);
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  await file.saveAs(info.outputPath("mixed-outline.json"));
});
