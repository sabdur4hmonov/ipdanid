import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { validateInstruction, toTxt } from "../src/core/validation";
const pinCount = Number(process.argv[2] ?? 160);
if (![160, 240].includes(pinCount)) throw Error("Use 160 or 240 pins");
const folder =
  (pinCount === 160 ? "output/circle-head" : "output/circle-head-240") +
  (process.argv[3] === "--clean-background" ? "-clean" : "") +
  (process.argv.includes("--resolution=192") ? "-192" : "");
const project = JSON.parse(
  readFileSync(`${folder}/circle-guide.json`, "utf8"),
).project;
const instruction = await validateInstruction(project.instruction);
if (project.progress.confirmed !== 0)
  throw Error("New guide must start at zero");
writeFileSync(`${folder}/circle-guide.txt`, toTxt(instruction));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await page.goto("http://127.0.0.1:5183/");
  const bytes = await page.evaluate(async (i) => {
    const { exportPdf } = await import("/src/core/pdf.ts");
    const { previewPng } = await import("/src/core/preview-png.ts");
    return {
      pdf: Array.from(await exportPdf(i, "en", { confirmed: 0 })),
      png: Array.from(previewPng(i)),
    };
  }, instruction);
  writeFileSync(`${folder}/circle-sequence.png`, Buffer.from(bytes.png));
  if (!existsSync(`${folder}/circle-guide.pdf`))
    writeFileSync(`${folder}/circle-guide.pdf`, Buffer.from(bytes.pdf), {
      flag: "wx",
    });
  console.log(
    JSON.stringify({
      hash: instruction.sequenceHash,
      steps: instruction.metrics.lines,
      exports: "PNG/TXT/PDF/JSON",
      progress: 0,
    }),
  );
} finally {
  await browser.close();
}
