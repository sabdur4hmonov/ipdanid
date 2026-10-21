import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, devices, expect } from "@playwright/test";

const directory = "output/phase15/photo-trial",
  launch = JSON.parse(readFileSync(`${directory}/preview-launch.json`, "utf8")),
  snapshot = JSON.parse(readFileSync(`${directory}/snapshot.json`, "utf8")),
  site = new URL(launch.site),
  api = new URL(launch.api);
assert.equal(site.hostname, "127.0.0.1");
assert(Number(site.port) >= 4210 && Number(site.port) < 4260);
assert.equal(api.hostname, "127.0.0.1");
assert(Number(api.port) >= 4650 && Number(api.port) < 4700);
assert.equal(launch.webDir, "output/phase15-photo-trial-dist");
const health = await (await fetch(`${api}/health`)).json();
assert.equal(health.sandbox, true);
assert.equal(health.livePayments, false);
assert.equal(health.liveMessages, false);
for (const [path, hash] of Object.entries(snapshot.files)) {
  assert(!path.includes("..") && !path.startsWith("/"));
  const response = await fetch(new URL(path, site));
  assert.equal(response.status, 200);
  assert.equal(
    createHash("sha256")
      .update(Buffer.from(await response.arrayBuffer()))
      .digest("hex"),
    hash,
  );
}
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  checks = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext(
      mobile ? devices["Pixel 7"] : { viewport: { width: 1280, height: 900 } },
    );
    try {
      const page = await context.newPage();
      await page.goto(`${site}photo-test/`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Bitta rasm bilan sinab ko‘ramiz",
      );
      assert.equal(await page.locator("section").count(), 6);
      const downloadEvent = page.waitForEvent("download");
      await page
        .getByRole("link", { name: "1. Rasmni saqlash", exact: true })
        .click();
      const download = await downloadEvent;
      assert.equal(download.suggestedFilename(), "namuna-portret.jpg");
      const source = readFileSync(await download.path());
      assert(
        source.equals(
          readFileSync(join(launch.webDir, "photo-test/namuna-portret.jpg")),
        ),
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: `${directory}/${mobile ? "mobile" : "desktop"}-report.png`,
        fullPage: true,
      });
      await page
        .getByRole("link", { name: "2. Ilovani ochish", exact: true })
        .click();
      await expect(page.getByTestId("customer-flow")).toHaveAttribute(
        "data-screen",
        "start",
      );
      const chooser = page.waitForEvent("filechooser");
      await page
        .getByRole("button", { name: "Galereyadan tanlash", exact: true })
        .click();
      await (
        await chooser
      ).setFiles({
        name: "namuna-portret.jpg",
        mimeType: "image/jpeg",
        buffer: source,
      });
      await expect(page.getByTestId("customer-photo")).not.toHaveAttribute(
        "data-framing",
        "null",
        { timeout: 90000 },
      );
      const generate = page
        .getByTestId("customer-flow")
        .getByRole("button", { name: "Yaratish", exact: true });
      await expect(generate).toBeEnabled();
      const start = Date.now();
      await generate.click();
      await expect(page.getByTestId("customer-result")).toBeVisible({
        timeout: 60000,
      });
      const elapsedMs = Date.now() - start;
      assert(elapsedMs < 15000);
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("iprasm.projects.v1") ?? "[]")
                .length,
          ),
        )
        .toBe(1);
      const hash = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("iprasm.projects.v1"))[0].instruction
            .sequenceHash,
      );
      assert.equal(
        hash,
        snapshot.results.find((r) => r.shape === "circle").sequenceHash,
      );
      await page.screenshot({
        path: `${directory}/${mobile ? "mobile" : "desktop"}-live-result.png`,
        fullPage: true,
      });
      checks.push({
        mobile,
        downloadExact: true,
        normalPhotoFlow: true,
        elapsedMs,
        exactSequenceHash: hash,
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
const result = {
  site: String(site),
  servedFilesExact: Object.keys(snapshot.files).length,
  healthSafe: true,
  checks,
  ownerCodeRedeemed: false,
};
writeFileSync(
  `${directory}/live-verification.json`,
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result));
