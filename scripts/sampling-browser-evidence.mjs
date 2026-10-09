import { chromium, devices, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true }),
  errors = [],
  panels = [];
try {
  const report = await browser.newPage();
  report.on("pageerror", (e) => errors.push(e.message));
  await report.goto("http://127.0.0.1:5183/output/contour/report.html");
  await report
    .locator("img")
    .evaluateAll((list) => Promise.all(list.map((im) => im.decode())));
  await report.screenshot({
    path: "output/contour/report-browser.png",
    fullPage: true,
  });
  for (const [name, options] of [
    ["desktop", { viewport: { width: 1280, height: 960 } }],
    ["mobile", devices["Pixel 7"]],
  ]) {
    const context = await browser.newContext(options),
      page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4183/");
    await page.getByLabel("Language").selectOption("en");
    await page
      .getByRole("button", { name: "Try an original sample", exact: true })
      .click();
    await page.getByLabel("Prioritize portrait", { exact: true }).check();
    const panel = page.getByTestId("portrait-sampling");
    await expect(panel).toBeVisible();
    await expect(panel.locator("tbody tr")).toHaveCount(3);
    await panel.screenshot({ path: `output/completion/sampling-${name}.png` });
    const fit = await panel.evaluate((el) => ({
      width: el.clientWidth,
      scrollWidth: el.scrollWidth,
    }));
    expect(fit.scrollWidth).toBeLessThanOrEqual(fit.width);
    panels.push({ name, ...fit, threeWindows: true });
    await context.close();
  }
  expect(errors).toEqual([]);
  writeFileSync(
    "output/completion/sampling-visual.json",
    JSON.stringify({ reportImagesLoaded: true, panels, errors }, null, 2),
  );
  console.log(JSON.stringify({ panels, errors }));
} finally {
  await browser.close();
}
