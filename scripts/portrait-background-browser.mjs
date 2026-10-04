import { chromium, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173/output/background/report.html");
  await expect(
    page.getByText("Quality acceptance remains OPEN.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).toContainText(
    "f89cad2a457f03ed345250894ce49d3085697c1442cd7e430e1d65988ad7d038",
  );
  const images = await page.locator("img").evaluateAll((imgs) =>
    imgs.map((im) => ({
      src: im.getAttribute("src"),
      loaded: im.complete && im.naturalWidth > 0,
      width: im.naturalWidth,
      height: im.naturalHeight,
    })),
  );
  expect(images).toHaveLength(6);
  expect(images.every((i) => i.loaded)).toBe(true);
  for (const suffix of ["json", "txt", "png", "pdf"]) {
    const response = await page.request.get(
      `http://127.0.0.1:5173/output/background/light-protected-guide.${suffix}`,
    );
    expect(response.ok()).toBe(true);
  }
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "output/background/report-browser.png",
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:4173/");
  await page.getByLabel("Language").selectOption("en");
  await expect(page.getByTestId("photo-guidance")).toContainText(
    "it is optional",
  );
  await page
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  await page
    .getByRole("combobox", { name: "Background controls", exact: true })
    .selectOption("manual-light");
  const editor = page.getByRole("region", {
    name: "Background controls",
    exact: true,
  });
  await editor.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "output/background/editor-browser.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  writeFileSync(
    "output/background/browser-evidence.json",
    JSON.stringify(
      {
        images,
        guideDownloads: true,
        photoGuidance: true,
        manualEditor: true,
        errors,
        nativeDeviceTested: false,
        physicalAssemblyValidated: false,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      imagesLoaded: images.length,
      guideDownloads: true,
      manualEditor: true,
      errors,
    }),
  );
} finally {
  await browser.close();
}
