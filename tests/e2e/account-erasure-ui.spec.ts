import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
for (const native of [false, true])
  test(`customer can erase an account and retry local cleanup (${native ? "native" : "web"})`, async ({
    page,
    request,
  }, info) => {
    const password = "Synthetic-password-123!";
    const register = async () => {
      const guest = await (await request.post("/api/session")).json();
      const r = await request.post("/api/account/register", {
        headers: { Authorization: "Bearer " + guest.token },
        data: { email: crypto.randomUUID() + "@example.invalid", password },
      });
      expect(r.ok(), `Registration HTTP status: ${r.status()}`).toBe(true);
      return r.json();
    };
    const user = await register(),
      other = await register(),
      api = process.env.IP_RASM_TEST_API_URL! + "/api";
    await page.addInitScript(
      ({ user, other, native, api }) => {
        const w = window as any;
        localStorage.setItem("iprasm.locale", "en");
        if (native) {
          w.CapacitorCustomPlatform = { name: "native-test" };
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
                const k = "native-test:" + o.key;
                if (method === "get") return { value: localStorage.getItem(k) };
                if (method === "set") {
                  localStorage.setItem(k, o.value);
                  return;
                }
                if (method === "remove") {
                  localStorage.removeItem(k);
                  return;
                }
              }
              if (
                plugin !== "CapacitorHttp" ||
                method !== "request" ||
                !o.url.startsWith(api + "/")
              )
                throw Error("Unexpected transport");
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
        }
        const scope =
            "iprasm.customer.product-4311.v1" +
            (native ? ":" + encodeURIComponent(api) : ""),
          storagePrefix = native ? "native-test:" : "";
        w.__erasureScope = scope;
        w.__erasureStoragePrefix = storagePrefix;
        if (!sessionStorage.getItem("erase-seeded")) {
          sessionStorage.setItem("erase-seeded", "1");
          localStorage.setItem(storagePrefix + scope, JSON.stringify(user));
          for (const suffix of [
            ":recovery:",
            ":digital-pending:",
            ":checkout:",
          ])
            localStorage.setItem(
              storagePrefix + scope + suffix + user.id,
              "{}",
            );
          localStorage.setItem(
            storagePrefix + scope + ":build-access-v1",
            JSON.stringify({
              deviceId: "synthetic-device-123",
              receipts: {
                own: { payload: { accountId: user.id } },
                foreign: { payload: { accountId: other.id } },
              },
            }),
          );
          localStorage.setItem("iprasm.projects.v1", "[]");
        }
      },
      { user, other, native, api },
    );
    const accountScreen = async () => {
      await page.getByTestId("customer-menu").locator("summary").click();
      await page
        .getByTestId("customer-menu")
        .getByRole("button", { name: "Account / Admin", exact: true })
        .click();
    };
    await page.goto("/");
    await accountScreen();
    let panel = page.getByTestId("account-erasure");
    await panel.locator("summary").click();
    await panel
      .getByRole("button", { name: "Review deletion", exact: true })
      .click();
    const remove = panel.getByRole("button", {
      name: "Permanently delete my account",
      exact: true,
    });
    await expect(remove).toBeDisabled();
    await panel
      .getByLabel("Re-enter account password", { exact: true })
      .fill(password);
    await panel
      .getByLabel("I confirm permanently deleting my account", { exact: true })
      .check();
    await page.evaluate(() => {
      const erase = IDBObjectStore.prototype.delete;
      IDBObjectStore.prototype.delete = function (
        ...args: Parameters<typeof erase>
      ) {
        if (this.transaction.db.name === "iprasm.private-photo-pending")
          throw new DOMException("Injected disk failure", "QuotaExceededError");
        return erase.apply(this, args);
      };
    });
    await remove.click();
    await expect(panel.getByRole("status")).toContainText(
      "Server account deleted",
    );
    expect(
      (
        await request.get("/api/account", {
          headers: { Authorization: "Bearer " + user.token },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.get("/api/account", {
          headers: { Authorization: "Bearer " + other.token },
        })
      ).ok(),
    ).toBe(true);
    await page.reload();
    await accountScreen();
    panel = page.getByTestId("account-erasure");
    await panel.locator("summary").click();
    await panel
      .getByRole("button", {
        name: "Finish clearing this device’s account cache",
        exact: true,
      })
      .click();
    await expect(panel.getByRole("status")).toContainText(
      "Account cache cleared",
    );
    const state = await page.evaluate((id) => {
      const w = window as any,
        scope = w.__erasureScope,
        p = w.__erasureStoragePrefix;
      return {
        credential: localStorage.getItem(p + scope),
        marker: localStorage.getItem(scope + ":erase-cleanup:" + id),
        remaining: [":checkout:", ":recovery:", ":digital-pending:"].map((s) =>
          localStorage.getItem(p + scope + s + id),
        ),
        receipts: JSON.parse(
          localStorage.getItem(p + scope + ":build-access-v1")!,
        ).receipts,
        deviceProjects: localStorage.getItem("iprasm.projects.v1"),
      };
    }, user.id);
    expect(state.credential).toBeNull();
    expect(state.marker).toBeNull();
    expect(state.remaining).toEqual([null, null, null]);
    expect(Object.keys(state.receipts)).toEqual(["foreign"]);
    expect(state.deviceProjects).toBe("[]");
    await panel.screenshot({
      path: `test-results/c21-erasure-ui/${info.project.name}-${native ? "native" : "web"}.png`,
    });
  });
