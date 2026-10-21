import { test, expect } from "@playwright/test";
import { financeFixture } from "./finance-fixture";
test.use({ trace: "off" });
test("transactional inbox and explicitly opted-in mock mail follow real payment/support transitions and private permissions", async ({
  request,
}) => {
  const f = await financeFixture(request),
    email = "mail-" + crypto.randomUUID() + "@example.invalid";
  const registration = await request.post("/api/account/register", {
    headers: f.headers,
    data: { email, password: "Synthetic-password-123!" },
  });
  expect(registration.ok()).toBe(true);
  const account = await registration.json();
  f.headers.Authorization = "Bearer " + account.token;
  const pref = await request.get("/api/inbox/preferences", {
    headers: f.headers,
  });
  expect(await pref.json()).toMatchObject({
    revision: 0,
    emailOptIn: false,
    emailAvailable: true,
    configured: true,
    mock: true,
  });
  expect(
    (
      await request.post("/api/inbox/preferences", {
        headers: f.headers,
        data: {
          revision: 0,
          emailOptIn: true,
          locale: "en",
          recipient: "wrong@example.invalid",
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/inbox/preferences", {
        headers: f.headers,
        data: { revision: 0, emailOptIn: true, locale: "en" },
      })
    ).ok(),
  ).toBe(true);
  const order = await f.order();
  const paid = await request.post(
    "/api/admin/finance/orders/" + order.id + "/receipt",
    {
      headers: f.root,
      data: {
        requestKey: crypto.randomUUID(),
        received: true,
        amountMinor: order.total_minor,
        currency: order.currency,
        reference: "SYNTHETIC-CASH-MAIL",
      },
    },
  );
  expect(paid.ok()).toBe(true);
  const ticket = await request.post("/api/support", {
    headers: f.headers,
    data: { subject: "PRIVATE SUBJECT", body: "PRIVATE SUPPORT CONTENT" },
  });
  expect(ticket.ok()).toBe(true);
  const t = await ticket.json();
  expect(
    (
      await request.post("/api/admin/support/" + t.id + "/reply", {
        headers: f.root,
        data: { body: "PRIVATE REPLY CONTENT", state: "answered" },
      })
    ).ok(),
  ).toBe(true);
  const inbox = await (
    await request.get("/api/inbox?locale=en", { headers: f.headers })
  ).json();
  expect(inbox.map((m: { kind: string }) => m.kind).sort()).toEqual(
    ["order-created", "order-paid", "support-replied"].sort(),
  );
  for (const secret of [
    email,
    "PRIVATE SUBJECT",
    "PRIVATE SUPPORT CONTENT",
    "PRIVATE REPLY CONTENT",
    "cipher",
    "provider_id",
  ])
    expect(JSON.stringify(inbox)).not.toContain(secret);
  const guest = await (await request.post("/api/session")).json(),
    other = { Authorization: "Bearer " + guest.token };
  expect(
    await (await request.get("/api/inbox", { headers: other })).json(),
  ).toEqual([]);
  expect(
    (
      await request.post("/api/inbox/" + inbox[0].id + "/read", {
        headers: other,
        data: {},
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.post("/api/inbox/" + inbox[0].id + "/read", {
        headers: f.headers,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await request.get("/api/admin/mail", { headers: f.headers })).status(),
  ).toBe(403);
  expect((await request.get("/api/inbox")).status()).toBe(401);
  expect(
    (
      await request.get("/api/inbox?locale=ar", { headers: f.headers })
    ).status(),
  ).toBe(400);
  await expect
    .poll(
      async () => {
        const r = await (
          await request.get("/api/admin/mail", { headers: f.root })
        ).json();
        return r.messages.filter(
          (m: { id: string; state: string }) =>
            inbox.some((own: { id: string }) => own.id === m.id) &&
            m.state === "accepted",
        ).length;
      },
      { timeout: 15000 },
    )
    .toBe(3);
  for (const m of inbox)
    expect(
      (
        await request.post("/api/admin/mail/" + m.id + "/retry", {
          headers: f.root,
          data: {},
        })
      ).ok(),
    ).toBe(true);
  await expect
    .poll(
      async () => {
        const r = await (
          await request.get("/api/admin/mail", { headers: f.root })
        ).json();
        return r.messages.filter(
          (m: { id: string; state: string; attempts: number }) =>
            inbox.some((own: { id: string }) => own.id === m.id) &&
            m.state === "delivered" &&
            m.attempts === 1,
        ).length;
      },
      { timeout: 15000 },
    )
    .toBe(3);
  const report = await (
    await request.get("/api/admin/mail", { headers: f.root })
  ).json();
  expect(report.mode).toBe("mock");
  expect(JSON.stringify(report)).not.toContain(email);
  for (const m of inbox)
    expect(
      (
        await request.post("/api/admin/mail/" + m.id + "/retry", {
          headers: f.root,
          data: {},
        })
      ).status(),
    ).toBe(409);
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"]) {
    const rows = await (
      await request.get("/api/inbox?locale=" + locale, { headers: f.headers })
    ).json();
    expect(rows).toHaveLength(3);
    expect(rows.every((m: { body: string }) => m.body.length > 10)).toBe(true);
  }
});
test("mock opt-out and stale revisions preserve the in-app fallback and messages-only staff scope", async ({
  request,
}) => {
  const f = await financeFixture(request),
    order = await f.order();
  const inbox = await (
    await request.get("/api/inbox?locale=en", { headers: f.headers })
  ).json();
  expect(inbox).toHaveLength(1);
  expect(inbox[0]).toMatchObject({
    entityId: order.id,
    state: "in_app",
    mock: false,
  });
  const access = await request.post("/api/admin/access", {
    headers: f.root,
    data: { name: "Synthetic mail support", role: "support", days: 1 },
  });
  expect(access.ok()).toBe(true);
  const staff = await access.json(),
    headers = { Authorization: "Bearer " + staff.token };
  expect((await request.get("/api/admin/mail", { headers })).status()).toBe(
    403,
  );
  expect(
    (
      await request.post("/api/admin/mail/" + inbox[0].id + "/retry", {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/inbox/preferences", {
        headers: f.headers,
        data: { revision: 0, locale: "ru", emailOptIn: false },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post("/api/inbox/preferences", {
        headers: f.headers,
        data: { revision: 0, locale: "en", emailOptIn: false },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/inbox/preferences", {
        headers: f.headers,
        data: { revision: 1, locale: "en", emailOptIn: true },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/admin/mail/" + inbox[0].id + "/retry", {
        headers: f.root,
        data: {},
      })
    ).status(),
  ).toBe(409);
});
