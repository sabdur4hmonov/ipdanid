import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const folder = "output/outline",
  browser = await chromium.launch({ headless: true });
try {
  const report = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    }),
    errors = [];
  report.on("pageerror", (e) => errors.push(e.message));
  await report.goto("http://127.0.0.1:5183/" + folder + "/report.html");
  await report
    .locator("img")
    .evaluateAll((list) => Promise.all(list.map((im) => im.decode())));
  const exact = await report.evaluate(async () => {
    const { previewPng } = await import("/src/core/preview-png.ts");
    const { validateInstruction } = await import("/src/core/validation.ts");
    const evidence = [];
    for (const name of ["baseline", "rectangle", "outline"]) {
      const file = name === "baseline" ? "baseline.json" : name + "-guide.json";
      const i = await validateInstruction(
        (await (await fetch("/output/outline/" + file)).json()).project
          .instruction,
      );
      const pixels = async (blob) => {
        const im = await createImageBitmap(blob),
          c = document.createElement("canvas");
        c.width = c.height = i.params.resolution;
        c.getContext("2d").drawImage(im, 0, 0);
        im.close();
        return c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      };
      const a = await pixels(new Blob([previewPng(i)], { type: "image/png" })),
        b = await pixels(
          await (
            await fetch("/output/outline/" + name + "-sequence.png")
          ).blob(),
        );
      if (!a.every((v, j) => v === b[j]))
        throw Error("Report is not exact full sequence: " + name);
      evidence.push({
        name,
        sequenceHash: i.sequenceHash,
        exactPreviewPixels: true,
      });
    }
    return evidence;
  });
  await report.screenshot({ path: folder + "/report-browser.png" });
  const context = await browser.newContext(),
    page = await context.newPage(),
    projects = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4183/");
  await page.getByLabel("Language").selectOption("en");
  for (const name of ["rectangle", "outline"]) {
    const project = JSON.parse(
      readFileSync(`${folder}/${name}-guide.json`, "utf8"),
    ).project;
    await page
      .locator("nav")
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    await page
      .locator("input[type=file]")
      .last()
      .setInputFiles(`${folder}/${name}-guide.json`);
    await expect(page.getByTestId("confirmed-step")).toContainText("0/", {
      timeout: 60000,
    });
    await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
      "data-sequence-hash",
      project.instruction.sequenceHash,
    );
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await page
      .locator("nav")
      .getByRole("button", { name: "My projects", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Resume", exact: true })
      .first()
      .click();
    await expect(page.getByTestId("player-hash")).toContainText(
      project.instruction.sequenceHash,
    );
    const d = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project JSON", exact: true })
      .click();
    const actual = JSON.parse(
      readFileSync(await (await d).path(), "utf8"),
    ).project;
    expect(actual.instruction).toEqual(project.instruction);
    expect(actual.edits).toEqual(project.edits);
    expect(actual.progress.confirmed).toBe(0);
    await context.setOffline(false);
    projects.push({
      name,
      hash: actual.instruction.sequenceHash,
      offlineReload: true,
      exactExport: true,
      zeroProgress: true,
    });
  }
  await context.close();
  expect(errors).toEqual([]);
  writeFileSync(
    folder + "/browser-evidence.json",
    JSON.stringify({ exact, projects, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      exactPreviews: exact.length,
      offlineProjects: projects.length,
      errors,
    }),
  );
} finally {
  await browser.close();
}
