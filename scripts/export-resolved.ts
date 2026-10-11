import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const out = "output/portrait-resolved",
  text = readFileSync(out + "/candidate-pruned.json", "utf8"),
  project = JSON.parse(text).project;
if (existsSync(out + "/selected-guide.pdf"))
  throw Error("Preserve completed guide");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5183/");
  const result = await page.evaluate(async (project) => {
    const { exportPdf } = await import("/src/core/pdf.ts" as string),
      { toTxt, validateInstruction } = await import(
        "/src/core/validation.ts" as string
      );
    await validateInstruction(project.instruction);
    return {
      pdf: Array.from(
        await exportPdf(project.instruction, "uz", { confirmed: 0 }),
      ),
      txt: toTxt(project.instruction),
    };
  }, project);
  writeFileSync(out + "/selected-guide.pdf", new Uint8Array(result.pdf), {
    flag: "wx",
  });
  writeFileSync(out + "/selected.txt", result.txt, { flag: "wx" });
  writeFileSync(out + "/selected.json", text, { flag: "wx" });
  console.log(
    JSON.stringify({
      sequenceHash: project.instruction.sequenceHash,
      lines: project.instruction.metrics.lines,
      confirmed: 0,
    }),
  );
} finally {
  await browser.close();
}
