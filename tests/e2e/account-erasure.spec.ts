import { test, expect } from "@playwright/test";
test.use({ trace: "off" });
test("account erasure revokes both clients and preserves the other account", async ({
  request,
}) => {
  const password = "Synthetic-password-123!";
  async function register() {
    const guest = await (await request.post("/api/session")).json(),
      email = crypto.randomUUID() + "@example.invalid";
    const r = await request.post("/api/account/register", {
      headers: { Authorization: "Bearer " + guest.token },
      data: { email, password },
    });
    expect(r.ok(), `Registration HTTP status: ${r.status()}`).toBe(true);
    return { ...(await r.json()), email };
  }
  const account = await register(),
    other = await register(),
    h = { Authorization: "Bearer " + account.token };
  const second = await (
    await request.post("/api/account/login", {
      data: { email: account.email, password },
    })
  ).json();
  expect((await request.get("/api/account/erasure")).status()).toBe(401);
  expect(
    (
      await request.get("/api/account/erasure?confirm=erase-account", {
        headers: h,
      })
    ).status(),
  ).toBe(400);
  expect(
    await (await request.get("/api/account/erasure", { headers: h })).json(),
  ).toMatchObject({
    version: "account-erasure/1",
    credential: "password",
    activeOrders: 0,
  });
  expect(
    (
      await request.post("/api/account/erasure", {
        headers: h,
        data: { confirm: "erase-account/1", credential: "Wrong-password-123!" },
      })
    ).status(),
  ).toBe(403);
  expect((await request.get("/api/account", { headers: h })).ok()).toBe(true);
  const result = await request.post("/api/account/erasure", {
    headers: h,
    data: { confirm: "erase-account/1", credential: password },
  });
  expect(result.ok()).toBe(true);
  expect(await result.json()).toMatchObject({ erased: true });
  for (const token of [account.token, second.token])
    expect(
      (
        await request.get("/api/account", {
          headers: { Authorization: "Bearer " + token },
        })
      ).status(),
    ).toBe(401);
  expect(
    (
      await request.get("/api/account", {
        headers: { Authorization: "Bearer " + other.token },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post("/api/account/login", {
        data: { email: account.email, password },
      })
    ).status(),
  ).toBe(401);
});
