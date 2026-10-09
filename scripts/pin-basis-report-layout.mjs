import { chromium, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({ headless: true }),
  evidence = [];
try {
  for (const kind of ["pin-basis", "grid"]) for (const width of [393, 1280]) {
    const p = await browser.newPage({ viewport: { width, height: 900 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`http://127.0.0.1:5183/output/${kind}/report.html`);
    await p
      .locator("img")
      .evaluateAll((images) => Promise.all(images.map((i) => i.decode())));
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
    await p.screenshot({
      path: `output/${kind}/report-${width}.png`,
      fullPage: true,
    });
    evidence.push({ kind, width, allImagesDecoded: true, noOverflow: true, errors });
    await p.close();
  }
  writeFileSync(
    "output/pin-basis/report-layout.json",
    JSON.stringify(evidence, null, 2),
  );
} finally {
  await browser.close();
}
