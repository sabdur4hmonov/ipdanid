import { test, expect } from "@playwright/test";
import { english, gallery, photoCases, png } from "./phase12-cases";
import { readdirSync } from "node:fs";
import { referenceTones } from "../../src/core/reference-preparation";
test("background tone worker exactly matches the retained reference arithmetic", async ({
  page,
}) => {
  const n = 48,
    rgba = Uint8ClampedArray.from({ length: n * n * 4 }, (_, i) =>
      i % 4 === 3 ? 255 : (i * 17) % 256,
    );
  const mask = {
    width: n,
    height: n,
    values: Float32Array.from({ length: n * n }, (_, i) => (i % 7) / 6),
  };
  const expected = referenceTones(rgba, n, n, mask).gray;
  const asset = readdirSync(
    (process.env.IP_RASM_TEST_WEB_DIR ?? "dist") + "/assets",
  ).find((n) => n.startsWith("photo-tone.worker-") && n.endsWith(".js"))!;
  expect(asset).toBeTruthy();
  await page.goto("/");
  const actual = await page.evaluate(
    async ({ asset, n }) => {
      const w = new Worker("/assets/" + asset, { type: "module" });
      const rgba = Uint8ClampedArray.from({ length: n * n * 4 }, (_, i) =>
        i % 4 === 3 ? 255 : (i * 17) % 256,
      );
      const mask = {
        width: n,
        height: n,
        values: Float32Array.from({ length: n * n }, (_, i) => (i % 7) / 6),
      };
      return await new Promise<number[]>((resolve, reject) => {
        w.onmessage = ({ data }) => {
          w.terminate();
          data.error
            ? reject(Error("worker error"))
            : resolve(Array.from(data.rgba));
        };
        w.onerror = () => {
          w.terminate();
          reject(Error("worker failed"));
        };
        w.postMessage({ rgba, width: n, height: n, mask });
      });
    },
    { asset, n },
  );
  expect(actual).toEqual(
    Array.from({ length: n * n * 4 }, (_, i) =>
      i % 4 === 3 ? 255 : Math.floor(expected[Math.floor(i / 4)] * 255),
    ),
  );
});
test("explicit local photo draft restores exact cutout and placement offline, then erases", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  await page.goto("/");
  await english(page);
  const open = async () => {
    await page.getByTestId("customer-menu").locator("summary").click();
    await page
      .getByRole("button", { name: "Continue editing later", exact: true })
      .click();
    await expect(page.getByTestId("photo-draft-panel")).toBeVisible();
  };
  await open();
  await page
    .getByRole("button", { name: "Open saved photo", exact: true })
    .click();
  await expect(
    page.getByTestId("photo-draft-panel").getByRole("status"),
  ).toContainText("No saved photo");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await gallery(page, photoCases[0]);
  await page.getByRole("button", { name: "Heart", exact: true }).click();
  await page.getByRole("slider", { name: "Zoom", exact: true }).fill("1.6");
  await page.getByRole("button", { name: "Rotate ↻", exact: true }).click();
  await page.getByTestId("edit-cutout").click();
  const editor = page.getByTestId("cutout-editor");
  await editor.scrollIntoViewIfNeeded();
  const b = (await editor.boundingBox())!;
  await page.mouse.click(b.x + b.width * 0.5, b.y + b.height * 0.5);
  await page.getByTestId("edit-cutout").click();
  const before = await png(page, "customer-photo"),
    framing = await page
      .getByTestId("customer-photo")
      .getAttribute("data-framing");
  let uploads = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/api/")) uploads++;
  });
  await open();
  await page
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  await expect(
    page.getByTestId("photo-draft-panel").getByRole("status"),
  ).toHaveText("Saved");
  expect(uploads).toBe(0);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (
      ...args: Parameters<typeof original>
    ) {
      if (this.transaction.db.name === "iprasm.editable-photo") {
        IDBObjectStore.prototype.put = original;
        throw new DOMException("Injected full disk", "QuotaExceededError");
      }
      return original.apply(this, args);
    };
  });
  await page
    .getByRole("button", { name: "Save on this device", exact: true })
    .click();
  await expect(
    page.getByTestId("photo-draft-panel").getByRole("status"),
  ).toContainText("Could not finish");
  // The failed replacement must leave the prior committed photo readable.
  await page.reload();
  await english(page);
  await open();
  // Load the lazy UI first; subsequent restore must not request a model/server.
  await page.evaluate(() => {
    const metrics = { started: performance.now(), longTasks: [] as number[] };
    (window as any).__draftRestoreMetrics = metrics;
    new PerformanceObserver((list) =>
      metrics.longTasks.push(...list.getEntries().map((e) => e.duration)),
    ).observe({ type: "longtask" });
  });
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Open saved photo", exact: true })
    .click();
  await expect(page.getByTestId("photo-draft-panel")).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(
    page.getByRole("button", { name: "Create", exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  await info.attach("restore-timing.json", {
    body: JSON.stringify(
      await page.evaluate(() => ({
        elapsed:
          performance.now() - (window as any).__draftRestoreMetrics.started,
        longTasks: (window as any).__draftRestoreMetrics.longTasks,
      })),
    ),
    contentType: "application/json",
  });
  expect(
    await page.getByTestId("customer-photo").getAttribute("data-framing"),
  ).toBe(framing);
  expect(await png(page, "customer-photo")).toBe(before);
  await page.screenshot({
    path: `test-results/c21c-draft-${info.project.name}.png`,
    fullPage: true,
  });
  await open();
  await page
    .getByRole("button", { name: "Delete saved photo", exact: true })
    .click();
  await expect(
    page.getByTestId("photo-draft-panel").getByRole("status"),
  ).toHaveText("Saved copy deleted");
  await page
    .getByRole("button", { name: "Open saved photo", exact: true })
    .click();
  await expect(
    page.getByTestId("photo-draft-panel").getByRole("status"),
  ).toHaveText("No saved photo");
  await context.setOffline(false);
});
