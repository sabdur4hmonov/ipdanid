import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true });
try {
  const p = await browser.newPage();
  await p.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await p.goto("http://127.0.0.1:5183/");
  const evidence = await p.evaluate(async () => {
    const { prepare, loadPhoto } = await import("/src/core/image.ts"),
      { remapPortrait } = await import("/src/core/shape-crop.ts"),
      { processPortrait, regionMeasurements, putRgb } =
        await import("/src/core/portrait.ts"),
      { rasterSequenceAtResolution } = await import("/src/core/optical.ts"),
      { validateInstruction } = await import("/src/core/validation.ts");
    const settings = await (
        await fetch("/output/circle-head-240/circle-settings.json")
      ).json(),
      image = await loadPhoto(
        new File(
          [await (await fetch("/output/outline/source.jpg")).blob()],
          "source.jpg",
          { type: "image/jpeg" },
        ),
      ),
      n = 512,
      c = document.createElement("canvas");
    c.width = c.height = n;
    const portrait = remapPortrait(
        settings.portrait,
        settings.edits,
        settings.edits,
        image.width,
        image.height,
        1,
        n,
        1,
        160,
      ),
      target = processPortrait(
        prepare(c.getContext("2d"), image, settings.edits, 1),
        n,
        portrait,
      );
    image.close();
    putRgb(c.getContext("2d"), target, n);
    const targetPng = c.toDataURL(),
      rows = [];
    for (const name of ["reference", "control-240", "basis-320"]) {
      const project = (
          await (
            await fetch(
              name === "reference"
                ? "/output/circle-head-240/circle-guide.json"
                : `/output/pin-basis/${name}.json`,
            )
          ).json()
        ).project,
        i = await validateInstruction(project.instruction),
        actual = rasterSequenceAtResolution(i, n);
      putRgb(
        c.getContext("2d"),
        Uint8Array.from(actual, (v) => Math.round(v * 255)),
        n,
      );
      rows.push({
        name,
        sequenceHash: i.sequenceHash,
        regions: regionMeasurements(target, actual, n, i.profile, portrait),
        png: c.toDataURL(),
      });
    }
    return {
      commonResolution: n,
      canonicalTarget:
        "independent source preparation/remapped manual anatomy; unchanged source/crop/processing/physical strand width",
      rows,
      targetPng,
    };
  });
  writeFileSync(
    "output/pin-basis/common-target512.png",
    Buffer.from(evidence.targetPng.split(",")[1], "base64"),
  );
  delete evidence.targetPng;
  for (const row of evidence.rows) {
    writeFileSync(
      `output/pin-basis/${row.name}-common512.png`,
      Buffer.from(row.png.split(",")[1], "base64"),
    );
    delete row.png;
  }
  writeFileSync(
    "output/pin-basis/evaluation512.json",
    JSON.stringify(evidence, null, 2),
  );
  console.log("Independent physical512 comparison complete");
} finally {
  await browser.close();
}
