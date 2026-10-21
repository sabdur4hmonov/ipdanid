import { expect, type APIRequestContext } from "@playwright/test";
export async function financeFixture(request: APIRequestContext) {
  const root = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN! };
  const batch = await request.post("/api/admin/kits/batch", {
    headers: root,
    data: { profile: "finance-ui", count: 1, requestKey: crypto.randomUUID() },
  });
  expect(batch.ok()).toBe(true);
  const kit = await batch.json();
  const login = await request.post("/api/account/kit", {
    data: { code: kit.codes[0].code },
  });
  expect(login.ok()).toBe(true);
  const account = await login.json(),
    headers = { Authorization: "Bearer " + account.token };
  const id = "finance-" + crypto.randomUUID().slice(0, 8),
    name = "Original finance fixture " + id.slice(-8);
  expect(
    (
      await request.post("/api/admin/products", {
        headers: root,
        data: {
          id,
          name,
          family: "string",
          price_minor: 10000,
          currency: "UZS",
          stock: 20,
          credits: 1,
          description: "Original local fixture",
          expectedRevision: 0,
          active: 1,
          profile_id: "original-board",
        },
      })
    ).ok(),
  ).toBe(true);
  const settings = await (
    await request.get("/api/admin/settings", { headers: root })
  ).json();
  expect(
    (
      await request.post("/api/admin/settings", {
        headers: root,
        data: { ...settings, pickupAddress: "Synthetic finance workshop" },
      })
    ).ok(),
  ).toBe(true);
  async function order() {
    const catalog = await (await request.get("/api/catalog")).json(),
      storefront = await (await request.get("/api/storefront")).json();
    const r = await request.post("/api/orders", {
      headers,
      data: {
        items: [{ productId: id, quantity: 1 }],
        address: {
          name: "Synthetic finance customer",
          phone: "+998901234567",
          city: "",
          street: "",
          country: "UZ",
          deliveryMethod: "pickup",
        },
        requestKey: crypto.randomUUID(),
        quote: {
          totalMinor: 10000,
          currency: "UZS",
          settingsRevision: storefront.settings.revision,
          catalogRevision: catalog.catalogRevision,
          shippingRevision: catalog.regions.revision,
        },
      },
    });
    expect(r.status()).toBe(201);
    return await r.json();
  }
  return { root, headers, account, code: kit.codes[0].code, id, name, order };
}
