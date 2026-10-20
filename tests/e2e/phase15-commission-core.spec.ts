import { test, expect } from "@playwright/test";
import { commissionFixture } from "./commission-fixture";
test.use({ trace: "off" });

test("real commission API binds owner-reviewed art and price, reuses sandbox settlement and requires ready production before tracking", async ({
  request,
}) => {
  const f = await commissionFixture(request);
  expect(
    (
      await request.post("/api/admin/commissions/products", {
        headers: f.root,
        data: {
          version: "commission-product/1",
          productId: f.id,
          enabled: true,
          revision: 0,
        },
      })
    ).status(),
  ).toBe(200);
  const requestBody = {
    instructionId: f.instructionId,
    productId: f.id,
    consent: true,
    locale: "en",
    requestKey: crypto.randomUUID(),
  };
  expect(
    (
      await request.post("/api/commissions", {
        headers: f.headers,
        data: { ...requestBody, consent: false },
      })
    ).status(),
  ).toBe(400);
  const result = await request.post("/api/commissions", {
    headers: f.headers,
    data: requestBody,
  });
  expect(result.status()).toBe(201);
  const row = await result.json();
  const outsider = await (
      await request.post("/api/session", { data: {} })
    ).json(),
    foreign = { Authorization: "Bearer " + outsider.token };
  expect(
    (
      await request.get("/api/commissions/" + row.id + "/guide", {
        headers: foreign,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.get("/api/admin/commissions/" + row.id + "/guide", {
        headers: f.headers,
      })
    ).status(),
  ).toBe(403);
  const art = await (
    await request.get("/api/admin/commissions/" + row.id + "/guide", {
      headers: f.root,
    })
  ).json();
  expect(art.instruction).toEqual(f.guide);
  const reviewed = await request.post(
    "/api/admin/commissions/" + row.id + "/review",
    {
      headers: f.root,
      data: {
        revision: row.revision,
        artHash: row.artHash,
        decision: "approve",
        note: "Same sequence, correct physical board",
        quote: (
          await (
            await request.get("/api/admin/commissions", { headers: f.root })
          ).json()
        ).find((r: any) => r.id === row.id).reviewQuote,
      },
    },
  );
  expect(reviewed.status()).toBe(200);
  const approved = await reviewed.json();
  const catalog = await (await request.get("/api/catalog")).json();
  const body = {
    revision: approved.revision,
    artHash: approved.artHash,
    requestKey: crypto.randomUUID(),
    address: {
      name: "Synthetic Owner Flow",
      phone: "+998901234567",
      country: "UZ",
      city: "",
      street: "",
      deliveryMethod: "pickup",
    },
    quote: {
      totalMinor: 10000,
      currency: "UZS",
      settingsRevision: approved.approval.settingsRevision,
      catalogRevision: catalog.catalogRevision,
      shippingRevision: catalog.regions.revision,
    },
  };
  const accept = await request.post("/api/commissions/" + row.id + "/accept", {
    headers: f.headers,
    data: body,
  });
  expect(accept.status()).toBe(200);
  let current = await accept.json();
  expect(
    (
      await (
        await request.post("/api/commissions/" + row.id + "/accept", {
          headers: f.headers,
          data: body,
        })
      ).json()
    ).order.id,
  ).toBe(current.order.id);
  const invoice = await request.post("/api/payments/invoices", {
    headers: f.headers,
    data: {
      orderId: current.order.id,
      provider: "click",
      requestKey: crypto.randomUUID(),
    },
  });
  expect(invoice.status()).toBe(201);
  const inv = await invoice.json();
  expect(
    (
      await request.post("/api/payments/invoices/" + inv.id + "/mock", {
        headers: f.headers,
        data: {},
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.post("/api/admin/orders/" + current.order.id + "/fulfill", {
        headers: f.root,
        data: { tracking: "COMMISSION-TRACK" },
      })
    ).status(),
  ).toBe(409);
  for (const state of ["making", "ready"]) {
    const r = await request.post(
      "/api/admin/commissions/" + row.id + "/production",
      {
        headers: f.root,
        data: { revision: current.revision, artHash: current.artHash, state },
      },
    );
    expect(r.status()).toBe(200);
    current = await r.json();
  }
  expect(
    (
      await request.post("/api/admin/orders/" + current.order.id + "/fulfill", {
        headers: f.root,
        data: { tracking: "COMMISSION-TRACK" },
      })
    ).status(),
  ).toBe(200);
  const final = await (
    await request.get("/api/commissions/" + row.id, { headers: f.headers })
  ).json();
  expect(final.order).toMatchObject({
    status: "fulfilled",
    tracking: ["COMMISSION-TRACK"],
  });
  expect(
    (
      await (
        await request.get("/api/commissions/" + row.id + "/guide", {
          headers: f.headers,
        })
      ).json()
    ).instruction,
  ).toEqual(f.guide);
  expect(
    (
      await request.post("/api/admin/commissions/products", {
        headers: f.root,
        data: {
          version: "commission-product/1",
          productId: f.id,
          enabled: false,
          revision: 1,
        },
      })
    ).status(),
  ).toBe(200);
  const retired = await (await request.get("/api/catalog")).json();
  expect(retired.products.some((p: any) => p.id === f.id)).toBe(false);
  expect(
    (
      await request.get("/api/commissions/" + row.id + "/guide", {
        headers: f.headers,
      })
    ).status(),
  ).toBe(200);
});
