import { randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";

import type { CustomerStore } from "./customer-store";
import { DomainError } from "./store";
function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(
      password,
      salt,
      32,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}
export async function hashAdminPassword(password: string) {
  if (
    typeof password !== "string" ||
    password.length < 14 ||
    password.length > 256
  )
    throw Error("Admin password must contain14–256 characters");
  const salt = randomBytes(16).toString("base64url");
  const key = await derive(password, salt);
  return ["scrypt", 32768, 8, 1, salt, key.toString("base64url")].join("$");
}
export async function verifyAdminPassword(password: unknown, encoded: string) {
  if (
    typeof password !== "string" ||
    password.length < 14 ||
    password.length > 256 ||
    !/^scrypt\$32768\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/.test(encoded)
  )
    return false;
  const parts = encoded.split("$"),
    key = await derive(password, parts[4]);
  return timingSafeEqual(key, Buffer.from(parts[5], "base64url"));
}
export class ProductionAdminAuth {
  constructor(
    private store: CustomerStore,
    private passwordHash: string,
  ) {
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS owner_sessions(hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL)",
    );
    // Persistent so a restart cannot reset an attacker's budget.
    store.db.exec(
      "CREATE TABLE IF NOT EXISTS owner_login_failures(scope TEXT PRIMARY KEY,count INTEGER NOT NULL,first_at INTEGER NOT NULL,locked_until INTEGER NOT NULL)",
    );
  }
  // Admin-specific lockout on top of the generic per-IP auth budget:
  // 5 failures from one client within15 minutes, or200 overall within an hour,
  // lock that scope for15 minutes. Success clears the client's own counter.
  static readonly LOCKOUT = Object.freeze({
    client: { limit: 5, windowMs: 15 * 60000 },
    global: { limit: 200, windowMs: 60 * 60000 },
    lockMs: 15 * 60000,
  });
  private scopes(client: string) {
    return [
      ["client:" + this.store.digest("owner-login:" + client), ProductionAdminAuth.LOCKOUT.client],
      ["global", ProductionAdminAuth.LOCKOUT.global],
    ] as const;
  }
  private audit(action: string, entity: string, now: number) {
    try {
      this.store.db
        .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
        .run(randomUUID(), "owner-login", action, entity, new Date(now).toISOString());
    } catch {
      // Audit storage must never turn a lockout into an open door.
    }
  }
  lockedUntil(client: string, now = Date.now()) {
    let until = 0;
    for (const [scope] of this.scopes(client)) {
      const row = this.store.db
        .prepare("SELECT locked_until FROM owner_login_failures WHERE scope=?")
        .get(scope) as { locked_until: number } | undefined;
      if (row && row.locked_until > now) until = Math.max(until, row.locked_until);
    }
    return until;
  }
  private recordFailure(client: string, now: number) {
    for (const [scope, rule] of this.scopes(client)) {
      const row = this.store.db
        .prepare("SELECT count,first_at FROM owner_login_failures WHERE scope=?")
        .get(scope) as { count: number; first_at: number } | undefined;
      const fresh = !row || now - row.first_at >= rule.windowMs,
        count = fresh ? 1 : row!.count + 1,
        first = fresh ? now : row!.first_at,
        locked = count >= rule.limit ? now + ProductionAdminAuth.LOCKOUT.lockMs : 0;
      this.store.db
        .prepare(
          "INSERT INTO owner_login_failures VALUES(?,?,?,?) ON CONFLICT(scope) DO UPDATE SET count=excluded.count,first_at=excluded.first_at,locked_until=MAX(owner_login_failures.locked_until,excluded.locked_until)",
        )
        .run(scope, count, first, locked);
      if (locked) this.audit("admin.login.locked", scope === "global" ? "global" : "client", now);
    }
  }
  async login(password: unknown, now = Date.now(), client = "unknown") {
    this.store.db
      .prepare(
        "DELETE FROM owner_login_failures WHERE locked_until<=? AND first_at<=?",
      )
      .run(now, now - ProductionAdminAuth.LOCKOUT.global.windowMs);
    const until = this.lockedUntil(client, now);
    if (until > now) {
      this.audit("admin.login.blocked", "locked", now);
      throw new DomainError(
        "Too many administrator login attempts; try again later",
        429,
      );
    }
    if (!(await verifyAdminPassword(password, this.passwordHash))) {
      this.recordFailure(client, now);
      this.audit("admin.login.failed", "password", now);
      throw new DomainError("Invalid administrator password", 401);
    }
    this.store.db
      .prepare("DELETE FROM owner_login_failures WHERE scope=?")
      .run(this.scopes(client)[0][0]);
    this.audit("admin.login.success", "owner", now);
    const token = randomBytes(32).toString("base64url"),
      expiresAt = now + 8 * 3600000;
    this.store.db
      .prepare("DELETE FROM owner_sessions WHERE expires_at<=?")
      .run(now);
    this.store.db
      .prepare(
        "DELETE FROM owner_sessions WHERE hash IN (SELECT hash FROM owner_sessions ORDER BY created_at DESC LIMIT -1 OFFSET 9)",
      )
      .run();
    this.store.db
      .prepare("INSERT INTO owner_sessions VALUES(?,?,?)")
      .run(this.store.digest(token), expiresAt, now);
    return { token, expiresAt };
  }
  authenticate(token: string, now = Date.now()) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
    return !!this.store.db
      .prepare("SELECT 1 FROM owner_sessions WHERE hash=? AND expires_at>?")
      .get(this.store.digest(token), now);
  }
  revoke(token: string) {
    this.store.db
      .prepare("DELETE FROM owner_sessions WHERE hash=?")
      .run(this.store.digest(token));
  }
}
