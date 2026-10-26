import { test, expect, type Page } from "@playwright/test";
import { commissionFixture } from "./commission-fixture";
import { english } from "./phase12-cases";
// These cases inject network responses; dedicated offline suites retain service workers.
test.use({ serviceWorkers: "block" });

test.use({ trace: "off" });
async function enter(page: Page, code: string) {
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
  await expect(page.locator(".customer-session")).not.toContainText("Guest");
}
async function shop(page: Page) {
  if (!(await page.locator(".customer-hub").isVisible())) {
    await page.getByTestId("customer-menu").locator("summary").click();
    await page
      .getByRole("button", { name: "Account / Admin", exact: true })
      .click();
  }
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Shop", exact: true })
    .click();
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Refresh", exact: true })
    .click();
  await expect(page.getByTestId("commission-studio")).toBeVisible();
}
async function requested(request: Parameters<typeof commissionFixture>[0]) {
  const f = await commissionFixture(request);
  expect(
    (
      await request.post("/api/admin/commissions/products", {
        headers: f.root,
        data: {
          version: "commission-product/1",
          productId: f.id,
          enabled: true,
          revision: 0,
        },
      })
    ).ok(),
  ).toBe(true);
  const r = await request.post("/api/commissions", {
    headers: f.headers,
    data: {
      instructionId: f.instructionId,
      productId: f.id,
      consent: true,
      locale: "en",
      requestKey: crypto.randomUUID(),
    },
  });
  expect(r.ok()).toBe(true);
  return { ...f, row: await r.json() };
}
test("lost acceptance response retries the exact art and price once; reload recovers the same paid-independent order", async ({
  page,
  request,
}) => {
  const f = await requested(request),
    own = await (
      await request.get("/api/admin/commissions", { headers: f.root })
    ).json(),
    quote = own.find((v: any) => v.id === f.row.id).reviewQuote;
  expect(
    (
      await request.post("/api/admin/commissions/" + f.row.id + "/review", {
        headers: f.root,
        data: {
          revision: f.row.revision,
          artHash: f.row.artHash,
          decision: "approve",
          note: "Privacy recovery test",
          quote,
        },
      })
    ).ok(),
  ).toBe(true);
  await enter(page, f.code);
  await shop(page);
  const row = page.locator(
    '[data-testid="commission-request"][data-commission-id="' + f.row.id + '"]',
  );
  await row
    .getByRole("button", { name: "Review this drawing", exact: true })
    .click();
  await expect(row.getByText("Drawing checked", { exact: true })).toBeVisible();
  await row
    .getByLabel("Your name", { exact: true })
    .fill("Synthetic response recovery");
  await row
    .getByLabel("Your phone number", { exact: true })
    .fill("+998901234567");
  await row
    .getByLabel("I approve this exact drawing and the total price", {
      exact: true,
    })
    .check();
  let first = true;
  const bodies: string[] = [];
  await page.route(
    "**/api/commissions/" + f.row.id + "/accept",
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
  await row
    .getByRole("button", {
      name: "Accept drawing and place order",
      exact: true,
    })
    .click();
  await expect(row.getByRole("alert")).toBeVisible();
  await row
    .getByRole("button", { name: "Retry this exact purchase", exact: true })
    .click();
  await expect(row).toContainText("Order accepted");
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toBe(bodies[1]);
  const orders = await (
    await request.get("/api/orders", { headers: f.headers })
  ).json();
  expect(
    orders.filter((o: any) => o.items.some((i: any) => i.product_id === f.id)),
  ).toHaveLength(1);
  await page.reload();
  await shop(page);
  await expect(row).toContainText("Order accepted");
  await row
    .getByRole("button", { name: "Cancel request", exact: true })
    .click();
  await expect(row).toContainText("Cancelled");
});
test("delayed private commission list and its drawing cannot reappear after sign-out into another guest", async ({
  page,
  request,
}) => {
  const f = await requested(request);
  await enter(page, f.code);
  await shop(page);
  const studio = page.getByTestId("commission-studio");
  await expect(studio.getByTestId("commission-request")).toHaveCount(1);
  let arrived!: () => void, release!: () => void;
  const held = new Promise<void>((r) => (arrived = r)),
    hold = new Promise<void>((r) => (release = r));
  let first = true;
  await page.route("**/api/commissions", async (route) => {
    if (!first || route.request().method() !== "GET") return route.fallback();
    first = false;
    const response = await route.fetch();
    arrived();
    await hold;
    await route.fulfill({ response });
  });
  await studio.getByRole("button", { name: "Refresh", exact: true }).click();
  await held;
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await expect(page.locator(".customer-session")).toContainText("Guest");
  release();
  await shop(page);
  await expect(studio.getByTestId("commission-request")).toHaveCount(0);
  await expect(studio.locator("canvas")).toHaveCount(0);
});
