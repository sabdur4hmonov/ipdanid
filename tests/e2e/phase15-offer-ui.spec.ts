import { test, expect } from "./legacy-test";
import type { Page, APIRequestContext } from "@playwright/test";
import { openMore } from "./navigation";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { newEvidenceRoot } from "../helpers/evidence-paths";
// These cases inject network responses; dedicated offline suites retain service workers.
test.use({ serviceWorkers: "block" });

test.use({ trace: "off" });
const admin = () => ({
  Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN!,
});
async function enter(page: Page) {
  await page.goto("/");
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await openMore(page);
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
}
async function register(page: Page) {
  const hub = page.locator(".customer-hub");
  await hub
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await hub
    .getByLabel("Email", { exact: true })
    .fill("offers-ui-" + crypto.randomUUID() + "@example.com");
  await hub
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill("isolated offer UI test password");
  await hub
    .getByRole("button", { name: "Register this account", exact: true })
    .click();
  await expect(hub.locator(".recovery-key code")).toBeVisible();
}
async function adminUI(page: Page) {
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
  await expect(
    page.getByTestId("offer-admin").getByTestId("promo-editor"),
  ).toBeVisible();
}
async function fixture(request: APIRequestContext) {
  const id = "offer-ui-" + crypto.randomUUID(),
    name = "Original offer UI kit " + id.slice(-6);
  expect(
    (
      await request.post("/api/admin/products", {
        headers: admin(),
        data: {
          id,
          name,
          family: "string",
          price_minor: 10000,
          stock: 20,
          credits: 3,
          description: "Original fixture",
          expectedRevision: 0,
          active: 1,
          profile_id: "standard-base-r1",
        },
      })
    ).ok(),
  ).toBe(true);
  const old = await (
    await request.get("/api/admin/settings", { headers: admin() })
  ).json();
  expect(
    (
      await request.post("/api/admin/settings", {
        headers: admin(),
        data: {
          ...old,
          pickupAddress: "Synthetic UI pickup",
          deliveryEnabled: true,
          deliveryFeeMinor: 2000,
        },
      })
    ).ok(),
  ).toBe(true);
  return { id, name };
}
async function promo(request: APIRequestContext) {
  const code = "UI-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
    now = Date.now(),
    rule = {
      discountType: "percent",
      value: 1000,
      maxDiscountMinor: 100000,
      minSubtotalMinor: 0,
      startsAt: now - 60000,
      expiresAt: now + 86400000,
      maxUses: 20,
      perAccountLimit: 1,
      enabled: true,
      revision: 0,
    };
  expect(
    (
      await request.post("/api/admin/offers/codes", {
        headers: admin(),
        data: { code, rule },
      })
    ).ok(),
  ).toBe(true);
  return { code, rule };
}
async function shop(page: Page, name: string) {
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Shop", exact: true })
    .click();
  const product = page
    .locator(".customer-grid section")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await product
    .getByRole("button", { name: "Add to cart", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Synthetic Maker");
  await page.getByLabel("Your phone number", { exact: true }).fill("901234567");
  return product;
}
async function apply(page: Page, code: string) {
  await page.getByLabel("Promo or friend code", { exact: true }).fill(code);
  await page
    .getByTestId("checkout-offer")
    .getByRole("button", { name: "Apply code", exact: true })
    .click();
  await expect(page.getByTestId("applied-offer")).toContainText(code);
}
async function shot(page: Page, id: string, name: string, project: string) {
  const root = newEvidenceRoot("output/current-offers/" + project);
  mkdirSync(root, { recursive: true });
  await page.getByTestId(id).screenshot({ path: join(root, name + ".png") });
}
test("Finance creates a promo; discounted lost-response checkout reloads one order and saves actual costs", async ({
  page,
  request,
}, info) => {
  const { name } = await fixture(request);
  await enter(page);
  await register(page);
  await adminUI(page);
  const panel = page.getByTestId("offer-admin"),
    editor = panel.getByTestId("promo-editor"),
    code = "REAL-" + crypto.randomUUID().slice(0, 8).toUpperCase();
  await editor.locator("summary").click();
  await editor.getByLabel("New promo code", { exact: true }).fill(code);
  await editor.getByLabel("Discount value (%)", { exact: true }).fill("10");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel.getByRole("status")).toHaveText("Saved");
  await expect(
    editor.getByLabel("New promo code", { exact: true }),
  ).toBeDisabled();
  await shot(page, "offer-admin", "admin-promo", info.project.name);
  await shop(page, name);
  await apply(page, code);
  await expect(page.getByTestId("checkout-total")).toContainText("90 UZS");
  await shot(page, "checkout-offer", "applied", info.project.name);
  let accepted: any;
  const submissions: any[] = [];
  let responseLost!: () => void;
  const lost = new Promise<void>((resolve) => {
    responseLost = resolve;
  });
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    submissions.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    accepted = await response.json();
    await route.abort("failed");
    responseLost();
  });
  await page
    .getByRole("button", { name: "Place sandbox order", exact: true })
    .click();
  await lost;
  await expect(
    page.getByRole("button", { name: "Retry this exact order", exact: true }),
  ).toBeEnabled();
  await expect(page.getByTestId("pending-offer")).toContainText(code);
  await page.unroute("**/api/orders");
  await page.reload();
  await openMore(page);
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Shop", exact: true })
    .click();
  await expect(page.getByTestId("pending-offer")).toContainText(code);
  const saved = (
    await (await request.get("/api/admin/offers", { headers: admin() })).json()
  ).codes.find((c: any) => c.code === code);
  expect(
    (
      await request.post("/api/admin/offers/codes", {
        headers: admin(),
        data: { code, rule: { ...saved.rule, enabled: false } },
      })
    ).ok(),
  ).toBe(true);
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() === "POST")
      submissions.push(route.request().postDataJSON());
    await route.continue();
  });
  await page
    .getByRole("button", { name: "Retry this exact order", exact: true })
    .click();
  await expect(page.getByTestId("pending-checkout")).toHaveCount(0);
  expect(submissions).toHaveLength(2);
  expect(submissions[1]).toEqual(submissions[0]);
  expect(accepted.total_minor).toBe(9000);
  expect(
    (
      await request.post(`/api/admin/orders/${accepted.id}/test-payment`, {
        headers: admin(),
        data: {},
      })
    ).ok(),
  ).toBe(true);
  await adminUI(page);
  const costs = panel.getByTestId("cost-editor");
  await costs.locator("summary").click();
  await costs.getByRole("combobox").selectOption(accepted.id);
  await expect(costs.getByTestId("order-contribution")).toContainText(
    "Actual costs not entered",
  );
  for (const [label, value] of [
    ["Materials", "20"],
    ["Packing", "3"],
    ["Delivery and fulfillment", "4"],
    ["Payment fees", "1"],
    ["Marketing", "2"],
    ["Paid referral reward", "0"],
  ])
    await costs.getByLabel(label, { exact: true }).fill(value);
  await costs.getByRole("button", { name: "Save", exact: true }).click();
  await expect(costs.getByTestId("order-contribution")).toContainText("60 UZS");
  await shot(page, "order-costs", "actual-costs", info.project.name);
  const report = await (
    await request.get("/api/admin/offers/report", { headers: admin() })
  ).json();
  expect(report.find((r: any) => r.orderId === accepted.id)).toMatchObject({
    discountMinor: 1000,
    netContributionMinor: 6000,
    costRevision: 1,
  });
  writeFileSync(
    join(
      newEvidenceRoot("output/current-offers/" + info.project.name),
      "checkout-proof.json",
    ),
    JSON.stringify(
      {
        sameRequestBody:
          JSON.stringify(submissions[0]) === JSON.stringify(submissions[1]),
        totalMinor: accepted.total_minor,
        discountMinor: 1000,
        contributionMinor: 6000,
      },
      null,
      2,
    ),
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("cart changes, superseded responses, expired quotes and logout cannot apply stale discounts", async ({
  page,
  request,
}, info) => {
  const { name } = await fixture(request),
    { code } = await promo(request);
  await enter(page);
  await register(page);
  const product = await shop(page, name);
  await apply(page, code);
  await product
    .getByRole("button", { name: "Add to cart", exact: true })
    .click();
  await expect(page.getByTestId("applied-offer")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Place sandbox order", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("checkout-offer")).toContainText(
    "Cart or terms changed",
  );
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let arrived!: () => void;
  const waiting = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  let delivered!: () => void;
  const complete = new Promise<void>((resolve) => {
    delivered = resolve;
  });
  await page.route("**/api/offers/quote", async (route) => {
    const response = await route.fetch();
    arrived();
    await held;
    await route.fulfill({ response });
    delivered();
  });
  await page.getByRole("button", { name: "Apply code", exact: true }).click();
  await waiting;
  await page
    .getByLabel("Promo or friend code", { exact: true })
    .fill("OTHER-CODE");
  release();
  await complete;
  await page.unroute("**/api/offers/quote");
  await expect(page.getByTestId("applied-offer")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Place sandbox order", exact: true }),
  ).toBeDisabled();
  await page.route("**/api/offers/quote", async (route) => {
    const response = await route.fetch(),
      body = await response.json();
    await route.fulfill({
      response,
      json: { ...body, expiresAt: Date.now() - 1000 },
    });
  });
  await page.getByLabel("Promo or friend code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Apply code", exact: true }).click();
  await expect(
    page.getByTestId("checkout-offer").getByRole("alert"),
  ).toContainText("Could not verify");
  await expect(page.getByTestId("applied-offer")).toHaveCount(0);
  await page.unroute("**/api/offers/quote");
  await apply(page, code);
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(page.getByTestId("checkout-offer")).toHaveCount(0);
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await expect(
    page.getByLabel("Promo or friend code", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByTestId("applied-offer")).toHaveCount(0);
  const root = newEvidenceRoot("output/current-offers/" + info.project.name);
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "stale-proof.json"),
    JSON.stringify(
      {
        cartInvalidated: true,
        supersededResponseIgnored: true,
        expiredResponseRejected: true,
        logoutCleared: true,
      },
      null,
      2,
    ),
  );
});
test("Admin enables referrals and the customer sees a private usable code and settled counts in four locales", async ({
  page,
  request,
}, info) => {
  await fixture(request);
  await enter(page);
  await register(page);
  await adminUI(page);
  const policy = page.getByTestId("referral-policy");
  await policy.locator("summary").click();
  await policy.getByLabel("Enabled", { exact: true }).check();
  await policy.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("offer-admin").getByRole("status")).toHaveText(
    "Saved",
  );
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Account", exact: true })
    .click();
  const referral = page.getByTestId("referral-panel");
  await referral.locator("summary").click();
  await referral
    .getByRole("button", { name: "Get friend code", exact: true })
    .click();
  await expect(page.getByTestId("referral-code")).toHaveText(/^REF-/);
  await expect(referral).toContainText("no automatic cash reward");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as any).__copiedOffer = value;
        },
      },
    });
  });
  await referral
    .getByRole("button", { name: "Copy code", exact: true })
    .click();
  await expect(referral.getByRole("status")).toHaveText("Code copied");
  const code = await page.getByTestId("referral-code").innerText();
  expect(await page.evaluate(() => (window as any).__copiedOffer)).toBe(code);
  await shot(page, "referral-panel", "referral", info.project.name);
  for (const [locale, label] of [
    ["uz", "Do‘stni taklif qilish"],
    ["uz-Cyrl", "Дўстни таклиф қилиш"],
    ["ru", "Пригласить друга"],
    ["en", "Invite a friend"],
  ]) {
    await page.locator('[data-testid="locale-picker"]:visible').selectOption(locale);
    await expect(referral.locator("summary")).toHaveText(label);
    await expect(page.getByTestId("referral-code")).toHaveText(code);
  }
  await referral.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByTestId("referral-counts")).toHaveText(
    "Pending: 0 · Paid referrals: 0 · Refunded referrals: 0",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

test("actual Finance staff can manage offers while Support cannot read financial reports", async ({
  page,
  request,
}) => {
  const financeResponse = await request.post("/api/admin/access", {
      headers: admin(),
      data: { name: "Synthetic offer finance", role: "finance", days: 1 },
    }),
    supportResponse = await request.post("/api/admin/access", {
      headers: admin(),
      data: { name: "Synthetic offer support", role: "support", days: 1 },
    });
  expect(financeResponse.ok()).toBe(true);
  expect(supportResponse.ok()).toBe(true);
  const finance = await financeResponse.json(),
    support = await supportResponse.json();
  await enter(page);
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page
    .getByLabel("Administrator token", { exact: true })
    .fill(finance.token);
  await page
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  await expect(
    page.getByTestId("offer-admin").getByTestId("promo-editor"),
  ).toBeVisible();
  expect(
    (
      await request.get("/api/admin/offers/report", {
        headers: { Authorization: "Bearer " + finance.token },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.get("/api/admin/access", {
        headers: { Authorization: "Bearer " + finance.token },
      })
    ).status(),
  ).toBe(403);
  await page
    .getByLabel("Administrator token", { exact: true })
    .fill(support.token);
  await page
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  await expect(page.getByTestId("gallery-moderation")).toBeVisible();
  await expect(page.getByTestId("offer-admin")).toHaveCount(0);
  for (const path of ["/api/admin/offers", "/api/admin/offers/report"])
    expect(
      (
        await request.get(path, {
          headers: { Authorization: "Bearer " + support.token },
        })
      ).status(),
    ).toBe(403);
  expect(
    (
      await request.post("/api/admin/offers/policy", {
        headers: { Authorization: "Bearer " + support.token },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
