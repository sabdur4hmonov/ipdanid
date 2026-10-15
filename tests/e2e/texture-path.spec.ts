import { test, expect } from "./legacy-test";
import { readFileSync, readdirSync } from "node:fs";
import {
  PDFDocument,
  PDFName,
  PDFRawStream,
  decodePDFRawStream,
} from "pdf-lib";
import { rasterSequence } from "../../src/core/optical";

test("v17 Worker replays exact bound guide and refuses changed strength", async ({
  page,
}) => {
  test.setTimeout(180000);
  const seed = JSON.parse(
      readFileSync("output/resolved-convergence/final.json", "utf8"),
    ).project.instruction,
    expected = JSON.parse(
      readFileSync("output/local-texture-v17/candidate.json", "utf8"),
    ).project.instruction,
    resume = JSON.parse(
      readFileSync("output/local-texture-v17/candidate-fit.json", "utf8"),
    ),
    pixels = Array.from(
      readFileSync("output/portrait-dispatch/target-320.bin"),
    ),
    name = readdirSync("dist/assets").find((n) =>
      n.startsWith("generator.worker-"),
    )!;
  await page.goto("/");
  const results = await page.evaluate(
    async ({ seed, expected, resume, pixels, name }) => {
      const run = (changed: boolean) =>
        new Promise<any>((resolve, reject) => {
          const worker = new Worker("/assets/" + name, { type: "module" }),
            events: any[] = [];
          const timer = setTimeout(() => {
            worker.terminate();
            reject(Error("Texture worker timeout"));
          }, 120000);
          worker.onmessage = ({ data }) => {
            events.push({ type: data.type, jobId: data.jobId });
            if (["done", "error"].includes(data.type)) {
              clearTimeout(timer);
              worker.terminate();
              resolve({ data, events });
            }
          };
          worker.onerror = (e) => {
            clearTimeout(timer);
            worker.terminate();
            reject(Error(e.message));
          };
          const texture = { ...expected.params.optimization.texture };
          if (changed) texture.strength += 0.1;
          worker.postMessage({
            jobId: changed ? "texture-changed" : "texture-bound",
            strategy: "texture",
            seed,
            resume,
            pixels: Uint8Array.from(pixels),
            profile: seed.profile,
            portrait: seed.params.portrait,
            resolution: 320,
            mode: "dark",
            lines: seed.params.requestedLines,
            totalSweeps: 1,
            texture,
          });
        });
      return [await run(false), await run(true)];
    },
    { seed, expected, resume, pixels, name },
  );
  expect(results[0].data.type).toBe("done");
  expect(results[0].data.instruction.sequenceHash).toBe(expected.sequenceHash);
  expect(results[0].data.instruction.segments).toEqual(expected.segments);
  expect(results[0].events.every((e: any) => e.jobId === "texture-bound")).toBe(
    true,
  );
  expect(results[1].data.type).toBe("error");
  expect(results[1].data.jobId).toBe("texture-changed");
});

test("v17 import keeps zero progress and exact JSON TXT optical PDF sequence", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const file = JSON.parse(
      readFileSync("output/local-texture-v17/candidate.json", "utf8"),
    ),
    i = file.project.instruction;
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .locator('input[accept=".json,.txt"]')
    .setInputFiles("output/local-texture-v17/candidate.json");
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  await expect(page.getByTestId("confirmed-step")).toContainText(
    `0/${i.metrics.lines}`,
  );
  for (const button of ["Project JSON", "TXT sequence", "PDF guide"]) {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: button, exact: true })
      .last()
      .click();
    const download = await pending,
      path = (await download.path())!;
    if (button === "Project JSON") {
      const actual = JSON.parse(readFileSync(path, "utf8"));
      expect(actual.project.instruction).toEqual(i);
      expect(actual.project.progress.confirmed).toBe(0);
    }
    if (button === "TXT sequence")
      expect(JSON.parse(readFileSync(path, "utf8").split("\n")[1])).toEqual(i);
    if (button === "PDF guide") {
      const pdf = await PDFDocument.load(readFileSync(path)),
        images = pdf
          .getPage(0)
          .node.Resources()!
          .lookup(PDFName.of("XObject")) as any;
      const previews = images
        .entries()
        .map((entry: any) => pdf.context.lookup(entry[1]))
        .filter(
          (s: any) =>
            s instanceof PDFRawStream &&
            s.dict.get(PDFName.of("Subtype"))?.toString() === "/Image",
        );
      expect(previews).toHaveLength(1);
      expect(previews[0].dict.get(PDFName.of("Width")).asNumber()).toBe(320);
      expect(Buffer.from(decodePDFRawStream(previews[0]).decode())).toEqual(
        Buffer.from(
          Uint8Array.from(rasterSequence(i), (v) => Math.round(v * 255)),
        ),
      );
    }
    await download.saveAs(
      info.outputPath(
        `${button.replaceAll(" ", "-")}.${button === "PDF guide" ? "pdf" : button === "TXT sequence" ? "txt" : "json"}`,
      ),
    );
  }
  await page.screenshot({
    path: info.outputPath("texture-player.png"),
    fullPage: true,
  });
});
