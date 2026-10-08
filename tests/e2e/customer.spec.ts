import { test, expect } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { generate } from "../../src/core/engine";
import { createProfile } from "../../src/core/geometry";
import { DEFAULT_EDITS } from "../../src/core/types";
import { progressFor } from "../../src/core/validation";

test("customer account, code, gift, order, administrator fulfillment and support survive reload", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const secrets = JSON.parse(
    readFileSync("tmp/data/local-secrets.json", "utf8"),
  );
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  const hub = page.locator(".customer-hub"),
    email = `flow-${testInfo.project.name}-${Date.now()}@example.com`,
    password = "local test password only";
  await hub
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  await hub.getByLabel("Email", { exact: true }).fill(email);
  await hub
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill(password);
  await hub
    .getByRole("button", { name: "Register this account", exact: true })
    .click();
  await expect(hub.locator(".recovery-key code")).toBeVisible();
  const recovery = await hub.locator(".recovery-key code").textContent();
  expect(recovery!.length).toBeGreaterThan(30);
  await page.reload();
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  await expect(hub.locator(".customer-session")).toContainText(email);
  await hub
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await hub
    .getByLabel("Administrator token", { exact: true })
    .fill(secrets.LOCAL_ADMIN_TOKEN);
  await hub
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  const codeCard = hub
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Codes", exact: true }) });
  await codeCard.getByLabel("Credit quota", { exact: true }).fill("3");
  await codeCard
    .getByRole("button", { name: "Issue new code", exact: true })
    .click();
  const code = await hub.getByTestId("issued-code").textContent();
  await hub.getByRole("button", { name: "Account", exact: true }).click();
  await hub.getByLabel("Kit code", { exact: true }).fill(code!);
  await hub.getByRole("button", { name: "Redeem code", exact: true }).click();
  await expect(hub.getByTestId("customer-credits")).toHaveText("3");
  await hub
    .getByRole("button", { name: "Create credit gift", exact: true })
    .click();
  await expect(hub.getByTestId("customer-credits")).toHaveText("2");
  await hub.getByRole("button", { name: "Cancel gift", exact: true }).click();
  await expect(hub.getByTestId("customer-credits")).toHaveText("3");
  await hub.getByRole("button", { name: "Shop", exact: true }).click();
  await hub
    .getByRole("button", { name: "Add to cart", exact: true })
    .first()
    .click();
  await hub.getByLabel("Name", { exact: true }).fill("Local Test Maker");
  await hub.getByLabel("City", { exact: true }).fill("Tashkent");
  await hub.getByLabel("Address", { exact: true }).fill("Development address");
  await hub
    .getByRole("button", { name: "Place sandbox order", exact: true })
    .click();
  await expect(hub).toContainText("Awaiting test payment");
  await hub
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await hub
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  const orderCard = hub
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Orders", exact: true }),
    });
  const order = orderCard.locator("article").first();
  await order
    .getByRole("button", { name: "Record test payment", exact: true })
    .click();
  await expect(order).toContainText("Test payment recorded");
  await order
    .getByLabel("Test tracking reference", { exact: true })
    .fill("TEST-ONLY-TRACK");
  await order
    .getByRole("button", { name: "Record test shipment", exact: true })
    .click();
  await hub.getByRole("button", { name: "Shop", exact: true }).click();
  await hub
    .locator(".customer-session")
    .getByRole("button", { name: "Refresh", exact: true })
    .click();
  await expect(hub).toContainText("TEST-ONLY-TRACK");
  await hub
    .getByRole("button", { name: "Request return", exact: true })
    .first()
    .click();
  await expect(hub).toContainText("Return requested");
  await hub
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await hub
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  await order
    .getByRole("button", { name: "Record test refund", exact: true })
    .click();
  await hub.getByRole("button", { name: "Support", exact: true }).click();
  await hub.getByLabel("Subject", { exact: true }).fill(email);
  await hub
    .getByLabel("Message", { exact: true })
    .fill("Test: help with exact instructions");
  await hub
    .getByRole("button", { name: "Save local support request", exact: true })
    .click();
  await expect(hub.locator("article")).toContainText("Test: help");
  await hub
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await hub
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  const ticket = hub
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: email, exact: true }) });
  await ticket
    .getByLabel("Message", { exact: true })
    .fill("Exact local support reply");
  await ticket.getByRole("button", { name: "Save reply", exact: true }).click();
  await hub.getByRole("button", { name: "Support", exact: true }).click();
  await hub
    .locator(".customer-session")
    .getByRole("button", { name: "Refresh", exact: true })
    .click();
  await expect(hub.locator("blockquote")).toHaveText(
    "Exact local support reply",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  await expect(hub.locator(".customer-session")).toContainText(email);
  await hub.getByRole("button", { name: "Sign out", exact: true }).click();
  await hub.getByLabel("Email", { exact: true }).fill(email);
  await hub
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill(password);
  await hub.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(hub.locator(".customer-session")).toContainText(email);
  await hub.getByRole("button", { name: "Shop", exact: true }).click();
  await expect(hub).toContainText("Test refund recorded");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  mkdirSync("output/product-evidence", { recursive: true });
  await page.screenshot({
    path: `output/product-evidence/${testInfo.project.name}-customer.png`,
    fullPage: true,
  });
});

