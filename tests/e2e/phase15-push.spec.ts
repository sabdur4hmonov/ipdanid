import { test, expect } from "./legacy-test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
test.use({ trace: "off" });
test("owner announcement queues through the real UI, mocks delivery and protects device ownership", async ({
  page,
  request,
}, info) => {
  const headers = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN },
    id = crypto.randomUUID(),
    secret = "test-only-installation-proof-" + crypto.randomUUID();
  const guest = await (await request.post("/api/session", { data: {} })).json(),
    other = await (await request.post("/api/session", { data: {} })).json();
  const own = { Authorization: "Bearer " + guest.token },
    foreign = { Authorization: "Bearer " + other.token };
  expect((await request.get("/api/push/devices")).status()).toBe(401);
  const input = {
    installationId: id,
    installationSecret: secret,
    token: "only-mock-device-token-" + crypto.randomUUID(),
    platform: "web",
    locale: "en",
    consent: true,
    promotions: false,
  };
  expect(
    (
      await request.post("/api/push/devices", {
        headers: own,
        data: { ...input, consent: false },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/push/devices", { headers: own, data: input })
    ).ok(),
  ).toBe(true);
  const listed = await (
    await request.get("/api/push/devices", { headers: own })
  ).json();
  expect(listed).toHaveLength(1);
  expect(JSON.stringify(listed)).not.toContain(input.token);
  expect(JSON.stringify(listed)).not.toContain(secret);
  expect(
    await (await request.get("/api/push/devices", { headers: foreign })).json(),
  ).toEqual([]);
  expect(
    (
      await request.post("/api/push/revoke", {
        headers: foreign,
        data: { installationId: id, installationSecret: secret },
      })
    ).status(),
  ).toBe(403);
  const title =
    "Mock notification " + info.project.name + " " + crypto.randomUUID();
  const announcement = await (
    await request.post("/api/admin/announcements", {
      headers,
      data: {
        title,
        body: "Local mocked delivery only",
        kind: "news",
        active: true,
        startsAt: Date.now() - 1000,
        endsAt: Date.now() + 3600000,
        requestKey: crypto.randomUUID(),
      },
    })
  ).json();
  try {
    const config = await (await request.get("/api/push/config")).json();
    expect(config).toMatchObject({ mode: "mock", web: null });
    await page.goto("/");
    await page.getByLabel("Language", { exact: true }).selectOption("en");
    await page.getByText("More", { exact: true }).click();
    await page
      .getByRole("button", { name: "Account & shop", exact: true })
      .click();
    const hub = page.locator(".customer-hub");
    await hub
      .getByRole("button", { name: "Start sandbox session", exact: true })
      .click();
    await expect(hub.getByTestId("push-settings")).toContainText(
      "not configured",
    );
    await expect(
      hub.getByTestId("push-settings").getByRole("button"),
    ).toBeDisabled();
    await hub
      .getByRole("button", { name: "Administration", exact: true })
      .click();
    await hub
      .getByLabel("Administrator token", { exact: true })
      .fill(process.env.LOCAL_ADMIN_TOKEN!);
    await hub
      .getByRole("button", { name: "Open administration", exact: true })
      .click();
    const card = hub
      .getByTestId("business-admin")
      .locator("article")
      .filter({ hasText: title });
    await card
      .getByRole("button", { name: "Send notification", exact: true })
      .click();
    await expect(
      card.getByRole("button", { name: "Queued", exact: true }),
    ).toBeDisabled();
    await expect(card).toContainText("no real messages");
    await expect
      .poll(async () => {
        const status = await (
          await request.get("/api/admin/push/status", { headers })
        ).json();
        return (
          status.counts.find((x: { state: string }) => x.state === "mock_sent")
            ?.count ?? 0
        );
      })
      .toBeGreaterThan(0);
    const out = join("output", "phase15", "push", info.project.name);
    mkdirSync(out, { recursive: true });
    await card.screenshot({ path: join(out, "admin-mock-queued.png") });
    expect(
      (
        await request.post("/api/push/revoke", {
          headers: own,
          data: { installationId: id, installationSecret: secret },
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await (await request.get("/api/push/devices", { headers: own })).json()
      )[0].active,
    ).toBe(0);
  } finally {
    await request.post(
      "/api/admin/announcements/" + announcement.id + "/revoke",
      { headers, data: { revision: announcement.revision } },
    );
    await request.post("/api/account/logout", { headers: own, data: {} });
  }
});
