import { openMore, revealControl } from "./navigation";
import { test, expect } from "./legacy-test";
import { readFileSync, readdirSync } from "node:fs";
const folder = "output/portrait-resolved";
test("resolved/pruned import uses the exact optical canvas, immutable offline export and bound settings", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const file = JSON.parse(
      readFileSync(folder + "/candidate-pruned.json", "utf8"),
    ),
    i = file.project.instruction;
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .locator('input[type=file][accept=".json,.txt"]')
    .setInputFiles(folder + "/candidate-pruned.json");
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash, {
    timeout: 60000,
  });
  await expect(page.getByTestId("confirmed-step")).toContainText("0/");
  const { rasterSequence } = await import("../../src/core/optical");
  const raster = rasterSequence(i);
  // Preview PNG uses exactly the same immutable optical raster, not photograph pixels.
  const [png] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Preview PNG", exact: true }).click(),
  ]);
  const bytes = Array.from(readFileSync((await png.path())!));
  const mismatch = await page.evaluate(
    async ({ bytes, rgb, n, base }) => {
      const image = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      );
      const actual = document.createElement("canvas");
      actual.width = image.width;
      actual.height = image.height;
      actual.getContext("2d")!.drawImage(image, 0, 0);
      image.close();
      const source = document.createElement("canvas");
      source.width = source.height = n;
      const rgba = new Uint8ClampedArray(n * n * 4);
      for (let k = 0; k < n * n; k++) {
        rgba.set(rgb.slice(k * 3, k * 3 + 3), k * 4);
        rgba[k * 4 + 3] = 255;
      }
      source.getContext("2d")!.putImageData(new ImageData(rgba, n, n), 0, 0);
      const expected = document.createElement("canvas");
      expected.width = actual.width;
      expected.height = actual.height;
      const ctx = expected.getContext("2d")!;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, expected.width, expected.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        source,
        expected.width * 0.06,
        expected.height * 0.06,
        expected.width * 0.88,
        expected.height * 0.88,
      );
      const a = actual
          .getContext("2d")!
          .getImageData(0, 0, actual.width, actual.height).data,
        b = ctx.getImageData(0, 0, expected.width, expected.height).data;
      let count = 0,
        max = 0;
      for (let k = 0; k < a.length; k++)
        if (a[k] !== b[k]) {
          count++;
          max = Math.max(max, Math.abs(a[k] - b[k]));
        }
      return { count, max };
    },
    {
      bytes,
      rgb: Array.from(raster, (v) => Math.round(v * 255)),
      n: i.params.resolution,
      base: i.profile.baseColor,
    },
  );
  expect(mismatch).toEqual({ count: 0, max: 0 });
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Project JSON", exact: true }).click(),
  ]);
  const exported = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(exported.project.instruction).toEqual(i);
  expect(exported.project.progress.confirmed).toBe(0);
  await context.setOffline(false);
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .click();
  await page.getByText("More", { exact: true }).click();
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page
    .getByTestId("advanced-generation")
    .locator("summary")
    .first()
    .click();
  await page.getByTestId("advanced-photo").locator("summary").first().click();
  await expect(
    page.getByLabel("Computation resolution", { exact: true }),
  ).toHaveValue("320");
  for(const [locale,hint] of [["uz","Ko‘proq hisoblash sifatni kafolatlamaydi."],["ru","Больше вычислений не гарантирует сходство."],["en","More computation does not guarantee likeness."]]){
    await page.getByLabel("Language", { exact: true }).selectOption(locale);
    await expect(page.getByText(hint,{exact:false})).toBeVisible();
  }
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByText("Dimensions and materials", { exact: true }).click();
  await expect(page.getByLabel("Number of pins", { exact: true })).toHaveValue(
    "240",
  );
  await expect(
    page.getByLabel("Thread thickness (mm)", { exact: true }),
  ).toHaveValue("0.1");
  // Settings persist on a synthetic photo without embedding the personal photo in the test page.
  await revealControl(page.getByText("Saved settings", { exact: true }).first());
  await page.getByText("Saved settings", { exact: true }).first().click();
  await revealControl(page.getByLabel("Settings name", { exact: true }));
  await page.getByLabel("Settings name", { exact: true }).fill("Resolved 320 actual240pins");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page.reload();
  await page.getByText("More", { exact: true }).click();
  await openMore(page);
  await page.locator(".more-menu")
    .getByRole("button", { name: "Try an original sample", exact: true })
    .click();
  await page
    .getByTestId("advanced-generation")
    .locator("summary")
    .first()
    .click();
  await revealControl(page.getByText("Saved settings", { exact: true }).first());
  await page.getByText("Saved settings", { exact: true }).first().click();
  await revealControl(page.getByLabel("Saved settings", { exact: true }));
  await page.getByLabel("Saved settings", { exact: true }).selectOption({ label: "Resolved 320 actual240pins" });
  await page.getByTestId("advanced-photo").locator("summary").first().click();
  await expect(
    page.getByLabel("Computation resolution", { exact: true }),
  ).toHaveValue("320");
  await revealControl(page.getByLabel("Portrait optimization", { exact: true }));
  await page.getByLabel("Portrait optimization", { exact: true }).selectOption("guarded");
  await expect(
    page.getByLabel("Computation resolution", { exact: true }),
  ).toHaveValue("160");
});
test("actual production worker reproduces the bound 320 completed checkpoint and keeps the browser responsive", async ({
  page,
}) => {
  test.setTimeout(120000);
  const file = JSON.parse(readFileSync(folder + "/candidate.json", "utf8")),
    i = file.project.instruction,
    checkpoint = JSON.parse(readFileSync(folder + "/fit.json", "utf8")),
    pixels = Array.from(readFileSync(folder + "/target-320.bin"));
  const worker = readdirSync("dist/assets").find((n) =>
    n.startsWith("generator.worker-"),
  )!;
  await page.goto("/");
  const result = await page.evaluate(
    async ({ i, checkpoint, pixels, worker }) =>
      new Promise<any>((resolve, reject) => {
        const w = new Worker("/assets/" + worker, { type: "module" });
        let ticks = 0;
        const timer = setInterval(() => ticks++, 10);
        const timeout = setTimeout(() => {
          w.terminate();
          clearInterval(timer);
          reject(Error("Worker checkpoint timeout"));
        }, 60000);
        w.onmessage = ({ data }) => {
          if (data.jobId !== "resolved-check") return;
          if (data.type === "done" || data.type === "error") {
            clearTimeout(timeout);
            clearInterval(timer);
            w.terminate();
            data.type === "done"
              ? resolve({ instruction: data.instruction, ticks })
              : reject(Error(data.message));
          }
        };
        w.postMessage({
          jobId: "resolved-check",
          strategy: "basis",
          pixels: new Uint8Array(pixels),
          profile: i.profile,
          resolution: 320,
          portrait: i.params.portrait,
          mode: i.params.mode,
          lines: i.params.requestedLines,
          totalSweeps: 8,
          resume: checkpoint,
        });
      }),
    { i, checkpoint, pixels, worker },
  );
  expect(result.instruction.sequenceHash).toBe(i.sequenceHash);
  expect(result.instruction.params.optimization.sampling).toEqual({
    version: "direct-source320/1",
    grid: 320,
  });
  expect(result.ticks).toBeGreaterThan(1);
});
