import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { english } from "./phase12-cases";
import { financeFixture } from "./finance-fixture";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { mailText } from "../../src/mail-i18n";
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
  await expect(page.getByTestId("customer-credits")).toBeVisible();
}
async function inbox(page: Page) {
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  const p = page.getByTestId("customer-inbox");
  await expect(
    p.getByRole("button", { name: "Save email choice", exact: true }),
  ).toBeVisible();
  return p;
}
async function admin(page: Page) {
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
  const p = page.getByTestId("mail-admin");
  await expect(
    p.getByRole("heading", { name: "Message delivery", exact: true }),
  ).toBeVisible();
  return p;
}
test("actual inbox email consent read/reload and Admin status-only retry work in four locales on desktop and mobile", async ({
  page,
  request,
}, info) => {
  const f = await financeFixture(request);
  await open(page, f.code);
  const email = "mail-ui-" + crypto.randomUUID() + "@example.invalid",
    hub = page.locator(".customer-hub");
  await hub.getByLabel("Email", { exact: true }).fill(email);
  await hub
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill("Synthetic-password-123!");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/account/register") &&
      r.request().method() === "POST",
  );
  await hub
    .getByRole("button", { name: "Register this account", exact: true })
    .click();
  const registered = await (await response).json();
  f.headers.Authorization = "Bearer " + registered.token;
  await expect(hub.locator(".recovery-key code")).toBeVisible();
  const p = await inbox(page),
    checkbox = p.getByLabel("Email me order updates and support replies", {
      exact: true,
    });
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await p.getByLabel("Email language", { exact: true }).selectOption("en");
  await p
    .getByRole("button", { name: "Save email choice", exact: true })
    .click();
  await expect(p.getByRole("status")).toHaveText("Saved");
  const order = await f.order();
  await p.getByRole("button", { name: "Refresh", exact: true }).click();
  const rows = await (
      await request.get("/api/inbox?locale=en", { headers: f.headers })
    ).json(),
    id = rows.find((m: { entityId: string }) => m.entityId === order.id).id,
    row = p.locator('[data-message-id="' + id + '"]');
  await expect(
    row.getByRole("heading", { name: "Order received", exact: true }),
  ).toBeVisible();
  await row.getByRole("button", { name: "Mark as read", exact: true }).click();
  await expect(row.getByText("Read", { exact: true })).toBeVisible();
  expect(
    JSON.stringify(
      await (
        await request.get("/api/inbox?locale=en", { headers: f.headers })
      ).json(),
    ),
  ).not.toContain(email);
  const dir = newEvidenceRoot("output/current-mail/" + info.project.name);
  mkdirSync(dir, { recursive: true });
  await p.screenshot({ path: join(dir, "inbox-en.png") });
  await page.reload();
  await page.getByTestId("customer-menu").locator("summary").click();
  await page
    .getByRole("button", { name: "Account / Admin", exact: true })
    .click();
  await inbox(page);
  await expect(
    page
      .getByTestId("customer-inbox")
      .getByLabel("Email me order updates and support replies", {
        exact: true,
      }),
  ).toBeChecked();
  const owner = await admin(page),
    arow = owner.locator('[data-message-id="' + id + '"]');
  await expect
    .poll(
      async () => {
        const r = await (
          await request.get("/api/admin/mail", { headers: f.root })
        ).json();
        return r.messages.find((m: { id: string }) => m.id === id)?.state;
      },
      { timeout: 15000 },
    )
    .toBe("accepted");
  await owner.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(arow.getByTestId("mail-state")).toHaveText("Service accepted");
  await owner.screenshot({ path: join(dir, "admin-accepted-en.png") });
  await arow
    .getByRole("button", { name: "Retry safely or check status", exact: true })
    .click();
  await expect
    .poll(
      async () => {
        const r = await (
          await request.get("/api/admin/mail", { headers: f.root })
        ).json();
        return r.messages.find((m: { id: string }) => m.id === id)?.state;
      },
      { timeout: 15000 },
    )
    .toBe("delivered");
  await owner.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(arow.getByTestId("mail-state")).toHaveText(
    "Mail server accepted",
  );
  await expect(arow).toContainText("Send attempts: 1");
  await expect(
    arow.getByRole("button", {
      name: "Retry safely or check status",
      exact: true,
    }),
  ).toHaveCount(0);
  await owner.screenshot({ path: join(dir, "admin-delivered-en.png") });
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Messages", exact: true })
    .click();
  for (const locale of ["uz", "ru", "uz-Cyrl"] as const) {
    await page
      .locator("header")
      .getByRole("combobox")
      .first()
      .selectOption(locale);
    const current = page.getByTestId("customer-inbox");
    await expect(
      current.getByRole("heading", {
        name: mailText(locale, "title"),
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      current.getByLabel(mailText(locale, "consent"), { exact: true }),
    ).toBeChecked();
    await expect(
      current
        .locator('[data-message-id="' + id + '"]')
        .getByTestId("mail-state"),
    ).toHaveText(mailText(locale, "delivered"));
    await current.screenshot({ path: join(dir, "inbox-" + locale + ".png") });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
  }
  await page.locator("header").getByRole("combobox").first().selectOption("en");
  const current = page.getByTestId("customer-inbox");
  await current
    .getByLabel("Email me order updates and support replies", { exact: true })
    .uncheck();
  await current
    .getByRole("button", { name: "Save email choice", exact: true })
    .click();
  await expect(current.getByRole("status")).toHaveText("Saved");
  const second = await f.order();
  await current.getByRole("button", { name: "Refresh", exact: true }).click();
  const fallback = (
    await (
      await request.get("/api/inbox?locale=en", { headers: f.headers })
    ).json()
  ).find((m: { entityId: string }) => m.entityId === second.id);
  await expect(
    current
      .locator('[data-message-id="' + fallback.id + '"]')
      .getByTestId("mail-state"),
  ).toHaveText("In the app");
});
test("a delayed private inbox response cannot return after logout and a new kit account", async ({
  page,
  request,
}) => {
  const f = await financeFixture(request),
    order = await f.order();
  await open(page, f.code);
  const p = await inbox(page);
  await expect(p).toContainText("#" + order.id.slice(0, 8));
  let arrived!: () => void,
    release!: () => void,
    first = true;
  const held = new Promise<void>((r) => (arrived = r)),
    hold = new Promise<void>((r) => (release = r));
  await page.route("**/api/inbox?locale=en", async (route) => {
    if (!first) return route.fallback();
    first = false;
    const response = await route.fetch();
    arrived();
    await hold;
    await route.fulfill({ response });
  });
  await p.getByRole("button", { name: "Refresh", exact: true }).click();
  await held;
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await expect(p).toHaveCount(0);
  const other = await financeFixture(request);
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Account", exact: true })
    .click();
  await page
    .getByLabel("Kit code for sign-in", { exact: true })
    .fill(other.code);
  await page
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  await inbox(page);
  release();
  await expect(
    page
      .getByTestId("customer-inbox")
      .getByText("No messages yet", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("customer-inbox")).not.toContainText(
    "#" + order.id.slice(0, 8),
  );
});
test("a delayed owner delivery report disappears when Admin switches to Support and direct access is refused", async ({
  page,
  request,
}) => {
  const f = await financeFixture(request);
  await f.order();
  const grant = await request.post("/api/admin/access", {
    headers: f.root,
    data: { name: "Synthetic mail support", role: "support", days: 1 },
  });
  expect(grant.ok()).toBe(true);
  const support = await grant.json();
  await open(page, f.code);
  const p = await admin(page);
  await expect(p.getByTestId("inbox-message").first()).toBeVisible();
  let arrived!: () => void, release!: () => void;
  const held = new Promise<void>((r) => (arrived = r)),
    hold = new Promise<void>((r) => (release = r));
  let first = true;
  await page.route("**/api/admin/mail", async (route) => {
    if (!first) return route.fallback();
    first = false;
    const response = await route.fetch();
    arrived();
    await hold;
    await route.fulfill({ response });
  });
  await p.getByRole("button", { name: "Refresh", exact: true }).click();
  await held;
  await page
    .getByLabel("Administrator token", { exact: true })
    .fill(support.token);
  await page
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  await expect(p).toHaveCount(0);
  release();
  await expect(page.getByTestId("mail-admin")).toHaveCount(0);
  expect(
    (
      await request.get("/api/admin/mail", {
        headers: { Authorization: "Bearer " + support.token },
      })
    ).status(),
  ).toBe(403);
});
