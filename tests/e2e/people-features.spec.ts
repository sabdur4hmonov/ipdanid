import { revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { existsSync } from "node:fs";
import { DEFAULT_EDITS } from "../../src/core/types";
import { sourceToTarget } from "../../src/core/coordinates";
const single = "output/white-background/source.png",
  group = "output/white-background/group.png";
test.use({ serviceWorkers: "block" });
async function start(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
}
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
test("local landmarks place mouth on actual source pixels; photo inference leaves UI responsive", async ({
  page,
}) => {
  test.skip(!existsSync(single), "Private owner screenshot fixture absent.");
  await start(page);
  await page.evaluate(() => {
    const w = window as typeof window & {
      photoTicks?: number;
      photoTimer?: number;
      photoGaps?: number[];
    };
    w.photoTicks = 0;
    w.photoGaps = [];
    let last = performance.now();
    w.photoTimer = window.setInterval(() => {
      w.photoTicks!++;
      const now = performance.now();
      w.photoGaps!.push(now - last);
      last = now;
    }, 50);
  });
  await page.locator("input[type=file]").first().setInputFiles(single);
  // R1: the subject is chosen explicitly; people analysis is not the default.
  await page.getByTestId("subject-kind").locator('[data-kind="people"]').click();
  await openBackgroundOptions(page);
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 45000 },
  );
  const panel = page.getByTestId("face-features");
  await expect(panel).toHaveAttribute("data-count", "1");
  await panel.locator("summary").click();
  const rect = await panel.locator('[data-feature="mouth"]').evaluate((r) => ({
    left: Number(r.getAttribute("x")),
    top: Number(r.getAttribute("y")),
    width: Number(r.getAttribute("width")),
    height: Number(r.getAttribute("height")),
  }));
  await panel
    .getByRole("button", { name: "Use reviewed facial regions", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText(
    "Fit the complete face",
  );
  await openAdvancedPhoto(page);
  await page.getByText("Zoom · Contrast", { exact: true }).click();
  await revealControl(page.getByLabel("Zoom", { exact: true }));
  await page.getByLabel("Zoom", { exact: true }).fill("0.9");
  await panel
    .getByRole("button", { name: "Use reviewed facial regions", exact: true })
    .click();
  await expect(
    page.getByLabel("Prioritize portrait", { exact: true }),
  ).toBeChecked();
  const box = JSON.parse(
    (await page.locator('[data-region="mouth"]').getAttribute("data-box"))!,
  );
  const a = sourceToTarget(
      rect.left * 462,
      rect.top * 462,
      462,
      462,
      { ...DEFAULT_EDITS, zoom: 0.9 },
      1,
      160,
    ),
    b = sourceToTarget(
      (rect.left + rect.width) * 462,
      (rect.top + rect.height) * 462,
      462,
      462,
      { ...DEFAULT_EDITS, zoom: 0.9 },
      1,
      160,
    );
  expect(box.left).toBeCloseTo(a.x, 8);
  expect(box.top).toBeCloseTo(a.y, 8);
  expect(box.width).toBeCloseTo(b.x - a.x, 8);
  expect(box.height).toBeCloseTo(b.y - a.y, 8);
  const heartbeat = await page.evaluate(() => {
    const w = window as typeof window & {
      photoTicks?: number;
      photoTimer?: number;
      photoGaps?: number[];
    };
    clearInterval(w.photoTimer);
    return { ticks: w.photoTicks!, maxGap: Math.max(...w.photoGaps!) };
  });
  expect(heartbeat.ticks).toBeGreaterThan(10);
  expect(heartbeat.maxGap).toBeLessThan(750);
  const exact = await page
    .locator('[data-region="mouth"]')
    .getAttribute("data-box");
  const automatic = page.getByLabel("Automatically whiten background", {
    exact: true,
  });
  await automatic.uncheck();
  await expect(page.locator('[data-region="mouth"]')).toHaveAttribute(
    "data-box",
    exact!,
  );
  await automatic.check();
  await expect(page.locator('[data-region="mouth"]')).toHaveAttribute(
    "data-box",
    exact!,
  );
  await page.getByText("Correct the background", { exact: true }).click();
  await page
    .getByRole("button", { name: "Whiten background", exact: true })
    .click();
  const preview = page.getByLabel("Prepared photo", { exact: true });
  await preview.scrollIntoViewIfNeeded();
  const r = (await preview.boundingBox())!;
  await page.mouse.click(r.x + r.width * 0.94, r.y + r.height * 0.65);
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "manual",
  );
  await expect(page.locator('[data-region="mouth"]')).toHaveAttribute(
    "data-box",
    exact!,
  );
});
test("two detected faces enable group controls; fitting removes lost-foreground warning and undo restores it", async ({
  page,
}) => {
  test.skip(!existsSync(group), "Private repeated-portrait diagnostic absent.");
  await start(page);
  await page.locator("input[type=file]").first().setInputFiles(group);
  // R1: the subject is chosen explicitly; people analysis is not the default.
  await page.getByTestId("subject-kind").locator('[data-kind="people"]').click();
  await openBackgroundOptions(page);
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 45000 },
  );
  await expect(page.getByTestId("face-features")).toHaveAttribute(
    "data-count",
    "2",
  );
  await expect(
    page.getByLabel("Two or more people", { exact: true }),
  ).toBeChecked();
  await expect(page.getByTestId("people-cropped")).toBeVisible();
  const edited = page.getByLabel("Edited photo", { exact: true }),
    before = await edited.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByTestId("fit-all-people").click();
  await expect(page.getByTestId("people-cropped")).toHaveCount(0);
  await expect
    .poll(() => edited.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .not.toBe(before);
  await page.getByTestId("undo-people-fit").click();
  await expect(page.getByTestId("people-cropped")).toBeVisible();
  await expect
    .poll(() => edited.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .toBe(before);
});
test("missing face model keeps successful white-background preparation and manual crop usable", async ({
  page,
  context,
}) => {
  test.skip(!existsSync(single), "Private owner fixture absent.");
  await context.route(
    "**/vendor/portrait-segmentation/face_landmarker.task",
    (r) => r.abort(),
  );
  await start(page);
  await page.locator("input[type=file]").first().setInputFiles(single);
  // R1: the subject is chosen explicitly; people analysis is not the default.
  await page.getByTestId("subject-kind").locator('[data-kind="people"]').click();
  await openBackgroundOptions(page);
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 45000 },
  );
  await expect(page.getByTestId("face-features")).toHaveCount(0);
  await expect(
    page.getByText(
      "Facial suggestions unavailable. Manual region editing remains available.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save prepared photo", exact: true }),
  ).toBeEnabled();
});
test("cleanup failure preserves the primary mask, face suggestions and honest correction notice", async ({
  page,
  context,
}) => {
  test.skip(!existsSync(single), "Private owner fixture absent.");
  await context.route(
    "**/vendor/portrait-segmentation/deeplab_v3.tflite",
    (r) => r.abort(),
  );
  await start(page);
  await page.locator("input[type=file]").first().setInputFiles(single);
  // R1: the subject is chosen explicitly; people analysis is not the default.
  await page.getByTestId("subject-kind").locator('[data-kind="people"]').click();
  await openBackgroundOptions(page);
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 45000 },
  );
  await expect(page.getByTestId("cleanup-unavailable")).toBeVisible();
  await expect(page.getByTestId("face-features")).toHaveAttribute(
    "data-count",
    "1",
  );
  await page.getByText("Correct the background", { exact: true }).click();
  const pixel = await page
    .getByLabel("Prepared photo", { exact: true })
    .evaluate((c: HTMLCanvasElement) =>
      Array.from(c.getContext("2d")!.getImageData(448, 210, 1, 1).data),
    );
  expect(pixel).toEqual([93, 93, 91, 255]);
});
