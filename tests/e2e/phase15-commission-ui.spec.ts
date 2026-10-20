import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { english } from "./phase12-cases";
import { commissionFixture } from "./commission-fixture";
import { newEvidenceRoot } from "../helpers/evidence-paths";
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
async function admin(page: Page) {
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  const open = page.getByRole("button", {
    name: "Open administration",
    exact: true,
  });
  if (await open.isVisible()) {
    await page
      .getByLabel("Administrator token", { exact: true })
      .fill(process.env.LOCAL_ADMIN_TOKEN!);
    await open.click();
  }
  await expect(page.getByTestId("commission-admin")).toBeVisible();
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
test("customer and workshop review the same saved drawing, accept exact price, pay and track ready-made art after reload", async ({
  page,
  request,
}, info) => {
  const f = await commissionFixture(request),
    root = newEvidenceRoot("output/current-commissions/" + info.project.name);
  mkdirSync(root, { recursive: true });
  await enter(page, f.code);
  await admin(page);
  const policy = page.getByTestId("commission-policy");
  await policy
    .getByRole("combobox", { name: "Finished art product", exact: true })
    .selectOption(f.id);
  await policy.getByLabel("Accept art requests", { exact: true }).check();
  await policy.getByRole("button", { name: "Save", exact: true }).click();
  await expect(policy.getByRole("status")).toHaveText("Saved");
  await shop(page);
  const studio = page.getByTestId("commission-studio");
  await studio
    .getByRole("combobox", { name: "Finished art product", exact: true })
    .selectOption(f.id);
  await studio
    .getByRole("combobox", { name: "My saved art", exact: true })
    .selectOption(f.instructionId);
  await expect(
    studio.getByRole("button", {
      name: "Request a finished artwork",
      exact: true,
    }),
  ).toBeDisabled();
  await studio
    .getByRole("checkbox", {
      name: "Share this saved thread drawing with the workshop for review. My source photo will not be sent.",
      exact: true,
    })
    .check();
  await studio
    .getByRole("button", { name: "Request a finished artwork", exact: true })
    .click();
  const customer = studio
    .getByTestId("commission-request")
    .filter({ hasText: f.id.slice(-8) });
  await expect(customer).toContainText("Awaiting workshop review");
  const id = (await customer.getAttribute("data-commission-id"))!;
  await customer.screenshot({ path: join(root, "requested.png") });
  await admin(page);
  const owner = page.getByTestId("commission-admin-request").filter({
    has: page.getByRole("heading", {
      name: "Original commissioned art " + f.id.slice(-8),
      exact: true,
    }),
  });
  await expect(
    owner.getByRole("button", { name: "Approve art and price", exact: true }),
  ).toBeDisabled();
  await owner
    .getByRole("button", { name: "Review this drawing", exact: true })
    .click();
  await expect(owner.locator("canvas")).toBeVisible();
  await expect(
    owner.getByText("Drawing checked", { exact: true }),
  ).toBeVisible();
  const downloading = page.waitForEvent("download");
  await owner
    .getByRole("button", { name: "Workshop PDF", exact: true })
    .click();
  const pdf = await downloading;
  await pdf.saveAs(join(root, "workshop.pdf"));
  await owner
    .getByLabel("Workshop note", { exact: true })
    .fill("Exact sequence and board reviewed locally");
  await owner
    .getByRole("button", { name: "Approve art and price", exact: true })
    .click();
  await expect(owner).toContainText("Art and price approved");
  await owner.screenshot({ path: join(root, "owner-approved.png") });
  await shop(page);
  const row = page.locator(
    '[data-testid="commission-request"][data-commission-id="' + id + '"]',
  );
  await expect(row).toContainText("Art and price approved");
  await row
    .getByLabel("Your name", { exact: true })
    .fill("Synthetic art buyer");
  await row
    .getByLabel("Your phone number", { exact: true })
    .fill("+998901234567");
  await row
    .getByLabel("I approve this exact drawing and the total price", {
      exact: true,
    })
    .check();
  await expect(
    row.getByRole("button", {
      name: "Accept drawing and place order",
      exact: true,
    }),
  ).toBeDisabled();
  await row
    .getByRole("button", { name: "Review this drawing", exact: true })
    .click();
  await expect(row.getByText("Drawing checked", { exact: true })).toBeVisible();
  await row
    .getByRole("button", {
      name: "Accept drawing and place order",
      exact: true,
    })
    .click();
  await expect(row).toContainText("Order accepted");
  await row.getByTestId("pay-click").click();
  await row
    .getByRole("button", { name: "Confirm test payment", exact: true })
    .click();
  await expect(row).toContainText("Paid");
  await row.screenshot({ path: join(root, "paid.png") });
  await admin(page);
  const production = page.locator(
    '[data-testid="commission-admin-request"][data-commission-id="' + id + '"]',
  );
  await production
    .getByRole("button", { name: "Review this drawing", exact: true })
    .click();
  await production
    .getByRole("button", { name: "Start making", exact: true })
    .click();
  await expect(production).toContainText("Being made");
  await production
    .getByRole("button", { name: "Mark ready", exact: true })
    .click();
  await production
    .getByLabel("Tracking reference", { exact: true })
    .fill("ORIGINAL-TRACK-" + info.project.name);
  await production
    .getByRole("button", { name: "Record dispatch", exact: true })
    .click();
  await expect(production).toContainText("Sent");
  await production.screenshot({ path: join(root, "workshop-sent.png") });
  await shop(page);
  await expect(row).toContainText("ORIGINAL-TRACK-" + info.project.name);
  await page.reload();
  await shop(page);
  const restored = page.locator(
    '[data-testid="commission-request"][data-commission-id="' + id + '"]',
  );
  await expect(restored).toContainText("Sent");
  await restored
    .getByRole("button", { name: "Review this drawing", exact: true })
    .click();
  await expect(
    restored.getByText("Drawing checked", { exact: true }),
  ).toBeVisible();
  await restored.screenshot({ path: join(root, "customer-sent.png") });
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"]) {
    await page
      .locator("header")
      .getByRole("combobox")
      .first()
      .selectOption(locale);
    await expect(restored).not.toContainText("undefined");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (locale === "uz-Cyrl")
      await restored.screenshot({ path: join(root, "customer-cyrl.png") });
  }
  const own = await (
    await request.get("/api/commissions/" + id, { headers: f.headers })
  ).json();
  expect(own.order).toMatchObject({
    status: "fulfilled",
    tracking: ["ORIGINAL-TRACK-" + info.project.name],
  });
  expect(own.artHash).toMatch(/^[a-f0-9]{64}$/);
  writeFileSync(
    join(root, "manufacturing-identity.json"),
    JSON.stringify(
      { artHash: own.artHash, sequenceHash: own.sequenceHash, guide: f.guide },
      null,
      2,
    ),
  );
});
