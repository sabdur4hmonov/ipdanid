import { test, expect } from "@playwright/test";
test("head fit requires correction; burst gestures accumulate and per-photo regions survive switching", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  const frame = page.getByTestId("shape-crop");
  const edits = async () =>
    JSON.parse((await frame.getAttribute("data-edits"))!);
  const portrait = async () =>
    JSON.parse((await frame.getAttribute("data-portrait"))!);
  const original = await edits();
  await page
    .getByRole("button", { name: "Fit marked face to shape", exact: true })
    .click();
  expect(await edits()).toEqual(original);
  await expect(page.getByTestId("crop-face-box")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "First mark the whole head" }),
  ).toContainText("First mark the whole head");
  await page
    .getByRole("button", { name: "Mark face bounds", exact: true })
    .click();
  await frame.evaluate((el) => {
    const r = el.getBoundingClientRect();
    el.setPointerCapture = () => {};
    const event = (type: string, x: number) =>
      new PointerEvent(type, {
        bubbles: true,
        pointerId: 77,
        clientX: r.left + r.width * x,
        clientY: r.top + r.height * 0.5,
      });
    // No React render between the moves: every physical delta must accumulate.
    el.dispatchEvent(event("pointerdown", 0.4));
    for (let i = 1; i <= 10; i++)
      el.dispatchEvent(event("pointermove", 0.4 + i * 0.01));
    el.dispatchEvent(event("pointerup", 0.5));
  });
  expect((await edits()).panX).toBeCloseTo(0.1, 6);
  await page.getByLabel("Zoom", { exact: true }).fill("0.65");
  await expect(page.getByTestId("missing-photo")).toBeVisible();
  await page.getByText("Saved settings", { exact: true }).first().click();
  await page
    .getByLabel("Settings name", { exact: true })
    .fill("Small crop retained");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(
    page.getByLabel("Saved settings", { exact: true }).locator("option"),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Fill and center photo", exact: true })
    .click();
  await expect(page.getByTestId("missing-photo")).toHaveCount(0);
  await page
    .getByLabel("Saved settings", { exact: true })
    .selectOption({ label: "Small crop retained" });
  expect((await edits()).zoom).toBe(0.65);
  await page
    .getByRole("button", { name: "Fill and center photo", exact: true })
    .click();
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await expect(
    page.getByLabel("Portrait optimization", { exact: true }),
  ).toHaveValue("guarded");
  await page.getByLabel("Eyes Left", { exact: true }).fill("0.25");
  const saved = await portrait();
  await page
    .getByRole("button", { name: "Mark face bounds", exact: true })
    .click();
  await frame.evaluate((el) => {
    const r = el.getBoundingClientRect();
    el.setPointerCapture = () => {};
    for (const [type, x, y] of [
      ["pointerdown", 0.1, 0.1],
      ["pointermove", 0.65, 0.8],
      ["pointerup", 0.65, 0.8],
    ] as const)
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 78,
          clientX: r.left + r.width * x,
          clientY: r.top + r.height * y,
        }),
      );
  });
  const corrected = await portrait();
  expect(corrected.face.width).toBeCloseTo((0.55 * 160) / 159, 5);
  expect(corrected.regions).toEqual(saved.regions);
  // A second local source must not inherit boxes from the first.
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles({
      name: "second.png",
      mimeType: "image/png",
      buffer: await page
        .getByLabel("Edited photo", { exact: true })
        .screenshot(),
    });
  await expect(
    page.getByRole("button", { name: "second.png", exact: true }),
  ).toBeVisible();
  expect((await portrait()).regions).toBeUndefined();
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  expect(await portrait()).toEqual(corrected);
  for (const [locale, text] of [
    ["uz", "Hozirgi hisoblash sozlamalari"],
    ["ru", "Текущие параметры генерации"],
    ["en", "Current generation settings"],
  ]) {
    await page.getByLabel("Language").selectOption(locale);
    await expect(page.getByTestId("actual-settings")).toContainText(text);
  }
});
