import { test, expect, type APIRequestContext } from "@playwright/test";
import { generate } from "../../src/core/engine";
import { createProfile } from "../../src/core/geometry";
test.use({ trace: "off" });
export async function commissionFixture(request: APIRequestContext) {
  const root = { Authorization: "Bearer " + process.env.LOCAL_ADMIN_TOKEN! };
  const batch = await request.post("/api/admin/kits/batch", {
    headers: root,
    data: {
      profile: "commission-test",
      count: 1,
      requestKey: crypto.randomUUID(),
    },
  });
  expect(batch.ok()).toBe(true);
  const kit = await batch.json(),
    login = await request.post("/api/account/kit", {
      data: { code: kit.codes[0].code },
    });
  expect(login.ok()).toBe(true);
  const account = await login.json(),
    headers = { Authorization: "Bearer " + account.token };
  const guide = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(90),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 40,
    mode: "dark",
    accessPolicy: "kit-build/1",
  });
  // Generate the access policy into the immutable identity, then use the same
  // kit unlock/archive API as customers, never a fabricated archive SQL row.
  const unlock = await request.post("/api/builds/unlock", {
    headers,
    data: {
      sequenceHash: guide.sequenceHash,
      deviceId: "commission-test-device",
      requestKey: crypto.randomUUID(),
    },
  });
  expect(unlock.ok()).toBe(true);
  const saved = await request.post("/api/builds/archive", {
    headers,
    data: { instruction: guide },
  });
  expect(saved.ok()).toBe(true);
  const instructionId = (await saved.json()).instructionId;
  const id = "commission-" + crypto.randomUUID().slice(0, 8);
  expect(
    (
      await request.post("/api/admin/products", {
        headers: root,
        data: {
          id,
          name: "Original commissioned art " + id.slice(-8),
          family: "string",
          price_minor: 10000,
          currency: "UZS",
          stock: 5,
          credits: 0,
          description: "Original made-to-order test art",
          expectedRevision: 0,
          active: 1,
          profile_id: guide.profile.id,
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
        data: { ...settings, pickupAddress: "Original local workshop" },
      })
    ).ok(),
  ).toBe(true);
  return {
    root,
    account,
    headers,
    guide,
    instructionId,
    id,
    code: kit.codes[0].code,
  };
}
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
});

