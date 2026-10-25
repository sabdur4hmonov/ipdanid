import { randomBytes, randomUUID } from "node:crypto";
import type { KitStore } from "./kit-store";
import { DomainError } from "./store";
import { DEFAULT_TRIAL_POLICY, type TrialPolicy } from "../src/trial-types";

// Private owner-issued codes, never an automatic Instagram follower check/DM.
// An account-bound digital credit is deliberately separate from physical kits,
// paid/gift credits and order/delivery prices.
export class TrialStore {
  constructor(
    private store: KitStore,
    private clock: () => number = Date.now,
  ) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS trial_policy(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS trial_batches(id TEXT PRIMARY KEY,actor TEXT NOT NULL,request_key TEXT NOT NULL,count INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(actor,request_key));
      CREATE TABLE IF NOT EXISTS trial_codes(hash TEXT PRIMARY KEY,batch_id TEXT NOT NULL REFERENCES trial_batches(id),expires_at INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,claimed_by TEXT REFERENCES users(id));
      CREATE TABLE IF NOT EXISTS trial_claims(user_id TEXT PRIMARY KEY REFERENCES users(id),code_hash TEXT NOT NULL UNIQUE REFERENCES trial_codes(hash),request_key TEXT NOT NULL,remaining INTEGER NOT NULL CHECK(remaining IN(0,1)),expires_at INTEGER NOT NULL,claimed_at INTEGER NOT NULL)`);
    store.db
      .prepare("INSERT OR IGNORE INTO trial_policy VALUES(1,?)")
      .run(JSON.stringify(DEFAULT_TRIAL_POLICY));
    store.additionalBuildCredits = {
      balance: (u, now) => this.balance(u, now),
      spend: (u, now) => this.spend(u, now),
    };
  }
  private tx<T>(fn: () => T): T {
    this.store.db.exec("SAVEPOINT trial_operation");
    try {
      const result = fn();
      this.store.db.exec("RELEASE SAVEPOINT trial_operation");
      return result;
    } catch (e) {
      this.store.db.exec("ROLLBACK TO SAVEPOINT trial_operation");
      this.store.db.exec("RELEASE SAVEPOINT trial_operation");
      throw e;
    }
  }
  private exact(v: unknown, keys: string) {
    if (
      !v ||
      typeof v !== "object" ||
      Array.isArray(v) ||
      Object.keys(v).sort().join() !== keys
    )
      throw new DomainError("Invalid trial request");
    return v as Record<string, unknown>;
  }
  private key(v: unknown) {
    if (typeof v !== "string" || !/^[-\w]{8,100}$/.test(v))
      throw new DomainError("Invalid trial request key");
    return v;
  }
  private digest(code: string) {
    return this.store.digest("instagram-trial/1:" + code);
  }
  policy() {
    return JSON.parse(
      String(
        this.store.db.prepare("SELECT data FROM trial_policy WHERE id=1").get()!
          .data,
      ),
    ) as TrialPolicy;
  }
  private counts(now = this.clock()) {
    const claimed = Number(
        this.store.db.prepare("SELECT count(*) AS n FROM trial_claims").get()!
          .n,
      ),
      pending = Number(
        this.store.db
          .prepare(
            "SELECT count(*) AS n FROM trial_codes WHERE claimed_by IS NULL AND revoked=0 AND expires_at>?",
          )
          .get(now)!.n,
      );
    return { claimed, pending };
  }
  update(actor: string, input: unknown) {
    const b = this.exact(
        input,
        "creditDays,enabled,expiresAt,maxClaims,revision,startsAt,version",
      ),
      p = b as unknown as TrialPolicy;
    if (
      p.version !== "instagram-trial/1" ||
      typeof p.enabled !== "boolean" ||
      ![p.revision, p.startsAt, p.expiresAt, p.maxClaims, p.creditDays].every(
        Number.isSafeInteger,
      ) ||
      p.startsAt < 0 ||
      p.expiresAt < 0 ||
      p.revision < 0 ||
      p.expiresAt > this.clock() + 366 * 86400000 ||
      p.startsAt > this.clock() + 366 * 86400000 ||
      p.maxClaims < 0 ||
      p.maxClaims > 10000 ||
      p.creditDays < 1 ||
      p.creditDays > 365 ||
      (p.enabled &&
        (p.maxClaims < 1 ||
          p.expiresAt <= this.clock() ||
          p.expiresAt <= p.startsAt))
    )
      throw new DomainError("Invalid trial policy");
    return this.tx(() => {
      const current = this.policy(),
        counts = this.counts();
      if (current.revision !== p.revision)
        throw new DomainError("Trial policy changed", 409);
      if (p.maxClaims < counts.claimed + counts.pending)
        throw new DomainError("Trial budget below existing promises", 409);
      const next = { ...p, revision: p.revision + 1 };
      this.store.db
        .prepare("UPDATE trial_policy SET data=? WHERE id=1")
        .run(JSON.stringify(next));
      this.log(actor, "trial.policy", "policy");
      return next;
    });
  }
  private active() {
    const p = this.policy(),
      now = this.clock();
    if (!p.enabled || now < p.startsAt || now >= p.expiresAt)
      throw new DomainError("Trial campaign is not active", 403);
    return p;
  }
  issue(actor: string, input: unknown) {
    const b = this.exact(input, "count,requestKey"),
      requestKey = this.key(b.requestKey),
      count = Number(b.count);
    if (!Number.isSafeInteger(b.count) || count < 1 || count > 100)
      throw new DomainError("Invalid trial batch size");
    return this.tx(() => {
      const p = this.active(),
        now = this.clock(),
        counts = this.counts(now);
      if (
        this.store.db
          .prepare(
            "SELECT 1 FROM trial_batches WHERE actor=? AND request_key=?",
          )
          .get(actor, requestKey)
      )
        throw new DomainError(
          "Trial batch already issued; revoke the unused batch before reissuing lost codes",
          409,
        );
      if (counts.claimed + counts.pending + count > p.maxClaims)
        throw new DomainError("Trial campaign budget exceeded", 409);
      if (
        Number(
          this.store.db.prepare("SELECT count(*) AS n FROM trial_codes").get()!
            .n,
        ) +
          count >
        20000
      )
        throw new DomainError("Trial code capacity reached", 429);
      const id = randomUUID();
      this.store.db
        .prepare("INSERT INTO trial_batches VALUES(?,?,?,?,?)")
        .run(id, actor, requestKey, count, now);
      const codes = [];
      for (let j = 0; j < count; j++) {
        const code = "TRIAL-" + randomBytes(15).toString("hex").toUpperCase();
        this.store.db
          .prepare("INSERT INTO trial_codes VALUES(?,?,?,0,NULL)")
          .run(this.digest(code), id, p.expiresAt);
        codes.push(code);
      }
      this.log(actor, "trial.issue", id);
      return {
        id,
        codes,
        expiresAt: p.expiresAt,
        digitalBuildsPerCode: 1 as const,
      };
    });
  }
  revoke(actor: string, input: unknown) {
    const b = this.exact(input, "batchId");
    if (typeof b.batchId !== "string" || !/^[-a-f0-9]{36}$/.test(b.batchId))
      throw new DomainError("Invalid trial batch");
    const result = this.store.db
      .prepare(
        "UPDATE trial_codes SET revoked=1 WHERE batch_id=? AND claimed_by IS NULL",
      )
      .run(b.batchId);
    this.log(actor, "trial.revoke", b.batchId);
    return { revoked: Number(result.changes) };
  }
  report() {
    return {
      policy: this.policy(),
      ...this.counts(),
      used: Number(
        this.store.db
          .prepare("SELECT count(*) AS n FROM trial_claims WHERE remaining=0")
          .get()!.n,
      ),
      batches: this.store.db
        .prepare(
          "SELECT b.id,b.count,b.created_at,sum(CASE WHEN c.claimed_by IS NOT NULL THEN 1 ELSE 0 END) AS claimed,sum(CASE WHEN c.revoked=1 THEN 1 ELSE 0 END) AS revoked FROM trial_batches b JOIN trial_codes c ON c.batch_id=b.id GROUP BY b.id ORDER BY b.created_at DESC,b.id LIMIT 100",
        )
        .all(),
    };
  }
  status(user: string) {
    this.store.assertAccountActive(user);
    const p = this.policy(),
      claim = this.store.db
        .prepare(
          "SELECT remaining,expires_at FROM trial_claims WHERE user_id=?",
        )
        .get(user);
    return {
      enabled:
        p.enabled && this.clock() >= p.startsAt && this.clock() < p.expiresAt,
      creditDays: p.creditDays,
      claimed: !!claim,
      remaining: this.balance(user),
      expiresAt: claim?.expires_at ?? null,
    };
  }
  claim(user: string, input: unknown) {
    this.store.assertAccountActive(user);
    if (
      !this.store.db.prepare("SELECT 1 FROM accounts WHERE user_id=?").get(user)
    )
      throw new DomainError("Register an account before claiming a trial", 403);
    const b = this.exact(input, "code,requestKey"),
      requestKey = this.key(b.requestKey);
    if (typeof b.code !== "string" || !/^TRIAL-[A-F0-9]{30}$/.test(b.code))
      throw new DomainError("Trial code unavailable", 403);
    const code = this.digest(b.code);
    return this.tx(() => {
      const old = this.store.db
        .prepare(
          "SELECT code_hash,expires_at FROM trial_claims WHERE user_id=?",
        )
        .get(user);
      if (old) {
        if (old.code_hash !== code)
          throw new DomainError("Only one trial per account", 409);
        return {
          duplicate: true,
          credits: this.store.kitBalance(user),
          expiresAt: Number(old.expires_at),
        };
      }
      const p = this.active(),
        now = this.clock(),
        r = this.store.db
          .prepare(
            "SELECT expires_at,revoked,claimed_by FROM trial_codes WHERE hash=?",
          )
          .get(code);
      if (!r || r.revoked || Number(r.expires_at) <= now)
        throw new DomainError("Trial code unavailable", 403);
      if (r.claimed_by)
        throw new DomainError(
          "Trial code already belongs to another account",
          409,
        );
      if (this.counts(now).claimed >= p.maxClaims)
        throw new DomainError("Trial campaign budget exceeded", 409);
      const expiresAt = now + p.creditDays * 86400000;
      this.store.db
        .prepare("INSERT INTO trial_claims VALUES(?,?,?,1,?,?)")
        .run(user, code, requestKey, expiresAt, now);
      this.store.db
        .prepare("UPDATE trial_codes SET claimed_by=? WHERE hash=?")
        .run(user, code);
      this.log(user, "trial.claim", code);
      return {
        duplicate: false,
        credits: this.store.kitBalance(user),
        expiresAt,
      };
    });
  }
  private balance(user: string, now = this.clock()) {
    if (
      this.store.db
        .prepare("SELECT 1 FROM account_erasure WHERE user_id=?")
        .get(user)
    )
      return 0;
    return Number(
      this.store.db
        .prepare(
          "SELECT COALESCE(sum(remaining),0) AS n FROM trial_claims WHERE user_id=? AND expires_at>?",
        )
        .get(user, now)!.n,
    );
  }
  private spend(user: string, now: number) {
    this.store.assertAccountActive(user);
    const row = this.store.db
      .prepare(
        "UPDATE trial_claims SET remaining=0 WHERE user_id=? AND remaining=1 AND expires_at>? RETURNING code_hash",
      )
      .get(user, now);
    return row ? "instagram-trial:" + String(row.code_hash) : null;
  }
  private log(actor: string, action: string, entity: string) {
    this.store.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(
        randomUUID(),
        actor,
        action,
        entity,
        new Date(this.clock()).toISOString(),
      );
  }
}
