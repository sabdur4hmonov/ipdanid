// Local-only manual annotation of this photograph; these coordinates are evidence, never product defaults.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
const folder = "output/regions";
mkdirSync(folder, { recursive: true });
if (existsSync(`${folder}/corrected.json`))
  throw new Error("Preserve completed region experiment");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/@vite/client", (r) => r.abort());
  await page.goto("http://127.0.0.1:5173");
  await page.exposeFunction("regionCheckpoint", (name, data) => {
    if (name === "progress") {
      console.log(data);
      return;
    }
    if (!existsSync(`${folder}/${name}.json`))
      writeFileSync(`${folder}/${name}.json`, JSON.stringify(data, null, 2));
    console.log(`${name} ${data.instruction?.sequenceHash ?? "audited"}`);
  });
  const result = await page.evaluate(async () => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts"),
      { processPortrait, putRgb, regionMeasurements, portraitRegions } =
        await import("/src/core/portrait.ts"),
      { regionPixels } = await import("/src/core/coordinates.ts"),
      { generate, hash } = await import("/src/core/engine.ts"),
      { generateDensity } = await import("/src/core/density.ts"),
      { rasterSequence } = await import("/src/core/optical.ts"),
      { previewPng } = await import("/src/core/preview-png.ts"),
      { validateInstruction } = await import("/src/core/validation.ts");
    const sourceProject = (
        await (await fetch("/output/portrait/browser-guide.json")).json()
      ).project,
      old = await validateInstruction(
        (await (await fetch("/output/portrait/continued.json")).json())
          .instruction,
      ),
      oldGlobal = await validateInstruction(
        (
          await (
            await fetch("/output/fidelity/distributed-contours.json")
          ).json()
        ).instruction,
      ),
      blob = await (await fetch("/output/portrait/source.jpg")).blob(),
      sourceHash = await hash(new Uint8Array(await blob.arrayBuffer())),
      image = await loadPhoto(
        new File([blob], "source.jpg", { type: "image/jpeg" }),
      ),
      n = 160,
      canvas = document.createElement("canvas");
    if (
      sourceHash !==
      "b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4"
    )
      throw new Error("Wrong source photograph");
    canvas.width = canvas.height = n;
    const raw = prepare(canvas.getContext("2d"), image, sourceProject.edits, 1),
      crop = canvas.toDataURL(),
      portrait = structuredClone(old.params.portrait);
    // Inclusive pixel-center boxes, visually checked on the exact crop. No inferred/detected anatomy.
    const box = (l, t, r, b) => ({
      left: l / 159,
      top: t / 159,
      width: (r - l) / 159,
      height: (b - t) / 159,
    });
    portrait.regions = {
      reference: "processed-target/sample-centers-v1",
      eyes: box(51, 52, 119, 73),
      nose: box(70, 76, 103, 102),
      mouth: box(65, 105, 110, 120),
    };
    const pixels = processPortrait(raw, n, portrait);
    const targetHash = await hash(pixels);
    if (targetHash !== old.imageHash || targetHash !== oldGlobal.imageHash)
      throw new Error("Target changed with region-only correction");
    putRgb(canvas.getContext("2d"), pixels, n);
    const target = canvas.toDataURL();
    const audit = {
      sourceHash,
      targetHash,
      edits: sourceProject.edits,
      portrait,
      oldRegions: portraitRegions(old.params.portrait),
      correctedRegions: portraitRegions(portrait),
      crops: Object.fromEntries(
        Object.entries(portraitRegions(portrait)).map(([k, b]) => [
          k,
          regionPixels(b, n),
        ]),
      ),
      historicalMeasurementsStatus:
        "superseded: proportional bands do not isolate the annotated nose/lips",
      baseline: {
        sequenceHash: old.sequenceHash,
        stored: old.metrics.regions.final,
        recalculated: regionMeasurements(
          pixels,
          rasterSequence(old),
          n,
          old.profile,
          portrait,
        ),
      },
      priorGlobal: {
        sequenceHash: oldGlobal.sequenceHash,
        stored: oldGlobal.metrics.regions.final,
        recalculated: regionMeasurements(
          pixels,
          rasterSequence(oldGlobal),
          n,
          old.profile,
          portrait,
        ),
      },
    };
    await window.regionCheckpoint("audit", audit);
    const options = {
      pixels,
      resolution: n,
      profile: old.profile,
      lines: old.params.requestedLines,
      mode: old.params.mode,
      portrait,
    };
    const stages = [];
    let at = 0;
    const progress = (fraction) => {
      if (performance.now() - at > 10000) {
        at = performance.now();
        window.regionCheckpoint("progress", Math.round(fraction * 100));
      }
    };
    for (const [name, solver] of [
      ["corrected-stage1", generate],
      ["corrected-stage2", generate],
    ]) {
      const started = performance.now(),
        seed = stages.at(-1)?.instruction;
      const persisted = await fetch(`/output/regions/${name}.json`);
      const instruction = persisted.ok
        ? await validateInstruction((await persisted.json()).instruction)
        : await solver({ ...options, seed, onProgress: progress });
      if (
        instruction.imageHash !== targetHash ||
        JSON.stringify(instruction.params.portrait) !== JSON.stringify(portrait)
      )
        throw new Error("Wrong resumed stage");
      await validateInstruction(instruction);
      const stage = persisted.ok
        ? await (await fetch(`/output/regions/${name}.json`)).json()
        : {
            instruction,
            durationMs: performance.now() - started,
            sourceHash,
            edits: sourceProject.edits,
          };
      stages.push(stage);
      if (!persisted.ok) await window.regionCheckpoint(name, stage);
    }
    await window.regionCheckpoint("corrected", {
      ...stages[1],
      label:
        "Fresh corrected-region continuous variant; quality acceptance open",
      transferredProgress: 0,
    });
    return {
      crop,
      target,
      pixels: [...pixels],
      previews: {
        baseline: [...previewPng(old)],
        prior: [...previewPng(oldGlobal)],
        "corrected-stage1": [...previewPng(stages[0].instruction)],
        "corrected-stage2": [...previewPng(stages[1].instruction)],
        corrected: [...previewPng(stages[1].instruction)],
      },
    };
  });
  for (const key of ["crop", "target"])
    writeFileSync(
      `${folder}/${key}.png`,
      Buffer.from(result[key].split(",")[1], "base64"),
    );
  writeFileSync(`${folder}/target.bin`, Buffer.from(result.pixels));
  for (const [name, bytes] of Object.entries(result.previews))
    writeFileSync(`${folder}/${name}.png`, Buffer.from(bytes));
} finally {
  await browser.close();
}
