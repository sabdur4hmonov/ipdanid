import { test, expect } from "@playwright/test";
import { financeFixture } from "./finance-fixture";
test.use({ trace: "off" });
test("opt-in analytics use real customer order support and unlock facts, accept only fixed milestones, export privately and erase without restoring stale events", async ({
  request,
}) => {
  const f = await financeFixture(request),
    base = {
      requestKey: crypto.randomUUID(),
      consentRevision: 1,
      kind: "photo-selected",
      shape: "circle",
    };
  expect((await request.get("/api/analytics/export")).status()).toBe(401);
  expect(
    await (
      await request.get("/api/analytics/preferences", { headers: f.headers })
    ).json(),
  ).toMatchObject({ revision: 0, enabled: false, since: null });
  expect(
    (
      await request.post("/api/analytics/events", {
        headers: f.headers,
        data: base,
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/analytics/preferences", {
        headers: f.headers,
        data: { revision: 0, enabled: true },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post("/api/analytics/events", {
        headers: f.headers,
        data: { ...base, photo: "PRIVATE CONTENT" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/analytics/events", {
        headers: f.headers,
        data: base,
      })
    ).status(),
  ).toBe(201);
  expect(
    await (
      await request.post("/api/analytics/events", {
        headers: f.headers,
        data: base,
      })
    ).json(),
  ).toMatchObject({ duplicate: true });
  expect(
    (
      await request.post("/api/analytics/events", {
        headers: f.headers,
        data: { ...base, shape: "heart" },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/analytics/events", {
        headers: f.headers,
        data: {
          ...base,
          requestKey: crypto.randomUUID(),
          kind: "preview-ready",
        },
      })
    ).status(),
  ).toBe(201);
  const hash = "b".repeat(64),
    milestone = {
      requestKey: crypto.randomUUID(),
      consentRevision: 1,
      kind: "assembly-confirmed",
      sequenceHash: hash,
      revision: 1,
      confirmed: 3000,
      total: 3000,
    };
  expect(
    (
      await request.post("/api/analytics/events", {
        headers: f.headers,
        data: milestone,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/builds/unlock", {
        headers: f.headers,
        data: {
          sequenceHash: hash,
          deviceId: crypto.randomUUID(),
          requestKey: crypto.randomUUID(),
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post("/api/analytics/events", {
        headers: f.headers,
        data: milestone,
      })
    ).status(),
  ).toBe(201);
  const order = await f.order();
  expect(
    (
      await request.post("/api/admin/finance/orders/" + order.id + "/receipt", {
        headers: f.root,
        data: {
          requestKey: crypto.randomUUID(),
          received: true,
          amountMinor: order.total_minor,
          currency: order.currency,
          reference: "SYNTHETIC-METRICS-CASH",
        },
      })
    ).ok(),
  ).toBe(true);
  const ticket = await (
    await request.post("/api/support", {
      headers: f.headers,
      data: { subject: "PRIVATE SUBJECT", body: "PRIVATE BODY" },
    })
  ).json();
  expect(
    (
      await request.post("/api/admin/support/" + ticket.id + "/reply", {
        headers: f.root,
        data: { body: "PRIVATE REPLY", state: "answered" },
      })
    ).ok(),
  ).toBe(true);
  const report = await (
    await request.get("/api/admin/analytics", { headers: f.root })
  ).json();
  expect(report).toMatchObject({
    version: "opt-in-metrics/1",
    funnel: { photos: 1, previews: 1, unlocked: 1, started: 1, completed: 1 },
    support: { tickets: 1, answered: 1 },
    commerce: { paidOrders: 1 },
  });
  for (const value of ["PRIVATE", f.account.id, order.id, hash])
    expect(JSON.stringify(report)).not.toContain(value);
  expect(
    (
      await request.get("/api/admin/analytics", { headers: f.headers })
    ).status(),
  ).toBe(403);
  const grant = await (
    await request.post("/api/admin/access", {
      headers: f.root,
      data: { name: "Synthetic metrics support", role: "support", days: 1 },
    })
  ).json();
  expect(
    (
      await request.get("/api/admin/analytics", {
        headers: { Authorization: "Bearer " + grant.token },
      })
    ).status(),
  ).toBe(403);
  const own = await (
    await request.get("/api/analytics/export", { headers: f.headers })
  ).json();
  expect(own.events).toHaveLength(3);
  expect(
    own.events.some((e: { sequenceHash?: string }) => e.sequenceHash === hash),
  ).toBe(true);
  expect(JSON.stringify(own)).not.toContain("PRIVATE");
  const other = await (await request.post("/api/session")).json();
  expect(
    (
      await (
        await request.get("/api/analytics/export", {
          headers: { Authorization: "Bearer " + other.token },
        })
      ).json()
    ).events,
  ).toEqual([]);
  expect(
    (
      await request.post("/api/analytics/erase", {
        headers: f.headers,
        data: { revision: 1, erase: false },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/analytics/erase", {
        headers: f.headers,
        data: { revision: 1, erase: true },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await (
        await request.get("/api/analytics/export", { headers: f.headers })
      ).json()
    ).events,
  ).toEqual([]);
  expect(
    (
      await request.post("/api/analytics/events", {
        headers: f.headers,
        data: base,
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await (
        await request.get("/api/admin/analytics", { headers: f.root })
      ).json()
    ).funnel,
  ).toMatchObject({
    photos: 0,
    previews: 0,
    unlocked: 0,
    started: 0,
    completed: 0,
  });
  expect(
    (
      await request.post("/api/analytics/preferences", {
        headers: f.headers,
        data: { revision: 2, enabled: true },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await (
        await request.get("/api/admin/analytics", { headers: f.root })
      ).json()
    ).commerce.paidOrders,
  ).toBe(0);
  expect(
    (
      await request.post("/api/analytics/erase", {
        headers: f.headers,
        data: { revision: 3, erase: true },
      })
    ).ok(),
  ).toBe(true);
});
