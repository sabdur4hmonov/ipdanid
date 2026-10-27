import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { uiText } from "../../src/ui-i18n";
import { protectedText } from "../../src/protected-generation-i18n";
test.use({ trace: "off" }); // Credentials and prepared image bodies stay private.
async function english(page: Page) {
  const menu = page.getByTestId("customer-menu");
  await menu.locator("summary").click();
  await page.getByTestId("locale-picker").selectOption("en");
  await menu.locator("summary").click();
}
async function choosePhoto(page: Page) {
  let input: string | { name: string; mimeType: string; buffer: Buffer } =
    process.env.IP_RASM_PHASE16_PHOTO ?? "";
  if (!input) {
    const jpeg = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 500;
      const x = canvas.getContext("2d")!;
      x.fillStyle = "white";
      x.fillRect(0, 0, 400, 500);
      x.fillStyle = "#c4a991";
      x.beginPath();
      x.ellipse(200, 235, 110, 165, 0, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = "#252525";
      x.beginPath();
      x.ellipse(200, 115, 112, 70, 0, Math.PI, 2 * Math.PI);
      x.fill();
      x.fillRect(130, 190, 40, 12);
      x.fillRect(230, 190, 40, 12);
      x.strokeStyle = "#504035";
      x.lineWidth = 9;
      x.beginPath();
      x.moveTo(200, 225);
      x.lineTo(185, 280);
      x.lineTo(212, 280);
      x.stroke();
      x.beginPath();
      x.moveTo(160, 330);
      x.quadraticCurveTo(200, 350, 240, 330);
      x.stroke();
      return canvas.toDataURL("image/jpeg", 0.94).split(",")[1];
    });
    input = {
      name: "original-synthetic-portrait.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from(jpeg, "base64"),
    };
  }
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (await chooser).setFiles(input);
  await expect(page.getByTestId("customer-adjust")).toBeVisible();
  await expect(page.locator("button.customer-main-action")).toBeEnabled({
    timeout: 90000,
  });
  await expect(page.getByTestId("server-generation-consent")).toContainText(
    "server",
  );
}
async function result(page: Page) {
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 90000,
  });
  await expect(page.getByTestId("customer-thread-result")).toHaveJSProperty(
    "naturalWidth",
    1000,
  );
  await expect(page.locator(".customer-progress")).toHaveCount(0);
}
test("ordinary upload/adjust/static preview has no client sequence; actual kit unlock persists exact offline progress", async ({
  page,
  request,
  context,
}, info) => {
  const statusChecks: Promise<boolean>[] = [];
  let starts = 0;
  await page.addInitScript(() => {
    (window as any).__localFitterStarts = 0;
    const Original = window.Worker;
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (String(url).includes("generator.worker"))
          (window as any).__localFitterStarts++;
        super(url, options);
      }
    };
  });
  page.on("response", (response) => {
    const path = new URL(response.url()).pathname;
    if (path === "/api/generation/start") starts++;
    if (path === "/api/generation/status" && response.ok())
      statusChecks.push(
        response
          .json()
          .then(
            (v) =>
              ![
                "instruction",
                "segments",
                "steps",
                "target",
                "checkpoint",
              ].some((k) => k in v),
          ),
      );
  });
  await page.goto("/");
  await english(page);
  await page
    .getByTestId("customer-start")
    .screenshot({ path: info.outputPath("01-start.png") });
  await choosePhoto(page);
  const canvas = page.getByTestId("customer-photo"),
    before = await canvas.getAttribute("data-framing");
  await page.getByRole("button", { name: "Before", exact: true }).click();
  await page.getByRole("button", { name: "After", exact: true }).click();
  await page.getByRole("button", { name: /^Rotate/ }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-framing", before!);
  await page.getByRole("slider", { name: "Zoom", exact: true }).fill("1.15");
  const surface = page.getByTestId("customer-gesture-surface"),
    rect = (await surface.boundingBox())!;
  await page.mouse.move(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(
    rect.x + rect.width * 0.54,
    rect.y + rect.height * 0.48,
    { steps: 5 },
  );
  await page.mouse.up();
  const framing = await canvas.getAttribute("data-framing");
  expect(framing === before).toBe(false);
  await page
    .getByTestId("customer-adjust")
    .screenshot({ path: info.outputPath("02-adjust.png") });
  const generationBegan = Date.now();
  await page.locator("button.customer-main-action").click();
  await result(page);
  const generationMilliseconds = Date.now() - generationBegan;
  expect(generationMilliseconds).toBeLessThan(20000);
  await info.attach("generation-timing", {
    body: Buffer.from(
      JSON.stringify({ generationMilliseconds, preparedBeforeTiming: true }),
    ),
    contentType: "application/json",
  });
  expect(await page.evaluate(() => (window as any).__localFitterStarts)).toBe(
    0,
  );
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).some((s) => s.includes('"segments"')),
    ),
  ).toBe(false);
  await page
    .getByTestId("customer-result")
    .screenshot({ path: info.outputPath("03-result-locked.png") });
  await page.getByRole("button", { name: "Adjust again", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-framing", framing!);
  await page.locator("button.customer-main-action").click();
  await result(page);
  expect(starts).toBe(1); // same retained job, no duplicate calculation/upload
  const issued = await request.post("/api/admin/kits/batch", {
    headers: { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN },
    data: {
      profile: "standard-base-r1",
      count: 1,
      requestKey: crypto.randomUUID(),
    },
  });
  expect(issued.ok()).toBe(true);
  const batch = await issued.json();
  expect(batch.codes[0].quota).toBe(3);
  await page
    .getByRole("button", { name: "Start assembling", exact: true })
    .click();
  const gate = page.getByTestId("build-gate");
  await expect(gate).toBeVisible();
  await expect(
    gate.locator('input[type="password"],input[type="email"]'),
  ).toHaveCount(0);
  await page.getByTestId("kit-code").fill(batch.codes[0].code);
  await gate
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  await expect(page.getByTestId("kit-credits")).toContainText("3");
  await page.getByTestId("unlock-build").click();
  await expect(page.getByTestId("player-hash")).toBeVisible({ timeout: 30000 });
  const sequenceHash = (await page.getByTestId("player-hash").textContent())!;
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  await expect(page.getByTestId("library-save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
  const account = await page.evaluate(async () => {
    // Actual client API is exercised by the UI; inspect only its persisted
    // credential internally to query this test account, never return/print it.
    const entry = Object.entries(localStorage).find(
      ([k]) => k === "iprasm.customer.product-4311.v1",
    );
    if (!entry) throw Error("Test account not saved");
    const session = JSON.parse(entry[1]);
    const r = await fetch("/api/builds/account", {
      headers: { Authorization: "Bearer " + session.token },
    });
    return (await r.json()).credits;
  });
  expect(account).toBe(2);
  const navigation = page.getByRole("navigation", {
    name: uiText("en", "main"),
    exact: true,
  });
  await navigation.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible();
  await page
    .getByRole("button", { name: "Start assembling", exact: true })
    .click();
  await expect(page.getByTestId("player-hash")).toHaveText(sequenceHash);
  await expect(page.getByTestId("build-gate")).toHaveCount(0);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("player-hash")).toHaveText(sequenceHash);
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page
      .getByRole("button", { name: "Project JSON", exact: true })
      .first()
      .click(),
  ]);
  const backup = JSON.parse(readFileSync((await download.path())!, "utf8"));
  expect(backup.project.instruction.sequenceHash).toBe(sequenceHash);
  expect(backup.project.progress.confirmed).toBe(1);
  expect(await Promise.all(statusChecks)).not.toContain(false);
  expect(starts).toBe(1);
  await context.setOffline(false);
});
test("server unavailable fails closed; cancel/navigation never starts the local fitter or shows a stale result", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as any).__localFitterStarts = 0;
    const Original = window.Worker;
    window.Worker = class extends Original {
      constructor(url: string | URL, options?: WorkerOptions) {
        if (String(url).includes("generator.worker"))
          (window as any).__localFitterStarts++;
        super(url, options);
      }
    };
  });
  await page.goto("/");
  await english(page);
  await choosePhoto(page);
  await page.route("**/api/generation/config", (route) =>
    route.fulfill({
      json: {
        version: "protected-generation/1",
        consent: "prepared-target-transfer/1",
        enabled: false,
      },
    }),
  );
  await page.locator("button.customer-main-action").click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("customer-result")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__localFitterStarts)).toBe(
    0,
  );
  await page.unroute("**/api/generation/config");
  let release!: () => void;
  const block = new Promise<void>((resolve) => {
    release = resolve;
  });
  let intercepted!: () => void;
  const started = new Promise<void>((resolve) => {
    intercepted = resolve;
  });
  await page.route("**/api/generation/start", async (route) => {
    intercepted();
    await block;
    await route.continue();
  });
  await page.locator("button.customer-main-action").click();
  await started;
  await expect(page.locator(".customer-progress")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const cancelled = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/generation/cancel" && r.ok(),
  );
  release();
  await cancelled;
  await expect(page.locator(".customer-progress")).toHaveCount(0);
  await expect(page.getByTestId("customer-result")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__localFitterStarts)).toBe(
    0,
  );

  await page.unroute("**/api/generation/start");
  let releaseNavigation!: () => void, interceptedNavigation!: () => void;
  const navigationBlock = new Promise<void>((resolve) => {
    releaseNavigation = resolve;
  });
  const navigationStarted = new Promise<void>((resolve) => {
    interceptedNavigation = resolve;
  });
  await page.route("**/api/generation/start", async (route) => {
    interceptedNavigation();
    await navigationBlock;
    await route.continue();
  });
  await page.locator("button.customer-main-action").click();
  await navigationStarted;
  const menu = page.getByTestId("customer-menu");
  await menu.locator("summary").click();
  await menu.getByRole("button", { name: "My projects", exact: true }).click();
  const cancelledNavigation = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/generation/cancel" && r.ok(),
  );
  releaseNavigation();
  await cancelledNavigation;
  const navigation = page.getByRole("navigation", {
    name: uiText("en", "main"),
    exact: true,
  });
  await navigation.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-adjust")).toBeVisible();
  await expect(page.getByTestId("customer-result")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__localFitterStarts)).toBe(
    0,
  );
});
test("prepared-image consent is readable in all four customer languages without horizontal overflow", async ({
  page,
}, info) => {
  await page.goto("/");
  await english(page);
  await choosePhoto(page);
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    const menu = page.getByTestId("customer-menu");
    await menu.locator("summary").click();
    await page.getByTestId("locale-picker").selectOption(locale);
    await menu.locator("summary").click();
    await expect(page.getByTestId("server-generation-consent")).toHaveText(
      protectedText(locale, "consent"),
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page
      .getByTestId("server-generation-consent")
      .screenshot({ path: info.outputPath("consent-" + locale + ".png") });
  }
});
