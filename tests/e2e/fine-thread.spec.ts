import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
test("real fine-thread guide retains exact material, progress and reusable preset", async ({
  page,
  context,
}, info) => {
  const reference = JSON.parse(
    readFileSync("output/thread-fineness/candidate.json", "utf8"),
  ).project.instruction;
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .locator('input[type=file][accept=".json,.txt"]')
    .setInputFiles("output/thread-fineness/candidate.json");
  await expect(page.getByTestId("player-hash")).toHaveText(
    reference.sequenceHash,
  );
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .click();
  await page.getByText("More", { exact: true }).click();
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await expect(
    page.getByLabel("Thread thickness (mm)", { exact: true }),
  ).toHaveValue("0.05");
  await expect(
    page.getByLabel("Thread thickness (mm)", { exact: true }),
  ).toHaveAttribute("min", "0.05");
  await page
    .getByTestId("advanced-generation")
    .locator("summary")
    .first()
    .click();
  await page.getByText("Saved settings", { exact: true }).first().click();
  await page
    .getByLabel("Settings name", { exact: true })
    .fill("Actual 0.05 mm thread");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page.reload();
  await page.getByText("More", { exact: true }).click();
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page
    .getByTestId("advanced-generation")
    .locator("summary")
    .first()
    .click();
  await page.getByText("Saved settings", { exact: true }).first().click();
  await page
    .getByLabel("Saved settings", { exact: true })
    .selectOption({ label: "Actual 0.05 mm thread" });
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await expect(
    page.getByLabel("Thread thickness (mm)", { exact: true }),
  ).toHaveValue("0.05");
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("player-hash")).toHaveText(
    reference.sequenceHash,
  );
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Project JSON", exact: true })
      .first()
      .click(),
  ]);
  const file = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(file.project.instruction.profile.threadMm).toBe(0.05);
  expect(file.project.instruction.sequenceHash).toBe(reference.sequenceHash);
  expect(file.project.progress.confirmed).toBe(1);
  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "PDF guide", exact: true })
      .first()
      .click(),
  ]);
  writeFileSync(
    `output/thread-fineness/offline-${info.project.name}-guide.pdf`,
    readFileSync((await pdf.path())!),
  );
  writeFileSync(
    `output/thread-fineness/offline-${info.project.name}-guide.json`,
    JSON.stringify(file),
  );
});
