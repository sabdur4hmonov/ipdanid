import { openMore } from "./navigation";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
test("owner issues scoped staff access, staff sees only duties, revocation blocks further access", async ({
  page,
}, info) => {
  const root = ({ LOCAL_ADMIN_TOKEN: process.env.LOCAL_ADMIN_TOKEN! }).LOCAL_ADMIN_TOKEN;
  const name = `Synthetic support ${info.project.name} ${Date.now()}`;
  await page.goto("/");
  await page.getByLabel("Language").selectOption("en");
  await openMore(page);
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  const hub = page.locator(".customer-hub");
  await hub
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await hub.getByLabel("Administrator token", { exact: true }).fill(root);
  await hub
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  const panel = hub.getByTestId("staff-access");
  await expect(panel).toBeVisible();
  await panel.getByLabel("Staff name", { exact: true }).fill(name);
  await panel.getByLabel("Staff role", { exact: true }).selectOption("support");
  await panel.getByLabel("Access duration (days)", { exact: true }).fill("1");
  await panel
    .getByRole("button", { name: "Issue staff access", exact: true })
    .click();
  const value = panel.getByTestId("issued-staff-token");
  await expect(value).toBeVisible();
  const token = (await value.textContent())!;
  const list = await page.request.get("/api/admin/access", {
    headers: { Authorization: `Bearer ${root}` },
  });
  const grant = (await list.json()).find(
    (s: { name: string }) => s.name === name,
  );
  expect(grant).toBeTruthy();
  try {
    await hub.getByLabel("Administrator token", { exact: true }).fill(token);
    await hub
      .getByRole("button", { name: "Open administration", exact: true })
      .click();
    await expect(hub.locator("[data-admin-permission=support]")).toBeVisible();
    for (const area of ["catalog", "orders", "codes", "audit"])
      await expect(hub.locator(`[data-admin-permission=${area}]`)).toBeHidden();
    await expect(hub.getByTestId("staff-access")).toHaveCount(0);
    const forged = await page.request.post("/api/admin/products", {
      headers: { Authorization: `Bearer ${token}` },
      data: { role: "owner", id: "forged", stock: 999 },
    });
    expect(forged.status()).toBe(403);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await hub.getByLabel("Administrator token", { exact: true }).fill(root);
    await hub
      .getByRole("button", { name: "Open administration", exact: true })
      .click();
    await panel.getByRole("button", { name: "Refresh", exact: true }).click();
    const entry = panel.locator("article").filter({ hasText: name });
    await entry
      .getByRole("button", { name: "Revoke staff access", exact: true })
      .click();
    await expect(entry).toContainText("Revoked");
    await hub.getByLabel("Administrator token", { exact: true }).fill(token);
    await hub
      .getByRole("button", { name: "Open administration", exact: true })
      .click();
    await expect(hub.getByRole("alert")).toBeVisible();
    await expect(hub.locator("[data-admin-permission=support]")).toHaveCount(0);
  } finally {
    await page.request.post(`/api/admin/access/${grant.id}/revoke`, {
      headers: { Authorization: `Bearer ${root}` },
      data: {},
    });
  }
});
