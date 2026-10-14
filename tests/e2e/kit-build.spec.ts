import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, readFileSync } from "node:fs";
import { generate } from "../../src/core/engine";
import { createProfile } from "../../src/core/geometry";
import { DEFAULT_EDITS } from "../../src/core/types";
import { progressFor } from "../../src/core/validation";
import { openMore } from "./navigation";
async function importGuide(page: Page, file: string) {
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.locator('input[accept=".json,.txt"]').setInputFiles(file);
}
async function reopen(page: Page) {
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
}
test("new guides lock steps and exports, signed unlock survives offline and tamper recovery never spends twice", async ({
  page,
  context,
  browser,
}, info) => {
  test.setTimeout(180000);
  const i = await generate({
      accessPolicy: "kit-build/1",
      pixels: new Uint8Array(32 * 32 * 3).fill(180),
      resolution: 32,
      profile: createProfile("circle", 24),
      lines: 40,
      mode: "dark",
    }),
    file = info.outputPath("locked.json");
  writeFileSync(
    file,
    JSON.stringify({
      schema: "iprasm.project/1",
      project: {
        id: crypto.randomUUID(),
        name: "Kit test",
        instruction: i,
        progress: progressFor(i),
        edits: DEFAULT_EDITS,
      },
    }),
  );
  await importGuide(page, file);
  const gate = page.getByTestId("build-gate");
  await expect(gate).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const box of await gate.getByRole("button").evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height)))expect(box).toBeGreaterThanOrEqual(44);
  for (const id of ["player-hash", "confirmed-step"])
    await expect(page.getByTestId(id)).toHaveCount(0);
  for (const name of ["PDF guide", "TXT sequence", "Project JSON"])
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  const download = page.waitForEvent("download");
  await gate
    .getByRole("button", { name: "Download preview PNG", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  const headers = { Authorization: `Bearer ${process.env.LOCAL_ADMIN_TOKEN}` },
    r = await page.request.post(
      process.env.IP_RASM_TEST_API_URL + "/api/admin/kits/batch",
      {
        headers,
        data: { profile: "test", count: 1, requestKey: crypto.randomUUID() },
      },
    );
  expect(r.ok()).toBe(true);
  const code = (await r.json()).codes[0].code;
  await page.getByTestId("kit-code").fill(code);
  await gate
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  await expect(page.getByTestId("kit-credits")).toContainText("4");
  await page.getByTestId("unlock-build").click();
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  const token = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("iprasm.customer.product-4311.v1")!)
        .token,
  );
  const account = async () => {
    const r = await page.request.get(
      process.env.IP_RASM_TEST_API_URL + "/api/builds/account",
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return r.json();
  };
  expect((await account()).credits).toBe(3);
  // Saving to the existing cloud library is a free archive of an already paid guide.
  const archive = await page.request.post(
    process.env.IP_RASM_TEST_API_URL + "/api/builds/archive",
    { headers: { Authorization: `Bearer ${token}` }, data: { instruction: i } },
  );
  expect(archive.ok()).toBe(true);
  expect((await account()).credits).toBe(3);
  const archiveRetry = await page.request.post(
    process.env.IP_RASM_TEST_API_URL + "/api/builds/archive",
    { headers: { Authorization: `Bearer ${token}` }, data: { instruction: i } },
  );
  expect((await archiveRetry.json()).duplicate).toBe(true);
  await page.evaluate(async () => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await reopen(page);
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  const saved = page.waitForEvent("download");
  await page.getByRole("button", { name: "Project JSON", exact: true }).click();
  const json = JSON.parse(readFileSync((await (await saved).path())!, "utf8"));
  expect(json.project.instruction.sequenceHash).toBe(i.sequenceHash);
  await context.setOffline(false);
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
        k.endsWith(":build-access-v1"),
      )!,
      c = JSON.parse(localStorage.getItem(key)!);
    c.deviceId = "changed-device-0123456789";
    localStorage.setItem(key, JSON.stringify(c));
  });
  await reopen(page);
  await expect(gate).toBeVisible();
  await expect(page.getByTestId("kit-credits")).toContainText("3");
  await page.getByTestId("unlock-build").click();
  await expect(page.getByTestId("player-hash")).toHaveText(i.sequenceHash);
  expect((await account()).credits).toBe(3);
  // Another device with only the guide stays locked, then the same account reissues access for free.
  const second = await browser.newContext({
    baseURL: info.project.use.baseURL,
  });
  try {
    const p = await second.newPage();
    await importGuide(p, file);
    await expect(p.getByTestId("build-gate")).toBeVisible();
    await p.getByTestId("kit-code").fill(code);
    await p
      .getByRole("button", { name: "Sign in with kit code", exact: true })
      .click();
    await expect(p.getByTestId("kit-credits")).toContainText("3");
    await p.getByTestId("unlock-build").click();
    await expect(p.getByTestId("player-hash")).toHaveText(i.sequenceHash);
    expect((await account()).credits).toBe(3);
  } finally {
    await second.close();
  }
  await page.screenshot({
    path: info.outputPath("unlocked-guide.png"),
    fullPage: true,
  });
});
test("admin configures default4/no expiry and downloads real local printable QR batch and private code list", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await openMore(page);
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await page
    .getByLabel("Administrator token", { exact: true })
    .fill(process.env.LOCAL_ADMIN_TOKEN!);
  await page
    .getByRole("button", { name: "Open administration", exact: true })
    .click();
  const admin = page.getByTestId("kit-admin");
  await expect(admin).toBeVisible();
  await expect(admin.getByLabel("Builds per kit", { exact: true })).toHaveValue(
    "4",
  );
  await expect(
    admin.getByLabel("Days to use credits after redemption (0 = no expiry)", {
      exact: true,
    }),
  ).toHaveValue("0");
  await admin.getByLabel("Codes per batch", { exact: true }).fill("2");
  await page.getByTestId("issue-kit-batch").click();
  await expect(page.getByTestId("kit-batch")).toBeVisible();
  const list = page.waitForEvent("download");
  await admin
    .getByRole("button", { name: "Download code list", exact: true })
    .click();
  const csv = readFileSync((await (await list).path())!, "utf8"),
    codes = csv
      .split("\n")
      .slice(1)
      .map((r) => r.split(",")[0]);
  expect(codes).toHaveLength(2);
  const print = page.waitForEvent("download");
  await admin
    .getByRole("button", { name: "Download printable QR inserts", exact: true })
    .click();
  const d = await print,
    html = readFileSync((await d.path())!, "utf8");
  expect(html.match(/<svg/g)).toHaveLength(2);
  for (const code of codes) expect(html).toContain(code);
  expect(html).not.toMatch(/<(script|img|link)\b/);
  await d.saveAs(info.outputPath("kit-inserts.html"));
  await page.screenshot({
    path: info.outputPath("kit-admin.png"),
    fullPage: true,
  });
});
