import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { chromium } from "@playwright/test";
const out = "output/thread-fineness",
  text = readFileSync(out + "/candidate.json", "utf8"),
  project = JSON.parse(text).project;
const prefix = process.argv.includes("--material-label") ? "uz-material" : "uz";
if (existsSync(out + `/${prefix}-guide.pdf`))
  throw Error("Preserved PDF exists");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5183/");
  const bytes = await page.evaluate(async (project) => {
    const { exportPdf } = await import("/src/core/pdf.ts" as string);
    return Array.from(
      await exportPdf(project.instruction, "uz", {
        confirmed: project.progress.confirmed,
      }),
    );
  }, project);
  writeFileSync(out + `/${prefix}-guide.pdf`, new Uint8Array(bytes), {
    flag: "wx",
  });
  writeFileSync(out + `/${prefix}-guide.json`, text, { flag: "wx" });
  console.log(
    "Complete 0.05 mm guide exported; physical use requires actual matching thread.",
  );
} finally {
  await browser.close();
}
