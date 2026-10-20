import { expect, type APIRequestContext } from "@playwright/test";
import { generate } from "../../src/core/engine";
import { createProfile } from "../../src/core/geometry";
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
