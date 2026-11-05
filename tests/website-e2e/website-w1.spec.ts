import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { websiteText } from "../../src/website-i18n";
import { customerFlowText } from "../../src/customer-flow-i18n";
import { english, choosePhoto, result } from "../protected-e2e/helpers";
test.use({ trace: "off" });

async function farPhoto(page: import("@playwright/test").Page) {
  const input = readFileSync("output/phase10/inputs/synthetic-1.png").toString(
    "base64",
  );
  const jpeg = await page.evaluate(async (input) => {
    const img = new Image();
    img.src = "data:image/png;base64," + input;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = 1100;
    c.height = 1200;
    const x = c.getContext("2d")!;
    x.fillStyle = "#eeeae2";
    x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = "#b9a183";
    x.fillRect(0, 820, c.width, 380);
    x.drawImage(img, 382, 180, 336, 420);
    return c.toDataURL("image/jpeg", 0.96).split(",")[1];
  }, input);
  return {
    name: "far-person-at-desk.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(jpeg, "base64"),
  };
}
test("far portrait warning is actionable in all four locales, crop is reversible and low pixels are explained", async ({
  page,
}, info) => {
  await page.goto("/");
  await english(page);
  const f = await farPhoto(page);
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    await page.evaluate(
      (l) => localStorage.setItem("iprasm.locale", l),
      locale,
    );
    await page.reload();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", {
        name: customerFlowText(locale, "gallery"),
        exact: true,
      })
      .click();
    await (await chooser).setFiles(f);
    const modal = page.getByTestId("far-face-modal");
    await expect(modal).toBeVisible({ timeout: 90000 });
    await expect(modal).toContainText(websiteText(locale, "far"));
    await page.screenshot({
      path: info.outputPath(`far-face-${locale}.png`),
      fullPage: true,
    });
    await modal
      .getByRole("button", { name: websiteText(locale, "crop"), exact: true })
      .click();
    await expect(modal).toHaveCount(0);
    await expect(page.getByTestId("low-face-warning")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  const photo = page.getByTestId("customer-photo"),
    initial = await photo.getAttribute("data-framing");
  await page.getByRole("slider", { name: "Zoom", exact: true }).fill("1.25");
  expect(await photo.getAttribute("data-framing")).not.toBe(initial);
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(photo).toHaveAttribute("data-framing", initial!);
  await page.getByRole("button", { name: "Before", exact: true }).click();
  await page.getByRole("button", { name: "After", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("far-cropped.png"),
    fullPage: true,
  });
});

test("unlimited anonymous previews lead to purchase for both actions; login attaches a kit and a second device restores the work", async ({
  page,
  request,
  browser,
}, info) => {
  await page.goto("/");
  await english(page);
  await page.screenshot({ path: info.outputPath("start.png"), fullPage: true });
  await expect(page.getByTestId("customer-account-link")).toBeVisible();
  await expect(page.getByTestId("customer-contact")).toHaveAttribute(
    "href",
    /^https:\/\/t.me\//,
  );
  let loginCalls = 0;
  page.on("request", (r) => {
    if (
      /\/api\/(session|account\/(login|register|kit))$/.test(
        new URL(r.url()).pathname,
      )
    )
      loginCalls++;
  });
  await choosePhoto(page, true);
  await page.locator("button.customer-main-action").click();
  await result(page);
  expect(loginCalls).toBe(0);
  await page.evaluate(() =>
    document.documentElement.style.setProperty("--safe-top", "32px"),
  );
  expect(
    (await page.locator(".customer-toolbar").boundingBox())!.y,
  ).toBeGreaterThanOrEqual(32);
  await page.screenshot({
    path: info.outputPath("result.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Start assembling", exact: true })
    .click();
  await expect(page.getByTestId("buy-screen")).toContainText(
    "3 complete portraits",
  );
  const link = new URL(
    (await page.getByTestId("buy-telegram").getAttribute("href"))!,
  );
  expect(link.searchParams.get("text")).toMatch(/[a-f0-9]{64}/);
  await expect(
    page.locator('[data-testid="buy-screen"] a[href^="tel:"]'),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("buy-screen.png"),
    fullPage: true,
  });
  const viewport = page.viewportSize()!;
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    expect(
      (await page.getByTestId("buy-screen").boundingBox())!.width,
    ).toBeLessThan(width);
  }
  await page.setViewportSize(viewport);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Download PDF", exact: true }).click();
  await expect(page.getByTestId("buy-screen")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Adjust again", exact: true }).click();
  await page.getByRole("slider", { name: "Zoom", exact: true }).fill("1.12");
  await page.locator("button.customer-main-action").click();
  await result(page);
  expect(loginCalls).toBe(0);
  await page.getByTestId("customer-account-link").click();
  const login = page.getByTestId("website-login");
  await expect(login).toBeVisible();
  const identity = "w1_" + crypto.randomUUID().slice(0, 8),
    password = "local test long password";
  await login.getByTestId("account-identity").fill(identity);
  await login.locator('input[type="password"]').first().fill(password);
  await login
    .getByRole("button", { name: "Register this account", exact: true })
    .click();
  await expect(page.getByTestId("customer-credits")).toHaveText("0");
  await page.screenshot({
    path: info.outputPath("account.png"),
    fullPage: true,
    mask: [page.locator(".recovery-key")],
  });
  const nav = page.getByRole("navigation", {
    name: "Main sections",
    exact: true,
  });
  await nav.getByRole("button", { name: "Create", exact: true }).click();
  await page
    .getByRole("button", { name: "Start assembling", exact: true })
    .click();
  await page.getByTestId("have-kit-code").click();
  const issued = await request.post("/api/admin/kits/batch", {
    headers: { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN },
    data: {
      profile: "standard-base-r1",
      count: 1,
      requestKey: crypto.randomUUID(),
    },
  });
  expect(issued.ok()).toBe(true);
  const b = await issued.json();
  await page.getByTestId("kit-code").fill(b.codes[0].code);
  await page
    .getByTestId("build-gate")
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  await expect(page.getByTestId("kit-credits")).toContainText("3");
  await page.getByTestId("unlock-build").click();
  await expect(page.getByTestId("player-hash")).toBeVisible({ timeout: 30000 });
  const hash = await page.getByTestId("player-hash").textContent();
  const second = await browser.newContext({
    baseURL: info.project.use.baseURL,
  });
  try {
    const p = await second.newPage();
    await p.goto("/");
    await english(p);
    await p.getByTestId("customer-account-link").click();
    const auth = p.getByTestId("website-login");
    await auth.getByTestId("account-identity").fill(identity);
    await auth.locator('input[type="password"]').first().fill(password);
    await auth.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(p.getByTestId("customer-credits")).toHaveText("2");
    await p
      .getByTestId("customer-account-link")
      .filter({ visible: true })
      .click();
    await expect(p.getByTestId("works-credits")).toHaveText("2");
    await expect(p.getByTestId("recovery-project")).toContainText(
      hash!.slice(0, 16),
    );
    await p.screenshot({
      path: info.outputPath("second-device-works.png"),
      fullPage: true,
    });
  } finally {
    await second.close();
  }
});
