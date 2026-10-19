import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
async function maker(request: any) {
  const guest = await (await request.post("/api/session", { data: {} })).json();
  const response = await request.post("/api/account/register", {
    headers: { Authorization: "Bearer " + guest.token },
    data: {
      email: "offer-" + crypto.randomUUID() + "@example.com",
      password: "isolated promotion test password",
    },
  });
  expect(response.ok()).toBe(true);
  const account = await response.json();
  return {
    id: account.id,
    headers: { Authorization: "Bearer " + account.token },
  };
}
test("actual HTTP offers preserve discounted payment totals, referral settlement and actual-cost contribution", async ({
  request,
}) => {
  const admin = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN },
    id = "offer-http-" + crypto.randomUUID(),
    code = "HTTP-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
    now = Date.now(),
    address = {
      name: "Synthetic offer buyer",
      phone: "901234567",
      city: "",
      street: "",
      deliveryMethod: "pickup",
    },
    items = [{ productId: id, quantity: 1 }];
  const product = await request.post("/api/admin/products", {
    headers: admin,
    data: {
      id,
      name: "Synthetic promo kit",
      family: "string",
      price_minor: 10000,
      stock: 8,
      credits: 3,
      description: "Isolated original fixture",
      expectedRevision: 0,
      active: 1,
      profile_id: "standard-base-r1",
    },
  });
  expect(product.ok()).toBe(true);
  const old = await (
    await request.get("/api/admin/settings", { headers: admin })
  ).json();
  expect(
    (
      await request.post("/api/admin/settings", {
        headers: admin,
        data: { ...old, pickupAddress: "Synthetic promotion pickup" },
      })
    ).ok(),
  ).toBe(true);
  const rule = {
    discountType: "percent",
    value: 1000,
    maxDiscountMinor: 100000,
    minSubtotalMinor: 0,
    startsAt: now - 1000,
    expiresAt: now + 86400000,
    maxUses: 10,
    perAccountLimit: 1,
    enabled: true,
    revision: 0,
  };
  expect(
    (
      await request.post("/api/admin/offers/codes", {
        headers: admin,
        data: { code, rule },
      })
    ).ok(),
  ).toBe(true);
  const buyer = await maker(request),
    referrer = await maker(request);
  expect(
    (
      await request.get("/api/admin/offers/report", { headers: buyer.headers })
    ).status(),
  ).toBe(403);
  const quoteResponse = await request.post("/api/offers/quote", {
    headers: buyer.headers,
    data: { items, method: "pickup", code },
  });
  expect(quoteResponse.ok()).toBe(true);
  const q = await quoteResponse.json();
  expect(q.totalMinor).toBe(9000);
  const key = crypto.randomUUID(),
    body = {
      items,
      address,
      requestKey: key,
      quote: {
        totalMinor: q.totalMinor,
        settingsRevision: q.settingsRevision,
        offerQuoteId: q.id,
      },
    };
  expect(
    (
      await request.post("/api/orders", {
        headers: referrer.headers,
        data: body,
      })
    ).status(),
  ).toBe(409);
  const accepted = await request.post("/api/orders", {
    headers: buyer.headers,
    data: body,
  });
  expect(accepted.status()).toBe(201);
  const order = await accepted.json();
  expect(order.total_minor).toBe(9000);
  const repeat = await (
    await request.post("/api/orders", { headers: buyer.headers, data: body })
  ).json();
  expect(repeat.id).toBe(order.id);
  expect(
    (
      await request.post(`/api/admin/orders/${order.id}/test-payment`, {
        headers: admin,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post(`/api/admin/orders/${order.id}/test-payment`, {
        headers: admin,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await (
        await request.get("/api/account", { headers: buyer.headers })
      ).json()
    ).credits,
  ).toBe(3);
  let report = await (
    await request.get("/api/admin/offers/report", { headers: admin })
  ).json();
  expect(report.find((r: any) => r.orderId === order.id)).toMatchObject({
    recognizedRevenueMinor: 9000,
    discountMinor: 1000,
    netContributionMinor: null,
  });
  const costs = {
    materialsMinor: 2000,
    packingMinor: 300,
    fulfillmentMinor: 400,
    providerFeeMinor: 100,
    marketingMinor: 200,
    referralRewardMinor: 0,
  };
  expect(
    (
      await request.post(`/api/admin/orders/${order.id}/costs`, {
        headers: admin,
        data: { revision: 0, costs },
      })
    ).ok(),
  ).toBe(true);
  report = await (
    await request.get("/api/admin/offers/report", { headers: admin })
  ).json();
  expect(report.find((r: any) => r.orderId === order.id)).toMatchObject({
    netContributionMinor: 6000,
    costRevision: 1,
  });
  const settings = await (
    await request.get("/api/admin/offers", { headers: admin })
  ).json();
  expect(
    (
      await request.post("/api/admin/offers/policy", {
        headers: admin,
        data: {
          ...settings.policy,
          enabled: true,
          startsAt: now - 1000,
          expiresAt: now + 86400000,
        },
      })
    ).ok(),
  ).toBe(true);
  const ref = await (
    await request.post("/api/referrals", {
      headers: referrer.headers,
      data: {},
    })
  ).json();
  expect(ref.code).toMatch(/^REF-/);
  expect(ref.automaticRewards).toBe(false);
  expect(
    (
      await request.post("/api/offers/quote", {
        headers: referrer.headers,
        data: { items, method: "pickup", code: ref.code },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await request.post("/api/offers/quote", {
        headers: buyer.headers,
        data: { items, method: "pickup", code: ref.code },
      })
    ).status(),
  ).toBe(409);
  const newBuyer = await maker(request),
    refQuote = await (
      await request.post("/api/offers/quote", {
        headers: newBuyer.headers,
        data: { items, method: "pickup", code: ref.code },
      })
    ).json();
  expect(refQuote.totalMinor).toBe(9500);
  const refOrder = await (
    await request.post("/api/orders", {
      headers: newBuyer.headers,
      data: {
        items,
        address,
        requestKey: crypto.randomUUID(),
        quote: {
          totalMinor: refQuote.totalMinor,
          settingsRevision: refQuote.settingsRevision,
          offerQuoteId: refQuote.id,
        },
      },
    })
  ).json();
  expect(
    (
      await (
        await request.get("/api/referrals", { headers: referrer.headers })
      ).json()
    ).qualified,
  ).toBe(0);
  expect(
    (
      await request.post(`/api/admin/orders/${refOrder.id}/test-payment`, {
        headers: admin,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await (
        await request.get("/api/referrals", { headers: referrer.headers })
      ).json()
    ).qualified,
  ).toBe(1);
  expect(
    (
      await request.post(`/api/orders/${refOrder.id}/return`, {
        headers: newBuyer.headers,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post(`/api/admin/orders/${refOrder.id}/refund`, {
        headers: admin,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(
    await (
      await request.get("/api/referrals", { headers: referrer.headers })
    ).json(),
  ).toMatchObject({ qualified: 0, reversed: 1 });
});
