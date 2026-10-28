import { randomUUID } from "node:crypto";
import { KitStore } from "./kit-store";
import { DomainError } from "./store";
import { generationCapability, generationIdentity } from "./generation-recipe";
import { validateInstruction } from "../src/core/validation";
import type { Instruction } from "../src/core/types";
export class GenerationStore {
  private serial = 0;
  constructor(
    readonly store: KitStore,
    private now = Date.now,
  ) {
    store.db.exec(`CREATE TABLE IF NOT EXISTS protected_generations(
      id TEXT PRIMARY KEY, capability_hash TEXT NOT NULL, request_key TEXT NOT NULL,
      recipe_hash TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('queued','running','ready','failed','cancelled')),
      fraction REAL NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
      owner_id TEXT, sequence_hash TEXT, lines INTEGER, guide TEXT, preview BLOB,
      UNIQUE(capability_hash,request_key));
      CREATE INDEX IF NOT EXISTS protected_generation_expiry ON protected_generations(expires_at);
      CREATE INDEX IF NOT EXISTS protected_generation_owner ON protected_generations(owner_id);`);
    // Raw targets are never persisted. A restart cannot pretend unfinished work
    // succeeded or resume a worker that no longer exists.
    store.db.exec(
      "UPDATE protected_generations SET status='failed' WHERE status IN ('queued','running')",
    );
    this.prune();
  }
  private tx<T>(fn: () => T): T {
    const db = this.store.db,
      savepoint = "generation_" + ++this.serial;
    db.exec("SAVEPOINT " + savepoint);
    try {
      const out = fn();
      db.exec("RELEASE SAVEPOINT " + savepoint);
      return out;
    } catch (e) {
      db.exec("ROLLBACK TO SAVEPOINT " + savepoint);
      db.exec("RELEASE SAVEPOINT " + savepoint);
      throw e;
    }
  }
  prune() {
    this.store.db
      .prepare("DELETE FROM protected_generations WHERE expires_at<=?")
      .run(this.now());
  }
  private auth(id: unknown, secret: unknown) {
    const capability = generationCapability(secret);
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))
      throw new DomainError("Generation unavailable", 404);
    const row = this.store.db
      .prepare(
        "SELECT id,status,fraction,expires_at,owner_id,recipe_hash FROM protected_generations WHERE id=? AND capability_hash=? AND expires_at>?",
      )
      .get(id, this.store.digest(capability), this.now());
    if (!row) throw new DomainError("Generation unavailable", 404);
    return row;
  }
  begin(secret: string, key: string, recipeHash: string) {
    generationCapability(secret);
    generationIdentity(key);
    if (!/^[a-f0-9]{64}$/.test(recipeHash))
      throw new DomainError("Invalid generation recipe");
    return this.tx(() => {
      this.prune();
      const capability = this.store.digest(secret),
        old = this.store.db
          .prepare(
            "SELECT id,recipe_hash,status FROM protected_generations WHERE capability_hash=? AND request_key=?",
          )
          .get(capability, key);
      if (old) {
        if (old.recipe_hash !== recipeHash)
          throw new DomainError("Generation request conflict", 409);
        return {
          id: String(old.id),
          duplicate: true,
          status: String(old.status),
        };
      }
      const resources = this.store.db
        .prepare(
          "SELECT COUNT(*) n, COALESCE(SUM(CASE WHEN status IN ('queued','running','ready') THEN 1 ELSE 0 END),0) live, COALESCE(SUM(LENGTH(CAST(guide AS BLOB))+LENGTH(preview)),0) bytes FROM protected_generations",
        )
        .get()!;
      if (
        Number(resources.n) >= 512 ||
        Number(resources.live) >= 64 ||
        Number(resources.bytes) >= 64 * 1024 * 1024
      )
        throw new DomainError("Generation service is busy; retry later", 503);
      const id = randomUUID(),
        at = this.now();
      this.store.db
        .prepare(
          "INSERT INTO protected_generations(id,capability_hash,request_key,recipe_hash,status,created_at,expires_at) VALUES(?,?,?,?,'queued',?,?)",
        )
        .run(id, capability, key, recipeHash, at, at + 30 * 60000);
      return { id, duplicate: false, status: "queued" };
    });
  }
  state(id: unknown, secret: unknown) {
    const row = this.auth(id, secret);
    const out = {
      id: String(row.id),
      status: String(row.status),
      fraction: Number(row.fraction),
      expiresAt: Number(row.expires_at),
    };
    if (row.status !== "ready") return out;
    const view = this.store.db
      .prepare(
        "SELECT sequence_hash,lines,preview FROM protected_generations WHERE id=?",
      )
      .get(String(row.id))!;
    return {
      ...out,
      sequenceHash: String(view.sequence_hash),
      lines: Number(view.lines),
      width: 1000,
      height: 1000,
      preview: Buffer.from(view.preview as Uint8Array).toString("base64"),
      secondsPerConnection: 8,
    };
  }
  running(id: string) {
    return (
      this.store.db
        .prepare(
          "UPDATE protected_generations SET status='running' WHERE id=? AND status='queued' AND expires_at>?",
        )
        .run(id, this.now()).changes === 1
    );
  }
  progress(id: string, fraction: number) {
    if (Number.isFinite(fraction))
      this.store.db
        .prepare(
          "UPDATE protected_generations SET fraction=MAX(fraction,?) WHERE id=? AND status='running'",
        )
        .run(Math.max(0, Math.min(0.99, fraction)), id);
  }
  fail(id: string) {
    this.store.db
      .prepare(
        "UPDATE protected_generations SET status='failed' WHERE id=? AND status IN ('queued','running')",
      )
      .run(id);
  }
  cancel(id: unknown, secret: unknown) {
    const row = this.auth(id, secret);
    this.store.db
      .prepare(
        "UPDATE protected_generations SET status='cancelled' WHERE id=? AND status IN ('queued','running')",
      )
      .run(String(row.id));
    return { id: String(row.id), status: this.auth(id, secret).status };
  }
  async complete(id: string, value: unknown, png: Uint8Array) {
    const i = await validateInstruction(value);
    if (
      i.algorithm !== "classic-greedy/3" ||
      i.params.resolution !== 500 ||
      i.params.accessPolicy !== "kit-build/1" ||
      ![2500, 3000, 3500].includes(i.metrics.lines) ||
      JSON.stringify(i).length > 2000000 ||
      png.length < 24 ||
      png.length > 4000000 ||
      !Buffer.from(png.subarray(0, 8)).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      ) ||
      Buffer.from(png).readUInt32BE(16) !== 1000 ||
      Buffer.from(png).readUInt32BE(20) !== 1000
    )
      throw new DomainError("Invalid generation result");
    const guide = JSON.stringify(i),
      bytes = this.store.db
        .prepare(
          "SELECT COALESCE(SUM(LENGTH(CAST(guide AS BLOB))+LENGTH(preview)),0) bytes FROM protected_generations WHERE id!=?",
        )
        .get(id)!.bytes;
    if (
      Number(bytes) + Buffer.byteLength(guide) + png.length >
      64 * 1024 * 1024
    )
      throw new DomainError("Generation service storage is full", 503);
    // CAS fences cancellation, expiry and erased/deleted rows after validation.
    return (
      this.store.db
        .prepare(
          "UPDATE protected_generations SET status='ready',fraction=1,sequence_hash=?,lines=?,guide=?,preview=? WHERE id=? AND status='running' AND expires_at>?",
        )
        .run(i.sequenceHash, i.metrics.lines, guide, png, id, this.now())
        .changes === 1
    );
  }
  unlock(
    account: string,
    id: unknown,
    secret: unknown,
    deviceId: string,
    requestKey: string,
  ) {
    this.store.assertAccountActive(account);
    return this.tx(() => {
      const row = this.auth(id, secret);
      if (row.status !== "ready")
        throw new DomainError("Generation is not ready", 409);
      if (row.owner_id && row.owner_id !== account)
        throw new DomainError("Generation unavailable", 404);
      const saved = this.store.db
          .prepare("SELECT guide FROM protected_generations WHERE id=?")
          .get(String(row.id))!,
        guide = JSON.parse(String(saved.guide)) as Instruction;
      this.store.db
        .prepare("UPDATE protected_generations SET owner_id=? WHERE id=?")
        .run(account, String(row.id));
      const receipt = this.store.unlockBuild(
        account,
        guide.sequenceHash,
        deviceId,
        requestKey,
      );
      this.store.archiveBuild(account, guide);
      return { ...receipt, instruction: guide };
    });
  }
}
