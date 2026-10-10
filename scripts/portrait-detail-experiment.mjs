import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
const out = "output/portrait-detail";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5183/");
  const target = await page.evaluate(async () => {
    const { contourPortrait } = await import("/src/core/portrait-detail.ts"),
      { putRgb } = await import("/src/core/portrait.ts");
    const bytes = new Uint8Array(
        await (
          await fetch("/output/circle-head-240/circle-target.bin")
        ).arrayBuffer(),
      ),
      pixels = contourPortrait(bytes, 160),
      c = document.createElement("canvas");
    c.width = c.height = 160;
    putRgb(c.getContext("2d"), pixels, 160);
    return { pixels: Array.from(pixels), png: c.toDataURL() };
  });
  writeFileSync(out + "/target.bin", new Uint8Array(target.pixels));
  writeFileSync(
    out + "/target-160.png",
    Buffer.from(target.png.split(",")[1], "base64"),
  );
} finally {
  await browser.close();
}
