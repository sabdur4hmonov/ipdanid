import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { english } from "./phase12-cases";
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
    .fill("digital-private-" + crypto.randomUUID() + "@example.com");
  await hub
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill("isolated digital privacy password");
  await hub
    .getByRole("button", { name: "Register this account", exact: true })
    .click();
  await expect(hub.locator(".recovery-key code")).toBeVisible();
}
async function fixture(request: APIRequestContext, kind: "app" | "gift") {
  const id = "digital-private-" + crypto.randomUUID().slice(0, 8),
    name = "Original private " + kind + " " + id.slice(-8);
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
          description: "Original private synthetic fixture",
          expectedRevision: 0,
          active: 1,
          profile_id: "standard-base-r1",
        },
      })
    ).ok(),
  ).toBe(true);
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
test("lost digital response resumes the original accepted receipt after policy retirement without making another order", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "app");
  await enter(page);
  await register(page);
  const studio = await shop(page),
    product = studio.getByTestId("digital-product").filter({
      has: page.getByRole("heading", { name: p.name, exact: true }),
    });
  await product
    .getByRole("button", { name: "Buy app credits", exact: true })
    .click();
  await studio.getByLabel("Your name", { exact: true }).fill("Synthetic buyer");
  let count = 0,
    complete!: () => void;
  const lost = new Promise<void>((r) => (complete = r));
  await page.route("**/api/digital/purchases", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    count++;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort("failed");
    complete();
  });
  await studio
    .getByRole("button", { name: "Create purchase", exact: true })
    .click();
  await lost;
  await expect(studio.getByTestId("digital-pending")).toBeVisible();
  await page.unroute("**/api/digital/purchases");
  const data = await (
      await request.get("/api/admin/journeys/products", { headers: root() })
    ).json(),
    old = data.products.find((v: any) => v.id === p.id),
    policy = data.policies.find((v: any) => v.productId === p.id);
  expect(
    (
      await request.post("/api/admin/products", {
        headers: root(),
        data: {
          ...old,
          name: "Changed later",
          price_minor: 14000,
          active: 0,
          expectedRevision: old.revision,
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post("/api/admin/journeys/products", {
        headers: root(),
        data: { ...policy, enabled: false },
      })
    ).ok(),
  ).toBe(true);
  await enter(page);
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Shop", exact: true })
    .click();
  const order = page
    .getByTestId("digital-order")
    .filter({ has: page.getByRole("heading", { name: p.name, exact: true }) });
  await expect(order).toContainText("100 UZS");
  await expect(page.getByTestId("digital-pending")).toHaveCount(0);
  expect(count).toBe(1);
  await order.getByTestId("pay-click").click();
  await order.getByTestId("simulate-payment").click();
  await expect(order).toContainText("Paid");
  await expect(page.getByTestId("customer-credits")).toHaveText("3");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((k) => k.includes(":digital-pending:")),
    ),
  ).toBe(false);
});
test("late account and purchased-gift data cannot repopulate the next guest after sign out", async ({
  page,
  request,
}) => {
  const p = await fixture(request, "gift");
  await enter(page);
  await register(page);
  const identity = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("iprasm.customer.product-4311.v1")!),
    ),
    headers = { Authorization: "Bearer " + identity.token },
    catalog = await (await request.get("/api/catalog")).json(),
    product = catalog.products.find((v: any) => v.id === p.id),
    settings = await (await request.get("/api/storefront")).json();
  const response = await request.post("/api/digital/purchases", {
    headers,
    data: {
      productId: p.id,
      kind: "gift",
      name: "Synthetic private buyer",
      locale: "en",
      requestKey: crypto.randomUUID(),
      quote: {
        productRevision: product.revision,
        settingsRevision: settings.settings.revision,
        currency: "UZS",
        totalMinor: 10000,
      },
    },
  });
  expect(response.ok()).toBe(true);
  const order = await response.json();
  expect(
    (
      await request.post(
        "/api/admin/orders/" + order.orderId + "/test-payment",
        { headers: root(), data: {} },
      )
    ).ok(),
  ).toBe(true);
  const detail = await (
      await request.get("/api/digital/purchases/" + order.orderId, { headers })
    ).json(),
    code = detail.gift.claimToken;
  const studio = await shop(page);
  await expect(studio.getByTestId("purchased-gift")).toContainText(
    "Ready to claim",
  );
  expect(
    await page.evaluate(
      (value) => Object.values(localStorage).some((v) => v.includes(value)),
      code,
    ),
  ).toBe(false);
  let arrived!: () => void, release!: () => void;
  const holding = new Promise<void>((r) => (arrived = r)),
    hold = new Promise<void>((r) => (release = r));
  let first = true;
  const oldReply = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/account" &&
      r.request().headers()["authorization"] === headers.Authorization,
  );
  await page.route("**/api/account", async (route) => {
    if (!first) return route.fallback();
    first = false;
    const result = await route.fetch();
    arrived();
    await hold;
    await route.fulfill({ response: result });
  });
  await studio.getByRole("button", { name: "Refresh", exact: true }).click();
  await holding;
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await expect(page.locator(".customer-session")).toContainText("Guest");
  release();
  await (await oldReply).finished();
  await page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      ),
  );
  await expect(page.locator(".customer-session")).toContainText("Guest");
  await expect(page.getByTestId("customer-credits")).toHaveText("0");
  await expect(page.getByTestId("digital-order")).toHaveCount(0);
  await expect(page.locator('[data-sensitive="gift-code"]')).toHaveCount(0);
  expect(
    (await page.locator(".customer-session").innerText()).includes(
      identity.email ?? "@example.com",
    ),
  ).toBe(false);
  await page.unroute("**/api/account");
});

test("sign out after app restart removes a saved digital draft without opening the shop", async ({
  page,
}) => {
  await enter(page);
  await register(page);
  const key = await page.evaluate(() => {
    const identity = JSON.parse(
      localStorage.getItem("iprasm.customer.product-4311.v1")!,
    );
    const key =
      "iprasm.customer.product-4311.v1:digital-pending:" + identity.id;
    localStorage.setItem(
      key,
      JSON.stringify({
        version: "digital-attempt/1",
        body: { name: "Isolated saved request" },
      }),
    );
    return key;
  });
  await enter(page);
  await expect(
    page
      .locator(".customer-session")
      .getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((k) => localStorage.getItem(k) !== null, key),
  ).toBe(true);
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  expect(
    await page.evaluate((k) => localStorage.getItem(k) === null, key),
  ).toBe(true);
});
