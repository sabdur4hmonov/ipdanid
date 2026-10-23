import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { generate } from "../../src/core/engine";
import { createProfile } from "../../src/core/geometry";
import { DEFAULT_EDITS } from "../../src/core/types";
import { progressFor } from "../../src/core/validation";
import { openMore } from "./navigation";
test.use({ trace: "off" });
async function fixture(request: APIRequestContext) {
  const guest = await (await request.post("/api/session")).json(),
    email = crypto.randomUUID() + "@example.invalid",
    password = "Synthetic-password-123!";
  const reg = await request.post("/api/account/register", {
    headers: { Authorization: "Bearer " + guest.token },
    data: { email, password },
  });
  expect(reg.ok()).toBe(true);
  const account = await reg.json(),
    headers = { Authorization: "Bearer " + account.token };
  const issued = await request.post("/api/admin/codes", {
    headers: { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN! },
    data: {
      profile: "dev-circle-120-dark",
      quota: 3,
      expiresAt: Date.now() + 60000,
    },
  });
  expect(issued.ok()).toBe(true);
  expect(
    (
      await request.post("/api/codes/redeem", {
        headers,
        data: { code: (await issued.json()).code },
      })
    ).ok(),
  ).toBe(true);
  const instruction = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(90),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 40,
    mode: "dark",
  });
  const job = await (
    await request.post("/api/jobs/reserve", {
      headers,
      data: {
        requestKey: crypto.randomUUID(),
        sequenceHash: instruction.sequenceHash,
      },
    })
  ).json();
  const finish = await request.post("/api/jobs/finish", {
    headers,
    data: { jobId: job.id, instruction },
  });
  expect(finish.ok()).toBe(true);
  const id = (await finish.json()).instructionId;
  const project = {
    id: crypto.randomUUID(),
    name: "Recovery portrait",
    instruction,
    progress: { ...progressFor(instruction), confirmed: 4 },
    edits: { ...DEFAULT_EDITS },
    folder: "Gifts",
    bookmarks: [{ step: 12, label: "Check tension" }],
  };
  return { account, headers, email, password, id, project };
}
async function sync(page: Page) {
  await openMore(page);
  await page
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  await page.getByRole("button", { name: "Project sync", exact: true }).click();
  return page.getByTestId("account-recovery");
}
async function seed(page: Page, f: Awaited<ReturnType<typeof fixture>>) {
  await page.addInitScript(
    ({ account, project }) => {
      if (sessionStorage.getItem("recovery-seeded")) return;
      sessionStorage.setItem("recovery-seeded", "1");
      localStorage.setItem("iprasm.locale", "en");
      localStorage.setItem(
        "iprasm.customer.product-4311.v1",
        JSON.stringify(account),
      );
      localStorage.setItem("iprasm.projects.v1", JSON.stringify([project]));
      localStorage.setItem(
        "iprasm.assembly-session.v1",
        JSON.stringify({
          version: 1,
          projectId: project.id,
          sequenceHash: project.instruction.sequenceHash,
          current: 17,
          pace: 8,
          resting: true,
        }),
      );
    },
    { account: f.account, project: f.project },
  );
  await page.goto("/");
}
test("explicit retry survives reload and second login restores exact paused position and organization", async ({
  page,
  request,
  browser,
}, info) => {
  const f = await fixture(request);
  await seed(page, f);
  let panel = await sync(page);
  await panel
    .getByRole("button", { name: "Refresh from server", exact: true })
    .click();
  let blocked = true;
  await page.route("**/api/instructions/*/recovery", async (route) => {
    if (blocked && route.request().method() === "POST") await route.abort();
    else await route.continue();
  });
  await panel
    .getByRole("button", { name: "Save this device’s copy", exact: true })
    .click();
  await expect(panel).toContainText("Not saved");
  await expect(
    panel.getByRole("button", { name: "Retry upload", exact: true }),
  ).toBeVisible();
  await page.reload();
  panel = await sync(page);
  await expect(
    panel.getByRole("button", { name: "Retry upload", exact: true }),
  ).toBeVisible();
  blocked = false;
  await panel
    .getByRole("button", { name: "Retry upload", exact: true })
    .click();
  await expect(panel).toContainText("Saved on server");
  const snapshot = await (
    await request.get(`/api/instructions/${f.id}/recovery`, {
      headers: f.headers,
    })
  ).json();
  expect(snapshot).toMatchObject({
    progress: { confirmed: 4, revision: 1 },
    details: {
      resume: { current: 17, resting: true },
      library: { folder: "Gifts" },
    },
  });
  const second = await browser.newContext({
    viewport:
      info.project.name === "desktop"
        ? { width: 1280, height: 900 }
        : { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  try {
    const p = await second.newPage();
    await p.addInitScript(() => localStorage.setItem("iprasm.locale", "en"));
    await p.goto(new URL("/", page.url()).href);
    await p.getByTestId('customer-menu').locator('summary').click();
    await p.getByTestId('customer-menu')
      .getByRole("button", { name: "Account / Admin", exact: true })
      .click();
    await p.getByLabel("Email", { exact: true }).fill(f.email);
    await p
      .getByLabel("Password (at least 12 characters)", { exact: true })
      .fill(f.password);
    await p.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(p.getByTestId("customer-credits")).toHaveText("2");
    await p.getByRole("button", { name: "Project sync", exact: true }).click();
    const remote = p.getByTestId("account-recovery");
    await remote
      .getByRole("button", { name: "Refresh from server", exact: true })
      .click();
    await remote
      .getByRole("button", { name: "Restore server copy", exact: true })
      .click();
    await expect(p.getByTestId("player-hash")).toHaveText(
      f.project.instruction.sequenceHash,
    );
    await expect(p.getByTestId("confirmed-step")).toHaveText("4/40");
    await expect(p.getByTestId("assembly-rest-status")).toBeVisible();
    const restored = await p.evaluate(() => ({
      projects: JSON.parse(localStorage.getItem("iprasm.projects.v1")!),
      session: JSON.parse(localStorage.getItem("iprasm.assembly-session.v1")!),
    }));
    expect(restored.projects[0].id).not.toBe(f.project.id);
    expect(restored.session).toMatchObject({
      projectId: restored.projects[0].id,
      current: 17,
      resting: true,
    });
    expect(restored.projects[0].folder).toBe("Gifts");
    expect(restored.projects[0].bookmarks).toEqual(f.project.bookmarks);
    await p.reload();
    await expect(p.getByTestId("assembly-rest-status")).toBeVisible();
    expect(
      await p.evaluate(
        () =>
          JSON.parse(localStorage.getItem("iprasm.assembly-session.v1")!)
            .current,
      ),
    ).toBe(17);
    await p.screenshot({
      path: `test-results/c21b-recovery-ui/${info.project.name}-restored.png`,
      fullPage: true,
    });
  } finally {
    await second.close();
  }
});
test("stale save stays pending and logout clears its private retry after leaving Sync", async ({
  page,
  request,
}) => {
  const f = await fixture(request);
  await seed(page, f);
  const panel = await sync(page);
  await panel
    .getByRole("button", { name: "Refresh from server", exact: true })
    .click();
  const body = {
    sequenceHash: f.project.instruction.sequenceHash,
    confirmed: 9,
    expectedRevision: 0,
    requestKey: crypto.randomUUID(),
    resume: { current: 25, pace: 10, resting: true },
    library: { name: "Newer remote copy", folder: "Newer", bookmarks: [] },
  };
  expect(
    (
      await request.post(`/api/instructions/${f.id}/recovery`, {
        headers: f.headers,
        data: body,
      })
    ).ok(),
  ).toBe(true);
  await panel
    .getByRole("button", { name: "Save this device’s copy", exact: true })
    .click();
  await expect(panel).toContainText("A newer copy is on the server");
  await panel
    .getByRole("button", { name: "Retry upload", exact: true })
    .click();
  await expect(panel).toContainText("A newer copy is on the server");
  expect(
    (
      await (
        await request.get(`/api/instructions/${f.id}/recovery`, {
          headers: f.headers,
        })
      ).json()
    ).progress.confirmed,
  ).toBe(9);
  const key = "iprasm.customer.product-4311.v1:recovery:" + f.account.id;
  expect(await page.evaluate((k) => !!localStorage.getItem(k), key)).toBe(true);
  await page
    .locator(".customer-hub")
    .getByRole("button", { name: "Account", exact: true })
    .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect
    .poll(() => page.evaluate((k) => localStorage.getItem(k), key))
    .toBeNull();
});
