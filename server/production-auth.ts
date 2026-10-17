import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

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
  }
  async login(password: unknown, now = Date.now()) {
    if (!(await verifyAdminPassword(password, this.passwordHash)))
      throw new DomainError("Invalid administrator password", 401);
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
