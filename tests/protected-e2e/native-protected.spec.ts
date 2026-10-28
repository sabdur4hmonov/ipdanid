import { test, expect } from "@playwright/test";
import { choosePhoto, result } from "./helpers";
test.use({ trace: "off" });
test("native HTTP and Preferences bridge unlock a protected snapshot guide and resume offline without a second debit", async ({
  page,
  request,
}) => {
  const api = process.env.IP_RASM_TEST_API_URL! + "/api";
  await page.addInitScript(
    ({ api }) => {
      const w = window as any;
      w.CapacitorCustomPlatform = { name: "native-test" };
      w.__nativeProtectedCalls = [];
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
            const key = "native-protected:" + o.key;
            if (method === "get") return { value: localStorage.getItem(key) };
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
            throw Error("Unexpected native transport");
          w.__nativeProtectedCalls.push({
            path: o.url.slice(api.length),
            method: o.method,
            authorized: !!o.headers?.Authorization,
            hasSnapshot: o.data?.pins?.version === "kit-pin-snapshot/1",
          });
          // APK assets are local and native mode intentionally has no SW.
          // Keep the fixture asset server available, disconnect the actual API
          // transport at the bridge boundary on reload instead.
          if (localStorage.getItem("native-protected-api-offline") === "1")
            throw Error("Native API is offline");
          const response = await fetch(o.url, {
            method: o.method,
            headers: o.headers,
            ...(o.data === undefined ? {} : { body: JSON.stringify(o.data) }),
          });
          return {
            status: response.status,
            data: await response.json(),
            headers: {},
            url: o.url,
          };
        },
      };
      localStorage.setItem("iprasm.debug-server.v1", api);
      localStorage.setItem("iprasm.locale", "en");
    },
    { api },
  );
  await page.goto("/");
  await choosePhoto(page);
  await page.locator("button.customer-main-action").click();
  await result(page);
  const issued = await request.post("/api/admin/kits/batch", {
    headers: { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN },
    data: {
      profile: "standard-kit-r1",
      count: 1,
      requestKey: crypto.randomUUID(),
    },
  });
  expect(issued.ok()).toBe(true);
  const code = (await issued.json()).codes[0].code;
  await page
    .getByRole("button", { name: "Start assembling", exact: true })
    .click();
  const gate = page.getByTestId("build-gate");
  await page.getByTestId("kit-code").fill(code);
  await gate
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  await expect(page.getByTestId("kit-credits")).toContainText("3");
  await page.getByTestId("unlock-build").click();
  await expect(page.getByTestId("player-hash")).toBeVisible();
  const sequenceHash = (await page.getByTestId("player-hash").textContent())!;
  await page
    .getByRole("button", {
      name: "Confirm completed through this step",
      exact: true,
    })
    .click();
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  await expect(page.getByTestId("library-save-state")).toHaveAttribute(
    "data-state",
    "saved",
  );
  const calls = await page.evaluate(
    () => (window as any).__nativeProtectedCalls,
  );
  expect(
    calls.some(
      (c: any) =>
        c.path === "/generation/start" && c.hasSnapshot && !c.authorized,
    ),
  ).toBe(true);
  expect(
    calls.some((c: any) => c.path === "/generation/unlock" && c.authorized),
  ).toBe(true);
  expect(calls.every((c: any) => !c.path.includes("?"))).toBe(true);
  await page.evaluate(() => localStorage.setItem("native-protected-api-offline", "1"));
  await page.reload();
  await page.getByRole("button", { name: "My projects", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByTestId("player-hash")).toHaveText(sequenceHash);
  await expect(page.getByTestId("confirmed-step")).toContainText("1/");
  await expect(page.getByTestId("build-gate")).toHaveCount(0);
  await page.evaluate(() => localStorage.removeItem("native-protected-api-offline"));
});
