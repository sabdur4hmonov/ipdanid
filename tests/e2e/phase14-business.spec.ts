import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
// The simulator is deliberately independent of the TypeScript payment adapter.
// @ts-expect-error local Node-only mock has no browser type declaration
import { startMockPaymentProvider } from "../../scripts/mock-payment-provider.mjs";

test("sandbox providers use authenticated callbacks, immutable retries and one credit grant over real HTTP", async ({
  request,
}, info) => {
  const api = process.env.IP_RASM_TEST_API_URL! + "/api";
  const productId = "phase14-http-" + crypto.randomUUID();
  expect(
    (
      await request.post(api + "/admin/products", {
        headers: { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN },
        data: {
          id: productId,
          name: "Synthetic HTTP kit",
          family: "string",
          price_minor: 550000,
          stock: 8,
          credits: 3,
          description: "Sandbox only",
          expectedRevision: 0,
          active: 1,
          profile_id: "standard-base-r1",
        },
      })
    ).ok(),
  ).toBe(true);
  const guest = await (
    await request.post(api + "/session", { data: {} })
  ).json();
  const other = await (
    await request.post(api + "/session", { data: {} })
  ).json();
  const headers = { Authorization: "Bearer " + guest.token };
  const createOrder = async () => {
    const r = await request.post(api + "/orders", {
      headers,
      data: {
        items: [{ productId, quantity: 1 }],
        address: {
          name: "Synthetic provider buyer",
          city: "Test",
          street: "Test address",
        },
        requestKey: crypto.randomUUID(),
      },
    });
    expect(r.ok()).toBe(true);
    return r.json();
  };
  const before = await (
    await request.get(api + "/account", { headers })
  ).json();
  for (const provider of ["click", "payme"]) {
    const order = await createOrder();
    const invoice = await (
      await request.post(api + "/payments/invoices", {
        headers,
        data: { provider, orderId: order.id, requestKey: crypto.randomUUID() },
      })
    ).json();
    expect(invoice.amountMinor).toBe(order.total_minor);
    expect(
      (
        await request.get(api + "/payments/invoices/" + invoice.id, {
          headers: { Authorization: "Bearer " + other.token },
        })
      ).status(),
    ).toBe(404);
    const mock = await startMockPaymentProvider({
      provider,
      api,
      serviceId: "12345",
      login: "Paycom-test",
      secret:
        process.env[
          provider === "click" ? "CLICK_SECRET_KEY" : "PAYME_TEST_KEY"
        ],
    });
    try {
      const data = {
        orderId: order.id,
        amountMinor: order.total_minor,
        requestKey: crypto.randomUUID(),
      };
      const first = await (
        await request.post(mock.url + "/pay", { data })
      ).json();
      expect(first.error ?? 0).toBe(0);
      expect(first.result?.state ?? 2).toBe(2);
      const retry = await (
        await request.post(mock.url + "/pay", { data })
      ).json();
      expect(retry).toEqual(first);
      expect(
        (
          await request.post(mock.url + "/pay", {
            data: { ...data, amountMinor: data.amountMinor + 1 },
          })
        ).status(),
      ).toBe(400);
      const status = await (
        await request.get(api + "/payments/invoices/" + invoice.id, { headers })
      ).json();
      expect(status.state).toBe(2);
    } finally {
      await mock.close();
    }
  }
  const after = await (await request.get(api + "/account", { headers })).json();
  expect(after.credits - before.credits).toBe(6);
  const click = await (
    await request.post(api + "/payments/click", {
      form: { sign_string: "0".repeat(32) },
    })
  ).json();
  expect(click.error).toBe(-1);
  const payme = await (
    await request.post(api + "/payments/payme", {
      data: { id: 1, method: "PerformTransaction", params: { id: "unknown" } },
    })
  ).json();
  expect(payme.error.code).toBe(-32504);
  const dir = "output/current-product/business/" + info.project.name;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    dir + "/callback-proof.json",
    JSON.stringify(
      {
        providers: ["click", "payme"],
        retriesStable: true,
        creditDelta: after.credits - before.credits,
        invalidSignaturesRejected: true,
        realCharges: false,
      },
      null,
      2,
    ),
  );
});

