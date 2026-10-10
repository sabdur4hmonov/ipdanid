import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
// Exercise the real browser exporter; Node's raw CommonJS UPNG interop differs.
const natural = process.argv.includes("--natural");
const out = "output/portrait-detail/" + (natural ? "natural" : "white"),
  text = readFileSync(out + "/candidate-guide.json", "utf8"),
  project = JSON.parse(text).project;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5183/");
  for (const locale of (natural ? ["uz"] : ["uz", "ru", "en"]) as (
    "uz" | "ru" | "en"
  )[]) {
    if (existsSync(`${out}/${locale}-guide.pdf`))
      throw Error("Preserved guide already exists");
    const bytes = await page.evaluate(
      async ({ project, locale }) => {
        const { exportPdf } = await import("/src/core/pdf.ts" as string);
        return Array.from(
          await exportPdf(project.instruction, locale, {
            confirmed: project.progress.confirmed,
          }),
        );
      },
      { project, locale },
    );
    writeFileSync(`${out}/${locale}-guide.pdf`, new Uint8Array(bytes));
    writeFileSync(`${out}/${locale}-guide.json`, text);
  }
  console.log(
    "Complete exact-sequence localized guides exported. Printing/assembly unverified.",
  );
} finally {
  await browser.close();
}
