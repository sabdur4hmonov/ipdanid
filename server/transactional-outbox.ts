import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from "node:crypto";
import type { CustomerStore } from "./customer-store";
import { DomainError } from "./store";
import {
  EmailFailure,
  type EmailAdapter,
  type EmailEnvelope,
} from "./email-adapter";
import { transactionalCopy } from "../src/transactional-copy";
import {
  TRANSACTIONAL_KINDS,
  type TransactionalKind,
  type TransactionalPayload,
  type InboxMessage,
  type MailPreferences,
} from "../src/transactional-types";
import type { Locale } from "../src/core/types";
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const locales = ["uz", "uz-Cyrl", "ru", "en"];
const exact = (v: unknown, keys: string) => {
  if (
    !v ||
    typeof v !== "object" ||
    Array.isArray(v) ||
    Object.keys(v).sort().join() !== keys
  )
    throw new DomainError("Invalid message fields");
};
type Job = {
  id: string;
  user_id: string;
  kind: TransactionalKind;
  entity_id: string;
  payload: string;
  locale: Locale;
  copy_version: string;
  created_at: number;
  read_at: number;
  state: string;
  mode: string;
  attempts: number;
  polls: number;
  due_at: number;
  lease_until: number;
  lease_tag: string;
  consent_revision: number;
  cipher: string;
  provider_id: string | null;
  first_attempt: number;
  error_code: string;
};
export class TransactionalOutbox {
  private key: Buffer;
  private pumping = false;
  private stopped = false;
  constructor(
    private store: CustomerStore,
    pepper: string,
    readonly adapter: EmailAdapter,
    readonly retentionDays = 90,
  ) {
    if (
      pepper.length < 32 ||
      !Number.isInteger(retentionDays) ||
      retentionDays < 7 ||
      retentionDays > 365
    )
      throw Error("Invalid outbox configuration");
    this.key = createHash("sha256")
      .update("iprasm-transactional-outbox/1:" + pepper)
      .digest();
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS mail_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id),revision INTEGER NOT NULL,locale TEXT NOT NULL,email_opt_in INTEGER NOT NULL,consent_revision INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS notification_blocks(user_id TEXT PRIMARY KEY);
   CREATE TABLE IF NOT EXISTS transactional_outbox(id TEXT PRIMARY KEY,event_key TEXT NOT NULL UNIQUE,user_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,entity_id TEXT NOT NULL,payload TEXT NOT NULL,locale TEXT NOT NULL,copy_version TEXT NOT NULL,created_at INTEGER NOT NULL,read_at INTEGER NOT NULL DEFAULT 0,state TEXT NOT NULL,mode TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,polls INTEGER NOT NULL DEFAULT 0,due_at INTEGER NOT NULL,lease_until INTEGER NOT NULL DEFAULT 0,lease_tag TEXT NOT NULL DEFAULT '',consent_revision INTEGER NOT NULL,cipher TEXT NOT NULL DEFAULT '',provider_id TEXT,first_attempt INTEGER NOT NULL DEFAULT 0,error_code TEXT NOT NULL DEFAULT '');
   CREATE INDEX IF NOT EXISTS transactional_outbox_due ON transactional_outbox(state,due_at);
   CREATE INDEX IF NOT EXISTS transactional_outbox_owner ON transactional_outbox(user_id,created_at);`);
    const previous = store.transactionalEvent;
    store.transactionalEvent = (kind, id, revision) => {
      previous?.(kind, id, revision);
      this.enqueue(kind, id, revision);
    };
  }
  private tx<T>(fn: () => T) {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.store.db.exec("COMMIT");
      return value;
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
  }
  private encrypt(value: EmailEnvelope) {
    const iv = randomBytes(12),
      c = createCipheriv("aes-256-gcm", this.key, iv),
      body = Buffer.concat([
        c.update(JSON.stringify(value), "utf8"),
        c.final(),
      ]);
    return [iv, c.getAuthTag(), body]
      .map((v) => v.toString("base64url"))
      .join(".");
  }
  private decrypt(value: string): EmailEnvelope {
    const [iv, tag, body] = value
        .split(".")
        .map((v) => Buffer.from(v, "base64url")),
      d = createDecipheriv("aes-256-gcm", this.key, iv);
    d.setAuthTag(tag);
    return JSON.parse(
      Buffer.concat([d.update(body), d.final()]).toString("utf8"),
    );
  }
  private pref(user: string) {
    return this.store.db
      .prepare("SELECT * FROM mail_preferences WHERE user_id=?")
      .get(user);
  }
  private account(user: string) {
    const row = this.store.db
      .prepare(
        "SELECT u.role,a.email FROM users u LEFT JOIN accounts a ON a.user_id=u.id WHERE u.id=?",
      )
      .get(user);
    if (
      !row ||
      this.store.db
        .prepare("SELECT 1 FROM notification_blocks WHERE user_id=?")
        .get(user)
    )
      throw new DomainError("Account unavailable", 403);
    return row;
  }
  preferences(user: string): MailPreferences {
    const account = this.account(user),
      p = this.pref(user);
    return {
      revision: Number(p?.revision ?? 0),
      locale: (p?.locale ?? "uz") as Locale,
      emailOptIn: p?.email_opt_in === 1,
      emailAvailable: account.role === "maker" && !!account.email,
      configured: this.adapter.mode !== "disabled",
      mock: this.adapter.mode === "mock",
    };
  }
  savePreferences(user: string, input: unknown) {
    exact(input, "emailOptIn,locale,revision");
    const v = input as {
      emailOptIn: boolean;
      locale: Locale;
      revision: number;
    };
    if (
      typeof v.emailOptIn !== "boolean" ||
      !locales.includes(v.locale) ||
      !Number.isSafeInteger(v.revision) ||
      v.revision < 0
    )
      throw new DomainError("Invalid message preferences");
    return this.tx(() => {
      const account = this.account(user),
        old = this.pref(user);
      if (Number(old?.revision ?? 0) !== v.revision)
        throw new DomainError("Message preferences changed", 409);
      if (
        v.emailOptIn &&
        (account.role !== "maker" ||
          !account.email ||
          this.adapter.mode === "disabled")
      )
        throw new DomainError(
          "Email account and configured service required",
          409,
        );
      const consent =
        Number(old?.consent_revision ?? 0) +
        (Boolean(old?.email_opt_in) !== v.emailOptIn ? 1 : 0);
      this.store.db
        .prepare(
          "INSERT INTO mail_preferences VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,locale=excluded.locale,email_opt_in=excluded.email_opt_in,consent_revision=excluded.consent_revision",
        )
        .run(user, v.revision + 1, v.locale, v.emailOptIn ? 1 : 0, consent);
      if (!v.emailOptIn)
        this.store.db
          .prepare(
            "UPDATE transactional_outbox SET state=CASE WHEN state='sending' THEN 'unknown' ELSE 'cancelled' END,cipher='',lease_tag='',lease_until=0,error_code='opted-out' WHERE user_id=? AND state IN ('queued','sending','unknown') AND provider_id IS NULL",
          )
          .run(user);
      this.store.db
        .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
        .run(
          randomUUID(),
          user,
          "mail.preferences",
          user,
          new Date().toISOString(),
        );
      return this.preferences(user);
    });
  }
  private enqueue(kind: TransactionalKind, sourceId: string, revision = 1) {
    if (!this.store.db.isTransaction)
      throw Error("Outbox enqueue requires the domain transaction");
    if (
      !TRANSACTIONAL_KINDS.includes(kind) ||
      !uuid(sourceId) ||
      !Number.isSafeInteger(revision) ||
      revision < 1
    )
      throw new DomainError("Invalid transactional event");
    let user: string,
      entityId = sourceId;
    const payload: TransactionalPayload = { reference: sourceId };
    if (kind.startsWith("order-")) {
      const o = this.store.db
        .prepare(
          "SELECT user_id,status,total_minor,currency FROM orders WHERE id=?",
        )
        .get(sourceId);
      if (!o) throw Error("Outbox order not found");
      const states: Partial<Record<TransactionalKind, string>> = {
        "order-created": "pending",
        "order-paid": "paid",
        "order-cancelled": "cancelled",
        "order-sent": "fulfilled",
        "order-return-requested": "return_requested",
        "order-refunded": "refunded",
      };
      if (o.status !== states[kind])
        throw Error("Transactional order state differs");
      user = String(o.user_id);
      payload.amountMinor = Number(o.total_minor);
      payload.currency = String(o.currency);
    } else if (kind === "support-replied") {
      const r = this.store.db
        .prepare(
          "SELECT t.user_id,t.id FROM ticket_replies r JOIN tickets t ON t.id=r.ticket_id WHERE r.id=?",
        )
        .get(sourceId);
      if (!r) throw Error("Outbox support reply not found");
      user = String(r.user_id);
      entityId = String(r.id);
      payload.reference = entityId;
    } else {
      const row = this.store.db
        .prepare("SELECT buyer_id,data FROM commissions WHERE id=?")
        .get(sourceId);
      if (!row) throw Error("Outbox commission not found");
      const data = JSON.parse(String(row.data)),
        expected =
          kind === "commission-approved"
            ? "approved"
            : kind === "commission-declined"
              ? "rejected"
              : kind === "commission-making"
                ? "making"
                : "ready";
      if (
        data.revision !== revision ||
        (kind === "commission-approved" || kind === "commission-declined"
          ? data.state
          : data.production) !== expected
      )
        throw Error("Transactional commission state differs");
      user = String(row.buyer_id);
    }
    if (
      this.store.db
        .prepare("SELECT 1 FROM notification_blocks WHERE user_id=?")
        .get(user)
    )
      return;
    const eventKey =
      "transactional/1:" + kind + ":" + sourceId + ":" + revision;
    if (
      this.store.db
        .prepare("SELECT id FROM transactional_outbox WHERE event_key=?")
        .get(eventKey)
    )
      return;
    const now = Date.now(),
      p = this.pref(user),
      locale = (p?.locale ?? "uz") as Locale,
      account = this.store.db
        .prepare("SELECT email FROM accounts WHERE user_id=?")
        .get(user),
      id = randomUUID(),
      copy = transactionalCopy("transactional-copy/1", locale, kind, payload);
    const recent = Number(
      this.store.db
        .prepare(
          "SELECT COUNT(*) n FROM transactional_outbox WHERE user_id=? AND mode IN ('resend','mock') AND created_at>?",
        )
        .get(user, now - 86400000)?.n,
    );
    const external =
      this.adapter.mode !== "disabled" &&
      p?.email_opt_in === 1 &&
      !!account?.email &&
      recent < 20;
    const cipher = external
      ? this.encrypt({
          from: this.adapter.sender,
          to: [String(account!.email)],
          subject: "Ip Rasm · " + copy.title,
          text: copy.body,
        })
      : "";
    this.store.db
      .prepare(
        "INSERT INTO transactional_outbox(id,event_key,user_id,kind,entity_id,payload,locale,copy_version,created_at,state,mode,due_at,consent_revision,cipher) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        eventKey,
        user,
        kind,
        entityId,
        JSON.stringify(payload),
        locale,
        "transactional-copy/1",
        now,
        external ? "queued" : "in_app",
        external ? this.adapter.mode : "disabled",
        now,
        Number(p?.consent_revision ?? 0),
        cipher,
      );
  }
  private dto(job: Job, locale: Locale = job.locale): InboxMessage {
    const copy = transactionalCopy(
      job.copy_version,
      locale,
      job.kind,
      JSON.parse(job.payload),
    );
    return {
      id: job.id,
      kind: job.kind,
      entityId: job.entity_id,
      createdAt: job.created_at,
      read: job.read_at > 0,
      ...copy,
      state: job.state,
      mock: job.mode === "mock",
    };
  }
  inbox(user: string, locale: Locale = "uz") {
    this.account(user);
    if (!locales.includes(locale))
      throw new DomainError("Invalid inbox locale");
    return (
      this.store.db
        .prepare(
          "SELECT * FROM transactional_outbox WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100",
        )
        .all(user) as unknown as Job[]
    ).map((r) => this.dto(r, locale));
  }
  read(user: string, id: unknown) {
    this.account(user);
    if (
      !uuid(id) ||
      !this.store.db
        .prepare("SELECT id FROM transactional_outbox WHERE id=? AND user_id=?")
        .get(id, user)
    )
      throw new DomainError("Message not found", 404);
    this.store.db
      .prepare(
        "UPDATE transactional_outbox SET read_at=CASE WHEN read_at=0 THEN ? ELSE read_at END WHERE id=? AND user_id=?",
      )
      .run(Date.now(), id, user);
    return { read: true };
  }
  private canRetry(r: Job, now = Date.now()) {
    if (this.adapter.mode === "disabled" || r.mode !== this.adapter.mode)
      return false;
    if (r.provider_id)
      return (
        ["accepted", "unknown"].includes(r.state) &&
        r.polls < 20 &&
        now - r.created_at < 48 * 3600000
      );
    const p = this.pref(r.user_id);
    return (
      ["queued", "unknown"].includes(r.state) &&
      !!r.cipher &&
      r.attempts < 5 &&
      p?.email_opt_in === 1 &&
      p.consent_revision === r.consent_revision &&
      now - (r.first_attempt || r.created_at) < 23 * 3600000 &&
      !this.store.db
        .prepare("SELECT 1 FROM notification_blocks WHERE user_id=?")
        .get(r.user_id)
    );
  }
  admin() {
    return {
      mode: this.adapter.mode,
      counts: this.store.db
        .prepare(
          "SELECT state,COUNT(*) count FROM transactional_outbox GROUP BY state",
        )
        .all(),
      messages: (
        this.store.db
          .prepare(
            "SELECT * FROM transactional_outbox ORDER BY created_at DESC,id DESC LIMIT 100",
          )
          .all() as unknown as Job[]
      ).map((job) => ({
        ...this.dto(job),
        attempts: job.attempts,
        polls: job.polls,
        dueAt: job.due_at,
        error: job.error_code,
        canRetry: this.canRetry(job),
      })),
    };
  }
  retry(id: unknown, now = Date.now(), actor = "system") {
    if (!uuid(id)) throw new DomainError("Message not found", 404);
    return this.tx(() => {
      const r = this.store.db
        .prepare("SELECT * FROM transactional_outbox WHERE id=?")
        .get(id) as unknown as Job | undefined;
      if (!r) throw new DomainError("Message not found", 404);
      if (this.adapter.mode === "disabled" || r.mode !== this.adapter.mode)
        throw new DomainError("Email service unavailable", 409);
      if (!this.canRetry(r, now))
        throw new DomainError(
          r.provider_id
            ? "Delivery cannot be checked again"
            : "Safe retry window or consent is no longer valid; use the in-app inbox",
          409,
        );
      if (r.provider_id) {
        if (!["accepted", "unknown"].includes(r.state) || r.polls >= 20)
          throw new DomainError("Delivery cannot be checked again", 409);
        this.store.db
          .prepare(
            "UPDATE transactional_outbox SET state='accepted',due_at=? WHERE id=?",
          )
          .run(now, id);
        this.store.db
          .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
          .run(
            randomUUID(),
            actor,
            "mail.check-status",
            id,
            new Date(now).toISOString(),
          );
        return { queued: false, checking: true };
      }
      const p = this.pref(r.user_id);
      if (
        !["queued", "unknown"].includes(r.state) ||
        !r.cipher ||
        r.attempts >= 5 ||
        !p?.email_opt_in ||
        p.consent_revision !== r.consent_revision ||
        now - (r.first_attempt || r.created_at) >= 23 * 3600000
      )
        throw new DomainError(
          "Safe retry window or consent is no longer valid; use the in-app inbox",
          409,
        );
      this.store.db
        .prepare(
          "UPDATE transactional_outbox SET state='queued',due_at=? WHERE id=?",
        )
        .run(now, id);
      this.store.db
        .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
        .run(
          randomUUID(),
          actor,
          "mail.retry",
          id,
          new Date(now).toISOString(),
        );
      return { queued: true, checking: false };
    });
  }
  stop() {
    this.stopped = true;
  }
  eraseAccount(user: string) {
    this.store.db
      .prepare("INSERT OR IGNORE INTO notification_blocks VALUES(?)")
      .run(user);
    this.store.db
      .prepare("DELETE FROM transactional_outbox WHERE user_id=?")
      .run(user);
    this.store.db
      .prepare("DELETE FROM mail_preferences WHERE user_id=?")
      .run(user);
  }
  prune(now = Date.now()) {
    this.store.db
      .prepare(
        "UPDATE transactional_outbox SET cipher='',state=CASE WHEN state IN ('queued','sending') THEN 'unknown' ELSE state END,error_code=CASE WHEN state IN ('queued','sending') THEN 'retry-window-ended' ELSE error_code END,lease_tag='',lease_until=0 WHERE provider_id IS NULL AND (CASE WHEN first_attempt>0 THEN first_attempt ELSE created_at END)<=? AND cipher!=''",
      )
      .run(now - 23 * 3600000);
    this.store.db
      .prepare("DELETE FROM transactional_outbox WHERE created_at<?")
      .run(now - this.retentionDays * 86400000);
  }
  async drain(at?: number, limit = 1) {
    if (this.pumping || this.stopped || this.adapter.mode === "disabled")
      return { processed: 0 };
    this.pumping = true;
    let processed = 0;
    try {
      for (let n = 0; n < Math.max(1, Math.min(20, limit)); n++) {
        const now = at ?? Date.now();
        if (this.stopped) break;
        this.prune(now);
        const job = this.tx(() => {
          this.store.db
            .prepare(
              "UPDATE transactional_outbox SET state=CASE WHEN state='checking' THEN 'accepted' ELSE 'queued' END,lease_tag='',lease_until=0 WHERE state IN ('sending','checking') AND lease_until<=?",
            )
            .run(now);
          this.store.db
            .prepare(
              "UPDATE transactional_outbox SET state='unknown',cipher='',error_code='attempt-limit' WHERE state='queued' AND attempts>=5",
            )
            .run();
          this.store.db
            .prepare(
              "UPDATE transactional_outbox SET state='unknown',error_code='status-limit' WHERE state='accepted' AND (polls>=20 OR created_at<=?)",
            )
            .run(now - 48 * 3600000);
          const r = this.store.db
            .prepare(
              "SELECT * FROM transactional_outbox WHERE state IN ('queued','accepted') AND due_at<=? AND mode=? ORDER BY due_at,created_at,id LIMIT 1",
            )
            .get(now, this.adapter.mode) as unknown as Job | undefined;
          if (!r) return null;
          const lease = randomUUID(),
            poll = r.state === "accepted";
          this.store.db
            .prepare(
              "UPDATE transactional_outbox SET state=?,attempts=attempts+?,polls=polls+?,first_attempt=CASE WHEN first_attempt=0 AND ?=0 THEN ? ELSE first_attempt END,lease_until=?,lease_tag=? WHERE id=?",
            )
            .run(
              poll ? "checking" : "sending",
              poll ? 0 : 1,
              poll ? 1 : 0,
              poll ? 1 : 0,
              now,
              now + 60000,
              lease,
              r.id,
            );
          return { ...r, lease, poll };
        });
        if (!job) break;
        processed++;
        let state = "unknown",
          provider = job.provider_id,
          error = "",
          due = now + 60000,
          cipher = job.cipher;
        try {
          if (job.poll) {
            if (!provider) throw new EmailFailure(false, "missing-provider-id");
            const result = await this.adapter.status(provider);
            state = result === "pending" ? "accepted" : result;
            cipher = "";
            due = now + Math.min(3600000, 60000 * 2 ** Math.min(6, job.polls));
          } else {
            const p = this.pref(job.user_id);
            if (
              !p?.email_opt_in ||
              p.consent_revision !== job.consent_revision ||
              this.store.db
                .prepare("SELECT 1 FROM notification_blocks WHERE user_id=?")
                .get(job.user_id)
            ) {
              state = "cancelled";
              cipher = "";
            } else if (
              now - (job.first_attempt || job.created_at) >=
              23 * 3600000
            ) {
              state = "unknown";
              cipher = "";
              error = "retry-window-ended";
            } else {
              const accepted = await this.adapter.send(
                this.decrypt(job.cipher),
                "iprasm-outbox/" + job.id,
              );
              provider = accepted.id;
              state = "accepted";
              cipher = "";
            }
          }
        } catch (e) {
          const failure =
            e instanceof EmailFailure ? e : new EmailFailure(true);
          error = failure.code;
          if (job.poll) {
            state =
              failure.retryable && job.polls < 19 ? "accepted" : "unknown";
            cipher = "";
            due =
              now +
              Math.max(
                60000,
                Math.min(
                  3600000,
                  failure.retryAfterMs || 60000 * 2 ** Math.min(6, job.polls),
                ),
              );
          } else {
            state =
              failure.retryable && job.attempts < 4 ? "queued" : "unknown";
            due =
              now +
              Math.max(
                30000,
                Math.min(
                  3600000,
                  Math.max(failure.retryAfterMs, 30000 * 2 ** job.attempts),
                ),
              );
            if (job.attempts >= 4) cipher = "";
          }
        }
        if (this.stopped) break;
        this.store.db
          .prepare(
            "UPDATE transactional_outbox SET state=?,provider_id=?,cipher=?,due_at=?,lease_until=0,lease_tag='',error_code=? WHERE id=? AND lease_tag=? AND state=?",
          )
          .run(
            state,
            provider,
            cipher,
            due,
            error,
            job.id,
            job.lease,
            job.poll ? "checking" : "sending",
          );
      }
    } finally {
      this.pumping = false;
    }
    return { processed };
  }
}