test("bookmarks, folder and explicit server progress preserve immutable instructions offline", async ({
  page,
  context,
}, testInfo) => {
  const i = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(90),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 80,
    mode: "dark",
  });
  const project = {
    id: crypto.randomUUID(),
    name: "Guide test",
    instruction: i,
    progress: progressFor(i),
    edits: DEFAULT_EDITS,
  };
  const secrets = JSON.parse(
    readFileSync("tmp/data/local-secrets.json", "utf8"),
  );
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await page
    .locator("input[type=file]")
    .last()
    .setInputFiles({
      name: "guide.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({ schema: "iprasm.project/1", project }),
      ),
    });
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  await page.getByLabel("Jump to exact step", { exact: true }).fill("10");
  await page
    .getByLabel("Bookmark label", { exact: true })
    .fill("Check this pin");
  await page
    .getByRole("button", { name: "Bookmark this step", exact: true })
    .click();
  await expect(page.getByTestId("confirmed-step")).toHaveText(
    `0/${i.metrics.lines}`,
  );
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page
    .locator(".project-card")
    .getByLabel("Folder", { exact: true })
    .fill("Portrait tests");
  await page.locator(".project-card h2").click();
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  const hub = page.locator(".customer-hub");
  await hub
    .getByRole("button", { name: "Start sandbox session", exact: true })
    .click();
  const response = await page.request.post(
    "http://127.0.0.1:4311/api/admin/codes",
    {
      headers: { Authorization: `Bearer ${secrets.LOCAL_ADMIN_TOKEN}` },
      data: {
        profile: "dev-circle-120-dark",
        quota: 2,
        expiresAt: Date.now() + 60000,
      },
    },
  );
  expect(response.ok()).toBe(true);
  const issued = await response.json();
  await hub.getByLabel("Kit code", { exact: true }).fill(issued.code);
  await hub.getByRole("button", { name: "Redeem code", exact: true }).click();
  await hub.getByRole("button", { name: "Project sync", exact: true }).click();
  await hub
    .getByRole("button", {
      name: "Save instruction to server · 1 credit",
      exact: true,
    })
    .click();
  await expect(hub.getByTestId("customer-credits")).toHaveText("1");
  const remote = hub
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: "Server instructions",
        exact: true,
      }),
    });
  await remote.getByRole("button", { name: "Refresh", exact: true }).click();
  await remote
    .getByRole("button", { name: "Save local progress", exact: true })
    .click();
  await expect(remote).toContainText("Confirmed: 10");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByLabel("Jump to exact step", { exact: true }).fill("15");
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  await expect(hub.getByTestId("customer-credits")).toHaveText("1");
  await hub.getByRole("button", { name: "Project sync", exact: true }).click();
  await remote.getByRole("button", { name: "Refresh", exact: true }).click();
  await remote
    .getByRole("button", { name: "Use server progress", exact: true })
    .click();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await expect(
    page.locator(".project-card").getByLabel("Folder", { exact: true }),
  ).toHaveValue("Portrait tests");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("confirmed-step")).toHaveText(
    `10/${i.metrics.lines}`,
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page
    .getByRole("button", { name: "10 · Check this pin", exact: true })
    .click();
  await expect(
    page.getByLabel("Jump to exact step", { exact: true }),
  ).toHaveValue("10");
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  mkdirSync("output/product-evidence", { recursive: true });
  await page.screenshot({
    path: `output/product-evidence/${testInfo.project.name}-guide.png`,
    fullPage: true,
  });
  await context.setOffline(false);
});
