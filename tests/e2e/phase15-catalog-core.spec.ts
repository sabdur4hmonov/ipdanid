import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
test("actual SKU HTTP composes inventory snapshots retries cancel refund and warehouse authorization", async ({
  request,
}) => {
  const root = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN! },
    suffix = crypto.randomUUID().slice(0, 8),
    base = "base-" + suffix,
    thread = "thread-" + suffix,
    bundle = "bundle-" + suffix;
  async function save(
    id: string,
    kind: string,
    parts: any[] = [],
    patch: any = {},
    oldSku?: any,
  ) {
    const data = await (
        await request.get("/api/admin/catalog", { headers: root })
      ).json(),
      old = data.products.find((p: any) => p.id === id);
    const response = await request.post("/api/admin/catalog/sku", {
      headers: root,
      data: {
        product: {
          id,
          name: id,
          family: "string",
          price_minor: old?.price_minor ?? 10000,
          stock: old?.stock ?? 20,
          credits: old?.credits ?? 3,
          description: "Original SKU HTTP fixture",
          expectedRevision: old?.revision ?? 0,
          active: old?.active ?? 1,
          profile_id: "standard-base-r1",
          ...patch,
        },
        sku: oldSku ?? {
          version: "catalog-sku/1",
          productId: id,
          kind,
          group: "original-http-kits",
          label: id,
          material: "Original test material",
          sellable: true,
          parts,
          revision:
            data.skus.find((s: any) => s.productId === id)?.revision ?? 0,
        },
      },
    });
    expect(response.ok()).toBe(true);
    return response.json();
  }
  await save(base, "kit", [], { stock: 6 });
  const supply = await save(thread, "refill", [], {
    stock: 12,
    price_minor: 1000,
    credits: 0,
  });
  await save(thread, "refill", [], {}, { ...supply.sku, sellable: false });
  await save(
    bundle,
    "bundle",
    [
      { productId: base, quantity: 2 },
      { productId: thread, quantity: 1 },
    ],
    { price_minor: 18000, credits: 6 },
  );
  let catalog = await (await request.get("/api/catalog")).json();
  expect(catalog.products.find((p: any) => p.id === bundle).stock).toBe(3);
  expect(catalog.products.some((p: any) => p.id === thread)).toBe(false);
  expect(catalog.skus[thread]).toBeUndefined();
  const settings = await (
    await request.get("/api/admin/settings", { headers: root })
  ).json();
  const configured = await (
    await request.post("/api/admin/settings", {
      headers: root,
      data: { ...settings, pickupAddress: "Synthetic catalog HTTP pickup" },
    })
  ).json();
  const buyer = await (await request.post("/api/session", { data: {} })).json(),
    headers = { Authorization: "Bearer " + buyer.token },
    items = [
      { productId: bundle, quantity: 2 },
      { productId: base, quantity: 1 },
    ],
    address = {
      name: "Synthetic SKU buyer",
      phone: "901234567",
      city: "",
      street: "",
      deliveryMethod: "pickup",
    },
    body = {
      items,
      address,
      requestKey: crypto.randomUUID(),
      quote: {
        totalMinor: 46000,
        settingsRevision: configured.revision,
        catalogRevision: catalog.catalogRevision,
      },
    };
  expect(
    (
      await request.post("/api/orders", {
        headers,
        data: {
          ...body,
          quote: { totalMinor: 46000, settingsRevision: configured.revision },
        },
      })
    ).status(),
  ).toBe(409);
  const response = await request.post("/api/orders", { headers, data: body });
  expect(response.ok()).toBe(true);
  const order = await response.json();
  expect(order.total_minor).toBe(46000);
  expect(
    (await (await request.post("/api/orders", { headers, data: body })).json())
      .id,
  ).toBe(order.id);
  async function rawStock(id: string) {
    return (
      await (await request.get("/api/admin/catalog", { headers: root })).json()
    ).products.find((p: any) => p.id === id).stock;
  }
  expect(await rawStock(base)).toBe(1);
  expect(await rawStock(thread)).toBe(10);
  expect(await rawStock(bundle)).toBe(18);
  const other = await (await request.post("/api/session", { data: {} })).json();
  expect(
    (
      await request.post(`/api/orders/${order.id}/cancel`, {
        headers: { Authorization: "Bearer " + other.token },
        data: {},
      })
    ).status(),
  ).toBe(404);
  expect(await rawStock(base)).toBe(1);
  await save(bundle, "bundle", [
    { productId: base, quantity: 3 },
    { productId: thread, quantity: 2 },
  ]);
  expect(
    (await (await request.post("/api/orders", { headers, data: body })).json())
      .id,
  ).toBe(order.id);
  const snapshot = (
    await (await request.get("/api/orders", { headers })).json()
  ).find((o: any) => o.id === order.id);
  expect(
    snapshot.items.find((i: any) => i.product_id === bundle).sku.parts,
  ).toEqual([
    { productId: base, quantity: 2 },
    { productId: thread, quantity: 1 },
  ]);
  expect(
    (
      await request.post(`/api/orders/${order.id}/cancel`, {
        headers,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post(`/api/orders/${order.id}/cancel`, {
        headers,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(await rawStock(base)).toBe(6);
  expect(await rawStock(thread)).toBe(12);
  expect(await rawStock(bundle)).toBe(20);
  const refill = "retail-refill-" + suffix;
  await save(refill, "refill", [], { stock: 8, credits: 0, price_minor: 1000 });
  catalog = await (await request.get("/api/catalog")).json();
  const paidResponse = await request.post("/api/orders", {
    headers,
    data: {
      items: [{ productId: refill, quantity: 2 }],
      address,
      requestKey: crypto.randomUUID(),
      quote: {
        totalMinor: 2000,
        settingsRevision: configured.revision,
        catalogRevision: catalog.catalogRevision,
      },
    },
  });
  expect(paidResponse.ok()).toBe(true);
  const paid = await paidResponse.json();
  expect(
    (
      await request.post(`/api/admin/orders/${paid.id}/test-payment`, {
        headers: root,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(
    (await (await request.get("/api/builds/account", { headers })).json())
      .credits,
  ).toBe(0);
  expect(
    (
      await request.post(`/api/orders/${paid.id}/return`, { headers, data: {} })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post(`/api/admin/orders/${paid.id}/refund`, {
        headers: root,
        data: {},
      })
    ).ok(),
  ).toBe(true);
  expect(await rawStock(refill)).toBe(8);
  const draft = "draft-" + suffix;
  await save(draft, "kit", [], { active: 0 });
  catalog = await (await request.get("/api/catalog")).json();
  expect(catalog.skus[draft]).toBeUndefined();
  const finance = await (
    await request.post("/api/admin/access", {
      headers: root,
      data: { name: "SKU denied finance", role: "finance", days: 1 },
    })
  ).json();
  expect(
    (
      await request.get("/api/admin/catalog", {
        headers: { Authorization: "Bearer " + finance.token },
      })
    ).status(),
  ).toBe(403);
});
