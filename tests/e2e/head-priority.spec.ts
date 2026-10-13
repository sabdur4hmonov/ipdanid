import { test, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import { rasterSequence } from "../../src/core/optical";
test("face-protected hair-cycle guide imports as its immutable sequence and exports a complete PDF", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const path = "output/head-quality/cycles.json",
    file = JSON.parse(readFileSync(path, "utf8")),
    i = file.project.instruction;
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .locator('input[type=file][accept=".json,.txt"]')
    .setInputFiles(path);
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  await expect(page.getByTestId("confirmed-step")).toContainText(
    `0/${i.metrics.lines}`,
  );
  const [preview] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Preview PNG", exact: true }).click(),
  ]);
  const previewBytes = Array.from(readFileSync((await preview.path())!));
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
      bytes: previewBytes,
      rgb: Array.from(rasterSequence(i), (v) => Math.round(v * 255)),
      n: i.params.resolution,
      base: i.profile.baseColor,
    },
  );
  expect(mismatch).toEqual({ count: 0, max: 0 });
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  const [projectJson] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Project JSON", exact: true }).click(),
  ]);
  const exported = JSON.parse(
    readFileSync((await projectJson.path())!, "utf8"),
  );
  expect(exported.project.instruction).toEqual(i);
  expect(exported.project.progress.confirmed).toBe(0);
  await context.setOffline(false);
  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "PDF guide", exact: true }).last().click(),
  ]);
  writeFileSync(
    "output/head-quality/face-protected-hair-cycles.pdf",
    readFileSync((await pdf.path())!),
  );
  expect((await pdf.suggestedFilename()).toLowerCase()).toContain("pdf");
});
