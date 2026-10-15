import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { unlockKitGuide } from "./kit-access";
import { validateInstruction } from "../../src/core/validation";
test.use({ serviceWorkers: "block" });
test("default standard kit prepares reviewed real pixels, runs classic Worker and unlocks exact saved guide", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await page.route("**/vendor/portrait-segmentation/**", (r) => r.abort());
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  const studio = page.getByTestId("standard-kit-studio");
  await expect(studio).toBeVisible();
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const x = c.getContext("2d")!;
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, 160, 160);
    x.fillStyle = "#999999";
    x.beginPath();
    x.ellipse(80, 64, 30, 43, 0, 0, 7);
    x.fill();
    x.fillStyle = "#222222";
    x.fillRect(64, 53, 8, 4);
    x.fillRect(89, 53, 8, 4);
    x.fillRect(77, 67, 5, 12);
    x.fillRect(70, 87, 20, 3);
    return c.toDataURL("image/png").split(",")[1];
  });
  await studio
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "procedural-face.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  await expect(studio.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "failed",
    { timeout: 60000 },
  );
  await studio
    .locator("summary")
    .filter({ hasText: "Source face boxes" })
    .click();
  await studio
    .getByRole("button", { name: "Add a real face box", exact: true })
    .click();
  await studio.locator("summary").filter({ hasText: "Kit profiles" }).click();
  await studio.getByLabel("Maximum connections", { exact: true }).fill("120");
  await studio
    .getByLabel("Computation resolution", { exact: true })
    .selectOption("64");
  await studio
    .getByRole("button", { name: "Prepare face-fill crop", exact: true })
    .click();
  const review = studio.getByRole("checkbox", {
    name: "I checked every face, the white background and crop",
    exact: true,
  });
  await expect(
    studio.getByRole("button", {
      name: "Calculate standard guide",
      exact: true,
    }),
  ).toBeDisabled();
  await review.check();
  await studio
    .getByRole("button", { name: "Calculate standard guide", exact: true })
    .click();
  await expect(
    studio.getByRole("button", { name: "Save and assemble", exact: true }),
  ).toBeVisible({ timeout: 120000 });
  await page.screenshot({
    path: info.outputPath("standard-kit.png"),
    fullPage: true,
  });
  await studio
    .getByRole("button", { name: "Save and assemble", exact: true })
    .click();
  await expect(page.getByTestId("build-gate")).toBeVisible();
  await expect(page.getByTestId("player-hash")).toHaveCount(0);
  await unlockKitGuide(page);
  await expect(page.getByTestId("player-hash")).toBeVisible();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Project JSON", exact: true })
    .last()
    .click();
  const download = await pending;
  const i = JSON.parse(readFileSync((await download.path())!, "utf8")).project
    .instruction;
  await validateInstruction(i);
  expect(i.algorithm).toBe("classic-greedy/1");
  expect(i.profile.pins).toHaveLength(240);
  expect(i.profile.pins[0].y * 500).toBeCloseTo(20, 8);
  expect(i.profile.threadMm).toBe(0.12);
  expect(i.metrics.lines).toBeGreaterThan(0);
  await context.setOffline(true);
  await expect(page.getByTestId("player-hash")).toBeVisible();
});
