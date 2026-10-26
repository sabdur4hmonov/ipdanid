import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { english } from "./phase12-cases";
import { financeFixture } from "./finance-fixture";
import { newEvidenceRoot } from "../helpers/evidence-paths";
// These cases inject network responses; dedicated offline suites retain service workers.
test.use({ serviceWorkers: "block" });

test.use({ trace: "off" });
async function open(page: Page, code: string) {
  await page.goto("/");
  await english(page);
  await page.getByTestId("customer-menu").locator("summary").click();
  await page
    .getByRole("button", { name: "Account / Admin", exact: true })
    .click();
  await page.getByLabel("Kit code for sign-in", { exact: true }).fill(code);
  await page
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
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
  await expect(page.getByTestId("finance-admin")).toBeVisible();
}
test("Finance records exact acknowledged cash and return once, compares actual invoice rows, and preserves four-locale history after reload", async ({
  page,
  request,
}, info) => {
  const f = await financeFixture(request),
    a = await f.order(),
    b = await f.order(),
    baseline = (
      await (await request.get("/api/credits", { headers: f.headers })).json()
    ).credits;
  const invoice = await (
      await request.post("/api/payments/invoices", {
        headers: f.headers,
        data: {
          orderId: a.id,
          provider: "click",
          requestKey: crypto.randomUUID(),
        },
      })
    ).json(),
    otherInvoice = await (
      await request.post("/api/payments/invoices", {
        headers: f.headers,
        data: {
          orderId: b.id,
          provider: "payme",
          requestKey: crypto.randomUUID(),
        },
      })
    ).json();
  await open(page, f.code);
  const panel = page.getByTestId("finance-admin"),
    row = panel.locator('[data-order-id="' + a.id + '"]'),
    root = newEvidenceRoot("output/current-finance/" + info.project.name);
  mkdirSync(root, { recursive: true });
  const form = row.getByTestId("manual-receipt");
  await expect(
    form.getByRole("button", { name: "Record received money", exact: true }),
  ).toBeDisabled();
  await form
    .getByLabel("Receipt or refund reference", { exact: true })
    .fill("SYNTHETIC-RECEIPT-1");
  await form
    .getByLabel("I have received this exact amount outside the app", {
      exact: true,
    })
    .check();
  await form
    .getByRole("button", { name: "Record received money", exact: true })
    .click();
  await expect(row).toContainText("Paid");
  await expect(row).toContainText("Manual receipt");
  await row.screenshot({ path: join(root, "manual-paid.png") });
  expect(
    (await (await request.get("/api/credits", { headers: f.headers })).json())
      .credits,
  ).toBe(baseline + 1);
  expect(
    (
      await (
        await request.get("/api/payments/invoices/" + invoice.id, {
          headers: f.headers,
        })
      ).json()
    ).state,
  ).toBe(-1);
  expect(
    (
      await request.post("/api/orders/" + a.id + "/return", {
        headers: f.headers,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  await panel
    .getByRole("button", { name: "Refresh", exact: true })
    .first()
    .click();
  const refund = row.getByTestId("manual-refund");
  await refund
    .getByLabel("Receipt or refund reference", { exact: true })
    .fill("SYNTHETIC-REFUND-1");
  await refund
    .getByLabel("I have returned this exact amount outside the app", {
      exact: true,
    })
    .check();
  await refund
    .getByRole("button", { name: "Record returned money", exact: true })
    .click();
  await expect(row).toContainText("Refund recorded");
  await row.screenshot({ path: join(root, "manual-refunded.png") });
  expect(
    (await (await request.get("/api/credits", { headers: f.headers })).json())
      .credits,
  ).toBe(baseline);
  await panel
    .getByLabel("Statement file (JSON)", { exact: true })
    .setInputFiles({
      name: "synthetic-statement.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          rows: [
            {
              invoiceId: invoice.id,
              provider: "click",
              currency: "UZS",
              amountMinor: 10000,
              state: -1,
            },
            {
              invoiceId: otherInvoice.id,
              provider: "payme",
              currency: "UZS",
              amountMinor: 10000,
              state: 2,
            },
          ],
        }),
      ),
    });
  const comparison = panel.getByTestId("finance-comparison").first();
  const downloading = page.waitForEvent("download");
  await panel
    .getByRole("button", { name: "Download local invoice rows", exact: true })
    .click();
  const file = await downloading;
  await file.saveAs(join(root, "local-invoice-rows.json"));
  const exported = JSON.parse(
    readFileSync(join(root, "local-invoice-rows.json"), "utf8"),
  );
  expect(
    exported.rows.find((r: any) => r.invoiceId === invoice.id),
  ).toMatchObject({
    provider: "click",
    currency: "UZS",
    amountMinor: 10000,
    state: -1,
  });
  await expect(comparison).toContainText("Matches local records");
  await expect(comparison).toContainText("Payment state differs");
  await comparison.screenshot({ path: join(root, "statement-comparison.png") });
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"]) {
    await page
      .locator("header")
      .getByRole("combobox")
      .first()
      .selectOption(locale);
    await expect(row).not.toContainText("undefined");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (locale === "uz-Cyrl")
      await row.screenshot({ path: join(root, "manual-cyrl.png") });
  }
  await page.reload();
  await page.getByTestId("customer-menu").locator("summary").click();
  await page
    .getByRole("button", { name: "Account / Admin", exact: true })
    .click();
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
  await expect(row).toContainText("Refund recorded");
  await expect(panel.getByTestId("finance-comparison").first()).toContainText(
    "Payment state differs",
  );
  expect(
    (
      await request.get("/api/admin/finance/reconciliation", {
        headers: f.headers,
      })
    ).status(),
  ).toBe(403);
});
test("lost manual receipt response retries the exact reference and key without a second payment or credit grant", async ({
  page,
  request,
}) => {
  const f = await financeFixture(request),
    a = await f.order(),
    baseline = (
      await (await request.get("/api/credits", { headers: f.headers })).json()
    ).credits;
  await open(page, f.code);
  const panel = page.getByTestId("finance-admin"),
    row = panel.locator('[data-order-id="' + a.id + '"]'),
    form = row.getByTestId("manual-receipt");
  let first = true;
  const bodies: string[] = [];
  await page.route(
    "**/api/admin/finance/orders/" + a.id + "/receipt",
    async (route) => {
      bodies.push(route.request().postData()!);
      if (first) {
        first = false;
        const accepted = await route.fetch();
        expect(accepted.ok()).toBe(true);
        await route.abort("failed");
      } else await route.continue();
    },
  );
  await form
    .getByLabel("Receipt or refund reference", { exact: true })
    .fill("SYNTHETIC-LOST-RECEIPT");
  await form
    .getByLabel("I have received this exact amount outside the app", {
      exact: true,
    })
    .check();
  await form
    .getByRole("button", { name: "Record received money", exact: true })
    .click();
  await expect(form.getByRole("alert")).toBeVisible();
  await form
    .getByRole("button", { name: "Retry this exact record", exact: true })
    .click();
  await expect(row).toContainText("Manual receipt");
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toBe(bodies[1]);
  expect(
    (await (await request.get("/api/credits", { headers: f.headers })).json())
      .credits,
  ).toBe(baseline + 1);
  const report = await (
    await request.get("/api/admin/finance/reconciliation", { headers: f.root })
  ).json();
  expect(report.orders.find((o: any) => o.id === a.id).settlementCount).toBe(1);
});

