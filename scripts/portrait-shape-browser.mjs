import { chromium, expect } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const f = "output/shape-fit",
  browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173/" + f + "/report.html");
  await page
    .locator("img")
    .evaluateAll((list) => Promise.all(list.map((im) => im.decode())));
  const exact = await page.evaluate(async () => {
    const { previewPng } = await import("/src/core/preview-png.ts"),
      { validateInstruction } = await import("/src/core/validation.ts");
    const checks = [];
    for (const name of ["before", "after", "physical"]) {
      const i = await validateInstruction(
        (await (await fetch("/output/shape-fit/" + name + ".json")).json())
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
          await (await fetch("/output/shape-fit/" + name + ".png")).blob(),
        );
      if (!a.every((v, j) => v === b[j]))
        throw Error("Report sequence mismatch " + name);
      checks.push({ name, hash: i.sequenceHash, exactPixels: true });
    }
    return checks;
  });
  await page.screenshot({ path: f + "/report-delivery-browser.png" });
  const root = JSON.parse(readFileSync(f + "/physical-guide.json", "utf8"));
  for (const name of ["before", "after"]) {
    const record = JSON.parse(readFileSync(f + "/" + name + ".json", "utf8"));
    const guide = structuredClone(root);
    guide.project.id = crypto.randomUUID();
    guide.project.name =
      "NEW 160-pin heart / " + name + " (portrait quality OPEN)";
    guide.project.instruction = record.instruction;
    guide.project.edits = record.edits;
    const progress = await page.evaluate(
      async (i) => (await import("/src/core/validation.ts")).progressFor(i),
      record.instruction,
    );
    guide.project.progress = progress;
    if (!existsSync(f + "/" + name + "-guide.json"))
      writeFileSync(
        f + "/" + name + "-guide.json",
        JSON.stringify(guide, null, 2),
        { flag: "wx" },
      );
  }
  await page.goto("http://127.0.0.1:4173/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator("nav")
    .getByRole("button", { name: "My projects", exact: true })
    .click();
  const projects = [];
  for (const name of ["before", "after", "physical"]) {
    const p = JSON.parse(
      readFileSync(f + "/" + name + "-guide.json", "utf8"),
    ).project;
    await page
      .locator("input[type=file]")
      .last()
      .setInputFiles(f + "/" + name + "-guide.json");
    // Whole-guide validation includes optical/distribution provenance and can
    // exceed the default five-second assertion timeout on the v8 record.
    await expect(page.getByTestId("confirmed-step")).toBeVisible({
      timeout: 60000,
    });
    await expect(page.locator("canvas[data-sequence-hash]")).toHaveAttribute(
      "data-sequence-hash",
      p.instruction.sequenceHash,
    );
    await expect(page.getByTestId("confirmed-step")).toContainText("0/");
    await page.evaluate(async () => navigator.serviceWorker.ready);
    await page.context().setOffline(true);
    const d = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Project JSON", exact: true })
      .click();
    const actual = JSON.parse(
      readFileSync(await (await d).path(), "utf8"),
    ).project;
    expect(actual.instruction).toEqual(p.instruction);
    expect(actual.edits).toEqual(p.edits);
    expect(actual.progress.confirmed).toBe(0);
    await page.context().setOffline(false);
    projects.push({
      name,
      hash: actual.instruction.sequenceHash,
      exactOfflineExport: true,
      zeroProgress: true,
      cropPreserved: true,
    });
    await page
      .locator("nav")
      .getByRole("button", { name: "My projects", exact: true })
      .click();
  }
  expect(errors).toEqual([]);
  writeFileSync(
    f + "/browser-evidence.json",
    JSON.stringify({ exact, projects, errors }, null, 2),
  );
  console.log(
    JSON.stringify({
      previews: exact.length,
      offlineProjects: projects.length,
      errors,
    }),
  );
} finally {
  await browser.close();
}
