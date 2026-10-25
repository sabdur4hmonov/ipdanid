import { test, expect, type Page } from "@playwright/test";
import { revealControl } from "./navigation";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { gallery, photoCases } from "./phase12-cases";
test.use({ trace: "off" });
const headers = () => ({
  Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN,
});
async function account(page: Page) {
  await page.goto("/");
  await page.getByTestId("customer-menu").locator("summary").click();
  await page
    .getByRole("button", { name: "Account / Admin", exact: true })
    .click();
}
const dateInput = (n: number) =>
  new Date(n - new Date(n).getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

test("private trial policy, lost issuance, exact claim retry and account reset work through real customer controls", async ({
  page,
  request,
}, info) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const out = newEvidenceRoot("output/current-trial/" + info.project.name);
  mkdirSync(out, { recursive: true });
  const guest = await (await request.post("/api/session")).json();
  const registered = await request.post("/api/account/register", {
    headers: { Authorization: "Bearer " + guest.token },
    data: {
      email: crypto.randomUUID() + "@example.invalid",
      password: "Synthetic-trial-123!",
    },
  });
  expect(registered.ok()).toBe(true);
  const user = await registered.json();
  await page.addInitScript((user) => {
    localStorage.setItem("iprasm.locale", "en");
    localStorage.setItem(
      "iprasm.customer.product-4311.v1",
      JSON.stringify(user),
    );
  }, user);
  await account(page);
  const hub = page.locator(".customer-hub");
  await hub
    .locator(".customer-tabs")
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  const adminToken = hub.getByLabel("Administrator token", { exact: true });
  await revealControl(adminToken);
  await adminToken.fill(process.env.LOCAL_ADMIN_TOKEN!);
  await hub
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  const panel = page.getByTestId("trial-admin");
  await panel.locator("summary").click();
  await expect(
    panel.getByLabel("Enable campaign", { exact: true }),
  ).toBeVisible();
  const before = await (
    await request.get("/api/admin/trials", { headers: headers() })
  ).json();
  const now = Date.now();
  await panel.getByLabel("Enable campaign", { exact: true }).check();
  await panel
    .getByLabel("Starts", { exact: true })
    .fill(dateInput(now - 60000));
  await panel
    .getByLabel("Ends", { exact: true })
    .fill(dateInput(now + 86400000));
  await panel
    .getByLabel("Total trial budget", { exact: true })
    .fill(String(before.claimed + before.pending + 3));
  await panel
    .getByRole("button", { name: "Save campaign", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get("/api/admin/trials", { headers: headers() })
          ).json()
        ).policy.enabled,
    )
    .toBe(true);
  const issueBodies: any[] = [];
  let lostBatch: any;
  await page.route("**/api/admin/trials/batch", async (route) => {
    issueBodies.push(route.request().postDataJSON());
    if (issueBodies.length === 1) {
      const r = await route.fetch();
      expect(r.status()).toBe(201);
      lostBatch = await r.json();
      await route.abort();
    } else await route.continue();
  });
  await panel
    .getByRole("button", { name: "Issue private codes", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Retry exact request", exact: true }),
  ).toBeEnabled();
  await panel
    .getByRole("button", { name: "Retry exact request", exact: true })
    .click();
  await expect(
    panel.getByRole("button", {
      name: "Reviewed, start new request",
      exact: true,
    }),
  ).toBeVisible();
  expect(issueBodies).toHaveLength(2);
  expect(issueBodies[1]).toEqual(issueBodies[0]);
  await panel.getByRole("button", { name: "Refresh", exact: true }).click();
  const lostRow = panel
    .getByTestId("trial-batch")
    .filter({ has: page.locator("code").filter({ hasText: lostBatch.id }) });
  await lostRow
    .getByRole("button", { name: "Revoke unused codes", exact: true })
    .click();
  await expect(lostRow).toContainText("Revoked: 1");
  await panel
    .getByRole("button", { name: "Reviewed, start new request", exact: true })
    .click();
  await page.unroute("**/api/admin/trials/batch");
  await panel.getByLabel("New code count", { exact: true }).fill("2");
  await panel
    .getByRole("button", { name: "Issue private codes", exact: true })
    .click();
  const issued = panel.getByTestId("trial-issued");
  await expect(issued.locator("pre")).toBeVisible();
  const codes = (await issued.locator("pre").innerText()).split("\n");
  expect(codes).toHaveLength(2);
  const download = page.waitForEvent("download");
  await issued
    .getByRole("button", { name: "Save codes as TXT", exact: true })
    .click();
  expect((await download).suggestedFilename()).toBe(
    "ip-rasm-private-trial-codes.txt",
  );
  await issued
    .getByRole("button", { name: "Clear codes from screen", exact: true })
    .click();
  await expect(issued).toHaveCount(0);
  await panel.screenshot({
    path: join(out, "admin-private-codes-cleared.png"),
  });
  await hub
    .locator(".customer-tabs")
    .getByRole("button", { name: "Account", exact: true })
    .click();
  const claim = page.getByTestId("trial-claim");
  await claim.locator("summary").click();
  await expect(claim.getByTestId("trial-code")).toBeVisible();
  const claimBodies: any[] = [];
  await page.route("**/api/trial/claim", async (route) => {
    claimBodies.push(route.request().postDataJSON());
    if (claimBodies.length === 1) {
      const r = await route.fetch();
      expect(r.status()).toBe(200);
      await route.abort();
    } else await route.continue();
  });
  await claim.getByTestId("trial-code").fill(codes[0]);
  await claim.getByRole("button", { name: "Claim trial", exact: true }).click();
  await expect(claim.getByRole("alert")).toBeVisible();
  await claim.getByRole("button", { name: "Claim trial", exact: true }).click();
  await expect(claim.getByTestId("trial-balance")).toContainText(
    "Trial builds remaining: 1",
  );
  expect(claimBodies).toHaveLength(2);
  expect(claimBodies[1]).toEqual(claimBodies[0]);
  await expect(hub.getByTestId("customer-credits")).toHaveText("1");
  await claim.screenshot({ path: join(out, "customer-claimed.png") });
  // A delayed private status must never appear after logout/reset.
  let release!: () => void;
  let seen!: () => void;
  const held = new Promise<void>((r) => (release = r)),
    arrived = new Promise<void>((r) => (seen = r));
  await page.route("**/api/trial", async (route) => {
    const r = await route.fetch();
    seen();
    await held;
    await route.fulfill({ response: r });
  });
  await claim.getByRole("button", { name: "Refresh", exact: true }).click();
  await arrived;
  await hub
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  release();
  await page.unroute("**/api/trial");
  await claim.locator("summary").click();
  await expect(claim).toContainText("Sign into an email and password account");
  await expect(claim.getByTestId("trial-balance")).toHaveCount(0);
  expect(errors).toEqual([]);
  const final = await (
    await request.get("/api/admin/trials", { headers: headers() })
  ).json();
  expect(final.claimed).toBe(before.claimed + 1);
  await request.post("/api/admin/trials/policy", {
    headers: headers(),
    data: { ...final.policy, enabled: false },
  });
});

