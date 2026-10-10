import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import {
  validatePaintProject,
  paintCoverage,
  paintCsv,
} from "../../src/core/paint";
async function enter(page: any) {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator("nav")
    .getByRole("button", { name: "Grid crafts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Paint by numbers", exact: true })
    .click();
}
async function create(page: any) {
  await page
    .getByRole("button", { name: "Use paint sample", exact: true })
    .click();
  await page.getByLabel("Paint columns", { exact: true }).fill("16");
  await page.getByLabel("Paint rows", { exact: true }).fill("16");
  await page.getByLabel("Minimum region (cells)", { exact: true }).fill("4");
  await page.getByLabel("Cell size (mm)", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Create paint guide", exact: true })
    .click();
  await expect(page.locator("[data-paint-hash]")).toBeVisible();
}
test("paint actual photo upload waits for local background preparation and produces bounded connected regions", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByLabel("Paint photo", { exact: true })
    .setInputFiles("output/white-background/source.png");
  await page.getByLabel("Paint columns", { exact: true }).fill("48");
  await page.getByLabel("Paint rows", { exact: true }).fill("48");
  const generate = page.getByRole("button", {
    name: "Create paint guide",
    exact: true,
  });
  await expect(generate).toBeEnabled({ timeout: 45000 });
  await generate.click();
  await expect(page.locator("[data-paint-hash]")).toBeVisible({
    timeout: 30000,
  });
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Paint JSON", exact: true }).click();
  const p = JSON.parse(
    readFileSync((await (await event).path())!, "utf8"),
  ).project;
  await validatePaintProject(p);
  expect(p.guide.cells).toHaveLength(48 * 48);
  expect(p.guide.regions.every((r: any) => r.cells.length >= 12)).toBe(true);
  expect(p.guide.regions.length).toBeGreaterThan(4);
  await (
    await event
  ).saveAs(`output/paint/photo-${test.info().project.name}.json`);
  await page.getByLabel("Colour preview", { exact: true }).check();
  await page
    .locator(".paint-preview")
    .screenshot({ path: `output/paint/photo-${test.info().project.name}.png` });
});
test("paint uses connected regions, independent progress, undo, same immutable offline exports and localized print guides", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await enter(page);
  await create(page);
  const hash = await page
    .locator("[data-paint-hash]")
    .getAttribute("data-paint-hash");
  await page
    .getByRole("button", { name: "Save paint project", exact: true })
    .click();
  await page.getByLabel("Region", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Mark region painted", exact: true })
    .click();
  await expect(page.getByTestId("paint-progress")).toContainText("1/");
  await page
    .getByRole("button", { name: "Undo paint confirmation", exact: true })
    .click();
  await expect(page.getByTestId("paint-progress")).toContainText("0/");
  await page
    .getByRole("button", { name: "Mark region painted", exact: true })
    .click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Paint JSON", exact: true }).click();
  const raw = readFileSync((await (await event).path())!, "utf8"),
    p = JSON.parse(raw).project;
  await validatePaintProject(p);
  expect(p.guide.sequenceHash).toBe(hash);
  expect(p.progress.completed).toEqual([1]);
  expect(p.guide.regions.every((r: any) => r.cells.length >= 4)).toBe(true);
  expect(paintCoverage(p.guide).reduce((s, c) => s + c.cells, 0)).toBe(256);
  mkdirSync("output/paint", { recursive: true });
  await (
    await event
  ).saveAs(`output/paint/${test.info().project.name}-guide.json`);
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: "Regions CSV", exact: true }).click();
  expect(readFileSync((await (await csv).path())!, "utf8")).toBe(
    paintCsv(p.guide, [1]),
  );
  const svg = page.waitForEvent("download");
  await page.getByRole("button", { name: "Paint SVG", exact: true }).click();
  expect(readFileSync((await (await svg).path())!, "utf8")).toContain(
    'width="160mm"',
  );
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page
    .locator("nav")
    .getByRole("button", { name: "Grid crafts", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Paint by numbers", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open paint project", exact: true })
    .first()
    .click();
  await expect(page.locator("[data-paint-hash]")).toHaveAttribute(
    "data-paint-hash",
    hash!,
  );
  await expect(page.getByTestId("paint-progress")).toContainText("1/");
  for (const [locale, label] of [
    ["en", "Paint PDF"],
    ["ru", "Раскраска PDF"],
    ["uz", "Bo‘yash PDF"],
  ] as const) {
    await page.getByLabel("Language").selectOption(locale);
    const pdf = page.waitForEvent("download");
    await page.getByRole("button", { name: label, exact: true }).click();
    await (
      await pdf
    ).saveAs(`output/paint/${test.info().project.name}-${locale}-guide.pdf`);
  }
  await page.getByLabel("Language").selectOption("en");
  await page.screenshot({
    path: `output/paint/${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("paint stale completion is refused and reopened progress remains independent of grid projects", async ({
  page,
  context,
}) => {
  await enter(page);
  await create(page);
  await page
    .getByRole("button", { name: "Save paint project", exact: true })
    .click();
  const other = await context.newPage();
  await enter(other);
  await other
    .getByRole("button", { name: "Open paint project", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Mark region painted", exact: true })
    .click();
  await expect(page.getByTestId("paint-progress")).toContainText("1/");
  await other.getByLabel("Region", { exact: true }).fill("2");
  await other
    .getByRole("button", { name: "Mark region painted", exact: true })
    .click();
  await expect(other.getByRole("alert")).toContainText(
    "Progress changed in another window",
  );
  await other
    .getByRole("button", { name: "Open paint project", exact: true })
    .first()
    .click();
  await expect(other.getByTestId("paint-progress")).toContainText("1/");
  const stored = await page.evaluate(() => ({
    paint: JSON.parse(localStorage.getItem("iprasm.paint-projects.v1")!),
    grid: localStorage.getItem("iprasm.grid-projects.v1"),
  }));
  expect(stored.paint[0].progress.completed).toEqual([0]);
  expect(stored.grid).toBeNull();
  await other.close();
});
test("paint validation and worker cancellation preserve the prior guide, and offline worker can generate again", async ({
  page,
  context,
}) => {
  await enter(page);
  await create(page);
  const hash = await page
    .locator("[data-paint-hash]")
    .getAttribute("data-paint-hash");
  await page
    .getByLabel("Paint palette", { exact: true })
    .fill("B,#000000\nB,#ffffff");
  await page
    .getByRole("button", { name: "Create paint guide", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Check dimensions");
  await expect(page.locator("[data-paint-hash]")).toHaveAttribute(
    "data-paint-hash",
    hash!,
  );
  await page
    .getByLabel("Paint palette", { exact: true })
    .fill("B,#000000\nW,#ffffff");
  // Deterministically hold an actual Worker result so cancellation is exercised.
  await page.evaluate(() => {
    const original = Worker.prototype.postMessage;
    (Worker.prototype as any).postMessage = function (
      message: any,
      transfer: any,
    ) {
      if (message?.minimum) return;
      return original.call(this, message, transfer);
    };
  });
  await page
    .getByRole("button", { name: "Create paint guide", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel paint generation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Create paint guide", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("[data-paint-hash]")).toHaveAttribute(
    "data-paint-hash",
    hash!,
  );
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await enter(page);
  await create(page);
  await expect(page.locator("[data-paint-hash]")).toBeVisible();
});
