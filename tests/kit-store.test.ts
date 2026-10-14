import { it, expect, afterEach, vi } from "vitest";
import { KitStore } from "../server/kit-store";
import { verify, createPublicKey } from "node:crypto";
const stores: KitStore[] = [];
afterEach(() => {
  vi.useRealTimers();
  stores.splice(0).forEach((s) => s.close());
});
function setup() {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  return s;
}
const device = "device_0123456789abcdef",
  seq = (v: string) => v.repeat(64);
it("default4/no expiry, one kit account and atomic idempotent signed unlocks", () => {
  const s = setup(),
    batch = s.issueKitBatch("admin", "board", 1, "batch-first"),
    code = batch.codes[0].code;
  expect(batch.codes[0]).toMatchObject({
    quota: 4,
    expiresAt: null,
    creditDays: 0,
  });
  const a = s.loginKit(code);
  expect(a.credits).toBe(4);
  expect(s.authenticate(a.token)).toBe(a.id);
  expect(s.loginKit(code).id).toBe(a.id);
  expect(() => s.loginKit(code, s.createGuest().id)).toThrow(/another account/);
  expect(s.redeemKit(a.id, code)).toMatchObject({
    duplicate: true,
    balance: 4,
  });
  expect(() => s.redeemKit(s.createGuest().id, code)).toThrow(
    /another account/,
  );
  const first = s.unlockBuild(a.id, seq("a"), device, "unlock-first");
  expect(first.credits).toBe(3);
  expect(first.duplicate).toBe(false);
  expect(
    verify(
      null,
      Buffer.from(JSON.stringify(first.receipt.payload)),
      createPublicKey({ key: first.publicKey, format: "jwk" }),
      Buffer.from(first.receipt.signature, "base64url"),
    ),
  ).toBe(true);
  expect(s.unlockBuild(a.id, seq("a"), device, "unlock-first")).toEqual({
    ...first,
    duplicate: true,
  });
  expect(
    s.unlockBuild(a.id, seq("a"), "another-device-123456", "unlock-again")
      .credits,
  ).toBe(3);
  expect(() => s.unlockBuild(a.id, seq("b"), device, "unlock-first")).toThrow(
    /reused/,
  );
  for (const v of ["b", "c", "d"])
    s.unlockBuild(a.id, seq(v), device, `unlock-${v.repeat(8)}`);
  expect(s.kitBalance(a.id)).toBe(0);
  expect(() => s.unlockBuild(a.id, seq("e"), device, "unlock-empty")).toThrow(
    /kit code/,
  );
  expect(
    s.unlockBuild(a.id, seq("a"), device, "unlock-existing").duplicate,
  ).toBe(true);
  expect(s.db.prepare("SELECT COUNT(*) AS n FROM build_unlocks").get()!.n).toBe(
    4,
  );
  const stored = JSON.stringify(s.db.prepare("SELECT * FROM kit_codes").all());
  expect(stored).not.toContain(code);
  expect(JSON.stringify(s.kitAdmin())).not.toContain("private_jwk");
  expect(() => s.issueKitBatch("admin", "board", 1, "batch-first")).toThrow(
    /already issued/,
  );
});
it("optional redemption/build windows and per-account limits never expire unlocked receipts", () => {
  const s = setup();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01"));
  s.setKitPolicy("admin", {
    quota: 4,
    codeDays: 1,
    creditDays: 30,
    maxKitsPerAccount: 1,
    buildsPerPeriod: 1,
    periodDays: 30,
  });
  const batch = s.issueKitBatch("admin", "board", 3, "batch-window"),
    a = s.loginKit(batch.codes[0].code);
  const r = s.unlockBuild(a.id, seq("a"), device, "unlock-window");
  expect(() => s.unlockBuild(a.id, seq("b"), device, "unlock-blocked")).toThrow(
    /period limit/,
  );
  expect(() => s.redeemKit(a.id, batch.codes[1].code)).toThrow(/kit limit/);
  vi.setSystemTime(new Date("2026-02-02"));
  expect(s.kitBalance(a.id)).toBe(0);
  expect(() => s.loginKit(batch.codes[2].code)).toThrow(/expired/);
  expect(s.loginKit(batch.codes[0].code).id).toBe(a.id);
  expect(
    s.unlockBuild(a.id, seq("a"), device, "unlock-old-build").receipt,
  ).toEqual(r.receipt);
  expect(() =>
    s.unlockBuild(a.id, seq("b"), device, "unlock-after-expiry"),
  ).toThrow(/kit code/);
  s.setKitLimit("admin", a.id, { maxKitsPerAccount: 2, buildsPerPeriod: 2 });
  const extra = s.issueKitBatch("admin", "board", 1, "batch-extra");
  s.redeemKit(a.id, extra.codes[0].code);
  expect(
    s.unlockBuild(a.id, seq("b"), device, "unlock-new-period").credits,
  ).toBe(3);
});
it("claimed guest ownership and legacy credits remain usable without mixing expiring kit grants into legacy jobs/gifts", () => {
  const s = setup(),
    guest = s.createGuest(),
    batch = s.issueKitBatch("admin", "board", 1, "batch-attach"),
    a = s.loginKit(batch.codes[0].code, guest.id);
  expect(a.id).toBe(guest.id);
  expect(s.balance(a.id)).toBe(0);
  expect(() => s.reserveGeneration(a.id, "legacy-job", seq("a"))).toThrow(
    /credit/,
  );
  const old = s.issueCode("board", 2, Date.now() + 100000, "admin");
  s.redeemCode(a.id, old.code);
  expect(s.kitBalance(a.id)).toBe(6);
  for (const v of ["a", "b", "c", "d", "e"])
    s.unlockBuild(a.id, seq(v), device, `unlock-${v.repeat(8)}`);
  expect(s.balance(a.id)).toBe(1);
  expect(s.kitBalance(a.id)).toBe(1);
  s.revokeKitBatch("admin", batch.id);
  expect(() => s.loginKit(batch.codes[0].code)).toThrow(/unavailable/);
  expect(
    s.unlockBuild(a.id, seq("a"), device, "unlock-revoked-old").duplicate,
  ).toBe(true);
});
