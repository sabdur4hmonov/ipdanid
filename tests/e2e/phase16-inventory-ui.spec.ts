import { test, expect } from "@playwright/test";
import { KitStore } from "../../server/kit-store";
import { KitInventory } from "../../server/kit-inventory";
import { assertTestDatabasePath } from "../../server/test-safety.mjs";
import { english } from "../protected-e2e/helpers";
import { resolve, sep, basename } from "node:path";
test("owner sees actual private inventory states without exporting secrets or pretending a public batch is a million", async ({
  page,
  request,
}, info) => {
  const path = process.env.IP_RASM_TEST_DATABASE!;
  assertTestDatabasePath(path);
  expect(
    resolve(path).startsWith(
      resolve(process.env.IP_RASM_TEST_ARTIFACTS!) + sep + "api-",
    ),
  ).toBe(true);
  expect(basename(path)).toBe("test.sqlite");
  const store = new KitStore(
    path,
    process.env.CODE_PEPPER!,
    process.env.SANDBOX_PAYMENT_KEY!,
  );
  let readyId = "",
    stagingId = "";
  try {
    const inventories = new KitInventory(store);
    const ready = inventories.begin(
      "admin",
      "standard-base-r1",
      3,
      crypto.randomUUID(),
    );
    inventories.append(ready.id, 3, () => {});
    inventories.activate(ready.id);
    readyId = ready.id;
    stagingId = inventories.begin(
      "admin",
      "standard-base-r1",
      2,
      crypto.randomUUID(),
    ).id;
  } finally {
    store.close();
  }
  const response = await request.get(
    process.env.IP_RASM_TEST_API_URL + "/api/admin/kits",
    {
      headers: { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN },
    },
  );
  expect(response.ok()).toBe(true);
  const inventory = (await response.json()).inventories;
  expect(inventory.find((r: any) => r.id === readyId)).toMatchObject({
    issued: 3,
    total: 3,
    status: "ready",
  });
  expect(inventory.find((r: any) => r.id === stagingId)).toMatchObject({
    issued: 0,
    total: 2,
    status: "staging",
  });
  expect(Object.keys(inventory[0]).sort()).toEqual([
    "created_at",
    "id",
    "issued",
    "profile",
    "status",
    "total",
  ]);
  await page.goto("/");
  await english(page);
  const menu = page.getByTestId("customer-menu");
  await menu.locator("summary").click();
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
  const table = page.getByTestId("kit-inventories");
  const readyRow = table
    .getByTestId("kit-inventory-row")
    .filter({ hasText: readyId });
  await expect(readyRow).toHaveAttribute("data-issued", "3");
  await expect(readyRow).toHaveAttribute("data-total", "3");
  await expect(readyRow).toContainText("Ready");
  await expect(
    table.getByTestId("kit-inventory-row").filter({ hasText: stagingId }),
  ).toContainText("Preparing");
  await expect(table.getByRole("button")).toHaveCount(0);
  await table.screenshot({
    path: info.outputPath("private-inventory-summary.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await hub.getByRole("button", { name: "Shop", exact: true }).click();
  await hub
    .getByRole("button", { name: "Add to cart", exact: true })
    .first()
    .click();
  const generation = await (
    await request.get(
      process.env.IP_RASM_TEST_API_URL + "/api/generation/config",
    )
  ).json();
  await expect(page.getByTestId("checkout-network-note")).toHaveText(
    generation.enabled
      ? "Ordering and creating a new preview need internet. Previously unlocked assembly works offline."
      : "Ordering needs internet. Creating and assembling string art work offline.",
  );
});
