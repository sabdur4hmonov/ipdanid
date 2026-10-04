import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173");
  for (const scenario of process.argv.slice(2).length
    ? process.argv.slice(2)
    : ["same-target", "crop-baseline", "prepared-baseline", "prepared-v4"]) {
    const data = await page.evaluate(async (scenario) => {
      const { loadPhoto, prepare } = await import("/src/core/image.ts");
      const { DEFAULT_EDITS } = await import("/src/core/types.ts");
      const { createProfile } = await import("/src/core/geometry.ts");
      const { generate } = await import("/src/core/engine.ts");
      const { generate: baseline } = await import("/src/core/baseline-v3.ts");
      const { previewPng } = await import("/src/core/preview-png.ts");
      const { rasterSequence } = await import("/src/core/optical.ts");
      const { processPortrait, regionMeasurements, putRgb } =
        await import("/src/core/portrait.ts");
      const blob = await (await fetch("/output/portrait/source.jpg")).blob();
      const source = await loadPhoto(
        new File([blob], "source.jpg", { type: "image/jpeg" }),
      );
      const c = document.createElement("canvas");
      c.width = c.height = 160;
      const edits = {
        ...DEFAULT_EDITS,
        panY:
          scenario.startsWith("zoom") || scenario === "same-target" ? 0 : 0.12,
        zoom: scenario.startsWith("zoom") ? 1.3 : 1,
      };
      const raw = prepare(c.getContext("2d"), source, edits, 1),
        crop = c.toDataURL();
      const portrait = {
        enabled: true,
        face: {
          left: scenario.startsWith("zoom") ? 0.21 : 0.28,
          top: scenario.startsWith("zoom")
            ? 0.175
            : scenario === "same-target"
              ? 0.25
              : 0.37,
          width: scenario.startsWith("zoom") ? 0.64 : 0.49,
          height: scenario.startsWith("zoom") ? 0.73 : 0.56,
        },
        background: 0.85,
        localContrast: 0.5,
      };
      const pixels =
        scenario.startsWith("prepared") || scenario.startsWith("zoom")
          ? processPortrait(raw, 160, portrait)
          : raw;
      putRgb(c.getContext("2d"), pixels, 160);
      const old = scenario.endsWith("baseline"),
        profile = createProfile(
          "circle",
          scenario.includes("240") ? 240 : 120,
          "dark",
        );
      if (scenario.includes("thin")) profile.threadMm = 0.1;
      if (old) {
        profile.version = 3;
        profile.maxLines = 3000;
      }
      const start = performance.now();
      const instruction = await (old ? baseline : generate)({
        pixels,
        resolution: 160,
        profile,
        lines: old ? 3000 : 20000,
        mode: "dark",
        portrait,
      });
      const raster = rasterSequence(instruction, instruction.metrics.lines);
      return {
        instruction,
        durationMs: performance.now() - start,
        crop,
        target: c.toDataURL(),
        preview: [...previewPng(instruction)],
        regions: regionMeasurements(
          pixels,
          raster,
          160,
          profile,
          portrait.face,
        ),
        settings: { edits, portrait, profile },
      };
    }, scenario);
    mkdirSync("output/portrait", { recursive: true });
    for (const kind of ["crop", "target"])
      writeFileSync(
        `output/portrait/${scenario}-${kind}.png`,
        Buffer.from(data[kind].split(",")[1], "base64"),
      );
    writeFileSync(
      `output/portrait/${scenario}-preview.png`,
      Buffer.from(data.preview),
    );
    delete data.crop;
    delete data.target;
    delete data.preview;
    writeFileSync(
      `output/portrait/${scenario}.json`,
      JSON.stringify(data, null, 2),
    );
    console.log(
      JSON.stringify({
        scenario,
        durationMs: data.durationMs,
        metrics: data.instruction.metrics,
        regions: data.regions,
      }),
    );
  }
} finally {
  await browser.close();
}
