import { chromium, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true });
const continuation = process.argv.includes("--continue"),
  seedPrefix = process.argv.find((a) => a.startsWith("--seed="))?.slice(7),
  prefix =
    process.argv.find((a) => a.startsWith("--out="))?.slice(6) ??
    (continuation ? "continued" : "replay");
try {
  const page = await browser.newPage();
  await page.route("**/@vite/client", (route) => route.abort());
  await page.goto("http://127.0.0.1:5173");
  const data = await page.evaluate(
    async ({ continuation, seedPrefix }) => {
      const { loadPhoto, prepare } = await import("/src/core/image.ts"),
        { generate } = await import("/src/core/engine.ts"),
        { processPortrait, putRgb } = await import("/src/core/portrait.ts"),
        { previewPng } = await import("/src/core/preview-png.ts"),
        { validateInstruction } = await import("/src/core/validation.ts");
      const project = (
          await (await fetch("/output/portrait/browser-guide.json")).json()
        ).project,
        seed = await validateInstruction(
          seedPrefix
            ? (
                await (
                  await fetch(`/output/portrait/${seedPrefix}.json`)
                ).json()
              ).instruction
            : project.instruction,
        );
      const source = await loadPhoto(
        new File(
          [await (await fetch("/output/portrait/source.jpg")).blob()],
          "source.jpg",
          { type: "image/jpeg" },
        ),
      );
      const n = seed.params.resolution,
        c = document.createElement("canvas");
      c.width = c.height = n;
      const pixels = processPortrait(
        prepare(
          c.getContext("2d"),
          source,
          project.edits,
          seed.profile.widthMm / seed.profile.heightMm,
        ),
        n,
        seed.params.portrait,
      );
      putRgb(c.getContext("2d"), pixels, n);
      const start = performance.now(),
        instruction = await generate({
          pixels,
          resolution: n,
          profile: seed.profile,
          lines: seed.params.requestedLines,
          mode: seed.params.mode,
          portrait: seed.params.portrait,
          ...(continuation ? { seed } : {}),
        });
      await validateInstruction(instruction);
      return {
        instruction,
        durationMs: performance.now() - start,
        originalHash: seed.sequenceHash,
        originalMetrics: seed.metrics,
        preview: [...previewPng(instruction)],
        target: c.toDataURL(),
      };
    },
    { continuation, seedPrefix },
  );
  writeFileSync(
    `output/portrait/${prefix}-preview.png`,
    Buffer.from(data.preview),
  );
  writeFileSync(
    `output/portrait/${prefix}-target.png`,
    Buffer.from(data.target.split(",")[1], "base64"),
  );
  delete data.preview;
  delete data.target;
  writeFileSync(
    `output/portrait/${prefix}.json`,
    JSON.stringify(data, null, 2),
  );
  if (!continuation)
    expect(data.instruction.sequenceHash).toBe(data.originalHash);
  else {
    expect(data.instruction.params.parentSequenceHash).toBe(data.originalHash);
    expect(data.instruction.metrics.weightedError.final).toBeLessThanOrEqual(
      data.originalMetrics.weightedError.final + 1e-6,
    );
  }
  console.log(
    JSON.stringify({
      prefix,
      durationMs: data.durationMs,
      metrics: data.instruction.metrics,
      hash: data.instruction.sequenceHash,
    }),
  );
} finally {
  await browser.close();
}
