import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

async function openBackgroundOptions(page: import("@playwright/test").Page) {
  // Simple flow keeps photo preparation inside a collapsed section.
  const options = page.getByTestId("background-options");
  if (!(await options.evaluate((d: HTMLDetailsElement) => d.open)))
    await options.locator("summary").first().click();
}
async function openAdvancedPhoto(page: import("@playwright/test").Page) {
  const advanced = page.getByTestId("advanced-photo");
  if (!(await advanced.evaluate((d: HTMLDetailsElement) => d.open)))
    await advanced.locator("summary").first().click();
}
test("localized optional photo advice, reversible local brush and exact exported target", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  for (const [locale, fragment] of [
    ["uz", "Mavjud suratlar ham mos"],
    ["ru", "Подойдут и существующие фотографии"],
    ["en", "Existing photographs are welcome"],
  ]) {
    await page.getByLabel("Language").selectOption(locale);
    await expect(page.getByTestId("photo-guidance")).toContainText(fragment);
  }
  // Patterned image is accepted; no background classifier or mandatory face detector.
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const ctx = c.getContext("2d")!;
    for (let y = 0; y < 160; y += 8)
      for (let x = 0; x < 160; x += 8) {
        ctx.fillStyle = (x + y) % 16 ? "#6d6d6d" : "#dedede";
        ctx.fillRect(x, y, 8, 8);
      }
    ctx.fillStyle = "#ded1bb";
    ctx.beginPath();
    ctx.ellipse(80, 83, 41, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#303030";
    ctx.fillRect(53, 65, 17, 5);
    ctx.fillRect(92, 65, 17, 5);
    ctx.fillRect(68, 116, 25, 4);
    return c.toDataURL().split(",")[1];
  });
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "patterned-portrait.png",
      mimeType: "image/png",
      buffer: Buffer.from(png, "base64"),
    });
  // R1: the subject is chosen explicitly; people analysis is not the default.
  await page.getByTestId("subject-kind").locator('[data-kind="people"]').click();
  await openBackgroundOptions(page);
  // This legacy target-space editor is exercised against the original source.
  // Source-space automatic separation is tested separately and must settle first.
  await expect(page.getByTestId("background-status")).not.toHaveAttribute(
    "data-status",
    "processing",
    { timeout: 45000 },
  );
  await page
    .getByRole("checkbox", {
      name: "Automatically whiten background",
      exact: true,
    })
    .uncheck();
  await openAdvancedPhoto(page);
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await page.getByText("Face region", { exact: true }).click();
  await page.getByLabel("Simplify background", { exact: true }).fill("0.75");
  const target = page.getByLabel("Exact generation target", { exact: true });
  const initial = await target.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await page
    .getByRole("combobox", { name: "Background controls", exact: true })
    .selectOption("manual-light");
  const paintPoint = async (x = 0.08, y = 0.55) => {
    const brush = page.getByLabel("After manual background", { exact: true });
    await brush.scrollIntoViewIfNeeded();
    const box = (await brush.boundingBox())!;
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y);
  };
  await paintPoint();
  const changed = await target.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  expect(changed).not.toBe(initial);
  await page
    .getByRole("button", { name: "Before manual background", exact: true })
    .click();
  expect(
    await page
      .getByLabel("Before manual background", { exact: true })
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  ).toBe(initial);
  // Inspecting Before never switches the actual generation target.
  expect(await target.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    changed,
  );
  await page
    .getByRole("button", { name: "Undo last brush", exact: true })
    .click();
  expect(await target.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    initial,
  );
  await page
    .getByRole("button", { name: "Paint background", exact: true })
    .click();
  await paintPoint();
  await page
    .getByRole("button", { name: "Restore subject", exact: true })
    .click();
  await paintPoint();
  const restored = await target.evaluate((c: HTMLCanvasElement) => [
    ...c.getContext("2d")!.getImageData(13, 88, 1, 1).data,
  ]);
  await page.getByLabel("Simplify background", { exact: true }).fill("0");
  expect(restored).toEqual(
    await target.evaluate((c: HTMLCanvasElement) => [
      ...c.getContext("2d")!.getImageData(13, 88, 1, 1).data,
    ]),
  );
  await page.getByLabel("Simplify background", { exact: true }).fill("0.75");
  await page
    .getByRole("button", { name: "Clear background selections", exact: true })
    .click();
  expect(await target.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    initial,
  );
  await page
    .getByRole("button", { name: "Paint background", exact: true })
    .click();
  await paintPoint();
  // A mask cannot silently move to a new aspect while portrait processing is off.
  await page.getByLabel("Prioritize portrait", { exact: true }).uncheck();
  await page.getByTestId("advanced-generation").locator("summary").first().click();
  await page.getByRole("button", { name: "Rectangle", exact: true }).click();
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await page.getByLabel("Height (mm)", { exact: true }).fill("240");
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  expect(await target.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    await page
      .getByLabel("After manual background", { exact: true })
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  );
  await page
    .getByRole("button", { name: "Before manual background", exact: true })
    .click();
  expect(await target.evaluate((c: HTMLCanvasElement) => c.toDataURL())).toBe(
    await page
      .getByLabel("Before manual background", { exact: true })
      .evaluate((c: HTMLCanvasElement) => c.toDataURL()),
  );
  await page.getByRole("button", { name: "Circle", exact: true }).click();
  await page
    .getByRole("button", { name: "Paint background", exact: true })
    .click();
  await paintPoint();
  await page
    .getByRole("button", { name: "Restore subject", exact: true })
    .click();
  await paintPoint(0.08, 0.4);
  const targetHash = await target.evaluate(async (c: HTMLCanvasElement) => {
    const rgba = c.getContext("2d")!.getImageData(0, 0, 160, 160).data,
      rgb = new Uint8Array(160 * 160 * 3);
    for (let i = 0; i < 160 * 160; i++)
      rgb.set(rgba.subarray(i * 4, i * 4 + 3), i * 3);
    return [...new Uint8Array(await crypto.subtle.digest("SHA-256", rgb))]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  });
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await page.getByLabel("Number of pins", { exact: true }).fill("24");
  await page.getByLabel("Maximum lines", { exact: true }).fill("200");
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click({ timeout: 90000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const project = JSON.parse(
    readFileSync((await (await download).path())!, "utf8"),
  ).project;
  expect(project.instruction.imageHash).toBe(targetHash);
  expect(project.instruction.params.portrait.backgroundMode).toBe(
    "manual-light",
  );
  expect(project.instruction.params.portrait.backgroundMask).toMatch(
    /^[0-9a-f]{1024}$/,
  );
  expect(project.instruction.params.portrait.foregroundMask).toMatch(
    /^[0-9a-f]{1024}$/,
  );
  expect(project.instruction.params.portrait.foregroundMask).not.toBe(
    "0".repeat(1024),
  );
  expect(project.progress.confirmed).toBe(0);
  await context.setOffline(false);
});
