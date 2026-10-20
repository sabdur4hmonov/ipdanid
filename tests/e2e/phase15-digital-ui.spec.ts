import {
  test,
  expect,
  devices,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { english } from "./phase12-cases";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { newEvidenceRoot } from "../helpers/evidence-paths";
test.use({ trace: "off" });
const root = () => ({
  Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN!,
});
async function enter(page: Page) {
  await page.goto("/");
  await english(page);
  await page.getByTestId("customer-menu").locator("summary").click();
  await page
    .getByRole("button", { name: "Account / Admin", exact: true })
    .click();
}
async function register(page: Page) {
  const hub = page.locator(".customer-hub");
  await hub
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await hub
    .getByLabel("Email", { exact: true })
    .fill("digital-ui-" + crypto.randomUUID() + "@example.com");
  await hub
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill("isolated digital UI password");
  await hub
    .getByRole("button", { name: "Register this account", exact: true })
    .click();
  await expect(hub.locator(".recovery-key code")).toBeVisible();
}
async function fixture(
  request: APIRequestContext,
  kind: "app" | "gift",
  enabled = false,
) {
  const id = "digital-ui-" + kind + "-" + crypto.randomUUID().slice(0, 8),
    name = "Original " + kind + " purchase " + id.slice(-8);
  expect(
    (
      await request.post("/api/admin/products", {
        headers: root(),
        data: {
          id,
          name,
          family: "digital",
          price_minor: 10000,
          currency: "UZS",
          stock: 20,
          credits: 3,
          description: "Original digital UI fixture",
          expectedRevision: 0,
          active: 1,
          profile_id: "standard-base-r1",
        },
      })
    ).ok(),
  ).toBe(true);
  if (enabled)
    expect(
      (
        await request.post("/api/admin/journeys/products", {
          headers: root(),
          data: {
            version: "journey-product/1",
            productId: id,
            kind,
            enabled: true,
            revision: 0,
          },
        })
      ).ok(),
    ).toBe(true);
  return { id, name };
}
async function enableUI(page: Page, id: string, kind: "app" | "gift") {
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
  const p = page.getByTestId("digital-admin");
  await p
    .getByRole("combobox", { name: "Digital product", exact: true })
    .selectOption(id);
  await p
    .getByRole("combobox", { name: "Purchase type", exact: true })
    .selectOption(kind);
  await p.getByLabel("Offer this purchase", { exact: true }).check();
  await p.getByRole("button", { name: "Save", exact: true }).click();
  await expect(p.getByRole("status")).toHaveText("Saved");
  return p;
}
async function shop(page: Page) {
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Shop", exact: true })
    .click();
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Refresh", exact: true })
    .click();
  return page.getByTestId("digital-studio");
}
async function buy(page: Page, name: string, kind: "app" | "gift") {
  const studio = page.getByTestId("digital-studio"),
    p = studio
      .getByTestId("digital-product")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await p
    .getByRole("button", {
      name: kind === "app" ? "Buy app credits" : "Buy a gift",
      exact: true,
    })
    .click();
  const form = studio.getByTestId("digital-purchase-form");
  await form
    .getByLabel("Your name", { exact: true })
    .fill("Synthetic digital buyer");
  await form
    .getByRole("button", { name: "Create purchase", exact: true })
    .click();
  const order = studio
    .getByTestId("digital-order")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(order).toBeVisible();
  return order;
}
test("owner enables app-only purchase; customer pays once with no physical delivery and resumes the receipt", async ({
  page,
  request,
}, info) => {
  const out = newEvidenceRoot("output/current-digital/" + info.project.name);
  mkdirSync(out, { recursive: true });
  const p = await fixture(request, "app");
  await enter(page);
  await register(page);
  const admin = await enableUI(page, p.id, "app");
  await admin.screenshot({ path: join(out, "owner-app-policy.png") });
  const studio = await shop(page);
  await expect(studio).toContainText("No board or shipping");
  const order = await buy(page, p.name, "app");
  await expect(studio.getByLabel("City", { exact: true })).toHaveCount(0);
  await expect(studio.getByLabel("Address", { exact: true })).toHaveCount(0);
  await order.getByTestId("pay-click").click();
  await order.getByTestId("simulate-payment").click();
  await expect(order).toContainText("Paid");
  await expect(page.getByTestId("customer-credits")).toHaveText("3");
  await studio.screenshot({ path: join(out, "app-purchase-paid.png") });
  await enter(page);
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Shop", exact: true })
    .click();
  await expect(
    page.getByTestId("digital-order").filter({
      has: page.getByRole("heading", { name: p.name, exact: true }),
    }),
  ).toContainText("Paid");
  await expect(page.getByTestId("customer-credits")).toHaveText("3");
  for (const [locale, phrase] of [
    ["uz", "Taxta va dostavka kirmaydi."],
    ["uz-Cyrl", "Тахта ва доставка кирмайди."],
    ["ru", "Основа и доставка не включены."],
    ["en", "No board or shipping is included."],
  ]) {
    await page
      .getByRole("combobox", { name: "Language", exact: true })
      .selectOption(locale);
    await expect(page.getByTestId("digital-studio")).toContainText(phrase);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (locale === "uz-Cyrl")
      await page
        .getByTestId("digital-studio")
        .screenshot({ path: join(out, "app-paid-cyrl.png") });
  }
});
test("paid gift link opens a private explicit claim; one recipient receives credits and the source code disappears", async ({
  page,
  request,
  browser,
}, info) => {
  test.setTimeout(180000);
  const out = newEvidenceRoot("output/current-digital/" + info.project.name);
  mkdirSync(out, { recursive: true });
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as any).__digitalClipboard = value;
        },
      },
    }),
  );
  const p = await fixture(request, "gift");
  await enter(page);
  await register(page);
  await enableUI(page, p.id, "gift");
  const studio = await shop(page),
    order = await buy(page, p.name, "gift");
  await order.getByTestId("pay-payme").click();
  await order.getByTestId("simulate-payment").click();
  await expect(order.getByTestId("purchased-gift")).toContainText(
    "Ready to claim",
  );
  await expect(page.getByTestId("customer-credits")).toHaveText("0");
  await expect(order.locator("[data-sensitive]")).toHaveCount(0);
  await order
    .getByRole("button", { name: "Copy gift link", exact: true })
    .click();
  const link = await page.evaluate(
      () => (window as any).__digitalClipboard as string,
    ),
    token = new URL(link).hash.slice(6);
  expect(link.includes("#gift=") && !new URL(link).search).toBe(true);
  await order.screenshot({ path: join(out, "gift-paid-private.png") });
  const context = await browser.newContext(
      info.project.name === "mobile-browser"
        ? { ...devices["Pixel 7"] }
        : { viewport: { width: 1280, height: 900 } },
    ),
    recipient = await context.newPage();
  let credentialInUrl = false,
    claims = 0;
  recipient.on("request", (req) => {
    if (
      req.url().includes(token) ||
      (req.headers()["referer"] ?? "").includes(token)
    )
      credentialInUrl = true;
    if (new URL(req.url()).pathname === "/api/gifts/redeem") claims++;
  });
  await recipient.goto(link);
  await recipient
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("en");
  await expect.poll(() => recipient.url().includes("#gift=")).toBe(false);
  const claim = recipient.getByTestId("gift-claim");
  await expect(claim).toBeVisible();
  await expect(
    claim.getByRole("button", { name: "Add gift to my account", exact: true }),
  ).toBeDisabled();
  expect(claims).toBe(0);
  await register(recipient);
  await expect(
    claim.getByRole("button", { name: "Add gift to my account", exact: true }),
  ).toBeEnabled();
  expect(claims).toBe(0);
  await claim
    .getByRole("button", { name: "Add gift to my account", exact: true })
    .click();
  await expect(claim).toHaveCount(0);
  await expect(recipient.getByTestId("customer-credits")).toHaveText("3");
  expect(claims).toBe(1);
  expect(credentialInUrl).toBe(false);
  await recipient
    .locator(".customer-session")
    .screenshot({ path: join(out, "recipient-claimed.png") });
  await studio.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(order.getByTestId("purchased-gift")).toContainText("Claimed");
  await expect(
    order.getByRole("button", { name: "Copy gift link", exact: true }),
  ).toHaveCount(0);
  await order.screenshot({ path: join(out, "gift-claimed-no-code.png") });
  await context.close();
});

