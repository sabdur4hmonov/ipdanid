import { afterEach, expect, test } from "vitest";
import { KitStore } from "../server/kit-store";
import { TrialStore } from "../server/trial-store";
import { AccountErasureStore } from "../server/account-erasure-store";
import { adminRoutePermission } from "../server/admin-access";
const stores: KitStore[] = [];
afterEach(() => stores.splice(0).forEach((s) => s.close()));
const password = "Synthetic-trial-password-123!";
function setup(cap = 3) {
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  stores.push(s);
  s.seed();
  let now = Date.now();
  const t = new TrialStore(s, () => now);
  const activate = () =>
    t.update("owner", {
      ...t.policy(),
      enabled: true,
      startsAt: now - 1000,
      expiresAt: now + 86400000,
      maxClaims: cap,
    });
  const register = () =>
    s.register(
      s.createGuest().id,
      crypto.randomUUID() + "@example.invalid",
      password,
    );
  return {
    s,
    t,
    activate,
    register,
    advance: (v: number) => (now += v),
    now: () => now,
  };
}
test("campaign is disabled by default; strict bounded settings and optimistic revisions", () => {
  const { t, activate } = setup();
  expect(t.policy().enabled).toBe(false);
  expect(() =>
    t.issue("owner", { count: 1, requestKey: crypto.randomUUID() }),
  ).toThrow("not active");
  for (const b of [
    { ...t.policy(), extra: 1 },
    { ...t.policy(), creditDays: 0 },
    { ...t.policy(), maxClaims: -1 },
    { ...t.policy(), enabled: true },
  ])
    expect(() => t.update("owner", b)).toThrow();
  const p = activate();
  expect(p.revision).toBe(1);
  expect(() => t.update("owner", { ...p, revision: 0 })).toThrow("changed");
  expect(adminRoutePermission("POST", "/api/admin/trials/policy")).toBe(
    "settings",
  );
  expect(adminRoutePermission("POST", "/api/admin/trials/batch")).toBe("codes");
});
test("private hashed codes claim exactly one non-transferable digital credit per registered account", () => {
  const { s, t, activate, register } = setup(2);
  activate();
  const batch = t.issue("owner", { count: 2, requestKey: crypto.randomUUID() }),
    a = register(),
    b = register(),
    req = { code: batch.codes[0], requestKey: crypto.randomUUID() };
  expect(t.claim(a.id, req)).toMatchObject({ duplicate: false, credits: 1 });
  expect(
    t.claim(a.id, { ...req, requestKey: crypto.randomUUID() }),
  ).toMatchObject({ duplicate: true, credits: 1 });
  expect(() => t.claim(b.id, req)).toThrow("another account");
  expect(() => t.claim(a.id, { ...req, code: batch.codes[1] })).toThrow(
    "one trial",
  );
  expect(t.claim(b.id, { ...req, code: batch.codes[1] }).credits).toBe(1);
  expect(s.balance(a.id)).toBe(0);
  expect(s.kitBalance(a.id)).toBe(1);
  expect(() => s.loginKit(batch.codes[0])).toThrow();
  expect(
    JSON.stringify(s.db.prepare("SELECT * FROM trial_codes").all()),
  ).not.toContain(batch.codes[0]);
  expect(() =>
    t.issue("owner", { count: 1, requestKey: crypto.randomUUID() }),
  ).toThrow("budget");
});
test("trial is spent first and never creates physical-kit ownership or consumes its quota", () => {
  const { s, t, activate, register } = setup();
  activate();
  const a = register(),
    real = s.issueKitBatch("owner", "standard-base-r1", 1, crypto.randomUUID());
  s.redeemKit(a.id, real.codes[0].code);
  const batch = t.issue("owner", { count: 1, requestKey: crypto.randomUUID() });
  t.claim(a.id, { code: batch.codes[0], requestKey: crypto.randomUUID() });
  expect(s.kitBalance(a.id)).toBe(4);
  const first = s.unlockBuild(
    a.id,
    "a".repeat(64),
    "device-trial-12345",
    crypto.randomUUID(),
  );
  expect(first.credits).toBe(3);
  expect(
    s.db.prepare("SELECT remaining FROM kit_grants").get()!.remaining,
  ).toBe(3);
  expect(
    String(s.db.prepare("SELECT source FROM build_unlocks").get()!.source),
  ).toMatch(/^instagram-trial:/);
  expect(
    s.unlockBuild(
      a.id,
      "a".repeat(64),
      "other-device-12345",
      crypto.randomUUID(),
    ),
  ).toMatchObject({ duplicate: true, credits: 3 });
  expect(
    s.unlockBuild(
      a.id,
      "b".repeat(64),
      "device-trial-12345",
      crypto.randomUUID(),
    ).credits,
  ).toBe(2);
  expect(s.db.prepare("SELECT count(*) AS n FROM kit_codes").get()!.n).toBe(1);
});
test("expiry is fixed at claim; closing campaign does not retract a promised credit or duplicate it", () => {
  const { s, t, activate, register, now, advance } = setup();
  activate();
  const a = register(),
    batch = t.issue("owner", { count: 2, requestKey: crypto.randomUUID() }),
    request = { code: batch.codes[0], requestKey: crypto.randomUUID() },
    r = t.claim(a.id, request);
  expect(r.expiresAt).toBe(now() + 30 * 86400000);
  t.update("owner", { ...t.policy(), enabled: false });
  expect(t.claim(a.id, request)).toMatchObject({
    duplicate: true,
    expiresAt: r.expiresAt,
  });
  expect(() =>
    t.claim(register().id, { ...request, code: batch.codes[1] }),
  ).toThrow("not active");
  expect(s.kitBalance(a.id, r.expiresAt)).toBe(0);
  advance(86400000 * 31);
  expect(t.status(a.id).remaining).toBe(0);
});
test("unused revoke releases only pending budget; lost batch response cannot issue twice", () => {
  const { t, activate, register } = setup(2);
  activate();
  const key = crypto.randomUUID(),
    batch = t.issue("owner", { count: 2, requestKey: key }),
    a = register();
  expect(() => t.issue("owner", { count: 2, requestKey: key })).toThrow(
    "already issued",
  );
  t.claim(a.id, { code: batch.codes[0], requestKey: crypto.randomUUID() });
  expect(t.revoke("owner", { batchId: batch.id }).revoked).toBe(1);
  expect(t.status(a.id).remaining).toBe(1);
  expect(
    t.issue("owner", { count: 1, requestKey: crypto.randomUUID() }).codes,
  ).toHaveLength(1);
  expect(() => t.update("owner", { ...t.policy(), maxClaims: 1 })).toThrow(
    "promises",
  );
});
test("claim rollback never consumes a code/budget or leaves partial credit", () => {
  const { s, t, activate, register } = setup();
  activate();
  const a = register(),
    batch = t.issue("owner", { count: 1, requestKey: crypto.randomUUID() }),
    request = { code: batch.codes[0], requestKey: crypto.randomUUID() };
  s.db.exec(
    "CREATE TRIGGER fail_trial BEFORE INSERT ON audit WHEN NEW.action='trial.claim' BEGIN SELECT RAISE(ABORT,'Injected trial failure'); END",
  );
  expect(() => t.claim(a.id, request)).toThrow("Injected trial failure");
  expect(s.kitBalance(a.id)).toBe(0);
  expect(
    s.db.prepare("SELECT claimed_by FROM trial_codes").get()!.claimed_by,
  ).toBeNull();
  expect(t.report().claimed).toBe(0);
  s.db.exec("DROP TRIGGER fail_trial");
  expect(t.claim(a.id, request).credits).toBe(1);
});
test("guest,extra fields,malformed and expired codes are refused; erasure keeps anti-abuse history but no usable trial", () => {
  const { s, t, activate, register, advance } = setup();
  activate();
  const a = register(),
    guest = s.createGuest(),
    batch = t.issue("owner", { count: 2, requestKey: crypto.randomUUID() }),
    request = { code: batch.codes[0], requestKey: crypto.randomUUID() };
  expect(() => t.claim(guest.id, request)).toThrow("Register");
  for (const body of [
    { ...request, credits: 100 },
    { ...request, code: "bad" },
    { ...request, requestKey: "" },
  ])
    expect(() => t.claim(a.id, body)).toThrow();
  t.claim(a.id, request);
  const e = new AccountErasureStore(s);
  e.erase(a.id, { confirm: "erase-account/1", credential: password });
  expect(t.report().claimed).toBe(1);
  expect(s.kitBalance(a.id)).toBe(0);
  expect(() => t.claim(a.id, request)).toThrow("erased");
  advance(86400001);
  expect(() =>
    t.claim(register().id, { ...request, code: batch.codes[1] }),
  ).toThrow("not active");
  e.close();
});
