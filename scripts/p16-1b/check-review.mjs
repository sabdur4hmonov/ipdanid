import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const url = process.argv[2] || "http://127.0.0.1:4888/";
const parsed = new URL(url);
assert(
  parsed.hostname === "127.0.0.1" &&
    Number(parsed.port) >= 4800 &&
    Number(parsed.port) < 5000,
  "Own isolated review port only",
);
const root = "output/p16-1b-review",
  key = JSON.parse(readFileSync(root + "/key.json", "utf8"));
for (const path of [
  "key.json",
  "public-files.json",
  "private/portrait-01/result.json",
  "private/visual-review.json",
  "../key.json",
  "%2e%2e/key.json",
  "?key.json",
])
  assert.equal((await fetch(new URL(path, url))).status, 404);
assert.equal((await fetch(url, { method: "POST" })).status, 405);
const response = await fetch(url),
  html = await response.text();
assert.equal(response.status, 200);
assert.match(
  response.headers.get("content-security-policy"),
  /default-src 'none'/,
);
for (const text of [
  "key.json",
  "classic-greedy",
  "SSIM",
  "candidate",
  "p16-1b/",
  "baseline",
  "private/",
])
  assert(!html.includes(text), "Blind page leaks " + text);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const screenshots = [];
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1720, height: 1100 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport }),
      errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(url);
    await page.locator("section").first().waitFor();
    assert.equal(await page.locator("section").count(), 8);
    await page
      .locator("img")
      .evaluateAll((images) => images.forEach((i) => (i.loading = "eager")));
    await page.waitForFunction(() =>
      [...document.images].every((i) => i.complete && i.naturalWidth > 0),
    );
    for (const [id, mapping] of Object.entries(key.mapping)) {
      const section = page.locator("#" + id),
        labels = await section.locator("h3").allTextContents();
      assert.deepEqual(new Set(labels), new Set(Object.keys(mapping)));
      const dimensions = await section
        .locator(".render")
        .evaluateAll((images) =>
          images.map((i) => ({
            natural: [i.naturalWidth, i.naturalHeight],
            width: i.getBoundingClientRect().width,
          })),
        );
      assert(
        dimensions.every(
          (d) =>
            d.natural[0] === 1000 &&
            d.natural[1] === 1000 &&
            Math.abs(d.width - dimensions[0].width) < 1,
        ),
      );
      const crops = await section
        .locator(".nose")
        .evaluateAll((images) =>
          images.map((i) => i.getBoundingClientRect().width / i.naturalWidth),
        );
      assert(
        crops.every((scale) => Math.abs(scale - 1.6) < 0.02),
        "Nose crop scales differ",
      );
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Document overflows phone viewport",
    );
    assert.deepEqual(errors, []);
    const out = `${root}/private/screens/${name}.png`;
    mkdirSync(`${root}/private/screens`, { recursive: true });
    await page.screenshot({ path: out, fullPage: false });
    screenshots.push(out);
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(
  `${root}/private/page-validation.json`,
  JSON.stringify(
    {
      desktop: "pass",
      mobile: "pass",
      sections: 8,
      equal1000pxRenders: true,
      equalNoseScale: 1.6,
      privateFilesBlocked: true,
      blindHtmlChecked: true,
      screenshots,
    },
    null,
    2,
  ),
);
console.log(
  "Desktop/mobile blind review, equal scale, eight sections, private-file denial: PASS",
);
