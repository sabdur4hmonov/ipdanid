import { expect, type Page } from "@playwright/test";
export async function unlockIfNeeded(page: Page) {
  await page
    .locator('[data-testid="build-gate"],[data-testid="player-hash"]')
    .first()
    .waitFor({ state: "visible" });
  if (await page.getByTestId("build-gate").isVisible())
    await unlockKitGuide(page);
}
export async function unlockKitGuide(page: Page) {
  const gate = page.getByTestId("build-gate");
  await expect(gate).toBeVisible();
  const issued = await page.request.post(
    process.env.IP_RASM_TEST_API_URL + "/api/admin/kits/batch",
    {
      headers: { Authorization: `Bearer ${process.env.LOCAL_ADMIN_TOKEN}` },
      data: {
        profile: "synthetic-e2e",
        count: 1,
        requestKey: crypto.randomUUID(),
      },
    },
  );
  expect(issued.ok()).toBe(true);
  const batch = await issued.json();
  await page.getByTestId("kit-code").fill(batch.codes[0].code);
  await gate
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  await expect(page.getByTestId("kit-credits")).toContainText(String(batch.codes[0].quota));
  await page.getByTestId("unlock-build").click();
  await expect(gate).toHaveCount(0);
}
