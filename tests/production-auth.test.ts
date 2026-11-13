import { test, expect } from "vitest";
import {
  hashAdminPassword,
  verifyAdminPassword,
  ProductionAdminAuth,
} from "../server/production-auth";
import {
  assertProductionConfig,
  allowedOrigin,
} from "../server/runtime-config";
import { KitStore } from "../server/kit-store";
import { AdminAccess } from "../server/admin-access";
test("production config fails closed before database IO; only configured HTTPS and native origins pass", async () => {
  const hash = await hashAdminPassword("synthetic owner password only");
  const env = {
    NODE_ENV: "production",
    DATABASE_PATH: process.cwd() + "/test-results/synthetic-production.sqlite",
    CODE_PEPPER: "p".repeat(32),
    SANDBOX_PAYMENT_KEY: "k".repeat(32),
    ADMIN_PASSWORD_HASH: hash,
    APP_ORIGIN: "https://example.invalid",
  };
  expect(() => assertProductionConfig(env)).not.toThrow();
  for (const path of [
    "relative/erasure.sqlite",
    env.DATABASE_PATH,
    process.cwd() + "/tmp/data/erasure.sqlite",
  ])
    expect(() =>
      assertProductionConfig({ ...env, ERASURE_LEDGER_PATH: path }),
    ).toThrow("erasure ledger");
  for (const name of [
    "DATABASE_PATH",
    "CODE_PEPPER",
    "SANDBOX_PAYMENT_KEY",
    "ADMIN_PASSWORD_HASH",
    "APP_ORIGIN",
  ])
    expect(() => assertProductionConfig({ ...env, [name]: "" })).toThrow();
  for (const origin of [
    "http://example.invalid",
    "https://user:secret@example.invalid",
    "https://example.invalid/path",
    "broken?secret",
  ])
    expect(() =>
      assertProductionConfig({ ...env, APP_ORIGIN: origin }),
    ).toThrow();
  expect(allowedOrigin("https://example.invalid", env)).toBe(true);
  expect(allowedOrigin("https://evil.invalid", env)).toBe(false);
  expect(allowedOrigin("http://127.0.0.1:5173", env)).toBe(false);
  expect(allowedOrigin("capacitor://localhost", env)).toBe(true);
});
test("password hashes, expiring hashed sessions and revocation disable local owner tokens in production", async () => {
  const password = "synthetic owner password only",
    hash = await hashAdminPassword(password);
  expect(hash.includes(password)).toBe(false);
  expect(await verifyAdminPassword(password, hash)).toBe(true);
  expect(await verifyAdminPassword("wrong password here", hash)).toBe(false);
  const s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  try {
    const auth = new ProductionAdminAuth(s, hash),
      local = "local-token-".padEnd(40, "x"),
      access = new AdminAccess(s, local, auth);
    await expect(auth.login("wrong password here")).rejects.toThrow();
    const session = await auth.login(password, 1000);
    expect(auth.authenticate(session.token, 1001)).toBe(true);
    expect(auth.authenticate(session.token, session.expiresAt)).toBe(false);
    expect(() => access.authenticate(local, 1001)).toThrow();
    expect(access.authenticate(session.token, 1001).role).toBe("owner");
    expect(
      s.db.prepare("SELECT hash FROM owner_sessions").get()?.hash,
    ).not.toBe(session.token);
    auth.revoke(session.token);
    expect(() => access.authenticate(session.token, 1001)).toThrow();
  } finally {
    s.close();
  }
});
test("owner login locks a client after5 failures and globally after50, survives restart and clears on success", async () => {
  const password = "synthetic owner password only",
    hash = await hashAdminPassword(password),
    s = new KitStore(":memory:", "p".repeat(32), "k".repeat(32));
  try {
    let auth = new ProductionAdminAuth(s, hash);
    const t0 = 10_000_000;
    for (let k = 0; k < 4; k++)
      await expect(auth.login("wrong password here", t0 + k, "1.2.3.4")).rejects.toThrow("Invalid administrator password");
    // A success before the limit clears this client's counter.
    await auth.login(password, t0 + 5, "1.2.3.4");
    for (let k = 0; k < 5; k++)
      await expect(auth.login("wrong password here", t0 + 10 + k, "1.2.3.4")).rejects.toThrow("Invalid administrator password");
    // Locked: even the right password is refused, without a password check.
    await expect(auth.login(password, t0 + 20, "1.2.3.4")).rejects.toThrow("Too many administrator login attempts");
    // Another client is unaffected.
    expect((await auth.login(password, t0 + 21, "5.6.7.8")).token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // Restart keeps the lock.
    auth = new ProductionAdminAuth(s, hash);
    await expect(auth.login(password, t0 + 22, "1.2.3.4")).rejects.toThrow("Too many");
    expect(auth.lockedUntil("1.2.3.4", t0 + 22)).toBe(t0 + 14 + ProductionAdminAuth.LOCKOUT.lockMs);
    // After the lock expires the owner can log in again.
    expect((await auth.login(password, t0 + 14 + ProductionAdminAuth.LOCKOUT.lockMs, "1.2.3.4")).token).toBeTruthy();
    // Global: 200 failures spread over many clients lock everyone for15 minutes.
    const t1 = t0 + 10 * 3600000;
    for (let k = 0; k < 200; k++)
      await expect(auth.login("wrong password here", t1 + k, "10.0." + (k >> 8) + "." + (k & 255))).rejects.toThrow();
    await expect(auth.login(password, t1 + 250, "9.9.9.9")).rejects.toThrow("Too many");
    const actions = (s.db.prepare("SELECT action FROM audit WHERE actor_id='owner-login'").all() as { action: string }[]).map((r) => r.action);
    expect(actions).toContain("admin.login.locked");
    expect(actions).toContain("admin.login.blocked");
    expect(actions).toContain("admin.login.success");
    // Client identifiers are stored only as keyed digests.
    expect(JSON.stringify(s.db.prepare("SELECT scope FROM owner_login_failures").all())).not.toContain("1.2.3.4");
  } finally {
    s.close();
  }
}, 120000);
