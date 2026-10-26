import {
  test,
  expect,
  devices,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { english } from "./phase12-cases";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { newEvidenceRoot } from "../helpers/evidence-paths";
import { validateInstruction } from "../../src/core/validation";
test.use({ trace: "off" });
const rootHeaders = () => ({
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
    .fill("partner-ui-" + crypto.randomUUID() + "@example.com");
  await hub
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill("isolated partner UI password");
  await hub
    .getByRole("button", { name: "Register this account", exact: true })
    .click();
  await expect(hub.locator(".recovery-key code")).toBeVisible();
  return (await page.getByTestId("partner-account-id").textContent())!;
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
    page.getByTestId("partner-admin").getByTestId("partner-terms"),
  ).toBeVisible();
}
async function product(request: APIRequestContext) {
  const id = "partner-ui-" + crypto.randomUUID(),
    name = "Original partner kit " + id.slice(-6);
  expect(
    (
      await request.post("/api/admin/products", {
        headers: rootHeaders(),
        data: {
          id,
          name,
          family: "string",
          price_minor: 10000,
          stock: 30,
          credits: 3,
          description: "Original fixture",
          expectedRevision: 0,
          active: 1,
          profile_id: "standard-base-r1",
        },
      })
    ).ok(),
  ).toBe(true);
  return { id, name };
}
async function portal(page: Page) {
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Account", exact: true })
    .click();
  const portal = page.getByTestId("partner-portal");
  await portal.locator("summary").click();
  await portal
    .getByRole("button", { name: "Check access and campaigns", exact: true })
    .click();
  return portal;
}
test("real owner terms volume authorization partner PDF links and recipient claim preserve the exact old kit profile", async ({
  page,
  request,
  browser,
}, info) => {
  test.setTimeout(240000);
  const out = newEvidenceRoot("output/current-partners/" + info.project.name);
  mkdirSync(out, { recursive: true });
  const sku = await product(request);
  await enter(page);
  const accountId = await register(page);
  await adminUI(page);
  const owner = page.getByTestId("partner-admin"),
    form = owner.getByTestId("partner-terms"),
    partnerName = "Original partner " + sku.id.slice(-6);
  await form
    .getByLabel("Account ID (give to the owner)", { exact: true })
    .fill(accountId);
  await form.getByLabel("Partner name", { exact: true }).fill(partnerName);
  await form
    .getByRole("combobox", { name: "Kit product", exact: true })
    .selectOption(sku.id);
  await form.getByLabel("Partner access enabled", { exact: true }).check();
  await form
    .getByTestId("partner-tier")
    .getByLabel("Unit price (UZS)", { exact: true })
    .fill("90");
  await form
    .getByRole("button", { name: "Add price tier", exact: true })
    .click();
  const tier = form.getByTestId("partner-tier").nth(1);
  await tier.getByLabel("Starting quantity", { exact: true }).fill("5");
  await tier.getByLabel("Unit price (UZS)", { exact: true }).fill("80");
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(owner.getByRole("status")).toHaveText("Saved");
  const p = await portal(page);
  await expect(p).toContainText(partnerName);
  for (const [locale, label] of [
    ["uz", "Hamkor uchun"],
    ["uz-Cyrl", "Ҳамкор учун"],
    ["ru", "Для партнёра"],
    ["en", "Partner portal"],
  ]) {
    await page.locator('[data-testid="locale-picker"]:visible').selectOption(locale);
    await expect(p.locator("summary")).toHaveText(label);
  }
  await p.getByLabel("Kit quantity", { exact: true }).fill("5");
  await p
    .getByRole("button", { name: "Get volume quote", exact: true })
    .click();
  await expect(p.getByTestId("partner-quote")).toContainText("400 UZS");
  const campaignName = "Original five-recipient " + sku.id.slice(-6);
  await p.getByLabel("Campaign name", { exact: true }).fill(campaignName);
  await p
    .getByRole("button", { name: "Request owner authorization", exact: true })
    .click();
  await expect(
    p.getByTestId("partner-campaign").filter({ hasText: campaignName }),
  ).toContainText("Awaiting owner authorization");
  await p.screenshot({ path: join(out, "partner-pending.png") });
  await adminUI(page);
  await owner
    .getByRole("combobox", { name: "Partner name", exact: true })
    .selectOption({ label: partnerName });
  const card = owner
    .getByTestId("partner-campaign")
    .filter({ hasText: campaignName });
  await expect(card).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Authorize code issuance", exact: true }),
  ).toBeDisabled();
  await card
    .getByLabel(
      "I reviewed the price and quantity and authorize issuing these codes.",
      { exact: true },
    )
    .check();
  await card
    .getByRole("button", { name: "Authorize code issuance", exact: true })
    .click();
  await expect(card).toContainText("Authorized, stock reserved");
  await owner.screenshot({ path: join(out, "owner-authorized.png") });
  const ready = await portal(page),
    campaign = ready
      .getByTestId("partner-campaign")
      .filter({ hasText: campaignName });
  await campaign
    .getByRole("button", { name: "Issue kit codes", exact: true })
    .click();
  const issued = page.getByTestId("partner-issued");
  await expect(issued).toBeVisible();
  await expect(issued.locator("code")).toHaveCount(5);
  await issued.screenshot({
    path: join(out, "issued-masked.png"),
    mask: [issued.locator("[data-sensitive]")],
  });
  let pending = page.waitForEvent("download");
  await issued
    .getByRole("button", { name: "Kit cards PDF", exact: true })
    .click();
  await (await pending).saveAs(join(out, "kit-cards.pdf"));
  expect(
    (
      await PDFDocument.load(readFileSync(join(out, "kit-cards.pdf")))
    ).getPageCount(),
  ).toBe(1);
  pending = page.waitForEvent("download");
  await issued
    .getByRole("button", { name: "Recipient links CSV", exact: true })
    .click();
  await (await pending).saveAs(join(out, "recipient-links.csv"));
  const links = readFileSync(join(out, "recipient-links.csv"), "utf8")
    .trim()
    .split("\n")
    .slice(1)
    .map((row) => row.split(",")[0]);
  expect(links).toHaveLength(5);
  const claimUrl = new URL(links[0]),
    code = claimUrl.hash.slice(5);
  expect(claimUrl.search).toBe("");
  expect(claimUrl.hash.startsWith("#kit=")).toBe(true);
  // Change the current kit after issuance. The recipient must still get revision1.
  const config = await (await request.get("/api/kit-profiles")).json();
  expect(
    (
      await request.post("/api/admin/kits/profiles", {
        headers: rootHeaders(),
        data: { ...config, stockMeters: config.stockMeters + 123 },
      })
    ).ok(),
  ).toBe(true);
  const recipientContext = await browser.newContext({
    ...devices[
      info.project.name === "mobile-browser" ? "Pixel 7" : "Desktop Chrome"
    ],
    baseURL: new URL(page.url()).origin,
  });
  try {
    await recipientContext.addInitScript(() =>
      localStorage.setItem("iprasm.locale", "en"),
    );
    const recipient = await recipientContext.newPage();
    let leaked = false;
    recipient.on("request", (r) => {
      if (r.url().includes(code) || (r.headers().referer ?? "").includes(code))
        leaked = true;
    });
    await recipient.goto(links[0]);
    await expect(recipient.getByTestId("kit-claim")).toBeVisible();
    expect(new URL(recipient.url()).hash).toBe("");
    await recipient
      .getByRole("button", { name: "Claim kit to this account", exact: true })
      .click();
    await expect(recipient.getByTestId("kit-claim")).toHaveCount(0);
    await expect(recipient.getByTestId("customer-credits")).toHaveText("3");
    await recipient
      .getByRole("button", { name: "Apply material to creator", exact: true })
      .click();
    await expect(recipient.getByTestId("customer-start")).toBeVisible();
    await recipient.getByTestId("customer-menu").locator("summary").click();
    await recipient.getByTestId("product-kind").selectOption("lettering");
    await recipient.getByTestId("customer-menu").locator("summary").click();
    await recipient.getByTestId("lettering-input").fill("KIT");
    await recipient.getByTestId("prepare-lettering").click();
    await recipient
      .getByRole("button", { name: "Create", exact: true })
      .click();
    await expect(recipient.getByTestId("customer-result")).toBeVisible({
      timeout: 60000,
    });
    // The visible preview precedes the serialized durable write.
    await expect.poll(() => recipient.evaluate(() =>
      JSON.parse(localStorage.getItem("iprasm.projects.v1") ?? "[]")[0]
        ?.instruction.sequenceHash,
    )).toBeTruthy();
    const guide = await recipient.evaluate(
      () =>
        JSON.parse(localStorage.getItem("iprasm.projects.v1")!)[0].instruction,
    );
    await validateInstruction(guide);
    expect(guide.algorithm).toBe("classic-greedy/3");
    expect(guide.metrics.lines).toBe(3000);
    expect(guide.profile.standardKit.config.revision).toBe(1);
    expect(guide.profile.standardKit.config.stockMeters).toBe(1200);
    writeFileSync(
      join(out, "claimed-profile-guide.json"),
      JSON.stringify(guide),
    );
    await recipient
      .getByRole("button", { name: "Start assembling", exact: true })
      .click();
    await expect(
      recipient.getByTestId("build-gate").getByTestId("kit-credits"),
    ).toContainText("3");
    await recipient
      .getByRole("button", { name: "Use 1 credit and unlock", exact: true })
      .click();
    await expect(recipient.getByTestId("player-hash")).toHaveText(
      guide.sequenceHash,
    );
    await recipient.evaluate(() => navigator.serviceWorker.ready);
    await recipientContext.setOffline(true);
    await recipient.reload();
    await expect(recipient.getByTestId("player-hash")).toHaveText(
      guide.sequenceHash,
    );
    expect(leaked).toBe(false);
    await recipient.screenshot({
      path: join(out, "claimed-offline-assembly.png"),
    });
  } finally {
    await recipientContext.close();
  }
  writeFileSync(
    join(out, "proof.json"),
    JSON.stringify(
      {
        actualCodes: 5,
        quoteMinor: 40000,
        profileRevision: 1,
        lines: 3000,
        fragmentStripped: true,
        noCodeInRequestUrl: true,
        signedUnlockAndOfflineResume: true,
      },
      null,
      2,
    ),
  );
});
test.describe("held partner response ownership", () => {
  // Routing-controlled failure injection must reach Playwright, not a service worker.
  // The preceding real kit/offline flow keeps its service worker enabled.
  test.use({ serviceWorkers: "block" });
test("lost one-time issuance cannot duplicate codes and stale partner responses cannot cross logout", async ({
  page,
  request,
}, info) => {
  const sku = await product(request);
  await enter(page);
  const accountId = await register(page),
    terms = {
      name: "Lost response partner",
      productId: sku.id,
      enabled: true,
      maxKits: 10,
      minBatch: 2,
      maxBatch: 10,
      codeDays: 30,
      creditDays: 0,
      tiers: [{ minCount: 2, unitMinor: 9000 }],
      revision: 0,
    };
  expect(
    (
      await request.post("/api/admin/partners", {
        headers: rootHeaders(),
        data: { accountId, terms },
      })
    ).ok(),
  ).toBe(true);
  const p = await portal(page);
  await p
    .getByRole("button", { name: "Get volume quote", exact: true })
    .click();
  await p
    .getByLabel("Campaign name", { exact: true })
    .fill("Lost response campaign");
  await p
    .getByRole("button", { name: "Request owner authorization", exact: true })
    .click();
  const card = p
      .getByTestId("partner-campaign")
      .filter({ hasText: "Lost response campaign" }),
    id = (await card.getAttribute("data-campaign-id"))!;
  const all = await (
      await request.get("/api/admin/partners", { headers: rootHeaders() })
    ).json(),
    owner = all.find((p: any) => p.accountId === accountId),
    campaigns = await (
      await request.get(`/api/admin/partners/${owner.id}/campaigns`, {
        headers: rootHeaders(),
      })
    ).json(),
    campaign = campaigns.find((c: any) => c.id === id);
  expect(
    (
      await request.post(`/api/admin/partners/campaigns/${id}/approve`, {
        headers: rootHeaders(),
        data: { revision: campaign.revision, authorizeIssue: true },
      })
    ).ok(),
  ).toBe(true);
  await p
    .getByRole("button", { name: "Check access and campaigns", exact: true })
    .click();
  let done!: () => void;
  let issuanceIntercepted = false;
  const lost = new Promise<void>((resolve) => {
    done = resolve;
  });
  await page.route(`**/api/partner/campaigns/${id}/issue`, async (route) => {
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    await route.abort("failed");
    issuanceIntercepted = true;
    done();
  });
  await card
    .getByRole("button", { name: "Issue kit codes", exact: true })
    .click();
  await expect.poll(() => issuanceIntercepted).toBe(true);
  await lost;
  await expect(p.getByRole("alert")).toBeVisible();
  await page.unroute(`**/api/partner/campaigns/${id}/issue`);
  await p
    .getByRole("button", { name: "Check access and campaigns", exact: true })
    .click();
  await expect(card).toContainText("Codes issued");
  await expect(
    card.getByRole("button", { name: "Issue kit codes", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("partner-issued")).toHaveCount(0);
  await expect(p).toContainText("Codes are shown once");
  let release!: () => void, arrive!: () => void, delivered!: () => void;
  let partnerIntercepted = false;
  const held = new Promise<void>((r) => {
      release = r;
    }),
    waiting = new Promise<void>((r) => {
      arrive = r;
    }),
    complete = new Promise<void>((r) => {
      delivered = r;
    });
  await page.route("**/api/partner", async (route) => {
    const response = await route.fetch();
    partnerIntercepted = true;
    arrive();
    await held;
    await route.fulfill({ response });
    delivered();
  });
  await p
    .getByRole("button", { name: "Check access and campaigns", exact: true })
    .click();
  await expect.poll(() => partnerIntercepted).toBe(true);
  await waiting;
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  release();
  await complete;
  await page.unroute("**/api/partner");
  await expect(page.getByTestId("partner-portal")).toHaveCount(0);
  await page
    .locator(".customer-session")
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  const clean = page.getByTestId("partner-portal");
  await clean.locator("summary").click();
  await clean
    .getByRole("button", { name: "Check access and campaigns", exact: true })
    .click();
  await expect(clean.getByRole("alert")).toContainText(
    "Partner access is not enabled",
  );
  await expect(clean.getByTestId("partner-campaign")).toHaveCount(0);
  const out = newEvidenceRoot("output/current-partners/" + info.project.name);
  mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "uncertain-proof.json"),
    JSON.stringify(
      {
        oneTimeResponseLost: true,
        noDuplicateIssueButton: true,
        lateResponseIgnoredAfterLogout: true,
      },
      null,
      2,
    ),
  );
});

});
