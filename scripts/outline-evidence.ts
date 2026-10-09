// Local sealed-sequence replay and exports, without rerunning portrait optimization.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { rasterSequence } from "../src/core/optical";
import { validateInstruction } from "../src/core/validation";
const folder = "output/outline";
for (const name of ["baseline", "rectangle", "outline"]) {
  const project = JSON.parse(
    readFileSync(
      `${folder}/${name === "baseline" ? "baseline" : name + "-guide"}.json`,
      "utf8",
    ),
  ).project;
  const instruction = await validateInstruction(project.instruction);
  const raster = rasterSequence(instruction),
    bytes = Buffer.from(raster.buffer, raster.byteOffset, raster.byteLength);
  const file = `${folder}/${name}-sequence.f32`;
  if (existsSync(file) && !bytes.equals(readFileSync(file)))
    throw Error("Sealed replay differs: " + name);
  if (!existsSync(file)) writeFileSync(file, bytes, { flag: "wx" });
}
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await page.goto("http://127.0.0.1:5183/");
  for (const name of ["rectangle", "outline"]) {
    const project = JSON.parse(
      readFileSync(`${folder}/${name}-guide.json`, "utf8"),
    ).project;
    const result = await page.evaluate(async (project) => {
      const { validateInstruction, toTxt } =
        await import("/src/core/validation.ts");
      const { exportPdf } = await import("/src/core/pdf.ts");
      const i = await validateInstruction(project.instruction);
      return {
        sequenceHash: i.sequenceHash,
        txt: toTxt(i),
        pdf: Array.from(
          await exportPdf(i, "en", { confirmed: project.progress.confirmed }),
        ),
      };
    }, project);
    if (result.sequenceHash !== project.instruction.sequenceHash)
      throw Error("Export hash differs");
    for (const [suffix, bytes] of [
      ["pdf", Buffer.from(result.pdf)],
      ["txt", Buffer.from(result.txt)],
    ] as const) {
      const path = `${folder}/${name}-guide.${suffix}`;
      // PDF document IDs are randomized; preserve already exported complete guides.
      if (!existsSync(path)) writeFileSync(path, bytes, { flag: "wx" });
    }
    console.log(
      name,
      result.sequenceHash,
      project.instruction.metrics.lines,
      "sealed replay and exports",
    );
  }
} finally {
  await browser.close();
}
