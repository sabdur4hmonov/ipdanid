import { chromium, expect } from "@playwright/test";
import { writeFileSync, readFileSync } from "node:fs";
const folder = "output/regions",
  project = JSON.parse(
    readFileSync(`${folder}/corrected-guide.json`, "utf8"),
  ).project;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173/output/regions/report.html");
  await expect(page.locator("body")).toContainText("quality remains open");
  const images = await page
    .locator("img")
    .evaluateAll((list) =>
      list.map((im) => ({
        src: im.getAttribute("src"),
        loaded: im.complete && im.naturalWidth > 0,
      })),
    );
  expect(images).toHaveLength(8);
  expect(images.every((im) => im.loaded)).toBe(true);
  for (const suffix of ["json", "txt", "png", "pdf"])
    expect(
      (
        await page.request.get(
          `http://127.0.0.1:5173/${folder}/corrected-guide.${suffix}`,
        )
      ).ok(),
    ).toBe(true);
  await page.screenshot({
    path: `${folder}/report-browser.png`,
    fullPage: true,
  });
  await page.goto("http://127.0.0.1:4173/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles("output/portrait/source.jpg");
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles(`${folder}/corrected-guide.json`);
  await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
    "data-sequence-hash",
    project.instruction.sequenceHash,
  );
  await expect(page.getByTestId("confirmed-step")).toContainText("0/");
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.context().setOffline(true);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const exported = JSON.parse(
    readFileSync(await (await event).path(), "utf8"),
  ).project;
  expect(exported.instruction).toEqual(project.instruction);
  expect(exported.progress.confirmed).toBe(0);
  await page.context().setOffline(false);
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .click();
  for (const key of ["eyes", "nose", "mouth"]) {
    const box = JSON.parse(
      await page.locator(`[data-region="${key}"]`).getAttribute("data-box"),
    );
    expect(box).toEqual(project.instruction.params.portrait.regions[key]);
  }
  const targetHash = await page
    .getByLabel("Exact generation target", { exact: true })
    .evaluate(async (c) => {
      const d = c.getContext("2d").getImageData(0, 0, 160, 160).data;
      const rgb = Uint8Array.from(
        { length: 160 * 160 * 3 },
        (_, k) => d[Math.floor(k / 3) * 4 + (k % 3)],
      );
      const hash = await crypto.subtle.digest("SHA-256", rgb);
      return [...new Uint8Array(hash)]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
    });
  expect(targetHash).toBe(project.instruction.imageHash);
  await page
    .getByLabel("Exact generation target", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `${folder}/editor-browser.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
  const evidence = {
    images,
    guideDownloads: true,
    productionGuideImport: true,
    offlineExactGuideExport: true,
    reusedRegions: true,
    targetHash,
    sequenceHash: project.instruction.sequenceHash,
    errors,
    nativeDeviceTested: false,
    physicalAssemblyValidated: false,
  };
  writeFileSync(
    `${folder}/browser-evidence.json`,
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
}
