import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { freemem } from "node:os";
import { chromium, expect } from "@playwright/test";
assert(freemem() >= 1.5 * 1024 ** 3);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    serviceWorkers: "block",
  });
  await context.addInitScript(() =>
    localStorage.setItem("iprasm.locale", "en"),
  );
  await context.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:4900"
      ? route.continue()
      : route.abort(),
  );
  const page = await context.newPage();
  let protectedWrites = 0;
  page.on("request", (r) => {
    if (
      r.method() === "POST" &&
      /\/api\/(account|generation|builds)/.test(new URL(r.url()).pathname)
    )
      protectedWrites++;
  });
  await page.goto("http://127.0.0.1:4900/");
  await page.getByTestId("customer-account-link").click();
  await expect(page.getByTestId("website-login")).toBeVisible();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    assert(
      (await page.getByTestId("customer-account-link").boundingBox()).y >= 0,
      "Account header clipped above viewport",
    );
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Account horizontal overflow",
    );
  }
  await page.setViewportSize({ width: 360, height: 800 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "360px login overflow",
  );
  await page.screenshot({
    path: "output/website-w1/screens/website-login-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Main sections", exact: true })
    .getByRole("button", { name: "Create", exact: true })
    .click();
  const src = readFileSync("output/phase10/inputs/synthetic-1.png").toString(
    "base64",
  );
  const jpeg = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = "data:image/png;base64," + src;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 1100;
    c.height = 1200;
    const x = c.getContext("2d");
    x.fillStyle = "#eeeae2";
    x.fillRect(0, 0, 1100, 1200);
    x.fillStyle = "#b9a183";
    x.fillRect(0, 820, 1100, 380);
    x.drawImage(img, 382, 180, 336, 420);
    return c.toDataURL("image/jpeg", 0.96).split(",")[1];
  }, src);
  const file = {
    name: "far-person-at-desk.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(jpeg, "base64"),
  };
  const pick = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (await pick).setFiles(file);
  const modal = page.getByTestId("far-face-modal");
  await expect(modal).toBeVisible({ timeout: 90000 });
  await page.screenshot({
    path: "output/website-w1/screens/website-far-mobile.png",
    fullPage: true,
  });
  const replace = page.waitForEvent("filechooser");
  await modal
    .getByRole("button", { name: "Choose another photo", exact: true })
    .click();
  const next = await replace;
  await expect(modal).toHaveCount(0);
  await next.setFiles(file);
  await expect(modal).toBeVisible({ timeout: 90000 });
  await modal
    .getByRole("button", { name: "Continue anyway", exact: true })
    .click();
  await expect(modal).toHaveCount(0);
  await expect(page.locator("button.customer-main-action")).toBeEnabled({
    timeout: 90000,
  });
  assert.equal(
    protectedWrites,
    0,
    "Owner preview must not spend a code or start a fit during readiness check",
  );
  console.log(
    JSON.stringify({
      ownerPreview: true,
      mobileWidth: 360,
      loginOverflow: false,
      farModal: true,
      chooseAnother: true,
      continueAnyway: true,
      kitCodesUsed: 0,
      generationStarts: 0,
    }),
  );
} finally {
  await browser.close();
}
