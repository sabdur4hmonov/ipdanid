import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { gallery, photoCases, png } from "./phase12-cases";
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
      await p.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(p.getByTestId("customer-credits")).toHaveText("0");
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
