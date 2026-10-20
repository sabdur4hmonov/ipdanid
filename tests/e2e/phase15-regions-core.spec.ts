import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
test("regional HTTP stores USD shipping, exact retry, currency rejection and scoped configuration", async ({
  request,
}) => {
  const root = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN! },
    id = "usd-" + crypto.randomUUID().slice(0, 8);
  const settings = await (
    await request.get("/api/admin/settings", { headers: root })
  ).json();
  let policy = await (
    await request.get("/api/admin/regions", { headers: root })
  ).json();
  const legacy = policy.usesLegacy ? [] : policy.regions;
  const rule = {
    country: "US",
    currency: "USD",
    enabled: true,
    pickupAddress: "Synthetic US warehouse",
    courierEnabled: true,
    courierFeeMinor: 700,
  };
  const saved = await request.post("/api/admin/catalog/sku", {
    headers: root,
    data: {
      product: {
        id,
        name: "Original USD kit",
        family: "string",
        price_minor: 12000,
        currency: "USD",
        stock: 10,
        credits: 3,
        description: "Original synthetic regional kit",
        expectedRevision: 0,
        active: 1,
        profile_id: "standard-base-r1",
      },
      sku: {
        version: "catalog-sku/1",
        productId: id,
        kind: "kit",
        group: "regional-original",
        label: "USD original",
        material: "Original white MDF",
        sellable: true,
        parts: [],
        revision: 0,
      },
    },
  });
  expect(saved.status()).toBe(200);
  try {
    expect(
      (
        await request.post("/api/admin/regions", {
          headers: root,
          data: { revision: policy.revision, regions: [rule] },
        })
      ).status(),
    ).toBe(200);
    const catalog = await (await request.get("/api/catalog")).json();
    policy = catalog.regions;
    expect(policy.usesLegacy).toBe(false);
    expect(catalog.products.find((p: any) => p.id === id).currency).toBe("USD");
    const buyer = await (
        await request.post("/api/session", { data: {} })
      ).json(),
      headers = { Authorization: "Bearer " + buyer.token };
    expect(
      (
        await request.post("/api/admin/regions", {
          headers,
          data: { revision: policy.revision, regions: [] },
        })
      ).status(),
    ).toBe(403);
    const body = {
      items: [{ productId: id, quantity: 1 }],
      address: {
        name: "Synthetic buyer",
        phone: "901234567",
        city: "Synthetic city",
        street: "Synthetic street",
        country: "US",
        deliveryMethod: "courier",
      },
      requestKey: crypto.randomUUID(),
      quote: {
        totalMinor: 12700,
        currency: "USD",
        settingsRevision: settings.revision,
        shippingRevision: policy.revision,
        catalogRevision: catalog.catalogRevision,
      },
    };
    const ordered = await request.post("/api/orders", { headers, data: body });
    expect(ordered.status()).toBe(201);
    const order = await ordered.json();
    expect(order.currency).toBe("USD");
    const rows = await (await request.get("/api/orders", { headers })).json();
    expect(rows.find((o: any) => o.id === order.id).commerce).toMatchObject({
      country: "US",
      currency: "USD",
      feeMinor: 700,
    });
    for (const provider of ["click", "payme"])
      expect(
        (
          await request.post("/api/payments/invoices", {
            headers,
            data: {
              provider,
              orderId: order.id,
              requestKey: crypto.randomUUID(),
            },
          })
        ).status(),
      ).toBe(409);
    expect(
      (
        await request.post("/api/admin/regions", {
          headers: root,
          data: {
            revision: policy.revision,
            regions: [{ ...rule, courierFeeMinor: 800 }],
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await (
          await request.post("/api/orders", { headers, data: body })
        ).json()
      ).id,
    ).toBe(order.id);
    expect(
      (
        await request.post("/api/orders", {
          headers,
          data: { ...body, requestKey: crypto.randomUUID() },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await request.post(`/api/admin/orders/${order.id}/test-payment`, {
          headers: root,
          data: {},
        })
      ).status(),
    ).toBe(200);
    const report = await (
      await request.get("/api/admin/offers/report", { headers: root })
    ).json();
    expect(report.find((r: any) => r.orderId === order.id)).toMatchObject({
      currency: "USD",
      recognizedRevenueMinor: 12700,
    });
  } finally {
    const current = await (
      await request.get("/api/admin/regions", { headers: root })
    ).json();
    expect(
      (
        await request.post("/api/admin/regions", {
          headers: root,
          data: { revision: current.revision, regions: legacy },
        })
      ).status(),
    ).toBe(200);
  }
});
