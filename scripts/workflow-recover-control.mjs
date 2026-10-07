// Reproduce the observed unsaved screenshot variant. Only an EXACT recorded
// sequence-hash match may be retained as the historical control.
import { chromium } from "@playwright/test";
import { writeFileSync, existsSync } from "node:fs";
const folder = "output/workflow",
  expected = "1ea608f6eb191e27857a1ea40f3c98629a7889ad172f41346d6be9e244058007";
if (existsSync(folder + "/historical-control.json"))
  throw Error("Preserve exact control");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/");
  const result = await page.evaluate(async (expected) => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts"),
      { processPortrait, snapshotPortrait } =
        await import("/src/core/portrait.ts"),
      { createProfile } = await import("/src/core/geometry.ts"),
      { validateInstruction } = await import("/src/core/validation.ts"),
      { previewPng } = await import("/src/core/preview-png.ts");
    const photo = await loadPhoto(
      new File(
        [await (await fetch("/output/portrait/source.jpg")).blob()],
        "source.jpg",
        { type: "image/jpeg" },
      ),
    );
    const image = document.createElement("canvas"),
      ratio = Math.min(1, 1536 / Math.max(photo.width, photo.height));
    image.width = Math.round(photo.width * ratio);
    image.height = Math.round(photo.height * ratio);
    image.getContext("2d").drawImage(photo, 0, 0, image.width, image.height);
    photo.close();
    const edits = {
      zoom: 0.6795704571147614,
      panX: -0.17380169039392387,
      panY: 0.02363596321607634,
      rotation: 0,
      brightness: 0,
      contrast: 1,
    };
    const portrait = snapshotPortrait({
      enabled: false,
      face: {
        left: 0.18353274576610332,
        top: 0.401461934792124,
        width: 0.32505649486854393,
        height: 0.2718281828459048,
      },
      background: 0.75,
      localContrast: 0.35,
    });
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const pixels = processPortrait(
        prepare(c.getContext("2d"), image, edits, 1),
        160,
        portrait,
      ),
      source = c.toDataURL();
    const profile = createProfile("heart", 120, "dark");
    profile.threadMm = 0.3;
    profile.stockMeters = 1200;
    const w = new Worker("/src/core/generator.worker.ts", { type: "module" });
    const i = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        w.terminate();
        reject(Error("Bounded historical reproduction timed out"));
      }, 180000);
      w.onmessage = ({ data }) => {
        if (data.type === "done" || data.type === "error") {
          clearTimeout(timer);
          w.terminate();
          data.type === "done"
            ? resolve(data.instruction)
            : reject(Error(data.message));
        }
      };
      w.postMessage({
        pixels,
        profile,
        portrait,
        resolution: 160,
        lines: 1400,
        mode: "dark",
        strategy: "continuous",
        jobId: 1,
      });
    });
    await validateInstruction(i);
    if (i.sequenceHash !== expected)
      return {
        matched: false,
        actual: i.sequenceHash,
        expected,
        metrics: i.metrics,
      };
    return {
      matched: true,
      instruction: i,
      edits,
      source,
      png: Array.from(previewPng(i)),
    };
  }, expected);
  writeFileSync(
    folder + "/historical-control-recovery.json",
    JSON.stringify({ ...result, source: undefined, png: undefined }, null, 2),
  );
  if (!result.matched)
    throw Error("Historical control did not match; do not relabel it");
  writeFileSync(
    folder + "/historical-control.json",
    JSON.stringify(
      { instruction: result.instruction, edits: result.edits },
      null,
      2,
    ),
  );
  writeFileSync(folder + "/historical-control.png", Buffer.from(result.png));
  writeFileSync(
    folder + "/historical-source.png",
    Buffer.from(result.source.split(",")[1], "base64"),
  );
  console.log(
    JSON.stringify({
      matched: true,
      hash: expected,
      metrics: result.instruction.metrics,
    }),
  );
} finally {
  await browser.close();
}
