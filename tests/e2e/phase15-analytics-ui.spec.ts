import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { english, gallery, photoCases } from "./phase12-cases";
import { financeFixture } from "./finance-fixture";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { analyticsText } from "../../src/analytics-i18n";
test.use({ trace: "off" });
async function accountMenu(page: Page) {
  const menu = page.getByTestId("customer-menu");
  if (!(await menu.evaluate((e) => (e as HTMLDetailsElement).open)))
    await menu.locator("summary").click();
  await page
    .getByRole("button", { name: "Account / Admin", exact: true })
    .click();
}
async function open(page: Page, code: string) {
  await page.goto("/");
  await english(page);
  await accountMenu(page);
  await page.getByLabel("Kit code for sign-in", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  await expect(
    page.getByTestId("analytics-settings").getByTestId("analytics-choice"),
  ).toHaveText("Statistics are off");
}
async function owner(page: Page) {
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page
    .getByLabel("Administrator token", { exact: true })
    .fill(process.env.LOCAL_ADMIN_TOKEN!);
  await page
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  const panel = page.getByTestId("analytics-admin");
  await expect(panel.locator('[data-metric="accounts"]')).toBeVisible();
  return panel;
}
test("real photo preview unlock and manual-only assembly milestones obey opt-in, export, undo and erasure with four-locale Admin", async ({
  page,
  request,
}, info) => {
  test.setTimeout(180000);
  const f = await financeFixture(request),
    records: Record<string, unknown>[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().endsWith("/api/analytics/events"))
      records.push(r.postDataJSON());
  });
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [
          {
            name: "Mock English",
            voiceURI: "mock-en",
            lang: "en-US",
            localService: true,
            default: true,
          },
        ],
        addEventListener: () => {},
        removeEventListener: () => {},
        cancel: () => {},
        speak: () => {},
      },
    });
    (window as any).SpeechSynthesisUtterance = class {
      constructor(public text: string) {}
    };
  });
  await open(page, f.code);
  const settings = page.getByTestId("analytics-settings");
  expect(records).toHaveLength(0);
  await settings
    .getByLabel("Share optional usage counts", { exact: true })
    .check();
  await settings
    .getByRole("button", { name: "Save statistics choice", exact: true })
    .click();
  await expect(settings.getByTestId("analytics-choice")).toHaveText(
    "Statistics are on",
  );
  const dir = newEvidenceRoot("output/current-analytics/" + info.project.name);
  mkdirSync(dir, { recursive: true });
  await settings.screenshot({ path: join(dir, "consent-en.png") });
  await page
    .getByRole("navigation", { name: "Main", exact: true })
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await page.getByRole("button", { name: "Square", exact: true }).click();
  await gallery(page, photoCases[0]);
  await page
    .getByTestId("customer-flow")
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  await expect
    .poll(async () => {
      const data = await (
        await request.get("/api/analytics/export", { headers: f.headers })
      ).json();
      return data.events.length;
    })
    .toBe(2);
  expect(records.map((r) => r.shape)).toEqual(["square", "square"]);
  await page
    .getByRole("button", { name: "Start assembling", exact: true })
    .click();
  await expect(page.getByTestId("unlock-build")).toBeEnabled();
  await page.getByTestId("unlock-build").click();
  await expect(page.getByTestId("assembly-focus")).toBeVisible();
  await page.getByTestId("assembly-next").click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/3000");
  expect(
    (
      await (
        await request.get("/api/analytics/export", { headers: f.headers })
      ).json()
    ).events,
  ).toHaveLength(2);
  await page.getByTestId("assembly-confirm").click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("2/3000");
  await expect
    .poll(async () => {
      const data = await (
        await request.get("/api/analytics/export", { headers: f.headers })
      ).json();
      return data.events.filter(
        (e: { kind: string }) => e.kind === "assembly-confirmed",
      ).length;
    })
    .toBe(1);
  await page
    .getByRole("button", { name: "Undo last confirmation", exact: true })
    .click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("0/3000");
  await expect
    .poll(async () => {
      const data = await (
        await request.get("/api/analytics/export", { headers: f.headers })
      ).json();
      return data.events.filter(
        (e: { kind: string }) => e.kind === "assembly-confirmed",
      ).length;
    })
    .toBe(2);
  await page
    .getByRole("navigation", { name: "Main", exact: true })
    .getByRole("button", { name: "Create", exact: true })
    .click();
  await accountMenu(page);
  await expect(
    page.getByTestId("analytics-settings").getByTestId("analytics-choice"),
  ).toHaveText("Statistics are on");
  const download = page.waitForEvent("download");
  await page
    .getByTestId("analytics-settings")
    .getByRole("button", { name: "Download my statistics", exact: true })
    .click();
  const path = join(dir, "statistics.json");
  await (await download).saveAs(path);
  const exported = JSON.parse(readFileSync(path, "utf8"));
  expect(exported.events).toHaveLength(4);
  for (const r of records) {
    expect(Object.keys(r).sort()).toEqual(
      (r.kind === "assembly-confirmed"
        ? [
            "requestKey",
            "consentRevision",
            "kind",
            "sequenceHash",
            "revision",
            "confirmed",
            "total",
          ]
        : ["requestKey", "consentRevision", "kind", "shape"]
      ).sort(),
    );
    expect(JSON.stringify(r)).not.toMatch(
      /photoName|caption|pixels|address|password|token|support/,
    );
  }
  const panel = await owner(page);
  await expect(panel.locator('[data-metric="photos"]')).toHaveText("1");
  await expect(panel.locator('[data-metric="previews"]')).toHaveText("1");
  await expect(panel.locator('[data-metric="unlocked"]')).toHaveText("1");
  await expect(panel.locator('[data-metric="completed"]')).toHaveText("0");
  await panel.screenshot({ path: join(dir, "admin-en.png") });
  for (const locale of ["uz", "ru", "uz-Cyrl"] as const) {
    await page
      .locator("header")
      .getByRole("combobox")
      .first()
      .selectOption(locale);
    await expect(
      panel.getByRole("heading", {
        name: analyticsText(locale, "admin"),
        exact: true,
      }),
    ).toBeVisible();
    await expect(panel.locator('[data-metric="photos"]')).toHaveText("1");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await panel.screenshot({ path: join(dir, "admin-" + locale + ".png") });
  }
  await page.locator("header").getByRole("combobox").first().selectOption("en");
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Account", exact: true })
    .click();
  const current = page.getByTestId("analytics-settings");
  await current
    .getByLabel("Delete my collected statistics and stop collection", {
      exact: true,
    })
    .check();
  await current
    .getByRole("button", { name: "Delete my statistics", exact: true })
    .click();
  await expect(current.getByTestId("analytics-choice")).toHaveText(
    "Statistics are off",
  );
  await current.screenshot({ path: join(dir, "erased-en.png") });
  const before = records.length;
  await page
    .getByRole("navigation", { name: "Main", exact: true })
    .getByRole("button", { name: "Assemble", exact: true })
    .click();
  await page.getByTestId("assembly-confirm").click();
  expect(
    (
      await (
        await request.get("/api/analytics/export", { headers: f.headers })
      ).json()
    ).events,
  ).toEqual([]);
  expect(records).toHaveLength(before);
  await page.reload();
  expect(
    (
      await (
        await request.get("/api/analytics/preferences", { headers: f.headers })
      ).json()
    ).enabled,
  ).toBe(false);
});
test("a delayed private statistics export cannot download after sign out or populate a new account", async ({
  page,
  request,
}) => {
  const f = await financeFixture(request);
  await open(page, f.code);
  const settings = page.getByTestId("analytics-settings");
  let arrived!: () => void,
    release!: () => void,
    downloads = 0;
  const held = new Promise<void>((r) => (arrived = r)),
    hold = new Promise<void>((r) => (release = r));
  page.on("download", () => downloads++);
  await page.route("**/api/analytics/export", async (route) => {
    const response = await route.fetch();
    arrived();
    await hold;
    await route.fulfill({ response });
  });
  await settings
    .getByRole("button", { name: "Download my statistics", exact: true })
    .click();
  await held;
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(settings).toHaveCount(0);
  const other = await financeFixture(request);
  await page
    .getByLabel("Kit code for sign-in", { exact: true })
    .fill(other.code);
  await page
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  release();
  await expect(
    page.getByTestId("analytics-settings").getByTestId("analytics-choice"),
  ).toHaveText("Statistics are off");
  expect(downloads).toBe(0);
});
test("a delayed owner analytics report cannot reappear after switching to Support", async ({
  page,
  request,
}) => {
  const f = await financeFixture(request),
    grant = await request.post("/api/admin/access", {
      headers: f.root,
      data: { name: "Synthetic analytics support", role: "support", days: 1 },
    });
  expect(grant.ok()).toBe(true);
  const support = await grant.json();
  await open(page, f.code);
  const panel = await owner(page);
  let arrived!: () => void,
    release!: () => void,
    first = true;
  const held = new Promise<void>((r) => (arrived = r)),
    hold = new Promise<void>((r) => (release = r));
  await page.route("**/api/admin/analytics", async (route) => {
    if (!first) return route.fallback();
    first = false;
    const response = await route.fetch();
    arrived();
    await hold;
    await route.fulfill({ response });
  });
  await panel.getByRole("button", { name: "Refresh", exact: true }).click();
  await held;
  await page
    .getByLabel("Administrator token", { exact: true })
    .fill(support.token);
  await page
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  await expect(panel).toHaveCount(0);
  release();
  await expect(page.getByTestId("analytics-admin")).toHaveCount(0);
  expect(
    (
      await request.get("/api/admin/analytics", {
        headers: { Authorization: "Bearer " + support.token },
      })
    ).status(),
  ).toBe(403);
});
