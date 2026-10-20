import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
test("actual partner HTTP scopes stock authorization atomic batches and single-account kit claims", async ({
  request,
}) => {
  const root = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN! };
  async function maker() {
    const guest = await (
        await request.post("/api/session", { data: {} })
      ).json(),
      registered = await request.post("/api/account/register", {
        headers: { Authorization: "Bearer " + guest.token },
        data: {
          email: "partner-" + crypto.randomUUID() + "@example.com",
          password: "isolated partner HTTP password",
        },
      });
    expect(registered.ok()).toBe(true);
    const account = await registered.json();
    return {
      id: account.id,
      headers: { Authorization: "Bearer " + account.token },
    };
  }
  const a = await maker(),
    b = await maker(),
    productId = "partner-http-" + crypto.randomUUID();
  expect(
    (
      await request.post("/api/admin/products", {
        headers: root,
        data: {
          id: productId,
          name: "Original partner campaign kit",
          family: "string",
          price_minor: 10000,
          stock: 30,
          credits: 3,
          description: "Original fixture",
          expectedRevision: 0,
          active: 1,
          profile_id: "standard-base-r1",
        },
      })
    ).ok(),
  ).toBe(true);
  const terms = {
    name: "Original partner",
    productId,
    enabled: true,
    maxKits: 10,
    minBatch: 2,
    maxBatch: 10,
    codeDays: 30,
    creditDays: 60,
    tiers: [
      { minCount: 2, unitMinor: 9000 },
      { minCount: 5, unitMinor: 8000 },
    ],
    revision: 0,
  };
  for (const account of [a, b])
    expect(
      (
        await request.post("/api/admin/partners", {
          headers: root,
          data: { accountId: account.id, terms },
        })
      ).ok(),
    ).toBe(true);
  const response = await request.post("/api/partner/quotes", {
    headers: a.headers,
    data: { count: 5, requestKey: crypto.randomUUID() },
  });
  expect(response.ok()).toBe(true);
  const quote = await response.json();
  expect(quote).toMatchObject({
    count: 5,
    totalMinor: 40000,
    quota: 3,
    codeDays: 30,
    creditDays: 60,
  });
  const key = crypto.randomUUID(),
    body = {
      quoteId: quote.id,
      name: "Original five-recipient campaign",
      requestKey: key,
    };
  expect(
    (
      await request.post("/api/partner/campaigns", {
        headers: b.headers,
        data: body,
      })
    ).status(),
  ).toBe(409);
  const requested = await request.post("/api/partner/campaigns", {
    headers: a.headers,
    data: body,
  });
  expect(requested.ok()).toBe(true);
  const campaign = await requested.json();
  expect(
    (
      await (
        await request.post("/api/partner/campaigns", {
          headers: a.headers,
          data: body,
        })
      ).json()
    ).id,
  ).toBe(campaign.id);
  expect(
    (
      await request.post(`/api/partner/campaigns/${campaign.id}/issue`, {
        headers: a.headers,
        data: { revision: campaign.revision },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post(
        `/api/admin/partners/campaigns/${campaign.id}/approve`,
        {
          headers: root,
          data: { revision: campaign.revision, authorizeIssue: false },
        },
      )
    ).status(),
  ).toBe(400);
  const approvedResponse = await request.post(
    `/api/admin/partners/campaigns/${campaign.id}/approve`,
    {
      headers: root,
      data: { revision: campaign.revision, authorizeIssue: true },
    },
  );
  expect(approvedResponse.ok()).toBe(true);
  const approved = await approvedResponse.json();
  expect(
    (
      await request.post(`/api/partner/campaigns/${campaign.id}/issue`, {
        headers: b.headers,
        data: { revision: approved.revision },
      })
    ).status(),
  ).toBe(404);
  const issuedResponse = await request.post(
    `/api/partner/campaigns/${campaign.id}/issue`,
    { headers: a.headers, data: { revision: approved.revision } },
  );
  expect(issuedResponse.ok()).toBe(true);
  const issued = await issuedResponse.json();
  expect(issued.batch.codes).toHaveLength(5);
  expect(issued.campaign).toMatchObject({
    available: 5,
    claimed: 0,
    status: "issued",
  });
  expect(
    (
      await request.post(`/api/partner/campaigns/${campaign.id}/issue`, {
        headers: a.headers,
        data: { revision: approved.revision },
      })
    ).status(),
  ).toBe(409);
  const claim = await request.post("/api/account/kit", {
    data: { code: issued.batch.codes[0].code, attach: false },
  });
  expect(claim.ok()).toBe(true);
  const recipient = await claim.json();
  expect(recipient.credits).toBe(3);
  expect(
    (
      await request.post("/api/account/kit", {
        headers: b.headers,
        data: { code: issued.batch.codes[0].code, attach: true },
      })
    ).status(),
  ).toBe(409);
  const again = await (
    await request.post("/api/account/kit", {
      headers: { Authorization: "Bearer " + recipient.token },
      data: { code: issued.batch.codes[0].code, attach: true },
    })
  ).json();
  expect(again.id).toBe(recipient.id);
  expect(again.credits).toBe(3);
  const own = await (
      await request.get("/api/partner", { headers: a.headers })
    ).json(),
    foreign = await (
      await request.get("/api/partner", { headers: b.headers })
    ).json();
  expect(own.campaigns[0]).toMatchObject({ claimed: 1, available: 4 });
  expect(foreign.campaigns).toEqual([]);
  expect(JSON.stringify(own)).not.toContain(recipient.id);
  const revoked = await request.post(
    `/api/admin/partners/campaigns/${campaign.id}/cancel`,
    { headers: root, data: { revision: issued.campaign.revision } },
  );
  expect(revoked.ok()).toBe(true);
  expect(await revoked.json()).toMatchObject({
    status: "revoked",
    revoked: 5,
    available: 0,
  });
  expect(
    (
      await request.post("/api/account/kit", {
        data: { code: issued.batch.codes[1].code, attach: false },
      })
    ).status(),
  ).toBe(401);
  const catalog = await (await request.get("/api/catalog")).json();
  expect(catalog.products.find((p: any) => p.id === productId).stock).toBe(25);
  expect(
    (
      await (
        await request.get("/api/builds/account", {
          headers: { Authorization: "Bearer " + recipient.token },
        })
      ).json()
    ).credits,
  ).toBe(3);
  const finance = await (
    await request.post("/api/admin/access", {
      headers: root,
      data: { name: "Partner denied finance", role: "finance", days: 1 },
    })
  ).json();
  expect(
    (
      await request.get("/api/admin/partners", {
        headers: { Authorization: "Bearer " + finance.token },
      })
    ).status(),
  ).toBe(403);
});