test("plain customer Shop entry completes delivery, exact lost-order retry, sandbox payment and order history", async ({
  page,
  request,
}, info) => {
  test.setTimeout(150000);
  const out = newEvidenceRoot("output/current-checkout/" + info.project.name);
  mkdirSync(out, { recursive: true });
  const id = "trial-kit-" + crypto.randomUUID().slice(0, 8),
    name = "Synthetic physical kit " + id;
  const current = await (
    await request.get("/api/admin/settings", { headers: headers() })
  ).json();
  expect(
    (
      await request.post("/api/admin/settings", {
        headers: headers(),
        data: {
          ...current,
          sellerName: "Synthetic workshop",
          sellerPhone: "+998901234567",
          paymentDetails: "Sandbox only",
          pickupAddress: "Synthetic pickup",
          deliveryEnabled: true,
          deliveryFeeMinor: 2500,
        },
      })
    ).ok(),
  ).toBe(true);
  const product = {
    id,
    name,
    family: "string",
    price_minor: 10000,
    currency: "UZS",
    stock: 10,
    credits: 3,
    description: "Original white MDF kit",
    expectedRevision: 0,
    active: 1,
    profile_id: "standard-base-r1",
  };
  expect(
    (
      await request.post("/api/admin/catalog/sku", {
        headers: headers(),
        data: {
          product,
          sku: {
            version: "catalog-sku/1",
            productId: id,
            kind: "kit",
            group: "trial-physical",
            label: "Physical kit",
            material: "White MDF",
            sellable: true,
            parts: [],
            revision: 0,
          },
        },
      })
    ).ok(),
  ).toBe(true);
  await page.addInitScript(() => localStorage.setItem("iprasm.locale", "en"));
  await account(page);
  const hub = page.locator(".customer-hub");
  await hub
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await hub
    .getByLabel("Email", { exact: true })
    .fill(crypto.randomUUID() + "@example.invalid");
  await hub
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill("Synthetic-checkout-123!");
  await hub
    .getByRole("button", { name: "Register this account", exact: true })
    .click();
  await expect(hub.locator(".recovery-key code")).toBeVisible();
  // Go back to the genuine three-screen customer entry; no Expert navigation.
  await page.reload();
  await page.getByTestId("customer-menu").locator("summary").click();
  await page.getByTestId("customer-shop").click();
  await expect(
    hub
      .locator(".customer-tabs")
      .getByRole("button", { name: "Shop", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const card = hub
    .locator("section.card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card.getByRole("button", { name: "Add to cart", exact: true }).click();
  await hub
    .getByRole("combobox", { name: "Delivery method", exact: true })
    .selectOption("courier");
  const buy = hub.getByRole("button", {
    name: "Place sandbox order",
    exact: true,
  });
  await expect(buy).toBeDisabled();
  await hub.getByLabel("Name", { exact: true }).fill("Synthetic Maker");
  await hub.getByLabel("Your phone number", { exact: true }).fill("901234567");
  await hub.getByLabel("City", { exact: true }).fill("Synthetic City");
  await expect(buy).toBeDisabled();
  await hub.getByLabel("Address", { exact: true }).fill("Synthetic Street 12");
  const expectedTotal = await hub.getByTestId("checkout-total").innerText();
  await expect(hub.getByTestId("checkout-subtotal")).not.toHaveText("");
  await hub
    .locator("section.card")
    .filter({ has: page.getByRole("heading", { name: "Cart", exact: true }) })
    .screenshot({ path: join(out, "delivery-review.png") });
  let accepted: any;
  const submissions: any[] = [];
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    submissions.push(route.request().postDataJSON());
    if (submissions.length === 1) {
      const r = await route.fetch();
      expect(r.status()).toBe(201);
      accepted = await r.json();
      await route.abort();
    } else await route.continue();
  });
  await buy.click();
  await expect(page.getByTestId("pending-checkout")).toBeVisible();
  await page.reload();
  await page.getByTestId("customer-menu").locator("summary").click();
  await page.getByTestId("customer-shop").click();
  await expect(page.getByTestId("checkout-total")).toHaveText(expectedTotal);
  await page
    .getByRole("button", { name: "Retry this exact order", exact: true })
    .click();
  await expect(page.getByTestId("pending-checkout")).toHaveCount(0);
  expect(submissions).toHaveLength(2);
  expect(submissions[1]).toEqual(submissions[0]);
  expect(submissions[0].quote.totalMinor).toBe(12500);
  const order = hub
    .locator("article.customer-item")
    .filter({ has: page.locator("code").filter({ hasText: accepted.id }) });
  await order
    .getByTestId(info.project.name === "desktop" ? "pay-click" : "pay-payme")
    .click();
  let invoiceId = "";
  page.on("request", (r) => {
    const m = r.url().match(/\/payments\/invoices\/([^/]+)\/mock$/);
    if (m) invoiceId = m[1];
  });
  await order.getByTestId("simulate-payment").click();
  await expect(order).toContainText("Paid");
  expect(invoiceId).not.toBe("");
  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("iprasm.customer.product-4311.v1")!),
  );
  const repeat = await request.post(
    "/api/payments/invoices/" + invoiceId + "/mock",
    { headers: { Authorization: "Bearer " + session.token }, data: {} },
  );
  expect(repeat.ok()).toBe(true);
  let rows = await (
    await request.get("/api/orders", {
      headers: { Authorization: "Bearer " + session.token },
    })
  ).json();
  expect(rows.filter((o: any) => o.id === accepted.id)).toHaveLength(1);
  expect(rows.find((o: any) => o.id === accepted.id)).toMatchObject({
    status: "paid",
    total_minor: 12500,
    commerce: { method: "courier", feeMinor: 2500 },
  });
  expect(
    (
      await request.post("/api/admin/orders/" + accepted.id + "/fulfill", {
        headers: headers(),
        data: { tracking: "SYNTHETIC-TRACK-ONLY" },
      })
    ).ok(),
  ).toBe(true);
  await page.reload();
  await page.getByTestId("customer-menu").locator("summary").click();
  await page.getByTestId("customer-shop").click();
  await expect(order).toContainText("SYNTHETIC-TRACK-ONLY");
  await order.screenshot({ path: join(out, "paid-delivery-history.png") });
});

