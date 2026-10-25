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
