import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
const base = "http://127.0.0.1:4891/",
  root = "output/p16-1c-review";
const key = JSON.parse(readFileSync(root + "/key.json", "utf8"));
for (const p of [
  "key.json",
  "public-files.json",
  "private/preparation.json",
  "private/photo-01/F2-route.json",
  "%2e%2e/key.json",
  "?key.json",
])
  assert.equal((await fetch(new URL(p, base))).status, 404);
assert.equal((await fetch(base, { method: "POST" })).status, 405);
const html = await (await fetch(base)).text();
for (const text of [
  "F0",
  "F1",
  "F2",
  "SSIM",
  "baseline",
  "classic",
  "key.json",
  "private/",
  "faceHeight",
])
  assert(!html.includes(text), "Blind HTML leaks " + text);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const [name, viewport] of [
    ["desktop", { width: 1720, height: 1100 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport }),
      errors = [];
    page.on("pageerror", (error) => errors.push(String(error)));
    await page.goto(base);
    await page
      .locator("img")
      .evaluateAll((images) => images.forEach((i) => (i.loading = "eager")));
    await page.waitForFunction(() =>
      [...document.images].every((i) => i.complete && i.naturalWidth > 0),
    );
    assert.equal(await page.locator("section").count(), 6);
    for (const c of key.cases) {
      const section = page.locator("#" + c.id),
        expected = key.mapping[c.id];
      assert.deepEqual(
        new Set(await section.locator("h3").allTextContents()),
        new Set(Object.keys(expected)),
      );
      assert.equal(
        await section.locator("article").count(),
        Object.values(c.rows).filter((r) => r.eligible).length,
      );
      const full = await section
        .locator(".full")
        .evaluateAll((images) =>
          images.map((i) => ({
            w: i.getBoundingClientRect().width,
            h: i.getBoundingClientRect().height,
            n: i.naturalWidth,
          })),
        );
      assert(
        full.every(
          (i) =>
            i.n === 1000 &&
            Math.abs(i.w - i.h) < 1 &&
            Math.abs(i.w - full[0].w) < 1,
        ),
      );
      assert(
        await section
          .locator(".small")
          .evaluateAll((images) =>
            images.every(
              (i) =>
                i.naturalWidth === 250 &&
                i.naturalHeight === 250 &&
                Math.abs(i.getBoundingClientRect().width - 250) < 1,
            ),
          ),
      );
    }
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    if (name === "mobile") {
      const scroll = page.locator(".scroll").first();
      assert(await scroll.evaluate((el) => el.scrollWidth > el.clientWidth));
      await scroll.evaluate((el) => (el.scrollLeft = el.scrollWidth));
      assert(await scroll.evaluate((el) => el.scrollLeft > 0));
    }
    assert.deepEqual(errors, []);
    mkdirSync(root + "/private/screens", { recursive: true });
    await page.screenshot({ path: `${root}/private/screens/${name}.png` });
    for (const id of ["photo-01", "photo-03", "photo-06"])
      await page
        .locator("#" + id)
        .screenshot({ path: `${root}/private/screens/${name}-${id}.png` });
    results.push({
      name,
      sections: 6,
      equalPhysicalSize: true,
      smallView250: true,
      privateFilesDenied: true,
      errors: 0,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
writeFileSync(
  root + "/private/page-validation.json",
  JSON.stringify(results, null, 2),
);
console.log(
  "Desktop/mobile framing page: six cases, equal-size renders,250px views,private-file denial PASS",
);