test("a normal photo trial unlocks the exact assembly guide and resumes offline without a physical kit", async ({
  page,
  request,
  context,
}) => {
  test.setTimeout(150000);
  const before = await (
    await request.get("/api/admin/trials", { headers: headers() })
  ).json();
  expect(
    (
      await request.post("/api/admin/trials/policy", {
        headers: headers(),
        data: {
          ...before.policy,
          enabled: true,
          startsAt: Date.now() - 1000,
          expiresAt: Date.now() + 86400000,
          maxClaims: before.claimed + before.pending + 1,
        },
      })
    ).ok(),
  ).toBe(true);
  const batch = await (
    await request.post("/api/admin/trials/batch", {
      headers: headers(),
      data: { count: 1, requestKey: crypto.randomUUID() },
    })
  ).json();
  const guest = await (await request.post("/api/session")).json();
  const r = await request.post("/api/account/register", {
    headers: { Authorization: "Bearer " + guest.token },
    data: {
      email: crypto.randomUUID() + "@example.invalid",
      password: "Synthetic-guide-trial-123!",
    },
  });
  expect(r.ok()).toBe(true);
  const user = await r.json();
  await page.addInitScript((u) => {
    localStorage.setItem("iprasm.locale", "en");
    localStorage.setItem("iprasm.customer.product-4311.v1", JSON.stringify(u));
  }, user);
  await page.goto("/");
  await gallery(page, photoCases[0]);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  const savedHash = () => page.evaluate(() => JSON.parse(localStorage.getItem("iprasm.projects.v1") ?? "[]")[0]?.instruction.sequenceHash ?? "");
  await expect.poll(savedHash).toMatch(/^[a-f0-9]{64}$/);
  const hash = await savedHash();
  await page
    .getByRole("button", { name: "Start assembling", exact: true })
    .click();
  const gate = page.getByTestId("build-gate");
  await expect(gate).toBeVisible();
  await expect(gate.getByTestId("kit-credits")).toContainText("0");
  const trial = gate.getByTestId("trial-claim");
  await trial.locator("summary").click();
  await trial.getByTestId("trial-code").fill(batch.codes[0]);
  await trial.getByRole("button", { name: "Claim trial", exact: true }).click();
  await expect(gate.getByTestId("kit-credits")).toContainText("1");
  await gate.getByTestId("unlock-build").click();
  await expect(page.getByTestId("player-hash")).toHaveText(hash);
  await page.getByTestId("assembly-confirm").click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("1/3000");
  await page.getByTestId("assembly-rest").click();
  await expect(page.getByTestId("assembly-rest-status")).toHaveAttribute(
    "data-state",
    "saved",
  );
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("player-hash")).toHaveText(hash);
  await expect(page.getByTestId("confirmed-step")).toHaveText("1/3000");
  await context.setOffline(false);
  const own = { Authorization: "Bearer " + user.token };
  expect(
    await (await request.get("/api/trial", { headers: own })).json(),
  ).toMatchObject({ claimed: true, remaining: 0 });
  const report = await (
    await request.get("/api/admin/trials", { headers: headers() })
  ).json();
  await request.post("/api/admin/trials/policy", {
    headers: headers(),
    data: { ...report.policy, enabled: false },
  });
});
