import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("portrait target, manual regions, low stock, cancellation and immutable stage continuation", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  const raw = await page
    .getByLabel("Edited photo", { exact: true })
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await expect(page.getByLabel("Maximum lines", { exact: true })).toHaveValue(
    "20000",
  );
  await page.getByLabel("Face region Top", { exact: true }).fill("0.2");
  const processed = await page
    .getByLabel("Exact generation target", { exact: true })
    .evaluate((c: HTMLCanvasElement) => c.toDataURL());
  expect(processed).not.toBe(raw);
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await page.getByLabel("Number of pins", { exact: true }).fill("60");
  await page.getByLabel("Available thread (m)", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Calculate thread path", exact: true }),
  ).toBeEnabled();
  // A small CPU stage for the browser regression; exact personal-photo evidence is a separate local script.
  await page.getByLabel("Maximum lines", { exact: true }).fill("400");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  await expect(page.getByTestId("supply")).toContainText(
    "Additional thread needed",
  );
  const oldHash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  // If refinement plateaued already, there is correctly no continuation CTA.
  const continueButton = page.getByRole("button", {
    name: "Continue path refinement",
    exact: true,
  });
  if (await continueButton.isVisible()) {
    await continueButton.click();
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeHidden({ timeout: 120000 });
    await expect(page.locator(".variant-tabs button")).toHaveCount(2);
    await page.locator(".variant-tabs button").first().click();
    await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
      "data-sequence-hash",
      oldHash!,
    );
  }
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const exported = JSON.parse(readFileSync((await (await d).path())!, "utf8"))
    .project.instruction;
  expect(exported.params.portrait.face.top).toBe(0.2);
  expect(exported.params.stockPolicy).toBe("estimate");
  expect(exported.metrics.stockShortfallMeters).toBeGreaterThan(0);
  expect(
    exported.metrics.estimatedMeters - exported.profile.stockMeters,
  ).toBeCloseTo(exported.metrics.stockShortfallMeters, 7);
  expect(exported.sequenceHash).toBe(oldHash);
});