test("owner one-page administration prints kit QR/PDF, edits UZS prices and customer pays both sandbox providers", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const api = process.env.IP_RASM_TEST_API_URL! + "/api",
    headers = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN };
  const productId = "phase14-ui-" + crypto.randomUUID(),
    productName = "Synthetic UI kit " + info.project.name;
  expect(
    (
      await page.request.post(api + "/admin/products", {
        headers,
        data: {
          id: productId,
          name: productName,
          family: "string",
          price_minor: 550000,
          stock: 8,
          credits: 3,
          description: "Sandbox only",
          expectedRevision: 0,
          active: 1,
          profile_id: "standard-base-r1",
        },
      })
    ).ok(),
  ).toBe(true);
  const settings = await (
    await page.request.get(api + "/admin/settings", { headers })
  ).json();
  expect(
    (
      await page.request.post(api + "/admin/settings", {
        headers,
        data: { ...settings, pickupAddress: "Synthetic pickup" },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/");
  const menu = page.getByTestId("customer-menu");
  await menu.locator("summary").click();
  await menu.getByLabel("Language", { exact: true }).selectOption("en");
  await menu
    .getByRole("button", { name: "Account / Admin", exact: true })
    .click();
  const hub = page.locator(".customer-hub");
  await hub
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await hub
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await hub
    .getByLabel("Administrator token", { exact: true })
    .fill(process.env.LOCAL_ADMIN_TOKEN!);
  await hub
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  await expect(page.getByTestId("owner-admin-navigation")).toBeVisible();
  for (const id of [
    "kits",
    "credits",
    "orders",
    "prices",
    "delivery",
    "announcements",
  ])
    await expect(page.locator("#admin-" + id)).toHaveCount(1);
  const kits = page.getByTestId("kit-admin");
  await kits.getByLabel("Codes per batch", { exact: true }).fill("7");
  await page.getByTestId("issue-kit-batch").click();
  await expect(page.getByTestId("kit-inserts-pdf")).toBeVisible();
  const dir = "output/current-product/business/" + info.project.name;
  mkdirSync(dir, { recursive: true });
  const dl = page.waitForEvent("download");
  await page.getByTestId("kit-inserts-pdf").click();
  const download = await dl;
  await download.saveAs(dir + "/issued-kit-cards.pdf");
  const pdf = await PDFDocument.load(
    readFileSync(dir + "/issued-kit-cards.pdf"),
  );
  expect(pdf.getPageCount()).toBe(2);
  const prices = page.locator("#admin-prices");
  await prices.getByRole("button", { name: productName, exact: true }).click();
  const price = prices.getByLabel("Example price", { exact: true });
  await expect(price).toHaveValue("5500");
  await price.fill("5500.25");
  await prices
    .getByRole("button", { name: "Save product", exact: true })
    .click();
  await expect
    .poll(async () => {
      const data = await (await page.request.get(api + "/catalog")).json();
      return data.products.find((p: any) => p.id === productId).price_minor;
    })
    .toBe(550025);
  await price.fill("5500");
  await prices
    .getByRole("button", { name: "Save product", exact: true })
    .click();
  await hub.getByRole("button", { name: "Shop", exact: true }).click();
  for (const provider of ["click", "payme"]) {
    await hub
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: productName, exact: true }),
      })
      .getByRole("button", { name: "Add to cart", exact: true })
      .click();
    await hub
      .getByLabel("Name", { exact: true })
      .fill("Synthetic payment buyer");
    await hub
      .getByLabel("Your phone number", { exact: true })
      .fill("901234567");
    await hub
      .getByRole("button", { name: "Place sandbox order", exact: true })
      .click();
    const payment = hub.getByTestId("payment-options");
    await expect(payment).toHaveCount(1);
    await payment.getByTestId("pay-" + provider).click();
    await payment.getByTestId("simulate-payment").click();
    await expect(payment).toHaveCount(0);
  }
  await hub.getByRole("button", { name: "Account", exact: true }).click();
  await expect(hub.getByTestId("customer-credits")).toHaveText("6");
  await hub
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await hub
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  await page
    .getByTestId("owner-admin-navigation")
    .getByRole("button", { name: "Delivery", exact: true })
    .click();
  await page.screenshot({ path: dir + "/admin.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
