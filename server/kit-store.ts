import { CustomerStore } from "./customer-store.ts";
import { DomainError } from "./store.ts";
import {
  randomBytes,
  randomUUID,
  generateKeyPairSync,
  createPrivateKey,
  sign,
} from "node:crypto";
export interface KitPolicy {
  quota: number;
  codeDays: number;
  creditDays: number;
  maxKitsPerAccount: number;
  buildsPerPeriod: number;
  periodDays: number;
}
const defaults: KitPolicy = {
  quota: 4,
  codeDays: 0,
  creditDays: 0,
  maxKitsPerAccount: 0,
  buildsPerPeriod: 0,
  periodDays: 30,
};
export class KitStore extends CustomerStore {
  constructor(path: string, pepper: string, paymentKey: string) {
    super(path, pepper, paymentKey);
    this.db.exec(`
 CREATE TABLE IF NOT EXISTS kit_settings(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS kit_signer(id INTEGER PRIMARY KEY CHECK(id=1),private_jwk TEXT NOT NULL,public_jwk TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS kit_batches(id TEXT PRIMARY KEY,profile TEXT NOT NULL,created_at INTEGER NOT NULL,actor TEXT NOT NULL,count INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS kit_codes(hash TEXT PRIMARY KEY,batch_id TEXT NOT NULL REFERENCES kit_batches(id),profile TEXT NOT NULL,quota INTEGER NOT NULL,credit_days INTEGER NOT NULL,expires_at INTEGER,revoked INTEGER NOT NULL DEFAULT 0,account_id TEXT REFERENCES users(id),redeemed_at INTEGER);
 CREATE TABLE IF NOT EXISTS kit_grants(code_hash TEXT PRIMARY KEY REFERENCES kit_codes(hash),account_id TEXT NOT NULL REFERENCES users(id),remaining INTEGER NOT NULL CHECK(remaining>=0),expires_at INTEGER,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS kit_limits(account_id TEXT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS build_unlocks(id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES users(id),sequence_hash TEXT NOT NULL,created_at INTEGER NOT NULL,source TEXT NOT NULL,UNIQUE(account_id,sequence_hash));
 CREATE TABLE IF NOT EXISTS build_requests(account_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,sequence_hash TEXT NOT NULL,PRIMARY KEY(account_id,request_key));
 `);
    this.ktx(() => {
      this.db
        .prepare("INSERT OR IGNORE INTO kit_settings VALUES(1,?)")
        .run(JSON.stringify(defaults));
      if (!this.db.prepare("SELECT id FROM kit_signer WHERE id=1").get()) {
        const pair = generateKeyPairSync("ed25519");
        this.db
          .prepare("INSERT INTO kit_signer VALUES(1,?,?)")
          .run(
            JSON.stringify(pair.privateKey.export({ format: "jwk" })),
            JSON.stringify(pair.publicKey.export({ format: "jwk" })),
          );
      }
    });
  }
  private ktx<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  private klog(actor: string, action: string, entity: string) {
    this.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(randomUUID(), actor, action, entity, new Date().toISOString());
  }
  kitPolicy(): KitPolicy {
    return JSON.parse(
      String(
        this.db.prepare("SELECT data FROM kit_settings WHERE id=1").get()!.data,
      ),
    );
  }
  private policy(value: unknown): KitPolicy {
    const p = value as KitPolicy;
    if (
      !p ||
      Object.keys(defaults).some(
        (k) => !Number.isSafeInteger(p[k as keyof KitPolicy]),
      ) ||
      p.quota < 1 ||
      p.quota > 100 ||
      p.codeDays < 0 ||
      p.codeDays > 3650 ||
      p.creditDays < 0 ||
      p.creditDays > 3650 ||
      p.maxKitsPerAccount < 0 ||
      p.maxKitsPerAccount > 1000 ||
      p.buildsPerPeriod < 0 ||
      p.buildsPerPeriod > 10000 ||
      p.periodDays < 1 ||
      p.periodDays > 3650
    )
      throw new DomainError("Invalid kit policy");
    return Object.fromEntries(
      Object.keys(defaults).map((k) => [k, p[k as keyof KitPolicy]]),
    ) as unknown as KitPolicy;
  }
  setKitPolicy(actor: string, value: unknown) {
    const p = this.policy(value);
    return this.ktx(() => {
      this.db
        .prepare("UPDATE kit_settings SET data=? WHERE id=1")
        .run(JSON.stringify(p));
      this.klog(actor, "kit.policy", "default");
      return p;
    });
  }
  setKitLimit(actor: string, accountId: string, value: unknown) {
    const p = this.policy({ ...this.kitPolicy(), ...(value as object) });
    return this.ktx(() => {
      if (!this.db.prepare("SELECT id FROM users WHERE id=?").get(accountId))
        throw new DomainError("Account not found", 404);
      this.db
        .prepare(
          "INSERT INTO kit_limits VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET data=excluded.data",
        )
        .run(accountId, JSON.stringify(p));
      this.klog(actor, "kit.limit", accountId);
      return p;
    });
  }
  private limit(account: string) {
    const r = this.db
      .prepare("SELECT data FROM kit_limits WHERE account_id=?")
      .get(account);
    return r ? (JSON.parse(String(r.data)) as KitPolicy) : this.kitPolicy();
  }
  issueKitBatch(
    actor: string,
    profile: unknown,
    count: unknown,
    requestKey: unknown,
  ) {
    if (
      typeof profile !== "string" ||
      !profile.trim() ||
      profile.length > 100 ||
      !Number.isSafeInteger(count) ||
      Number(count) < 1 ||
      Number(count) > 100 ||
      typeof requestKey !== "string" ||
      !/^[-\w]{8,100}$/.test(requestKey)
    )
      throw new DomainError("Invalid kit batch");
    // Batch ID is idempotent; plaintext codes are deliberately never retained. A lost response must be revoked/reissued explicitly.
    return this.ktx(() => {
      const id = `kit-${this.digest(actor + ":" + requestKey)}`,
        existing = this.db
          .prepare("SELECT id FROM kit_batches WHERE id=?")
          .get(id);
      if (existing)
        throw new DomainError(
          "Batch already issued; plaintext codes cannot be recovered. Inspect and revoke that batch before reissuing.",
          409,
        );
      const p = this.kitPolicy(),
        now = Date.now(),
        codes = [];
      this.db
        .prepare("INSERT INTO kit_batches VALUES(?,?,?,?,?)")
        .run(id, profile.trim(), now, actor, Number(count));
      for (let j = 0; j < Number(count); j++) {
        const code = randomBytes(24).toString("base64url"),
          expiresAt = p.codeDays ? now + p.codeDays * 86400000 : null;
        this.db
          .prepare(
            "INSERT INTO kit_codes(hash,batch_id,profile,quota,credit_days,expires_at) VALUES(?,?,?,?,?,?)",
          )
          .run(
            this.digest(code),
            id,
            profile.trim(),
            p.quota,
            p.creditDays,
            expiresAt,
          );
        codes.push({
          code,
          quota: p.quota,
          expiresAt,
          creditDays: p.creditDays,
        });
      }
      this.klog(actor, "kit.batch", id);
      return { id, profile: profile.trim(), codes };
    });
  }
  isKitCode(code: unknown) {
    return (
      typeof code === "string" &&
      Boolean(
        this.db
          .prepare("SELECT hash FROM kit_codes WHERE hash=?")
          .get(this.digest(code)),
      )
    );
  }
  private claim(account: string, code: string, now = Date.now()) {
    const h = this.digest(code),
      r = this.db.prepare("SELECT * FROM kit_codes WHERE hash=?").get(h);
    if (!r || r.revoked) throw new DomainError("Kit code unavailable", 403);
    if (r.account_id) {
      if (r.account_id !== account)
        throw new DomainError("Kit belongs to another account", 409);
      return {
        profile: String(r.profile),
        duplicate: true,
        balance: this.kitBalance(account),
      };
    }
    if (r.expires_at !== null && Number(r.expires_at) <= now)
      throw new DomainError("Kit code expired", 403);
    const limit = this.limit(account),
      count = Number(
        this.db
          .prepare("SELECT COUNT(*) AS n FROM kit_codes WHERE account_id=?")
          .get(account)!.n,
      );
    if (limit.maxKitsPerAccount && count >= limit.maxKitsPerAccount)
      throw new DomainError("Account kit limit reached", 403);
    this.db
      .prepare("UPDATE kit_codes SET account_id=?,redeemed_at=? WHERE hash=?")
      .run(account, now, h);
    this.db
      .prepare("INSERT INTO kit_grants VALUES(?,?,?,?,?)")
      .run(
        h,
        account,
        Number(r.quota),
        Number(r.credit_days) ? now + Number(r.credit_days) * 86400000 : null,
        now,
      );
    this.db
      .prepare("UPDATE users SET role='maker' WHERE id=? AND role='guest'")
      .run(account);
    this.klog(account, "kit.redeem", h);
    return {
      profile: String(r.profile),
      duplicate: false,
      balance: this.kitBalance(account),
    };
  }
  redeemKit(account: string, code: unknown) {
    if (typeof code !== "string" || code.length > 100)
      throw new DomainError("Kit code unavailable", 403);
    return this.ktx(() => this.claim(account, code));
  }
  loginKit(code: unknown, currentAccount?: string) {
    if (typeof code !== "string" || !/^[-\w]{32}$/.test(code))
      throw new DomainError("Kit code unavailable", 401);
    return this.ktx(() => {
      const r = this.db
        .prepare("SELECT account_id,revoked FROM kit_codes WHERE hash=?")
        .get(this.digest(code));
      if (!r || r.revoked) throw new DomainError("Kit code unavailable", 401);
      const account = r.account_id
        ? String(r.account_id)
        : (currentAccount ?? randomUUID());
      if (!r.account_id && !currentAccount)
        this.db
          .prepare("INSERT INTO users VALUES(?,?,?)")
          .run(account, "maker", new Date().toISOString());
      this.claim(account, code);
      const token = randomBytes(32).toString("base64url");
      this.db
        .prepare("INSERT INTO sessions VALUES(?,?,?)")
        .run(this.digest(token), account, Date.now() + 7 * 86400000);
      this.klog(account, "kit.login", this.digest(code));
      return { id: account, token, credits: this.kitBalance(account) };
    });
  }
  kitBalance(account: string, now = Date.now()) {
    return (
      super.balance(account) +
      Number(
        this.db
          .prepare(
            "SELECT COALESCE(SUM(remaining),0) AS n FROM kit_grants WHERE account_id=? AND (expires_at IS NULL OR expires_at>?)",
          )
          .get(account, now)!.n,
      )
    );
  }
  override customer(account: string) {
    return { ...super.customer(account), credits: this.kitBalance(account) };
  }
  kitAccount(account: string) {
    return {
      id: account,
      credits: this.kitBalance(account),
      grants: this.db
        .prepare(
          "SELECT remaining,expires_at FROM kit_grants WHERE account_id=? ORDER BY created_at DESC",
        )
        .all(account),
      unlocks: this.db
        .prepare(
          "SELECT sequence_hash,created_at FROM build_unlocks WHERE account_id=? ORDER BY created_at DESC LIMIT 200",
        )
        .all(account),
      limits: this.limit(account),
    };
  }
  kitAdmin() {
    return {
      policy: this.kitPolicy(),
      codes: this.db
        .prepare(
          "SELECT hash,batch_id,profile,quota,credit_days,expires_at,revoked,account_id,redeemed_at FROM kit_codes ORDER BY rowid DESC LIMIT 500",
        )
        .all(),
      accounts: this.db
        .prepare(
          "SELECT account_id,COUNT(*) AS builds,MAX(created_at) AS last_build FROM build_unlocks GROUP BY account_id ORDER BY last_build DESC LIMIT 200",
        )
        .all(),
    };
  }
  revokeKitBatch(actor: string, id: string) {
    return this.ktx(() => {
      const n = this.db
        .prepare("UPDATE kit_codes SET revoked=1 WHERE batch_id=?")
        .run(id);
      this.klog(actor, "kit.batch.revoke", id);
      return { revoked: Number(n.changes) };
    });
  }
  buildKey() {
    return JSON.parse(
      String(
        this.db.prepare("SELECT public_jwk FROM kit_signer WHERE id=1").get()!
          .public_jwk,
      ),
    );
  }
  unlockBuild(
    account: string,
    sequenceHash: unknown,
    deviceId: unknown,
    requestKey: unknown,
  ) {
    if (
      typeof sequenceHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(sequenceHash) ||
      typeof deviceId !== "string" ||
      !/^[-\w]{16,80}$/.test(deviceId) ||
      typeof requestKey !== "string" ||
      !/^[-\w]{8,100}$/.test(requestKey)
    )
      throw new DomainError("Invalid build unlock");
    return this.ktx(() => {
      const prior = this.db
        .prepare(
          "SELECT sequence_hash FROM build_requests WHERE account_id=? AND request_key=?",
        )
        .get(account, requestKey);
      if (prior && prior.sequence_hash !== sequenceHash)
        throw new DomainError("Unlock request key reused", 409);
      let unlock = this.db
        .prepare(
          "SELECT id,created_at FROM build_unlocks WHERE account_id=? AND sequence_hash=?",
        )
        .get(account, sequenceHash);
      const duplicate = Boolean(unlock),
        now = Date.now();
      if (!unlock) {
        const limit = this.limit(account),
          used = Number(
            this.db
              .prepare(
                "SELECT COUNT(*) AS n FROM build_unlocks WHERE account_id=? AND created_at>?",
              )
              .get(account, now - limit.periodDays * 86400000)!.n,
          );
        if (limit.buildsPerPeriod && used >= limit.buildsPerPeriod)
          throw new DomainError("Account build period limit reached", 403);
        const grant = this.db
          .prepare(
            "SELECT code_hash FROM kit_grants WHERE account_id=? AND remaining>0 AND (expires_at IS NULL OR expires_at>?) ORDER BY expires_at IS NULL,expires_at,created_at,code_hash LIMIT 1",
          )
          .get(account, now);
        let source: string;
        if (grant) {
          source = String(grant.code_hash);
          this.db
            .prepare(
              "UPDATE kit_grants SET remaining=remaining-1 WHERE code_hash=? AND remaining>0",
            )
            .run(source);
        } else {
          if (super.balance(account) < 1)
            throw new DomainError("Enter a kit code to unlock this build", 402);
          source = "legacy-credit";
          this.db
            .prepare("INSERT INTO credit_ledger VALUES(?,?,?,?,?,?)")
            .run(
              randomUUID(),
              account,
              -1,
              "build-unlock",
              `build:${account}:${sequenceHash}`,
              new Date(now).toISOString(),
            );
        }
        unlock = { id: randomUUID(), created_at: now };
        this.db
          .prepare("INSERT INTO build_unlocks VALUES(?,?,?,?,?)")
          .run(String(unlock.id), account, sequenceHash, now, source);
        this.klog(account, "build.unlock", String(unlock.id));
      }
      this.db
        .prepare("INSERT OR IGNORE INTO build_requests VALUES(?,?,?)")
        .run(account, requestKey, sequenceHash);
      const payload = {
          version: "iprasm.build-access/1",
          accountId: account,
          sequenceHash,
          deviceId,
          unlockId: String(unlock.id),
          issuedAt: Number(unlock.created_at),
        },
        privateKey = createPrivateKey({
          key: JSON.parse(
            String(
              this.db
                .prepare("SELECT private_jwk FROM kit_signer WHERE id=1")
                .get()!.private_jwk,
            ),
          ),
          format: "jwk",
        }),
        signature = sign(
          null,
          Buffer.from(JSON.stringify(payload)),
          privateKey,
        ).toString("base64url");
      return {
        receipt: { payload, signature },
        duplicate,
        credits: this.kitBalance(account),
        publicKey: this.buildKey(),
      };
    });
  }
}