test("manual non-UZS app purchase keeps original seller details and never offers a UZS provider", async ({
  page,
  request,
}, info) => {
  const p = await fixture(request, "app", true),
    all = await (
      await request.get("/api/admin/products", { headers: root() })
    ).json(),
    product = all.find((v: any) => v.id === p.id);
  expect(
    (
      await request.post("/api/admin/products", {
        headers: root(),
        data: {
          ...product,
          currency: "USD",
          price_minor: 12000,
          expectedRevision: product.revision,
        },
      })
    ).ok(),
  ).toBe(true);
  const original = await (
    await request.get("/api/admin/settings", { headers: root() })
  ).json();
  expect(
    (
      await request.post("/api/admin/settings", {
        headers: root(),
        data: {
          ...original,
          sellerName: "Original synthetic seller",
          sellerPhone: "901234567",
          paymentDetails: "Original synthetic transfer notes",
        },
      })
    ).ok(),
  ).toBe(true);
  try {
    await enter(page);
    await register(page);
    await shop(page);
    const order = await buy(page, p.name, "app");
    await expect(order).toContainText("120 USD");
    await expect(order.getByTestId("digital-seller")).toContainText(
      "Original synthetic transfer notes",
    );
    await expect(order.getByTestId("pay-click")).toHaveCount(0);
    await expect(order.getByTestId("pay-payme")).toHaveCount(0);
    const current = await (
      await request.get("/api/admin/settings", { headers: root() })
    ).json();
    expect(
      (
        await request.post("/api/admin/settings", {
          headers: root(),
          data: {
            ...current,
            sellerName: "Changed later seller",
            paymentDetails: "Changed later transfer notes",
          },
        })
      ).ok(),
    ).toBe(true);
    const orders = await (
        await request.get("/api/admin/orders", { headers: root() })
      ).json(),
      accepted = orders.find((o: any) =>
        o.items.some((i: any) => i.product_id === p.id),
      );
    expect(!!accepted).toBe(true);
    const editor = await enableUI(page, p.id, "app");
    await editor
      .getByRole("combobox", { name: "Purchase type", exact: true })
      .selectOption("gift");
    const adminOrder = page
      .locator("#admin-orders article")
      .filter({ has: page.locator("code").filter({ hasText: accepted.id }) });
    await adminOrder
      .getByRole("button", { name: "Record test payment", exact: true })
      .click();
    await expect(adminOrder).toContainText("Test payment recorded");
    await expect(
      editor.getByRole("combobox", { name: "Purchase type", exact: true }),
    ).toHaveValue("gift");
    const actual = await (await request.get("/api/catalog")).json();
    expect(actual.journeys.find((v: any) => v.productId === p.id).kind).toBe(
      "app",
    );
    await shop(page);
    await expect(order).toContainText("Paid");
    await expect(order.getByTestId("digital-seller")).toContainText(
      "Original synthetic transfer notes",
    );
    await expect(page.getByTestId("customer-credits")).toHaveText("3");
    const out = newEvidenceRoot("output/current-digital/" + info.project.name);
    mkdirSync(out, { recursive: true });
    await order.screenshot({ path: join(out, "usd-manual-seller.png") });
  } finally {
    const current = await (
      await request.get("/api/admin/settings", { headers: root() })
    ).json();
    expect(
      (
        await request.post("/api/admin/settings", {
          headers: root(),
          data: { ...original, revision: current.revision },
        })
      ).ok(),
    ).toBe(true);
  }
});
