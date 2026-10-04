import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173");
  const data = await page.evaluate(async () => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts");
    const { DEFAULT_EDITS } = await import("/src/core/types.ts");
    const { createProfile } = await import("/src/core/geometry.ts");
    const { generate } = await import("/src/core/baseline-v3.ts");
    const { previewPng } = await import("/src/core/preview-png.ts");
    const blob = await (await fetch("/output/portrait/source.jpg")).blob();
    const source = await loadPhoto(
      new File([blob], "source.jpg", { type: "image/jpeg" }),
    );
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const pixels = prepare(c.getContext("2d"), source, DEFAULT_EDITS, 1);
    const profile = createProfile("circle", 120, "dark");
    profile.version = 3;
    profile.maxLines = 3000;
    const start = performance.now();
    const instruction = await generate({
      pixels,
      resolution: 160,
      profile,
      lines: 1400,
      mode: "dark",
    });
    return {
      instruction,
      durationMs: performance.now() - start,
      pixels: [...pixels],
      target: c.toDataURL(),
      preview: [...previewPng(instruction)],
      settings: {
        edits: DEFAULT_EDITS,
        resolution: 160,
        requestedLines: 1400,
        profile,
      },
    };
  });
  mkdirSync("output/portrait", { recursive: true });
  writeFileSync(
    "output/portrait/initial.json",
    JSON.stringify(
      {
        settings: data.settings,
        durationMs: data.durationMs,
        instruction: data.instruction,
      },
      null,
      2,
    ),
  );
  writeFileSync(
    "output/portrait/initial-target.png",
    Buffer.from(data.target.split(",")[1], "base64"),
  );
  writeFileSync(
    "output/portrait/initial-preview.png",
    Buffer.from(data.preview),
  );
  writeFileSync(
    "output/portrait/initial-pixels.json",
    JSON.stringify(data.pixels),
  );
  console.log(
    JSON.stringify({
      algorithm: data.instruction.algorithm,
      durationMs: data.durationMs,
      metrics: data.instruction.metrics,
    }),
  );
} finally {
  await browser.close();
}
