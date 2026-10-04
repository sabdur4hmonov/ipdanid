import { chromium, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
const out = "output/portrait";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4173");
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles(`${out}/source.jpg`);
  await page.getByLabel("Prioritize portrait", { exact: true }).check();
  for (const [label, value] of [
    ["Zoom", 1.3],
    ["Face region Left", 0.21],
    ["Face region Top", 0.18],
    ["Face region Width", 0.64],
    ["Face region Height", 0.73],
    ["Simplify background", 0.85],
    ["Local contrast", 0.5],
  ])
    await page.getByLabel(label, { exact: true }).fill(String(value));
  await page.getByText("Dimensions and materials", { exact: true }).click();
  for (const [label, value] of [
    ["Number of pins", 240],
    ["Thread thickness (mm)", 0.1],
    ["Available thread (m)", 600],
  ])
    await page.getByLabel(label, { exact: true }).fill(String(value));
  const targetHash = await page
    .getByLabel("Exact generation target", { exact: true })
    .evaluate(async (c) => {
      const rgba = c.getContext("2d").getImageData(0, 0, 160, 160).data;
      const rgb = Uint8Array.from(
        { length: 160 * 160 * 3 },
        (_, i) => rgba[Math.floor(i / 3) * 4 + (i % 3)],
      );
      return [...new Uint8Array(await crypto.subtle.digest("SHA-256", rgb))]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    });
  await page
    .getByLabel("Edited photo", { exact: true })
    .screenshot({ path: `${out}/browser-crop.png` });
  await page
    .getByLabel("Exact generation target", { exact: true })
    .screenshot({ path: `${out}/browser-target.png` });
  const start = Date.now();
  await page
    .getByRole("button", { name: "Calculate thread path", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Save & assemble", exact: true }),
  ).toBeVisible({ timeout: 240000 });
  const generationMs = Date.now() - start;
  await page
    .locator(".result-card")
    .screenshot({ path: `${out}/browser-result.png` });
  const hash = await page
    .locator("canvas[data-sequence-hash]")
    .getAttribute("data-sequence-hash");
  await page
    .getByLabel("Project name")
    .fill("Local portrait quality experiment");
  await page
    .getByRole("button", { name: "Save & assemble", exact: true })
    .click();
  await expect(page.getByTestId("player-hash")).toHaveText(hash);
  await page.getByLabel("Jump to exact step").fill("5");
  await page
    .getByRole("button", { name: "Confirm completed through this step" })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("confirmed-step")).toContainText("5/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  for (const [name, ext] of [
    ["Project JSON", "json"],
    ["TXT sequence", "txt"],
    ["Preview PNG", "png"],
    ["PDF guide", "pdf"],
  ]) {
    const download = page.waitForEvent("download", { timeout: 120000 });
    await page.getByRole("button", { name, exact: true }).first().click();
    await (await download).saveAs(`${out}/browser-guide.${ext}`);
  }
  const project = JSON.parse(
    readFileSync(`${out}/browser-guide.json`, "utf8"),
  ).project;
  expect(project.instruction.sequenceHash).toBe(hash);
  expect(project.instruction.imageHash).toBe(targetHash);
  expect(project.progress.confirmed).toBe(5);
  expect(project.instruction.metrics.lines).toBeGreaterThan(3000);
  expect(project.instruction.metrics.stockShortfallMeters).toBeGreaterThan(0);
  expect(readFileSync(`${out}/browser-guide.txt`, "utf8")).toContain(hash);
  expect(errors).toEqual([]);
  writeFileSync(
    `${out}/browser-evidence.json`,
    JSON.stringify(
      {
        generationMs,
        targetHash,
        sequenceHash: hash,
        metrics: project.instruction.metrics,
        offlineExports: true,
        confirmedAfterReload: 5,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      generationMs,
      metrics: project.instruction.metrics,
      hash,
      errors,
    }),
  );
} finally {
  await browser.close();
}
