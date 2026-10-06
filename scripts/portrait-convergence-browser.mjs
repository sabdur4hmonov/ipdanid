import { chromium, expect } from "@playwright/test";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const folder = "output/convergence",
  read = (p) => JSON.parse(readFileSync(p, "utf8"));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173/" + folder + "/report.html");
  await expect(page.locator("body")).toContainText("reject default promotion");
  await page
    .locator("img")
    .evaluateAll(async (list) => Promise.all(list.map((im) => im.decode())));
  const images = await page
    .locator("img")
    .evaluateAll((list) =>
      list.map((im) => ({
        src: im.getAttribute("src"),
        loaded: im.complete && im.naturalWidth > 0,
        width: im.width,
        height: im.height,
      })),
    );
  expect(images.every((im) => im.loaded)).toBe(true);
  const exactPreviews = await page.evaluate(async () => {
    const { previewPng } = await import("/src/core/preview-png.ts"),
      checks = [];
    const names = [
      "total-12",
      "total-16",
      "total-19",
      "exchange-single",
      "exchange-paired",
      "exchange-targeted-single",
      "exchange-targeted-paired",
    ];
    for (const name of names) {
      const i = (
        await (await fetch("/output/convergence/" + name + ".json")).json()
      ).instruction;
      const pixels = async (blob) => {
        const im = await createImageBitmap(blob),
          c = document.createElement("canvas");
        c.width = c.height = i.params.resolution;
        c.getContext("2d").drawImage(im, 0, 0);
        im.close();
        return c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      };
      const expected = await pixels(
          new Blob([previewPng(i)], { type: "image/png" }),
        ),
        actual = await pixels(
          await (await fetch("/output/convergence/" + name + ".png")).blob(),
        );
      if (!expected.every((v, k) => v === actual[k]))
        throw Error("Wrong report sequence " + name);
      checks.push({ name, sequenceHash: i.sequenceHash, exactPixels: true });
    }
    return checks;
  });
  await page
    .getByRole("heading", {
      name: "Each candidate beside the same source crop at 160 pixels",
      exact: true,
    })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: folder + "/report-delivery-browser.png" });
  if (process.argv.includes("--report-only")) {
    writeFileSync(
      folder + "/report-browser-evidence.json",
      JSON.stringify({ images, exactPreviews, errors }, null, 2),
    );
    expect(errors).toEqual([]);
    console.log(
      JSON.stringify({
        loadedImages: images.length,
        exactPreviews: exactPreviews.length,
        errors,
      }),
    );
  } else {
    if (process.argv.includes("--report-only")) {
      writeFileSync(
        folder + "/report-browser-evidence.json",
        JSON.stringify({ images, exactPreviews, errors }, null, 2),
      );
      expect(errors).toEqual([]);
      console.log(
        JSON.stringify({
          loadedImages: images.length,
          exactPreviews: exactPreviews.length,
          errors,
        }),
      );
    } else {
      await page.goto("http://127.0.0.1:4173/");
      await page.getByLabel("Language").selectOption("en");
      await page
        .locator("nav")
        .getByRole("button", { name: "My projects", exact: true })
        .click();
      const exports = [];
      for (const name of ["total-19", "exchange-targeted-paired"]) {
        const project = read(folder + "/" + name + "-guide.json").project;
        await page
          .locator("input[type=file]")
          .last()
          .setInputFiles(folder + "/" + name + "-guide.json");
        await expect(
          page.locator("canvas[data-sequence-hash]"),
        ).toHaveAttribute(
          "data-sequence-hash",
          project.instruction.sequenceHash,
        );
        await expect(page.getByTestId("confirmed-step")).toContainText("0/");
        await page.evaluate(async () => navigator.serviceWorker.ready);
        await page.context().setOffline(true);
        const download = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Project JSON", exact: true })
          .click();
        const actual = read(await (await download).path()).project;
        expect(actual.instruction).toEqual(project.instruction);
        expect(actual.progress.confirmed).toBe(0);
        await page.context().setOffline(false);
        exports.push({
          name,
          sequenceHash: actual.instruction.sequenceHash,
          offlineExact: true,
          zeroProgress: true,
        });
        await page
          .locator("nav")
          .getByRole("button", { name: "My projects", exact: true })
          .click();
      }
      // Rapid selection through the real saved-project UI must update the player/canvas/export together.
      for (let pass = 0; pass < 3; pass++)
        for (const name of ["total-19", "exchange-targeted-paired"]) {
          const project = read(folder + "/" + name + "-guide.json").project;
          const card = page
            .locator("article")
            .filter({ hasText: project.name });
          await card
            .getByRole("button", { name: "Resume", exact: true })
            .click();
          await expect(
            page.locator("canvas[data-sequence-hash]"),
          ).toHaveAttribute(
            "data-sequence-hash",
            project.instruction.sequenceHash,
          );
          await expect(page.getByTestId("confirmed-step")).toContainText("0/");
          await page
            .locator("nav")
            .getByRole("button", { name: "My projects", exact: true })
            .click();
        }
      const workerFile = readdirSync("dist/assets").find((n) =>
        n.startsWith("generator.worker-"),
      );
      const root = read("output/contrast/physical-2.json").instruction,
        seed = read("output/resolution/basis-refined.json").instruction;
      const jobs = [
        {
          name: "total-19",
          seed,
          resume: read(folder + "/fit-total-19.json"),
          extension: {
            checkpoint: read("output/contrast/physical-2-fit-checkpoint.json"),
            priorSweepLimit: 8,
            reference: root,
          },
          totalSweeps: 24,
        },
        {
          name: "exchange-targeted-paired",
          seed: read(folder + "/total-19.json").instruction,
          resume: read(folder + "/exchange-targeted-paired-state.json"),
          exchange: read(folder + "/exchange-targeted-paired.json").instruction
            .params.optimization.exchange,
        },
      ];
      await page.evaluate(async () => navigator.serviceWorker.ready);
      await page.context().setOffline(true);
      const workers = [];
      for (const [index, job] of jobs.entries()) {
        const expected = read(folder + "/" + job.name + ".json").instruction,
          start = Date.now();
        const data = await page.evaluate(
          async ({ job, workerFile, pixels, id }) =>
            new Promise((resolve, reject) => {
              const w = new Worker("/assets/" + workerFile, { type: "module" }),
                stages = [];
              const timer = setTimeout(() => {
                w.terminate();
                reject(Error("Bounded worker replay exceeded ceiling"));
              }, 180000);
              w.onerror = (e) => {
                clearTimeout(timer);
                w.terminate();
                reject(Error(e.message));
              };
              w.onmessage = ({ data }) => {
                if (data.jobId !== id) {
                  clearTimeout(timer);
                  w.terminate();
                  reject(Error("Wrong worker job"));
                  return;
                }
                if (data.type === "stage") stages.push(data.diagnostic);
                if (data.type === "done" || data.type === "error") {
                  clearTimeout(timer);
                  w.terminate();
                  data.type === "done"
                    ? resolve({ instruction: data.instruction, stages })
                    : reject(Error(data.message));
                }
              };
              w.postMessage({
                jobId: id,
                strategy: "physical",
                pixels: new Uint8Array(pixels),
                resolution: 192,
                profile: job.seed.profile,
                portrait: job.seed.params.portrait,
                mode: job.seed.params.mode,
                lines: job.seed.params.requestedLines,
                seed: job.seed,
                resume: job.resume,
                extension: job.extension,
                totalSweeps: job.totalSweeps,
                exchange: job.exchange,
              });
            }),
          {
            job,
            workerFile,
            pixels: [...readFileSync("output/resolution/target.bin")],
            id: 884 + index,
          },
        );
        expect(data.instruction.sequenceHash).toBe(expected.sequenceHash);
        expect(data.instruction.segments).toEqual(expected.segments);
        expect(data.instruction.profile).toEqual(expected.profile);
        expect(data.instruction.params).toEqual(expected.params);
        workers.push({
          name: job.name,
          sequenceHash: expected.sequenceHash,
          wrapperMs: Date.now() - start,
          offline: true,
          actualCompiledWorker: workerFile,
          stages: data.stages,
          searchRepeated: false,
        });
      }
      expect(errors).toEqual([]);
      writeFileSync(
        folder + "/browser-evidence.json",
        JSON.stringify(
          {
            images,
            exactPreviews,
            exports,
            rapidSwitches: 6,
            workers,
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
          workers: workers.map(({ stages, ...r }) => r),
          errors,
        }),
      );
    }
  }
} finally {
  await browser.close();
}
