import { test, expect } from "@playwright/test";
import { encodePhotoDraft, type PhotoDraft } from "../../src/photo-draft";
import { DEFAULT_STANDARD_KIT } from "../../src/core/standard-kit";
test.use({ trace: "off" });
test("private photo API keeps an exact large archive across clients, scopes access and fences deletion", async ({
  request,
}) => {
  const guest = await (await request.post("/api/session")).json();
  const guestHeaders = { Authorization: "Bearer " + guest.token };
  expect((await request.get("/api/photo-backup")).status()).toBe(401);
  // Invalid JSON still returns403: authorization happens before large-body parsing.
  expect(
    (
      await request.post("/api/photo-backup", {
        headers: { ...guestHeaders, "Content-Type": "application/json" },
        data: "not JSON",
      })
    ).status(),
  ).toBe(403);
  const email = crypto.randomUUID() + "@example.invalid",
    password = "Synthetic-password-123!";
  const account = await (
    await request.post("/api/account/register", {
      headers: guestHeaders,
      data: { email, password },
    })
  ).json();
  const h = { Authorization: "Bearer " + account.token };
  expect(
    await (await request.get("/api/photo-backup", { headers: h })).json(),
  ).toMatchObject({ revision: 0, available: false });
  const n = 1024;
  const draft: PhotoDraft = {
    version: "editable-photo/1",
    savedAt: Date.now(),
    width: n,
    height: n,
    rgba: new Uint8Array(n * n * 4).fill(128),
    maskEdited: true,
    analysis: {
      mask: { width: 2, height: 2, values: new Float32Array([0, 0.3, 0.7, 1]) },
      faces: [],
      faceUnavailable: true,
      cleanupUnavailable: true,
    },
    shape: "heart",
    kind: "people",
    caption: "Ali علي",
    adjustment: { x: 0.1, y: -0.2, zoom: 1.7 },
    rotation: 1,
    lines: 3000,
    config: structuredClone(DEFAULT_STANDARD_KIT),
  };
  const archive = Buffer.from(await encodePhotoDraft(draft)).toString("base64");
  expect(archive.length).toBeGreaterThan(4_000_000);
  const b = {
    consent: "private-photo-backup/1",
    expectedRevision: 0,
    requestKey: crypto.randomUUID(),
    archive,
  };
  expect(
    (
      await request.post("/api/photo-backup", {
        headers: h,
        data: { ...b, consent: false },
      })
    ).status(),
  ).toBe(400);
  const uploaded = await request.post("/api/photo-backup", {
    headers: h,
    data: b,
  });
  expect(uploaded.ok()).toBe(true);
  const saved = await uploaded.json();
  expect(saved).toMatchObject({ revision: 1, available: true });
  expect(saved.archive).toBeUndefined();
  expect(
    await (
      await request.post("/api/photo-backup", { headers: h, data: b })
    ).json(),
  ).toEqual(saved);
  const second = await (
      await request.post("/api/account/login", { data: { email, password } })
    ).json(),
    h2 = { Authorization: "Bearer " + second.token };
  const read = await request.get("/api/photo-backup/read", { headers: h2 });
  expect(read.headers()["cache-control"]).toBe("no-store");
  const restored = await read.json();
  expect(restored.archive === archive).toBe(true);
  expect(restored.status).toEqual(saved);
  expect(
    (
      await request.get("/api/photo-backup/read?revision=1", { headers: h2 })
    ).status(),
  ).toBe(400);
  const g = await (await request.post("/api/session")).json();
  const other = await (
    await request.post("/api/account/register", {
      headers: { Authorization: "Bearer " + g.token },
      data: { email: crypto.randomUUID() + "@example.invalid", password },
    })
  ).json();
  expect(
    (
      await request.get("/api/photo-backup/read", {
        headers: { Authorization: "Bearer " + other.token },
      })
    ).status(),
  ).toBe(404);
  const del = { expectedRevision: 1, requestKey: crypto.randomUUID() };
  const removed = await request.post("/api/photo-backup/delete", {
    headers: h2,
    data: del,
  });
  expect(removed.ok()).toBe(true);
  expect(await removed.json()).toMatchObject({ revision: 2, available: false });
  expect(
    (await request.post("/api/photo-backup", { headers: h, data: b })).status(),
  ).toBe(409);
  expect(
    (await request.get("/api/photo-backup/read", { headers: h })).status(),
  ).toBe(404);
  expect(
    (await request.post("/api/account/logout", { headers: h2, data: {} })).ok(),
  ).toBe(true);
  expect(
    (await request.get("/api/photo-backup", { headers: h2 })).status(),
  ).toBe(401);
  // Existing logout is device-session scoped; another signed-in device remains valid.
  expect(
    (await request.get("/api/photo-backup", { headers: h })).status(),
  ).toBe(200);
});
