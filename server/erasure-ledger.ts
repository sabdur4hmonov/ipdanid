import { DatabaseSync } from "node:sqlite";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  realpathSync,
} from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { assertTestDatabasePath } from "./test-safety.mjs";

export interface ErasureLedgerConfig {
  path: string;
  key: string;
}
// A separate durable SQLite volume is intentionally never restored with the app
// database. Contains opaque IDs/timestamps, not credentials or customer content.
export class ErasureLedger {
  private db: DatabaseSync;
  private known = new Set<string>();
  private closed = false;
  readonly id: string;
  constructor(main: DatabaseSync, config: ErasureLedgerConfig) {
    if (!isAbsolute(config.path) || config.key.length < 32)
      throw Error("Invalid erasure ledger configuration");
    assertTestDatabasePath(config.path);
    const path = resolve(config.path),
      existed = existsSync(path);
    if (existed && lstatSync(path).isSymbolicLink())
      throw Error("Erasure ledger must not be a symbolic link");
    const mainFile = main
      .prepare("PRAGMA database_list")
      .all()
      .find((r) => r.name === "main")?.file;
    if (
      mainFile &&
      existsSync(String(mainFile)) &&
      existed &&
      realpathSync(path) === realpathSync(String(mainFile))
    )
      throw Error("Erasure ledger must be separate from application database");
    main.exec(
      "CREATE TABLE IF NOT EXISTS erasure_ledger_binding(id INTEGER PRIMARY KEY CHECK(id=1),ledger_id TEXT NOT NULL)",
    );
    const binding = main
      .prepare("SELECT ledger_id FROM erasure_ledger_binding WHERE id=1")
      .get();
    if (binding && !existed)
      throw Error(
        "Missing current erasure ledger; refusing database activation",
      );
    mkdirSync(dirname(path), { recursive: true });
    this.key = config.key;
    this.db = new DatabaseSync(path);
    try {
      chmodSync(path, 0o600);
      this.db.exec(
        "PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000",
      );
      if (this.db.prepare("PRAGMA quick_check").get()?.quick_check !== "ok")
        throw Error("Erasure ledger integrity failed");
      if (!existed) {
        this.db.exec(
          "CREATE TABLE ledger_identity(id INTEGER PRIMARY KEY CHECK(id=1),ledger_id TEXT NOT NULL,entry_count INTEGER NOT NULL,last_mac TEXT NOT NULL,mac TEXT NOT NULL);CREATE TABLE erasures(seq INTEGER NOT NULL UNIQUE,user_id TEXT PRIMARY KEY,erased_at INTEGER NOT NULL,prev_mac TEXT NOT NULL,mac TEXT NOT NULL)",
        );
        const id = randomUUID(),
          head = "0".repeat(64);
        this.db
          .prepare("INSERT INTO ledger_identity VALUES(1,?,0,?,?)")
          .run(id, head, this.sign(["head", id, 0, head]));
      }
      const header = this.header();
      this.id = header.ledger_id;
      if (binding && binding.ledger_id !== this.id)
        throw Error("Wrong erasure ledger for this database");
      // Verify chain/head/count before serving. Keep only opaque IDs in memory
      // so removing a journal row during runtime cannot re-enable a pending user.
      for (const entry of this.entries()) this.known.add(entry.user);
      main
        .prepare("INSERT OR IGNORE INTO erasure_ledger_binding VALUES(1,?)")
        .run(this.id);
      chmodSync(path, 0o600);
    } catch (error) {
      this.db.close();
      throw error;
    }
  }
  private key: string;
  private sign(fields: unknown[]) {
    return createHmac("sha256", this.key)
      .update(JSON.stringify(fields))
      .digest("hex");
  }
  private matches(value: unknown, expected: string) {
    return (
      typeof value === "string" &&
      /^[a-f0-9]{64}$/.test(value) &&
      timingSafeEqual(Buffer.from(value, "hex"), Buffer.from(expected, "hex"))
    );
  }
  private header() {
    const h = this.db
      .prepare(
        "SELECT ledger_id,entry_count,last_mac,mac FROM ledger_identity WHERE id=1",
      )
      .get();
    if (
      !h ||
      typeof h.ledger_id !== "string" ||
      typeof h.entry_count !== "number" ||
      !Number.isSafeInteger(h.entry_count) ||
      h.entry_count < 0 ||
      typeof h.last_mac !== "string" ||
      !this.matches(
        h.mac,
        this.sign(["head", h.ledger_id, h.entry_count, h.last_mac]),
      )
    )
      throw Error("Erasure ledger authentication failed");
    return { ledger_id: h.ledger_id, count: h.entry_count, head: h.last_mac };
  }
  private checked(row: Record<string, unknown>) {
    const user = row.user_id,
      at = row.erased_at,
      seq = row.seq,
      prev = row.prev_mac;
    if (
      typeof user !== "string" ||
      !/^[-a-zA-Z0-9_]{1,128}$/.test(user) ||
      typeof at !== "number" ||
      !Number.isSafeInteger(at) ||
      at <= 0 ||
      typeof seq !== "number" ||
      !Number.isSafeInteger(seq) ||
      seq < 1 ||
      typeof prev !== "string" ||
      !this.matches(row.mac, this.sign(["erase", this.id, seq, user, at, prev]))
    )
      throw Error("Erasure ledger entry authentication failed");
    return { user, at, seq, prev, mac: String(row.mac) };
  }
  *entries() {
    const head = this.header();
    let count = 0,
      previous = "0".repeat(64);
    for (const row of this.db
      .prepare(
        "SELECT seq,user_id,erased_at,prev_mac,mac FROM erasures ORDER BY seq",
      )
      .iterate()) {
      const entry = this.checked(row);
      if (entry.seq !== ++count || entry.prev !== previous)
        throw Error("Erasure ledger chain is incomplete");
      previous = entry.mac;
      yield entry;
    }
    if (count !== head.count || previous !== head.head)
      throw Error("Erasure ledger head/count mismatch");
  }
  has(user: string) {
    if (this.known.has(user)) return true;
    const row = this.db
      .prepare(
        "SELECT seq,user_id,erased_at,prev_mac,mac FROM erasures WHERE user_id=?",
      )
      .get(user);
    if (!row) return false;
    this.checked(row);
    this.known.add(user);
    return true;
  }
  record(user: string, at = Date.now()) {
    if (
      !/^[-a-zA-Z0-9_]{1,128}$/.test(user) ||
      !Number.isSafeInteger(at) ||
      at <= 0
    )
      throw Error("Invalid erasure intent");
    const old = this.db
      .prepare(
        "SELECT seq,user_id,erased_at,prev_mac,mac FROM erasures WHERE user_id=?",
      )
      .get(user);
    if (old) return this.checked(old).at;
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const h = this.header();
      if (
        Number(
          this.db.prepare("SELECT count(*) AS n FROM erasures").get()!.n,
        ) !== h.count
      )
        throw Error("Erasure ledger count mismatch");
      const seq = h.count + 1,
        mac = this.sign(["erase", this.id, seq, user, at, h.head]);
      this.db
        .prepare("INSERT INTO erasures VALUES(?,?,?,?,?)")
        .run(seq, user, at, h.head, mac);
      this.db
        .prepare(
          "UPDATE ledger_identity SET entry_count=?,last_mac=?,mac=? WHERE id=1",
        )
        .run(seq, mac, this.sign(["head", this.id, seq, mac]));
      this.db.exec("COMMIT");
      this.known.add(user);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    return at;
  }
  close() {
    if (!this.closed) {
      this.db.close();
      this.closed = true;
    }
  }
}
