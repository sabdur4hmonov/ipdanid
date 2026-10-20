import { test, expect, type APIRequestContext } from "@playwright/test";
test.use({ trace: "off" });
async function maker(request: APIRequestContext) {
  const guest = await (await request.post("/api/session", { data: {} })).json(),
    r = await request.post("/api/account/register", {
      headers: { Authorization: "Bearer " + guest.token },
      data: {
        email: "digital-" + crypto.randomUUID() + "@example.com",
        password: "isolated digital purchase password",
      },
    });
  expect(r.status()).toBe(201);
  const a = await r.json();
  return { id: a.id, headers: { Authorization: "Bearer " + a.token } };
}
test("real digital HTTP purchase settles app credits and a private one-recipient gift through both sandbox providers", async ({
  request,
}) => {
  const root = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN! },
    buyer = await maker(request),
    recipient = await maker(request),
    suffix = crypto.randomUUID().slice(0, 8);
  for (const [kind, provider] of [
    ["app", "click"],
    ["gift", "payme"],
  ] as const) {
    const id = "digital-" + kind + "-" + suffix;
    expect(
      (
        await request.post("/api/admin/products", {
          headers: root,
          data: {
            id,
            name: "Original " + kind + " credits",
            family: "digital",
            price_minor: 10000,
            currency: "UZS",
            stock: 10,
            credits: 3,
            description: "Original digital HTTP fixture",
            expectedRevision: 0,
            active: 1,
            profile_id: "standard-base-r1",
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await request.post("/api/admin/journeys/products", {
          headers: root,
          data: {
            version: "journey-product/1",
            productId: id,
            kind,
            enabled: true,
            revision: 0,
          },
        })
      ).status(),
    ).toBe(200);
    const catalog = await (await request.get("/api/catalog")).json(),
      p = catalog.products.find((p: any) => p.id === id),
      settings = await (await request.get("/api/storefront")).json();
    expect(catalog.journeys.find((j: any) => j.productId === id).kind).toBe(
      kind,
    );
    const body = {
      productId: id,
      kind,
      name: "Synthetic digital maker",
      locale: "en",
      requestKey: crypto.randomUUID(),
      quote: {
        productRevision: p.revision,
        settingsRevision: settings.settings.revision,
        totalMinor: 10000,
        currency: "UZS",
      },
    };
    const response = await request.post("/api/digital/purchases", {
      headers: buyer.headers,
      data: body,
    });
    expect(response.status()).toBe(201);
    const order = await response.json();
    expect(order.gift).toBeNull();
    expect(
      (
        await request.get("/api/digital/purchases/" + order.orderId, {
          headers: recipient.headers,
        })
      ).status(),
    ).toBe(404);
    expect(
      (
        await (
          await request.post("/api/digital/purchases", {
            headers: buyer.headers,
            data: body,
          })
        ).json()
      ).orderId,
    ).toBe(order.orderId);
    const invoiceResponse = await request.post("/api/payments/invoices", {
      headers: buyer.headers,
      data: {
        provider,
        orderId: order.orderId,
        requestKey: crypto.randomUUID(),
      },
    });
    expect(invoiceResponse.status()).toBe(201);
    const invoice = await invoiceResponse.json();
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request.post("/api/payments/invoices/" + invoice.id + "/mock", {
            headers: buyer.headers,
            data: {},
          })
        ).status(),
      ).toBe(200);
    const paid = await (
      await request.get("/api/digital/purchases/" + order.orderId, {
        headers: buyer.headers,
      })
    ).json();
    expect(paid.status).toBe("paid");
    expect(
      (
        await (
          await request.get("/api/credits", { headers: buyer.headers })
        ).json()
      ).credits,
    ).toBe(3);
    expect(
      (
        await request.post("/api/admin/orders/" + order.orderId + "/fulfill", {
          headers: root,
          data: { tracking: "INVENTED-PHYSICAL" },
        })
      ).status(),
    ).toBe(409);
    if (kind === "gift") {
      expect(paid.gift.status).toBe("active");
      for (let i = 0; i < 2; i++)
        expect(
          (
            await request.post("/api/gifts/redeem", {
              headers: recipient.headers,
              data: { claimToken: paid.gift.claimToken },
            })
          ).status(),
        ).toBe(200);
      expect(
        (
          await (
            await request.get("/api/credits", { headers: recipient.headers })
          ).json()
        ).credits,
      ).toBe(3);
      expect(
        (
          await request.post("/api/gifts/redeem", {
            headers: buyer.headers,
            data: { claimToken: paid.gift.claimToken },
          })
        ).status(),
      ).toBe(409);
      const after = await (
        await request.get("/api/digital/purchases/" + order.orderId, {
          headers: buyer.headers,
        })
      ).json();
      expect(after.gift).not.toHaveProperty("claimToken");
    }
  }
  expect(
    (
      await request.post("/api/admin/journeys/products", {
        headers: recipient.headers,
        data: {},
      })
    ).status(),
  ).toBe(403);
  const all = await (
    await request.get("/api/digital/purchases", { headers: buyer.headers })
  ).json();
  expect(all).toHaveLength(2);
  expect(
    await (
      await request.get("/api/digital/purchases", {
        headers: recipient.headers,
      })
    ).json(),
  ).toHaveLength(0);
});
