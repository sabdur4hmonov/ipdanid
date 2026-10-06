import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const f = "output/contrast",
  browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173/" + f + "/report.html");
  await expect(page.locator("body")).toContainText("quality acceptance open");
  const images = await page
    .locator("img")
    .evaluateAll((list) =>
      list.map((im) => ({
        src: im.getAttribute("src"),
        loaded: im.complete && im.naturalWidth > 0,
      })),
    );
  expect(images.every((im) => im.loaded)).toBe(true);
  for (const name of ["physical-2", "simplified"])
    for (const suffix of ["json", "txt", "png", "pdf"])
      expect(
        (
          await page.request.get(
            `http://127.0.0.1:5173/${f}/${name}-guide.${suffix}`,
          )
        ).ok(),
      ).toBe(true);
  const exactPreviews = await page.evaluate(async () => {
    const { previewPng } = await import("/src/core/preview-png.ts");
    const paths = {
        "pixel-160": "guarded/multiscale-2",
        "pixel-192": "resolution/multiscale-2",
        "physical-2": "contrast/physical-2",
        simplified: "contrast/simplified",
      },
      checks = [];
    for (const [name, path] of Object.entries(paths)) {
      const i = (await (await fetch(`/output/${path}.json`)).json())
        .instruction;
      const pixels = async (blob) => {
        const image = await createImageBitmap(blob),
          c = document.createElement("canvas");
        c.width = c.height = i.params.resolution;
        c.getContext("2d").drawImage(image, 0, 0);
        image.close();
        return c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      };
      const expected = await pixels(
          new Blob([previewPng(i)], { type: "image/png" }),
        ),
        actual = await pixels(
          await (await fetch(`/output/contrast/${name}.png`)).blob(),
        );
      if (!expected.every((v, k) => v === actual[k]))
        throw Error("Report differs from complete sequence: " + name);
      checks.push({ name, sequenceHash: i.sequenceHash, exactPixels: true });
    }
    return checks;
  });
  await page.screenshot({ path: f + "/report-browser.png", fullPage: true });
  await page
    .getByRole("heading", { name: "Ordinary native portraits", exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: f + "/report-delivery-browser.png" });
  await page.goto("http://127.0.0.1:4173/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("output/portrait/source.jpg");
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  const exports = [];
  for (const name of ["physical-2", "simplified"]) {
    const project = JSON.parse(
      readFileSync(`${f}/${name}-guide.json`, "utf8"),
    ).project;
    await page
      .locator("input[type=file]")
      .last()
      .setInputFiles(`${f}/${name}-guide.json`);
    await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
      "data-sequence-hash",
      project.instruction.sequenceHash,
    );
    await expect(page.getByTestId("confirmed-step")).toContainText("0/");
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.context().setOffline(true);
    const e = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project JSON", exact: true })
      .click();
    const actual = JSON.parse(
      readFileSync(await (await e).path(), "utf8"),
    ).project;
    expect(actual.instruction).toEqual(project.instruction);
    expect(actual.progress.confirmed).toBe(0);
    await page.context().setOffline(false);
    exports.push({
      name,
      sequenceHash: actual.instruction.sequenceHash,
      offlineExact: true,
    });
    await page
      .locator("nav")
      .getByRole("button", { name: "My projects", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Reuse settings", exact: true })
    .last()
    .click();
  await expect(
    page.getByLabel("Portrait optimization", { exact: true }),
  ).toHaveValue("physical");
  await expect(
    page.getByLabel("Computation resolution", { exact: true }),
  ).toHaveValue("192");
  const targetHash = await page
    .getByLabel("Exact generation target", { exact: true })
    .evaluate(async (c) => {
      const d = c.getContext("2d").getImageData(0, 0, 192, 192).data,
        rgb = Uint8Array.from(
          { length: 192 * 192 * 3 },
          (_, k) => d[Math.floor(k / 3) * 4 + (k % 3)],
        );
      return [...new Uint8Array(await crypto.subtle.digest("SHA-256", rgb))]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("");
    });
  expect(targetHash).toBe(
    JSON.parse(readFileSync(f + "/physical-2.json", "utf8")).instruction
      .imageHash,
  );
  expect(errors).toEqual([]);
  writeFileSync(
    f + "/browser-evidence.json",
    JSON.stringify(
      {
        images,
        exactPreviews,
        exports,
        targetHash,
        errors,
        realDeviceTested: false,
        physicallyValidated: false,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      loadedImages: images.length,
      exactPreviews: exactPreviews.length,
      exports,
      targetHash,
      errors,
    }),
  );
} finally {
  await browser.close();
}
