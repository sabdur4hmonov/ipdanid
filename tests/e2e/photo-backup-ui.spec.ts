import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { gallery, photoCases, png } from "./phase12-cases";
import { encodePhotoDraft, type PhotoDraft } from "../../src/photo-draft";
import { DEFAULT_STANDARD_KIT } from "../../src/core/standard-kit";
test.use({ trace: "off" });
async function account(request: APIRequestContext) {
  const guest = await (await request.post("/api/session")).json(),
    email = crypto.randomUUID() + "@example.invalid",
    password = "Synthetic-password-123!";
  const r = await request.post("/api/account/register", {
    headers: { Authorization: "Bearer " + guest.token },
    data: { email, password },
  });
  expect(r.ok()).toBe(true);
  return { account: await r.json(), email, password };
}
async function open(page: Page) {
  const menu = page.getByTestId("customer-menu");
  if (!(await menu.evaluate((n: HTMLDetailsElement) => n.open)))
    await menu.locator("summary").click();
  await menu
    .getByRole("button", { name: "Continue editing later", exact: true })
    .click();
  return page.getByTestId("private-photo-backup");
}
async function seed(page: Page, a: unknown) {
  await page.addInitScript((a) => {
    localStorage.setItem("iprasm.locale", "en");
    if (!sessionStorage.getItem("photo-backup-seeded")) {
      sessionStorage.setItem("photo-backup-seeded", "1");
      localStorage.setItem(
        "iprasm.customer.product-4311.v1",
        JSON.stringify(a),
      );
    }
  }, a);
  await page.goto("/");
}
async function accountScreen(page: Page) {
  const menu = page.getByTestId("customer-menu");
  if (!(await menu.evaluate((n: HTMLDetailsElement) => n.open)))
    await menu.locator("summary").click();
  await menu
    .getByRole("button", { name: "Account / Admin", exact: true })
    .click();
}
async function login(page: Page, f: { email: string; password: string }) {
  await page.getByLabel("Email", { exact: true }).fill(f.email);
  await page
    .getByLabel("Password (at least 12 characters)", { exact: true })
    .fill(f.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator(".customer-session")).toContainText(f.email);
}
async function pendingCount(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const r = indexedDB.open("iprasm.private-photo-pending", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("pending"),
            count = tx.objectStore("pending").count();
          tx.oncomplete = () => {
            resolve(count.result);
            db.close();
          };
          tx.onerror = () => {
            reject(tx.error);
            db.close();
          };
        };
        r.onerror = () => reject(r.error);
      }),
  );
}
test("private photo privacy: logout cleans unmounted retries and rejects a held old-account photo", async ({
  page,
  request,
}, info) => {
  const f = await account(request),
    other = await account(request);
  const draft: PhotoDraft = {
    version: "editable-photo/1",
    savedAt: Date.now(),
    width: 2,
    height: 2,
    rgba: new Uint8Array(16).fill(160),
    maskEdited: true,
    analysis: {
      mask: { width: 2, height: 2, values: new Float32Array(4).fill(1) },
      faces: [],
      faceUnavailable: true,
      cleanupUnavailable: true,
    },
    shape: "heart",
    kind: "people",
    caption: "Private old account",
    adjustment: { x: 0.1, y: 0.1, zoom: 1.2 },
    rotation: 1,
    lines: 3000,
    config: structuredClone(DEFAULT_STANDARD_KIT),
  };
  const saved = await request.post("/api/photo-backup", {
    headers: { Authorization: "Bearer " + f.account.token },
    data: {
      consent: "private-photo-backup/1",
      expectedRevision: 0,
      requestKey: crypto.randomUUID(),
      archive: Buffer.from(await encodePhotoDraft(draft)).toString("base64"),
    },
  });
  expect(saved.ok()).toBe(true);
  await seed(page, f.account);
  let panel = await open(page);
  await panel
    .getByRole("button", { name: "Check backup status", exact: true })
    .click();
  await page.route("**/api/photo-backup/delete", (route) => route.abort());
  await panel
    .getByLabel("I confirm deleting the account copy", { exact: true })
    .check();
  await panel
    .getByRole("button", { name: "Delete account photo", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Retry previous request", exact: true }),
  ).toBeVisible();
  expect(await pendingCount(page)).toBe(1);
  await page
    .getByTestId("photo-draft-panel")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await accountScreen(page);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect.poll(() => pendingCount(page)).toBe(0);
  await login(page, f);
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("button", { name: "Create", exact: true })
    .click();
  panel = await open(page);
  await panel
    .getByRole("button", { name: "Check backup status", exact: true })
    .click();
  let arrived!: () => void, release!: () => void, finished!: () => void;
  const received = new Promise<void>((r) => (arrived = r)),
    gate = new Promise<void>((r) => (release = r)),
    done = new Promise<void>((r) => (finished = r));
  await page.route("**/api/photo-backup/read", async (route) => {
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    arrived();
    await gate;
    await route.fulfill({ response });
    finished();
  });
  await panel
    .getByRole("button", { name: "Open account photo", exact: true })
    .click();
  await received;
  try {
    await page
      .getByTestId("photo-draft-panel")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await accountScreen(page);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await login(page, other);
    release();
    await done;
    await page
      .getByRole("navigation", { name: "Main" })
      .getByRole("button", { name: "Create", exact: true })
      .click();
    panel = await open(page);
    await panel
      .getByRole("button", { name: "Check backup status", exact: true })
      .click();
    await expect(panel.getByTestId("photo-backup-status")).toContainText(
      "No account photo",
    );
    expect(await pendingCount(page)).toBe(0);
    await expect(page.getByTestId("customer-photo")).toHaveCount(0);
    await panel.screenshot({
      path: `test-results/c21c-backup-privacy/${info.project.name}-other-account.png`,
    });
    await page.reload();
    await expect(page.getByTestId("customer-photo")).toHaveCount(0);
  } finally {
    release();
  }
});
for (const native of [false, true])
  test(`private photo exact retry and second-device ${native ? "native" : "web"} restore/delete`, async ({
    page,
    request,
    browser,
  }, info) => {
    test.setTimeout(180000);
    const f = await account(request),
      h = { Authorization: "Bearer " + f.account.token };
    await seed(page, f.account);
    await gallery(page, photoCases[0]);
    await page.getByRole("button", { name: "Heart", exact: true }).click();
    await page.getByRole("slider", { name: "Zoom", exact: true }).fill("1.5");
    await page.getByRole("button", { name: "Rotate ↻", exact: true }).click();
    const before = await png(page, "customer-photo"),
      framing = await page
        .getByTestId("customer-photo")
        .getAttribute("data-framing");
    let panel = await open(page);
    await panel
      .getByRole("button", { name: "Check backup status", exact: true })
      .click();
    await expect(panel.getByTestId("photo-backup-status")).toContainText(
      "No account photo",
    );
    await expect(
      panel.getByRole("button", { name: "Save to my account", exact: true }),
    ).toBeDisabled();
    await panel
      .getByLabel(
        "I agree to upload my photo and cutout for a private backup",
        { exact: true },
      )
      .check();
    await page.evaluate(() => {
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (
        ...args: Parameters<typeof put>
      ) {
        if (this.transaction.db.name === "iprasm.private-photo-pending") {
          IDBObjectStore.prototype.put = put;
          throw new DOMException("Injected full disk", "QuotaExceededError");
        }
        return put.apply(this, args);
      };
    });
    await panel
      .getByRole("button", { name: "Save to my account", exact: true })
      .click();
    await expect(panel.getByRole("status")).toContainText("Could not finish");
    expect(
      await (await request.get("/api/photo-backup", { headers: h })).json(),
    ).toMatchObject({ revision: 0 });
    let lost = false,
      sent = "";
    await page.route("**/api/photo-backup", async (route) => {
      if (route.request().method() === "POST" && !lost) {
        sent = route.request().postData()!;
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        lost = true;
        await route.abort();
      } else {
        if (route.request().method() === "POST")
          expect(route.request().postData() === sent).toBe(true);
        await route.continue();
      }
    });
    await panel
      .getByRole("button", { name: "Save to my account", exact: true })
      .click();
    await expect(panel.getByRole("status")).toContainText("Could not finish");
    await expect(
      panel.getByRole("button", {
        name: "Retry previous request",
        exact: true,
      }),
    ).toBeVisible();
    await page.reload();
    panel = await open(page);
    await panel
      .getByRole("button", { name: "Retry previous request", exact: true })
      .click();
    await expect(panel.getByRole("status")).toHaveText("Saved to account");
    expect(
      await (await request.get("/api/photo-backup", { headers: h })).json(),
    ).toMatchObject({ revision: 1, available: true });
    const second = await browser.newContext({
      viewport:
        info.project.name === "desktop"
          ? { width: 1280, height: 900 }
          : { width: 390, height: 844 },
      serviceWorkers: "block",
    });
    try {
      const p = await second.newPage(),
        api = process.env.IP_RASM_TEST_API_URL! + "/api";
      await p.addInitScript(
        ({ native, api }) => {
          localStorage.setItem("iprasm.locale", "en");
          if (!native) return;
          const w = window as any;
          w.CapacitorCustomPlatform = { name: "native-test" };
          w.__photoNativeCalls = [];
          w.Capacitor = {
            PluginHeaders: [
              {
                name: "CapacitorHttp",
                methods: [{ name: "request", rtype: "promise" }],
              },
              {
                name: "Preferences",
                methods: ["get", "set", "remove"].map((name) => ({
                  name,
                  rtype: "promise",
                })),
              },
            ],
            nativePromise: async (plugin: string, method: string, o: any) => {
              if (plugin === "Preferences") {
                const key = "native-test:" + o.key;
                if (method === "get")
                  return { value: localStorage.getItem(key) };
                if (method === "set") {
                  localStorage.setItem(key, o.value);
                  return;
                }
                if (method === "remove") {
                  localStorage.removeItem(key);
                  return;
                }
              }
              if (
                plugin !== "CapacitorHttp" ||
                method !== "request" ||
                !o.url.startsWith(api + "/")
              )
                throw Error("Unexpected transport");
              w.__photoNativeCalls.push({
                path: o.url.slice(api.length),
                method: o.method,
              });
              const r = await fetch(o.url, {
                method: o.method,
                headers: o.headers,
                ...(o.data === undefined
                  ? {}
                  : { body: JSON.stringify(o.data) }),
              });
              return {
                status: r.status,
                data: await r.json(),
                headers: {},
                url: o.url,
              };
            },
          };
          localStorage.setItem("iprasm.debug-server.v1", api);
        },
        { native, api },
      );
      await p.goto(new URL("/", page.url()).href);
      await p.getByTestId("customer-menu").locator("summary").click();
      await p
        .getByTestId("customer-menu")
        .getByRole("button", { name: "Account / Admin", exact: true })
        .click();
      await p.getByLabel("Email", { exact: true }).fill(f.email);
      await p
        .getByLabel("Password (at least 12 characters)", { exact: true })
        .fill(f.password);
      const loginReply = p.waitForResponse((r) =>
        new URL(r.url()).pathname === "/api/account/login" && r.request().method() === "POST");
      const responseErrors: { path: string; status: number }[] = [];
      p.on("response", (r) => {
        const path = new URL(r.url()).pathname;
        if (path.startsWith("/api/") && r.status() >= 400)
          responseErrors.push({ path, status: r.status() });
      });
      await p.getByRole("button", { name: "Sign in", exact: true }).click();
      expect((await loginReply).status(), "Second-device login HTTP status").toBe(200);
      await expect(p.getByTestId("customer-credits"),
        `Second-device API errors: ${JSON.stringify(responseErrors)}`).toHaveText("0");
      // A reload returns to the photo start screen with the persisted account.
      await p.reload();
      const remote = await open(p);
      await remote
        .getByRole("button", { name: "Check backup status", exact: true })
        .click();
      await remote
        .getByRole("button", { name: "Open account photo", exact: true })
        .click();
      await expect(p.getByTestId("photo-draft-panel")).toHaveCount(0);
      await expect(p.getByTestId("customer-photo")).toHaveAttribute(
        "data-framing",
        framing!,
        { timeout: 30000 },
      );
      expect((await png(p, "customer-photo")) === before).toBe(true);
      if (native)
        expect(
          await p.evaluate(() => (window as any).__photoNativeCalls),
        ).toEqual(
          expect.arrayContaining([
            { path: "/photo-backup/read", method: "GET" },
          ]),
        );
      const deletion = await open(p);
      await deletion
        .getByRole("button", { name: "Check backup status", exact: true })
        .click();
      await expect(
        deletion.getByRole("button", {
          name: "Delete account photo",
          exact: true,
        }),
      ).toBeDisabled();
      await deletion
        .getByLabel("I confirm deleting the account copy", { exact: true })
        .check();
      await deletion
        .getByRole("button", { name: "Delete account photo", exact: true })
        .click();
      await expect(deletion.getByRole("status")).toHaveText(
        "Account copy deleted",
      );
      expect(
        await (await request.get("/api/photo-backup", { headers: h })).json(),
      ).toMatchObject({ revision: 2, available: false });
      await deletion.screenshot({
        path: `test-results/c21c-backup-ui/${info.project.name}-${native ? "native" : "web"}-deleted.png`,
      });
    } finally {
      await second.close();
    }
  });
