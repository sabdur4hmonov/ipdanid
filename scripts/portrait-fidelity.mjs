import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const edgeWeight = Number(process.argv[2] ?? 1),
  sweeps = Number(process.argv[3] ?? 8),
  prefix = process.argv[4] ?? `density-e${edgeWeight}-s${sweeps}`;
mkdirSync("output/fidelity", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/@vite/client", (r) => r.abort());
  await page.goto("http://127.0.0.1:5173");
  await page.exposeFunction("checkpointProgress", (p) =>
    console.log(`progress ${prefix} ${Math.round(p * 100)}%`),
  );
  const data = await page.evaluate(
    async ({ edgeWeight, sweeps, reroute }) => {
      const { loadPhoto, prepare } = await import("/src/core/image.ts"),
        { processPortrait, putRgb } = await import("/src/core/portrait.ts"),
        { generateDensity } = await import("/src/core/density.ts"),
        { hash } = await import("/src/core/engine.ts"),
        { previewPng } = await import("/src/core/preview-png.ts"),
        { validateInstruction } = await import("/src/core/validation.ts");
      const project = (
          await (await fetch("/output/portrait/browser-guide.json")).json()
        ).project,
        baseline = await validateInstruction(
          (await (await fetch("/output/portrait/continued.json")).json())
            .instruction,
        );
      const blob = await (await fetch("/output/portrait/source.jpg")).blob(),
        source = await loadPhoto(
          new File([blob], "source.jpg", { type: "image/jpeg" }),
        ),
        n = baseline.params.resolution,
        c = document.createElement("canvas");
      c.width = c.height = n;
      const raw = prepare(
          c.getContext("2d"),
          source,
          project.edits,
          baseline.profile.widthMm / baseline.profile.heightMm,
        ),
        crop = c.toDataURL(),
        pixels = processPortrait(raw, n, baseline.params.portrait);
      if ((await hash(pixels)) !== baseline.imageHash)
        throw new Error("Baseline processed target does not reproduce");
      putRgb(c.getContext("2d"), pixels, n);
      const target = c.toDataURL(),
        started = performance.now();
      let last = -1;
      const instruction = await generateDensity(
        {
          pixels,
          resolution: n,
          profile: baseline.profile,
          lines: baseline.params.requestedLines,
          mode: baseline.params.mode,
          portrait: baseline.params.portrait,
          ...(reroute ? { seed: baseline } : {}),
          onProgress: (p) => {
            const percent = Math.floor(p * 20);
            if (percent !== last) {
              last = percent;
              window.checkpointProgress(p);
            }
          },
        },
        { edgeWeight, sweeps },
      );
      await validateInstruction(instruction);
      return {
        instruction,
        baseline,
        crop,
        target,
        pixels: [...pixels],
        sourceHash: await hash(new Uint8Array(await blob.arrayBuffer())),
        edits: project.edits,
        durationMs: performance.now() - started,
        preview: [...previewPng(instruction)],
        baselinePreview: [...previewPng(baseline)],
      };
    },
    { edgeWeight, sweeps, reroute: process.argv.includes("--reroute") },
  );
  for (const name of ["crop", "target"]) {
    writeFileSync(
      `output/fidelity/${name}.png`,
      Buffer.from(data[name].split(",")[1], "base64"),
    );
    delete data[name];
  }
  writeFileSync("output/fidelity/target.bin", Buffer.from(data.pixels));
  delete data.pixels;
  writeFileSync(
    "output/fidelity/baseline.json",
    JSON.stringify(data.baseline, null, 2),
  );
  delete data.baseline;
  writeFileSync(
    "output/fidelity/baseline.png",
    Buffer.from(data.baselinePreview),
  );
  delete data.baselinePreview;
  writeFileSync(`output/fidelity/${prefix}.png`, Buffer.from(data.preview));
  delete data.preview;
  writeFileSync(
    `output/fidelity/${prefix}.json`,
    JSON.stringify(data, null, 2),
  );
  console.log(
    JSON.stringify({
      prefix,
      hash: data.instruction.sequenceHash,
      durationMs: data.durationMs,
      metrics: data.instruction.metrics,
    }),
  );
} finally {
  await browser.close();
}