test("a delayed owner Finance report cannot reappear after switching to a support credential", async ({
  page,
  request,
}) => {
  const f = await financeFixture(request),
    a = await f.order();
  const grant = await request.post("/api/admin/access", {
    headers: f.root,
    data: { name: "Synthetic Support", role: "support", days: 1 },
  });
  expect(grant.ok()).toBe(true);
  const support = await grant.json();
  await open(page, f.code);
  const panel = page.getByTestId("finance-admin");
  await expect(panel.locator('[data-order-id="' + a.id + '"]')).toBeVisible();
  let arrived!: () => void, release!: () => void;
  const held = new Promise<void>((r) => (arrived = r)),
    hold = new Promise<void>((r) => (release = r));
  let first = true;
  await page.route("**/api/admin/finance/reconciliation", async (route) => {
    if (!first) return route.fallback();
    first = false;
    const response = await route.fetch();
    arrived();
    await hold;
    await route.fulfill({ response });
  });
  await panel
    .getByRole("button", { name: "Refresh", exact: true })
    .first()
    .click();
  await held;
  await page
    .getByLabel("Administrator token", { exact: true })
    .fill(support.token);
  await page
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  await expect(panel).toHaveCount(0);
  release();
  await expect(page.getByTestId("finance-order")).toHaveCount(0);
  expect(
    (
      await request.get("/api/admin/finance/reconciliation", {
        headers: { Authorization: "Bearer " + support.token },
      })
    ).status(),
  ).toBe(403);
});
