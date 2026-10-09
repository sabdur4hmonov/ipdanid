import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
const fixture = "output/white-background/source.png";
const upload = (page: import("@playwright/test").Page) =>
  page.locator("input[type=file]").first();
async function start(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
}
async function synthetic(
  page: import("@playwright/test").Page,
  color = "#183848",
) {
  return Buffer.from(
    await page.evaluate((color) => {
      const c = document.createElement("canvas");
      c.width = c.height = 160;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 160, 160);
      return c.toDataURL().split(",")[1];
    }, color),
    "base64",
  );
}
test("failed model preserves original; manual source brush, undo and original toggle are exact", async ({
  page,
}) => {
  await page.route(
    "**/vendor/portrait-segmentation/selfie_multiclass_256x256.tflite",
    (r) => r.abort(),
  );
  await start(page);
  const buffer = await synthetic(page);
  await upload(page).setInputFiles({
    name: "manual.png",
    mimeType: "image/png",
    buffer,
  });
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "failed",
  );
  const edited = page.getByLabel("Edited photo", { exact: true }),
    original = await edited.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByText("Correct the background", { exact: true }).click();
  await page
    .getByRole("button", { name: "Whiten background", exact: true })
    .click();
  const canvas = page.getByLabel("Prepared photo", { exact: true });
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect
    .poll(() => edited.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .not.toBe(original);
  await page
    .getByRole("button", { name: "Undo brush stroke", exact: true })
    .click();
  await expect
    .poll(() => edited.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .toBe(original);
  await page
    .getByRole("checkbox", {
      name: "Automatically whiten background",
      exact: true,
    })
    .uncheck();
  await expect
    .poll(() => edited.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .toBe(original);
  await page
    .getByRole("checkbox", { name: "Two or more people", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "Prioritize portrait", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Fit marked face to shape", exact: true }),
  ).toBeDisabled();
});
test("latest photo survives a delayed model response and navigation", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route(
    "**/vendor/portrait-segmentation/selfie_multiclass_256x256.tflite",
    async (r) => {
      await gate;
      await r.abort();
    },
  );
  await start(page);
  await upload(page).setInputFiles({
    name: "first.png",
    mimeType: "image/png",
    buffer: await synthetic(page, "#ff0000"),
  });
  await upload(page).setInputFiles({
    name: "latest.png",
    mimeType: "image/png",
    buffer: await synthetic(page, "#008800"),
  });
  release();
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "failed",
  );
  const pixel = await page
    .getByLabel("Edited photo", { exact: true })
    .evaluate((c: HTMLCanvasElement) =>
      Array.from(c.getContext("2d")!.getImageData(100, 100, 1, 1).data),
    );
  expect(pixel).toEqual([0, 136, 0, 255]);
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "failed",
  );
});
test("actual local model keeps face pixels, group foreground and reversible photo choices", async ({
  page,
}) => {
  test.skip(
    !existsSync(fixture),
    "Owner screenshot fixture is private, generated locally by evidence script.",
  );
  const outbound: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET") outbound.push(r.url());
  });
  await start(page);
  await upload(page).setInputFiles(fixture);
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 45000 },
  );
  const edited = page.getByLabel("Edited photo", { exact: true });
  const prepared = await edited.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  await page
    .getByRole("checkbox", {
      name: "Automatically whiten background",
      exact: true,
    })
    .uncheck();
  const original = await edited.evaluate((c: HTMLCanvasElement) =>
    c.toDataURL(),
  );
  expect(prepared).not.toBe(original);
  await page
    .getByRole("checkbox", {
      name: "Automatically whiten background",
      exact: true,
    })
    .check();
  await expect
    .poll(() => edited.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .toBe(prepared);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Save prepared photo", exact: true })
      .click(),
  ]);
  expect(download.suggestedFilename()).toBe("ip-rasm-prepared.png");
  const group = await page.evaluate(async (base64) => {
    const im = new Image();
    im.src = "data:image/png;base64," + base64;
    await im.decode();
    const c = document.createElement("canvas");
    c.width = 924;
    c.height = 462;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(im, 0, 0);
    ctx.drawImage(im, 462, 0);
    return c.toDataURL().split(",")[1];
  }, readFileSync(fixture).toString("base64"));
  await upload(page).setInputFiles({
    name: "two-region-diagnostic.png",
    mimeType: "image/png",
    buffer: Buffer.from(group, "base64"),
  });
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 45000 },
  );
  await page
    .getByRole("checkbox", { name: "Two or more people", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "Prioritize portrait", exact: true }),
  ).not.toBeChecked();
  await page.getByText("Correct the background", { exact: true }).click();
  const pixels = await page
    .getByLabel("Prepared photo", { exact: true })
    .evaluate((c: HTMLCanvasElement) => {
      const ctx = c.getContext("2d")!;
      return [235, 697].map((x) =>
        Array.from(ctx.getImageData(x, 245, 1, 1).data),
      );
    });
  expect(pixels[0]).toEqual([183, 136, 116, 255]);
  expect(pixels[1]).toEqual(pixels[0]);
  await page.getByRole("button", { name: "source.png", exact: true }).click();
  await expect
    .poll(() => edited.evaluate((c: HTMLCanvasElement) => c.toDataURL()))
    .toBe(prepared);
  await expect(
    page.getByRole("checkbox", { name: "Two or more people", exact: true }),
  ).not.toBeChecked();
  expect(outbound.filter((u) => !u.includes("/api/"))).toEqual([]);
});
test("PWA precaches local model and performs fresh inference after offline reload", async ({
  page,
  context,
}) => {
  test.skip(!existsSync(fixture), "Private owner fixture absent.");
  await start(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(
      () => page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      { timeout: 45000 },
    )
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await upload(page).setInputFiles(fixture);
  await expect(page.getByTestId("background-status")).toHaveAttribute(
    "data-status",
    "ready",
    { timeout: 45000 },
  );
  await expect(
    page.getByRole("button", { name: "Save prepared photo", exact: true }),
  ).toBeEnabled();
  await context.setOffline(false);
});
