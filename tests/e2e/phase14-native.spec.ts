import { test, expect } from "@playwright/test";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
} from "../../src/core/classic-least-squares";
import {
  standardProfiles,
  DEFAULT_STANDARD_KIT,
} from "../../src/core/standard-kit";
import { progressFor } from "../../src/core/validation";
import { DEFAULT_EDITS } from "../../src/core/types";
import { unlockKitGuide } from "./kit-access";
import { openMore } from "./navigation";
import { mkdirSync, writeFileSync } from "node:fs";
test("native-mode browser uses real local API for kit redeem, signed unlock and backend-scoped restart", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const api = process.env.IP_RASM_TEST_API_URL! + "/api";
  const i = await generateClassicLeastSquares({
    pixels: new Uint8Array(64 * 64 * 3).fill(140),
    profile: leastSquaresProfile(
      standardProfiles(structuredClone(DEFAULT_STANDARD_KIT))[0],
      true,
    ),
    resolution: 64,
    lines: 80,
    mode: "dark",
    accessPolicy: "kit-build/1",
  });
  const project = {
    id: "native14",
    name: "Native14",
    instruction: i,
    progress: progressFor(i),
    edits: { ...DEFAULT_EDITS },
  };
  await page.addInitScript(
    ({ api, project }) => {
      const w = window as any;
      w.CapacitorCustomPlatform = { name: "native-test" };
      w.__nativeCalls = [];
      w.Capacitor = {
        PluginHeaders: [
          {
            name: "CapacitorHttp",
            methods: [{ name: "request", rtype: "promise" }],
          },
        ],
        nativePromise: async (plugin: string, method: string, o: any) => {
          if (plugin !== "CapacitorHttp" || method !== "request")
            throw Error("Unexpected native method");
          w.__nativeCalls.push({
            url: o.url,
            method: o.method,
            authorized: !!o.headers?.Authorization,
          });
          const r = await fetch(o.url, {
            method: o.method,
            headers: o.headers,
            ...(o.data !== undefined ? { body: JSON.stringify(o.data) } : {}),
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
      localStorage.setItem("iprasm.locale", "en");
      if (!localStorage.getItem("CapacitorStorage.iprasm.projects.v1")) {
        localStorage.setItem(
          "CapacitorStorage.iprasm.projects.v1",
          JSON.stringify([project]),
        );
        localStorage.setItem(
          "CapacitorStorage.iprasm.assembly-session.v1",
          JSON.stringify({
            version: 1,
            projectId: project.id,
            sequenceHash: project.instruction.sequenceHash,
            current: 1,
            pace: 8,
          }),
        );
      }
    },
    { api, project },
  );
  await page.goto("/");
  await unlockKitGuide(page);
  await expect(page.getByTestId("assembly-focus")).toBeVisible();
  const calls = await page.evaluate(() => (window as any).__nativeCalls);
  expect(
    calls.some(
      (c: any) => c.url === api + "/account/kit" && c.method === "POST",
    ),
  ).toBe(true);
  expect(
    calls.some((c: any) => c.url === api + "/builds/unlock" && c.authorized),
  ).toBe(true);
  expect(calls.every((c: any) => c.url.startsWith(api + "/"))).toBe(true);
  await openMore(page);
  await page
    .locator(".more-menu")
    .getByRole("button", { name: "Account & shop", exact: true })
    .click();
  await page
    .locator(".customer-tabs")
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await expect(page.getByTestId("native-server-address")).toHaveValue(api);
  await page
    .getByTestId("native-server-address")
    .fill("http://remote.example/api");
  await page
    .getByRole("button", { name: "Save and reopen", exact: true })
    .click();
  await expect(
    page.locator('[data-testid="native-server-settings"] [role="alert"]'),
  ).toBeVisible();
  await page.getByTestId("native-server-address").fill(api);
  await page
    .getByRole("button", { name: "Save and reopen", exact: true })
    .click();
  await expect(page.getByTestId("assembly-focus")).toBeVisible();
  await page.route(api + "/**", (r) => r.abort());
  await page.reload();
  await expect(page.getByTestId("assembly-focus")).toBeVisible();
  await expect(page.getByTestId("build-gate")).toHaveCount(0);
  await page.getByTestId("assembly-confirm").click();
  await expect(page.getByTestId("confirmed-step")).toHaveText("1/80");
  const out = "output/current-product/native/" + info.project.name;
  mkdirSync(out, { recursive: true });
  await page.screenshot({ path: out + "/native-local-kit.png" });
  writeFileSync(
    out + "/verification.json",
    JSON.stringify(
      {
        nativeBridge: "CapacitorHttp request forwarded by test bridge",
        realLocalApi: true,
        codeRedeemed: true,
        signedUnlock: true,
        offlineRestart: true,
        accountScopedToBackend: true,
        phoneInstalled: false,
      },
      null,
      2,
    ),
  );
});
