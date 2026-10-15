import { unlockIfNeeded } from "./kit-access";
import { test, expect } from "./legacy-test";
import { mkdirSync, readFileSync } from "node:fs";

test("failed preparation opens the correction controls and preserves usable photo", async ({
  page,
}) => {
  await page.route(
    "**/vendor/portrait-segmentation/selfie_multiclass_256x256.tflite",
    (route) => route.abort(),
  );
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page
    .getByLabel("Upload from gallery", { exact: true })
    .setInputFiles("tests/fixtures/transparency.png");
  // R1: the subject is chosen explicitly; people analysis is not the default.
  await page.getByTestId("subject-kind").locator('[data-kind="people"]').click();
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "failed",
    { timeout: 45000 },
  );
  await expect(page.getByTestId("background-options")).toHaveAttribute(
    "open",
    "",
  );
  await expect(page.getByLabel("Edited photo", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Calculate thread path", exact: true }),
  ).toBeEnabled();
});

test("photo-first start has exactly two source actions in all languages", async ({
  page,
}, info) => {
  await page.goto("/");
  for (const [locale, camera, gallery] of [
    ["uz", "Rasmga olish", "Galereyadan yuklash"],
    ["ru", "Сделать фотографию", "Выбрать из галереи"],
    ["en", "Take photo", "Upload from gallery"],
  ]) {
    await page.getByLabel("Language", { exact: true }).selectOption(locale);
    await expect(page.getByTestId("photo-actions").locator("button:visible")).toHaveCount(2);
    await expect(page.getByTestId("photo-guidance")).toBeVisible();
    await expect(page.getByTestId("photo-guidance")).toContainText(
      locale === "uz"
        ? "Mavjud suratlar"
        : locale === "ru"
          ? "существующие фотографии"
          : "Existing photographs",
    );
    await expect(
      page.getByRole("button", { name: camera, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: gallery, exact: true }),
    ).toBeVisible();
    await expect(page.locator(".settings-card, .result-card")).toHaveCount(0);
    await expect(page.locator("nav button")).toHaveCount(3);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  mkdirSync("output/simple-flow", { recursive: true });
  await page.screenshot({
    path: `output/simple-flow/${info.project.name}-start.png`,
    fullPage: true,
  });
});

test("gallery still prepares locally, generates a real path and saves resumable progress", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page
    .getByLabel("Upload from gallery", { exact: true })
    .setInputFiles("output/portrait/source.jpg");
  // R1: the subject is chosen explicitly; people analysis is not the default.
  await page.getByTestId("subject-kind").locator('[data-kind="people"]').click();
  await expect(page.getByLabel("Edited photo", { exact: true })).toBeVisible();
  // Preparation continues while its controls are collapsed.
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 60000 },
  );
  await expect(page.getByTestId("background-options")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.getByTestId("advanced-photo")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.getByTestId("advanced-generation")).not.toHaveAttribute(
    "open",
    "",
  );
  await expect(page.locator(".result-card")).toHaveCount(0);
  // This regression intentionally exercises the legacy image method with an explicit opt-out.
  await page.getByLabel("Use general image method (no portrait priority)", {exact:true}).check();
  await expect(page.getByTestId("material-summary")).toContainText(
    "400 × 400 mm",
  );
  await expect(
    page.getByRole("button", { name: "Calculate thread path", exact: true }),
  ).toBeEnabled();
  await page.screenshot({
    path: `output/simple-flow/${info.project.name}-photo.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.locator(".result-card canvas[data-sequence-hash]"),
  ).toBeVisible({ timeout: 60000 });
  const hash = await page
    .locator(".result-card canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
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
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Project JSON", exact: true })
      .first()
      .click(),
  ]);
  const exported = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(exported.project.instruction.sequenceHash).toBe(hash);
  expect(exported.project.progress.confirmed).toBe(1);
});
