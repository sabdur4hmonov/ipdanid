import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
test("a private Instagram trial grants one bound digital build without paying for stock or delivery", async ({
  request,
}) => {
  const headers = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN },
    password = "Synthetic-trial-password-123!";
  const admin = async () => {
    const r = await request.get("/api/admin/trials", { headers });
    expect(r.ok()).toBe(true);
    return r.json();
  };
  const before = await admin(),
    now = Date.now(),
    policy = {
      ...before.policy,
      enabled: true,
      startsAt: now - 1000,
      expiresAt: now + 86400000,
      maxClaims: before.claimed + before.pending + 2,
    };
  expect(
    (
      await request.post("/api/admin/trials/policy", { headers, data: policy })
    ).ok(),
  ).toBe(true);
  let batch: any;
  try {
    const issued = await request.post("/api/admin/trials/batch", {
      headers,
      data: { count: 2, requestKey: crypto.randomUUID() },
    });
    expect(issued.ok()).toBe(true);
    batch = await issued.json();
    const register = async () => {
      const g = await (await request.post("/api/session")).json();
      const r = await request.post("/api/account/register", {
        headers: { Authorization: "Bearer " + g.token },
        data: { email: crypto.randomUUID() + "@example.invalid", password },
      });
      expect(r.ok(), `register ${r.status()}`).toBe(true);
      return r.json();
    };
    const a = await register(),
      b = await register(),
      ah = { Authorization: "Bearer " + a.token },
      bh = { Authorization: "Bearer " + b.token },
      body = { code: batch.codes[0], requestKey: crypto.randomUUID() };
    expect(
      (await request.post("/api/trial/claim", { data: body })).status(),
    ).toBe(401);
    expect(
      (await request.get("/api/admin/trials", { headers: ah })).status(),
    ).not.toBe(200);
    expect(
      (await request.get("/api/trial?unexpected=1", { headers: ah })).status(),
    ).toBe(400);
    const first = await request.post("/api/trial/claim", {
      headers: ah,
      data: body,
    });
    expect(first.ok()).toBe(true);
    expect(await first.json()).toMatchObject({ duplicate: false, credits: 1 });
    expect(
      await (
        await request.post("/api/trial/claim", { headers: ah, data: body })
      ).json(),
    ).toMatchObject({ duplicate: true, credits: 1 });
    expect(
      (
        await request.post("/api/trial/claim", {
          headers: ah,
          data: { ...body, code: batch.codes[1] },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await request.post("/api/trial/claim", { headers: bh, data: body })
      ).status(),
    ).toBe(409);
    expect(
      (
        await request.post("/api/account/kit", {
          data: { code: batch.codes[0] },
        })
      ).status(),
    ).toBe(401);
    const unlock = {
      sequenceHash: "a".repeat(64),
      deviceId: "trial-http-device-12345",
      requestKey: crypto.randomUUID(),
    };
    const opened = await request.post("/api/builds/unlock", {
      headers: ah,
      data: unlock,
    });
    expect(opened.ok()).toBe(true);
    expect(await opened.json()).toMatchObject({ duplicate: false, credits: 0 });
    expect(
      await (
        await request.post("/api/builds/unlock", { headers: ah, data: unlock })
      ).json(),
    ).toMatchObject({ duplicate: true, credits: 0 });
    expect(
      (
        await request.post("/api/builds/unlock", {
          headers: ah,
          data: {
            ...unlock,
            sequenceHash: "b".repeat(64),
            requestKey: crypto.randomUUID(),
          },
        })
      ).status(),
    ).toBe(402);
    expect(
      (
        await request.post("/api/trial/claim", {
          headers: bh,
          data: { ...body, code: batch.codes[1] },
        })
      ).ok(),
    ).toBe(true);
    const report = await admin();
    expect(report.claimed).toBe(before.claimed + 2);
    expect(report.used).toBe(before.used + 1);
    expect(JSON.stringify(report)).not.toContain(batch.codes[0]);
    expect(
      (
        await request.post("/api/admin/trials/batch", {
          headers,
          data: { count: 1, requestKey: crypto.randomUUID() },
        })
      ).status(),
    ).toBe(409);
  } finally {
    if (batch)
      await request.post("/api/admin/trials/revoke", {
        headers,
        data: { batchId: batch.id },
      });
    const current = await admin();
    await request.post("/api/admin/trials/policy", {
      headers,
      data: { ...current.policy, enabled: false },
    });
  }
});
