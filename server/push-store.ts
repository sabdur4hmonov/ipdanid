import {
  randomBytes,
  randomUUID,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import type { CustomerStore } from "./customer-store";
import type { Announcement } from "../src/business-types";
import { DomainError } from "./store";
import { PushFailure, type PushAdapter } from "./fcm-adapter";
const locales = ["uz", "uz-Cyrl", "ru", "en"],
  uuid =
    /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  secret = /^[a-zA-Z0-9_-]{32,100}$/;
function object(input: unknown, allowed: string[]) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => !allowed.includes(k))
  )
    throw new DomainError("Invalid push request");
  return input as Record<string, unknown>;
}
export class PushStore {
  private key: Buffer;
  private pumping = false;
  constructor(
    private store: CustomerStore,
    pepper: string,
    readonly adapter: PushAdapter,
    private announcement: (id: string) => Announcement | undefined,
  ) {
    if (pepper.length < 32) throw Error("Push storage key required");
    this.key = createHash("sha256")
      .update("iprasm-push/1:" + pepper)
      .digest();
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS push_devices(id TEXT PRIMARY KEY,secret_hash TEXT NOT NULL,account_id TEXT NOT NULL REFERENCES users(id),token_hash TEXT NOT NULL UNIQUE,cipher TEXT NOT NULL,platform TEXT NOT NULL,locale TEXT NOT NULL,promotions INTEGER NOT NULL,active INTEGER NOT NULL,updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS push_batches(id TEXT PRIMARY KEY,actor TEXT NOT NULL,request_key TEXT NOT NULL,payload TEXT NOT NULL,announcement_id TEXT NOT NULL,revision INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(actor,request_key));
      CREATE TABLE IF NOT EXISTS push_deliveries(id TEXT PRIMARY KEY,batch_id TEXT NOT NULL REFERENCES push_batches(id),device_id TEXT NOT NULL REFERENCES push_devices(id),account_id TEXT NOT NULL,token_hash TEXT NOT NULL,state TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,due_at INTEGER NOT NULL,lease_until INTEGER NOT NULL DEFAULT 0,lease_tag TEXT NOT NULL DEFAULT '',provider_id TEXT,UNIQUE(batch_id,device_id));
      CREATE INDEX IF NOT EXISTS push_due ON push_deliveries(state,due_at);`);
  }
  private tx<T>(fn: () => T) {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const v = fn();
      this.store.db.exec("COMMIT");
      return v;
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
  }
  private encrypt(value: string) {
    const iv = randomBytes(12),
      c = createCipheriv("aes-256-gcm", this.key, iv),
      body = Buffer.concat([c.update(value, "utf8"), c.final()]);
    return [iv, c.getAuthTag(), body]
      .map((b) => b.toString("base64url"))
      .join(".");
  }
  private decrypt(value: string) {
    const [iv, tag, body] = value
        .split(".")
        .map((v) => Buffer.from(v, "base64url")),
      d = createDecipheriv("aes-256-gcm", this.key, iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(body), d.final()]).toString("utf8");
  }
  register(account: string, input: unknown, now = Date.now()) {
    if (this.adapter.mode === "disabled")
      throw new DomainError(
        "Push is not configured; in-app announcements remain available",
        409,
      );
    const b = object(input, [
      "installationId",
      "installationSecret",
      "token",
      "platform",
      "locale",
      "promotions",
      "consent",
    ]);
    if (
      typeof b.installationId !== "string" ||
      !uuid.test(b.installationId) ||
      typeof b.installationSecret !== "string" ||
      !secret.test(b.installationSecret) ||
      typeof b.token !== "string" ||
      b.token.length < 20 ||
      b.token.length > 4096 ||
      !/^[A-Za-z0-9_:.-]+$/.test(b.token) ||
      !["android", "ios", "web"].includes(String(b.platform)) ||
      !locales.includes(String(b.locale)) ||
      typeof b.promotions !== "boolean" ||
      b.consent !== true
    )
      throw new DomainError("Invalid push registration");
    const id = b.installationId,
      ownerProof = this.store.digest("push-install:" + b.installationSecret),
      tokenHash = this.store.digest("push-token:" + b.token);
    return this.tx(() => {
      const old = this.store.db
        .prepare("SELECT secret_hash FROM push_devices WHERE id=?")
        .get(id);
      if (old && old.secret_hash !== ownerProof)
        throw new DomainError("Push installation ownership required", 403);
      const collision = this.store.db
        .prepare("SELECT id FROM push_devices WHERE token_hash=? AND id<>?")
        .get(tokenHash, id);
      if (collision)
        throw new DomainError(
          "Push registration already belongs to an installation",
          409,
        );
      const count = this.store.db
        .prepare(
          "SELECT count(*) n FROM push_devices WHERE account_id=? AND active=1 AND id<>?",
        )
        .get(account, id)!;
      if (Number(count.n) >= 10)
        throw new DomainError("Too many push installations", 409);
      this.store.db
        .prepare(
          "INSERT INTO push_devices VALUES(?,?,?,?,?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET account_id=excluded.account_id,token_hash=excluded.token_hash,cipher=excluded.cipher,platform=excluded.platform,locale=excluded.locale,promotions=excluded.promotions,active=1,updated_at=excluded.updated_at",
        )
        .run(
          id,
          ownerProof,
          account,
          tokenHash,
          this.encrypt(b.token as string),
          String(b.platform),
          String(b.locale),
          b.promotions ? 1 : 0,
          now,
        );
      return { registered: true, installationId: id };
    });
  }
  list(account: string) {
    return this.store.db
      .prepare(
        "SELECT id,platform,locale,promotions,active,updated_at FROM push_devices WHERE account_id=? ORDER BY updated_at DESC LIMIT 20",
      )
      .all(account);
  }
  revoke(account: string, input: unknown) {
    const b = object(input, ["installationId", "installationSecret"]);
    if (
      typeof b.installationId !== "string" ||
      !uuid.test(b.installationId) ||
      typeof b.installationSecret !== "string" ||
      !secret.test(b.installationSecret)
    )
      throw new DomainError("Invalid push request");
    const r = this.store.db
      .prepare("SELECT secret_hash,account_id FROM push_devices WHERE id=?")
      .get(b.installationId);
    if (
      !r ||
      r.account_id !== account ||
      r.secret_hash !==
        this.store.digest("push-install:" + b.installationSecret)
    )
      throw new DomainError("Push installation ownership required", 403);
    this.store.db
      .prepare("UPDATE push_devices SET active=0,cipher='' WHERE id=?")
      .run(b.installationId);
    return { revoked: true };
  }
  revokeAccount(account: string) {
    this.store.db
      .prepare("UPDATE push_devices SET active=0,cipher='' WHERE account_id=?")
      .run(account);
  }
  enqueue(actor: string, input: unknown, now = Date.now()) {
    const b = object(input, ["announcementId", "requestKey"]);
    if (
      typeof b.announcementId !== "string" ||
      !uuid.test(b.announcementId) ||
      typeof b.requestKey !== "string" ||
      !uuid.test(b.requestKey)
    )
      throw new DomainError("Invalid push request");
    const a = this.announcement(b.announcementId);
    if (!a || !a.active || a.endsAt <= now)
      throw new DomainError("Announcement is not available", 409);
    if (this.adapter.mode === "disabled")
      throw new DomainError(
        "Push is not configured; in-app announcements remain available",
        409,
      );
    const payload = JSON.stringify({ id: a.id, revision: a.revision });
    return this.tx(() => {
      const old = this.store.db
        .prepare(
          "SELECT id,payload FROM push_batches WHERE actor=? AND request_key=?",
        )
        .get(actor, b.requestKey as string);
      if (old) {
        if (old.payload !== payload)
          throw new DomainError("Push request changed", 409);
        return { batchId: old.id, duplicate: true };
      }
      const id = randomUUID();
      this.store.db
        .prepare("INSERT INTO push_batches VALUES(?,?,?,?,?,?,?)")
        .run(id, actor, b.requestKey as string, payload, a.id, a.revision, now);
      const devices = this.store.db
        .prepare(
          "SELECT id,account_id,token_hash FROM push_devices WHERE active=1 AND updated_at>? AND (?='news' OR promotions=1) LIMIT 10000",
        )
        .all(now - 90 * 86400000, a.kind);
      for (const d of devices)
        this.store.db
          .prepare(
            "INSERT INTO push_deliveries(id,batch_id,device_id,account_id,token_hash,state,due_at) VALUES(?,?,?,?,?,'queued',?)",
          )
          .run(
            randomUUID(),
            id,
            d.id,
            d.account_id,
            d.token_hash,
            Math.max(now, a.startsAt),
          );
      this.store.db
        .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
        .run(
          randomUUID(),
          actor,
          "push.enqueue",
          id,
          new Date(now).toISOString(),
        );
      return {
        batchId: id,
        queued: devices.length,
        mock: this.adapter.mode === "mock",
      };
    });
  }
  status() {
    return {
      mode: this.adapter.mode,
      counts: this.store.db
        .prepare(
          "SELECT state,count(*) count FROM push_deliveries GROUP BY state",
        )
        .all(),
    };
  }
  async drain(at?: number, limit = 10) {
    if (this.pumping || this.adapter.mode === "disabled") return;
    this.pumping = true;
    try {
      for (let j = 0; j < Math.min(20, limit); j++) {
        const now = at ?? Date.now();
        this.store.db
          .prepare(
            "UPDATE push_devices SET active=0,cipher='' WHERE updated_at<=? AND active=1",
          )
          .run(now - 90 * 86400000);
        const job = this.tx(() => {
          this.store.db
            .prepare(
              "UPDATE push_deliveries SET state='queued' WHERE state='sending' AND lease_until<=? AND attempts<5",
            )
            .run(now);
          this.store.db
            .prepare(
              "UPDATE push_deliveries SET state='failed' WHERE state IN ('sending','queued') AND attempts>=5 AND lease_until<=?",
            )
            .run(now);
          const r = this.store.db
            .prepare(
              "SELECT d.*,b.announcement_id,b.revision FROM push_deliveries d JOIN push_batches b ON b.id=d.batch_id WHERE d.state='queued' AND d.due_at<=? AND d.attempts<5 ORDER BY d.due_at LIMIT 1",
            )
            .get(now);
          if (!r) return undefined;
          const lease = randomUUID();
          this.store.db
            .prepare(
              "UPDATE push_deliveries SET state='sending',attempts=attempts+1,lease_until=?,lease_tag=? WHERE id=?",
            )
            .run(now + 60000, lease, r.id);
          return { ...r, lease } as Record<string, any> & { lease: string };
        });
        if (!job) break;
        const device = this.store.db
            .prepare("SELECT * FROM push_devices WHERE id=?")
            .get(job.device_id as string),
          a = this.announcement(String(job.announcement_id));
        let state = "cancelled",
          provider = "",
          retryAt = now;
        if (
          device?.active &&
          device.account_id === job.account_id &&
          device.token_hash === job.token_hash &&
          Number(device.updated_at) > now - 90 * 86400000 &&
          a?.active &&
          a.revision === Number(job.revision) &&
          a.startsAt <= now &&
          a.endsAt > now &&
          (a.kind === "news" || device.promotions)
        ) {
          try {
            const m = await this.adapter.send({
              token: this.decrypt(String(device.cipher)),
              title: [...a.title].slice(0, 80).join(""),
              body: [...a.body].slice(0, 500).join(""),
              tag: a.id + "-" + a.revision,
              ttl: Math.max(
                1,
                Math.min(21600, Math.floor((a.endsAt - now) / 1000)),
              ),
            });
            state = this.adapter.mode === "mock" ? "mock_sent" : "sent";
            provider = m.id;
          } catch (e) {
            const f = e instanceof PushFailure ? e : new PushFailure(true);
            if (f.invalidToken)
              this.store.db
                .prepare(
                  "UPDATE push_devices SET active=0,cipher='' WHERE id=? AND token_hash=?",
                )
                .run(device.id, job.token_hash);
            state =
              f.retryable && Number(job.attempts) < 4 ? "queued" : "failed";
            retryAt =
              now +
              Math.min(
                3600000,
                Math.max(f.retryAfterMs, 60000 * 2 ** Number(job.attempts)),
              );
          }
        }
        this.store.db
          .prepare(
            "UPDATE push_deliveries SET state=?,due_at=?,provider_id=?,lease_until=0,lease_tag='' WHERE id=? AND lease_tag=? AND state='sending'",
          )
          .run(state, retryAt, provider || null, job.id as string, job.lease);
      }
    } finally {
      this.pumping = false;
    }
  }
}
