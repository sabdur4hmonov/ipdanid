import { test, expect, type Page } from "@playwright/test";
import { uiText } from "../../src/ui-i18n";

test.use({ serviceWorkers: "block", trace: "off" });

async function createNavigation(page: Page) {
  await page.getByRole("navigation", { name: uiText("en", "main"), exact: true })
    .getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible();
}

async function details(page: Page) {
  const panel = page.locator(".customer-details");
  if (!(await panel.evaluate((n: HTMLDetailsElement) => n.open)))
    await panel.locator("summary").click();
  return page.getByTestId("sequence-animation");
}

test("a box code needs no password, opens three guides, and never exposes a fourth ordered guide", async ({ page, request }) => {
  test.setTimeout(240000);
  await page.goto("/");
  const menu = page.getByTestId("customer-menu");
  await menu.locator("summary").click();
  await page.locator('[data-testid="locale-picker"]:visible').selectOption("en");
  await menu.locator("summary").click();
  // An original, procedural JPEG: no private or licensed portrait fixture.
  const jpeg = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 400; c.height = 500;
    const x = c.getContext("2d")!;
    x.fillStyle = "white"; x.fillRect(0, 0, 400, 500);
    x.fillStyle = "#c4a991"; x.beginPath(); x.ellipse(200, 235, 110, 165, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#252525"; x.beginPath(); x.ellipse(200, 115, 112, 70, 0, Math.PI, 2 * Math.PI); x.fill();
    x.fillRect(130, 190, 40, 12); x.fillRect(230, 190, 40, 12);
    x.strokeStyle = "#504035"; x.lineWidth = 9;
    x.beginPath(); x.moveTo(200, 225); x.lineTo(185, 280); x.lineTo(212, 280); x.stroke();
    x.beginPath(); x.moveTo(160, 330); x.quadraticCurveTo(200, 350, 240, 330); x.stroke();
    return c.toDataURL("image/jpeg", 0.94).split(",")[1];
  });
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (await chooser).setFiles({ name: "original-kit-test.jpg", mimeType: "image/jpeg", buffer: Buffer.from(jpeg, "base64") });
  const generate = page.locator("button.customer-main-action");
  await expect(generate).toHaveText("Create");
  await expect(generate).toBeEnabled({ timeout: 90000 });
  await generate.click();
  await expect(page.getByTestId("customer-result")).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId("customer-thread-result")).toBeVisible();
  const lockedAnimation = await details(page);
  for (const name of ["Download thread video", "Download thread GIF"])
    await expect(lockedAnimation.getByRole("button", { name, exact: true })).toBeDisabled();
  await expect(page.getByTestId("player-hash")).toHaveCount(0);
  for (const name of ["Project JSON", "TXT sequence", "PDF guide"])
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0);

  const config = await (await request.get("/api/kit-profiles")).json();
  const issued = await request.post("/api/admin/kits/batch", {
    headers: { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN },
    data: { profile: `standard-base-r${config.revision}`, count: 1, requestKey: crypto.randomUUID() },
  });
  expect(issued.ok()).toBe(true);
  const batch = await issued.json();
  expect(batch.codes[0].quota).toBe(3);
  const hashes: string[] = [];
  for (let index = 0; index < 3; index++) {
    if (index) {
      const animation = await details(page);
      await expect(animation.getByRole("button", { name: "Download thread GIF", exact: true })).toBeEnabled();
      const budget = index === 1 ? 2500 : 3500;
      await page.locator(".budget-chips").getByRole("button", { name: index === 1 ? /^2500 / : /^3500 / }).click();
      await expect(page.locator(".customer-effort")).toContainText(String(budget), { timeout: 60000 });
      await expect(page.locator(".customer-progress")).toHaveCount(0, { timeout: 60000 });
      await expect((await details(page)).getByRole("button", { name: "Download thread GIF", exact: true })).toBeDisabled();
    }
    await page.getByRole("button", { name: "Start assembling", exact: true }).click();
    const gate = page.getByTestId("build-gate");
    await expect(gate).toBeVisible();
    await expect(gate.locator('input[type="password"], input[type="email"]')).toHaveCount(0);
    if (!index) {
      await page.getByTestId("kit-code").fill(batch.codes[0].code);
      await gate.getByRole("button", { name: "Sign in with kit code", exact: true }).click();
    }
    await expect(page.getByTestId("kit-credits")).toContainText(String(3 - index));
    await page.getByTestId("unlock-build").click();
    await expect(page.getByTestId("player-hash")).toBeVisible();
    hashes.push((await page.getByTestId("player-hash").textContent())!);
    await createNavigation(page);
    // An already-opened guide is free to reopen.
    await page.getByRole("button", { name: "Start assembling", exact: true }).click();
    await expect(page.getByTestId("player-hash")).toHaveText(hashes[index]);
    await expect(page.getByTestId("build-gate")).toHaveCount(0);
    await createNavigation(page);
  }
  expect(new Set(hashes).size).toBe(3);
  await page.getByRole("button", { name: "Adjust again", exact: true }).click();
  await page.getByRole("button", { name: "Square", exact: true }).click();
  await expect(page.locator("button.customer-main-action")).toBeEnabled();
  await page.locator("button.customer-main-action").click();
  await expect(page.getByTestId("customer-result")).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId("customer-thread-result")).toBeVisible();
  for (const name of ["Download thread video", "Download thread GIF"])
    await expect((await details(page)).getByRole("button", { name, exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Start assembling", exact: true }).click();
  await expect(page.getByTestId("kit-credits")).toContainText("0");
  await page.getByTestId("unlock-build").click();
  await expect(page.getByTestId("build-gate").getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("player-hash")).toHaveCount(0);
});
