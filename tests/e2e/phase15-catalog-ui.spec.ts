import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { english } from "./phase12-cases";
import { mkdirSync } from "node:fs";
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
  await english(page);
  await page.getByTestId("customer-menu").locator("summary").click();
  await page
    .getByRole("button", { name: "Account / Admin", exact: true })
    .click();
}
async function openShop(page: Page) {
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Shop", exact: true })
    .click();
}
async function openAdmin(page: Page) {
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
    page
      .getByTestId("catalog-admin")
      .getByRole("combobox", { name: "Product", exact: true }),
  ).toBeEnabled();
}
async function saveFixture(request: APIRequestContext, id: string) {
  const r = await request.post("/api/admin/catalog/sku", {
    headers: admin(),
    data: {
      product: {
        id,
        name: "Original component " + id,
        family: "string",
        price_minor: 1000,
        currency: "UZS",
        stock: 20,
        credits: 3,
        description: "Original fixture",
        expectedRevision: 0,
        active: 1,
        profile_id: "standard-base-r1",
      },
      sku: {
        version: "catalog-sku/1",
        productId: id,
        kind: "kit",
        group: "original",
        label: "Original component",
        material: "White MDF",
        sellable: false,
        parts: [],
        revision: 0,
      },
    },
  });
  expect(r.ok()).toBe(true);
}
test("owner creates a real bundle and regional shipping; mobile/desktop original checkout survives lost response and edited terms", async ({
  page,
  request,
}, info) => {
  test.setTimeout(180000);
  const out = newEvidenceRoot("output/current-catalog/" + info.project.name);
  mkdirSync(out, { recursive: true });
  const suffix = crypto.randomUUID().slice(0, 8),
    component = "component-" + suffix,
    id = "bundle-" + suffix,
    name = "Original regional bundle " + suffix;
  await saveFixture(request, component);
  const old = await (
    await request.get("/api/admin/regions", { headers: admin() })
  ).json();
  expect(
    (
      await request.post("/api/admin/regions", {
        headers: admin(),
        data: { revision: old.revision, regions: [] },
      })
    ).ok(),
  ).toBe(true);
  await enter(page);
  await page
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await openAdmin(page);
  const panel = page.getByTestId("catalog-admin");
  await panel.getByLabel("Product identifier", { exact: true }).fill(id);
  await panel.getByLabel("Name", { exact: true }).fill(name);
  await panel
    .getByLabel("Description", { exact: true })
    .fill("Original regional bundle fixture");
  await panel
    .getByRole("combobox", { name: "Currency", exact: true })
    .selectOption("USD");
  await panel.getByLabel("Price (USD)", { exact: true }).fill("120");
  await panel.getByLabel("Stock", { exact: true }).fill("10");
  await panel.getByLabel("Build credits", { exact: true }).fill("6");
  await panel
    .getByRole("combobox", { name: "Product type", exact: true })
    .selectOption("bundle");
  await panel
    .getByLabel("Option name", { exact: true })
    .fill("Double white kit");
  await panel
    .getByLabel("Material", { exact: true })
    .fill("Original white MDF and black thread");
  await panel.getByRole("button", { name: "Add an item", exact: true }).click();
  await panel
    .getByRole("combobox", { name: "Product 1", exact: true })
    .selectOption(component);
  await panel.getByLabel("Quantity 1", { exact: true }).fill("2");
  await panel.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    panel.getByLabel("Product identifier", { exact: true }),
  ).toBeDisabled();
  await panel.screenshot({ path: join(out, "owner-bundle.png") });
  const regional = page.getByTestId("regions-admin");
  for (let i = 1; i <= 2; i++) {
    await regional
      .getByRole("button", { name: "Add country", exact: true })
      .click();
    const field = regional.locator("form fieldset fieldset").nth(i - 1);
    await field.getByLabel("Serve this country", { exact: true }).check();
    await field
      .getByLabel("Pickup address " + i, { exact: true })
      .fill(i === 1 ? "Synthetic UZ pickup" : "Original US pickup");
    if (i === 2) {
      await field
        .getByRole("combobox", { name: "Currency 2", exact: true })
        .selectOption("USD");
      await field.getByLabel("Courier available", { exact: true }).check();
      await field
        .getByLabel("Delivery price (USD) 2", { exact: true })
        .fill("7");
    }
  }
  await regional.getByRole("button", { name: "Save", exact: true }).click();
  await expect(regional.getByRole("status")).toHaveText("Saved");
  await regional.screenshot({ path: join(out, "owner-regions.png") });
  await openShop(page);
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Refresh", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Country", exact: true })
    .selectOption("US");
  const product = page
    .locator(".customer-grid section")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(product).toContainText("120 USD");
  await expect(product).toContainText("Original white MDF");
  await expect(product).toContainText("× 2");
  await product
    .getByRole("button", { name: "Add to cart", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Synthetic Maker");
  await page.getByLabel("Your phone number", { exact: true }).fill("901234567");
  await page
    .getByRole("combobox", { name: "Delivery method", exact: true })
    .selectOption("courier");
  await page.getByLabel("City", { exact: true }).fill("Synthetic City");
  await page.getByLabel("Address", { exact: true }).fill("Synthetic Street");
  await expect(page.getByTestId("checkout-total")).toContainText("127 USD");
  await expect(page.getByTestId("checkout-offer")).toHaveCount(0);
  let accepted: any, finish!: () => void;
  const lost = new Promise<void>((r) => (finish = r)),
    submissions: any[] = [];
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    submissions.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    accepted = await response.json();
    await route.abort("failed");
    finish();
  });
  await page
    .getByRole("button", { name: "Place sandbox order", exact: true })
    .click();
  await lost;
  await expect(page.getByTestId("pending-checkout")).toBeVisible();
  await page.unroute("**/api/orders");
  const catalog = await (
      await request.get("/api/admin/catalog", { headers: admin() })
    ).json(),
    p = catalog.products.find((p: any) => p.id === id),
    sku = catalog.skus.find((s: any) => s.productId === id);
  expect(
    (
      await request.post("/api/admin/catalog/sku", {
        headers: admin(),
        data: {
          product: {
            id: p.id,
            name: "Changed later " + suffix,
            family: p.family,
            price_minor: 14000,
            currency: p.currency,
            stock: p.stock,
            credits: p.credits,
            description: p.description,
            expectedRevision: p.revision,
            active: p.active,
            profile_id: p.profile_id,
          },
          sku: { ...sku, material: "Changed later material" },
        },
      })
    ).ok(),
  ).toBe(true);
  const policy = await (
    await request.get("/api/admin/regions", { headers: admin() })
  ).json();
  expect(
    (
      await request.post("/api/admin/regions", {
        headers: admin(),
        data: {
          revision: policy.revision,
          regions: policy.regions.map((r: any) =>
            r.country === "US" ? { ...r, courierFeeMinor: 900 } : r,
          ),
        },
      })
    ).ok(),
  ).toBe(true);
  await enter(page);
  await openShop(page);
  await expect(page.getByTestId("pending-checkout")).toBeVisible();
  await expect(page.getByTestId("checkout-total")).toContainText("127 USD");
  const cart = page
    .locator("section.card")
    .filter({ has: page.getByRole("heading", { name: "Cart", exact: true }) });
  await expect(cart).toContainText(name);
  await expect(cart).toContainText("Original white MDF and black thread");
  await cart.screenshot({ path: join(out, "original-checkout-recovery.png") });
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() === "POST")
      submissions.push(route.request().postDataJSON());
    await route.fallback();
  });
  await page
    .getByRole("button", { name: "Retry this exact order", exact: true })
    .click();
  await expect(page.getByTestId("pending-checkout")).toHaveCount(0);
  expect(submissions).toHaveLength(2);
  expect(submissions[1]).toEqual(submissions[0]);
  const order = page
    .locator(".customer-item")
    .filter({ has: page.locator("code").filter({ hasText: accepted.id }) });
  await expect(order).toContainText("127 USD");
  await expect(order.getByTestId("payment-options")).toHaveCount(0);
  await expect(order).toContainText("UZS orders only");
  await order.screenshot({ path: join(out, "original-order.png") });
  await page
    .getByRole("combobox", { name: "Country", exact: true })
    .selectOption("UZ");
  expect(
    await page
      .getByRole("heading", { name: "Changed later " + suffix, exact: true })
      .count(),
  ).toBe(0);
  const current = await (
    await request.get("/api/admin/regions", { headers: admin() })
  ).json();
  expect(
    (
      await request.post("/api/admin/regions", {
        headers: admin(),
        data: { revision: current.revision, regions: [] },
      })
    ).ok(),
  ).toBe(true);
});
test("actual kit account shows finite credit expiry and scrubs the panel after sign out", async ({
  page,
  request,
}, info) => {
  const out = newEvidenceRoot("output/current-catalog/" + info.project.name);
  mkdirSync(out, { recursive: true });
  const original = (
    await (await request.get("/api/admin/kits", { headers: admin() })).json()
  ).policy;
  expect(
    (
      await request.post("/api/admin/kits/policy", {
        headers: admin(),
        data: { ...original, creditDays: 30 },
      })
    ).ok(),
  ).toBe(true);
  const result = await request.post("/api/admin/kits/batch", {
    headers: admin(),
    data: {
      count: 1,
      profile: "standard-base-r1",
      requestKey: crypto.randomUUID(),
    },
  });
  expect(result.ok()).toBe(true);
  const batch = await result.json();
  expect(batch.codes[0].creditDays).toBe(30);
  expect(
    (
      await request.post("/api/admin/kits/policy", {
        headers: admin(),
        data: original,
      })
    ).ok(),
  ).toBe(true);
  await enter(page);
  const code = page.getByLabel("Kit code for sign-in", { exact: true });
  await code.fill(batch.codes[0].code);
  await page
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  const panel = page.getByTestId("kit-credit-terms");
  await panel.locator("summary").click();
  await expect(panel).toContainText("Credits left");
  await expect(panel).toContainText("Credits valid until");
  await panel.screenshot({ path: join(out, "kit-credit-validity.png") });
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(panel).toHaveCount(0);
});
