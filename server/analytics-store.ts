import { randomUUID, createHash } from "node:crypto";
import { DomainError } from "./store";
import type { KitStore } from "./kit-store";
import type {
  AnalyticsPreferences,
  AnalyticsEvent,
  AnalyticsReport,
} from "../src/analytics-types";
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const integer = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
function fields(input: unknown, keys: string) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).sort().join() !== keys
  )
    throw new DomainError("Invalid metrics fields");
}
export class AnalyticsStore {
  constructor(private store: KitStore) {
    store.db.exec(`
 CREATE TABLE IF NOT EXISTS analytics_preferences(user_id TEXT PRIMARY KEY REFERENCES users(id),revision INTEGER NOT NULL,enabled INTEGER NOT NULL,since INTEGER);
 CREATE TABLE IF NOT EXISTS analytics_blocks(user_id TEXT PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS analytics_events(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,payload_hash TEXT NOT NULL,kind TEXT NOT NULL,payload TEXT NOT NULL,created_at INTEGER NOT NULL,UNIQUE(user_id,request_key));
 CREATE INDEX IF NOT EXISTS analytics_events_owner ON analytics_events(user_id,created_at);
 CREATE INDEX IF NOT EXISTS analytics_events_kind ON analytics_events(kind,created_at);
 CREATE TABLE IF NOT EXISTS analytics_assembly(user_id TEXT NOT NULL REFERENCES users(id),sequence_hash TEXT NOT NULL,revision INTEGER NOT NULL,confirmed INTEGER NOT NULL,total INTEGER NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,sequence_hash));
 `);
  }
  private tx<T>(fn: () => T) {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.store.db.exec("COMMIT");
      return result;
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
  }
  private account(user: string) {
    if (
      !this.store.db.prepare("SELECT 1 FROM users WHERE id=?").get(user) ||
      this.store.db
        .prepare("SELECT 1 FROM analytics_blocks WHERE user_id=?")
        .get(user)
    )
      throw new DomainError("Account unavailable", 403);
  }
  preferences(user: string): AnalyticsPreferences {
    this.account(user);
    const p = this.store.db
      .prepare("SELECT * FROM analytics_preferences WHERE user_id=?")
      .get(user);
    return {
      revision: Number(p?.revision ?? 0),
      enabled: p?.enabled === 1,
      since:
        p?.since === undefined || p.since === null ? null : Number(p.since),
      retentionDays: 90,
    };
  }
  save(user: string, input: unknown, now = Date.now()) {
    fields(input, "enabled,revision");
    const v = input as { enabled: boolean; revision: number };
    if (typeof v.enabled !== "boolean" || !integer(v.revision, 0, 1e9))
      throw new DomainError("Invalid metrics choice");
    return this.tx(() => {
      const old = this.preferences(user);
      if (old.revision !== v.revision)
        throw new DomainError("Metrics choice changed", 409);
      if (!v.enabled) this.eraseRows(user);
      const since = v.enabled ? (old.enabled ? old.since : now) : null;
      this.store.db
        .prepare(
          "INSERT INTO analytics_preferences VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,enabled=excluded.enabled,since=excluded.since",
        )
        .run(user, old.revision + 1, v.enabled ? 1 : 0, since);
      this.store.db
        .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
        .run(
          randomUUID(),
          user,
          "metrics.choice",
          user,
          new Date(now).toISOString(),
        );
      return this.preferences(user);
    });
  }
  private eraseRows(user: string) {
    this.store.db
      .prepare("DELETE FROM analytics_events WHERE user_id=?")
      .run(user);
    this.store.db
      .prepare("DELETE FROM analytics_assembly WHERE user_id=?")
      .run(user);
  }
  erase(user: string, input: unknown, now = Date.now()) {
    fields(input, "erase,revision");
    const v = input as { erase: boolean; revision: number };
    if (v.erase !== true) throw new DomainError("Explicit erasure required");
    return this.save(user, { enabled: false, revision: v.revision }, now);
  }
  eraseAccount(user: string) {
    this.store.db
      .prepare("INSERT OR IGNORE INTO analytics_blocks VALUES(?)")
      .run(user);
    this.eraseRows(user);
    this.store.db
      .prepare("DELETE FROM analytics_preferences WHERE user_id=?")
      .run(user);
  }
  record(user: string, input: unknown, now = Date.now()) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new DomainError("Invalid metrics event");
    const v = input as AnalyticsEvent;
    if (!uuid(v.requestKey) || !integer(v.consentRevision, 1, 1e9))
      throw new DomainError("Invalid metrics event");
    let payload: AnalyticsEvent;
    if (v.kind === "photo-selected" || v.kind === "preview-ready") {
      fields(input, "consentRevision,kind,requestKey,shape");
      if (!["circle", "square", "heart"].includes(v.shape))
        throw new DomainError("Invalid metrics shape");
      payload = {
        requestKey: v.requestKey,
        consentRevision: v.consentRevision,
        kind: v.kind,
        shape: v.shape,
      };
    } else if (v.kind === "assembly-confirmed") {
      fields(
        input,
        "confirmed,consentRevision,kind,requestKey,revision,sequenceHash,total",
      );
      if (
        typeof v.sequenceHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(v.sequenceHash) ||
        !integer(v.revision, 1, 1e9) ||
        !integer(v.total, 1, 20000) ||
        !integer(v.confirmed, 0, v.total)
      )
        throw new DomainError("Invalid confirmed milestone");
      payload = {
        requestKey: v.requestKey,
        consentRevision: v.consentRevision,
        kind: v.kind,
        sequenceHash: v.sequenceHash,
        revision: v.revision,
        confirmed: v.confirmed,
        total: v.total,
      };
    } else throw new DomainError("Unknown metrics event");
    return this.tx(() => {
      const p = this.preferences(user);
      if (!p.enabled || p.revision !== v.consentRevision)
        throw new DomainError("Metrics consent changed", 409);
      const raw = JSON.stringify(payload),
        hash = createHash("sha256").update(raw).digest("hex"),
        old = this.store.db
          .prepare(
            "SELECT payload_hash FROM analytics_events WHERE user_id=? AND request_key=?",
          )
          .get(user, v.requestKey);
      if (old) {
        if (old.payload_hash !== hash)
          throw new DomainError("Metrics retry differs", 409);
        return { recorded: true, duplicate: true };
      }
      this.prune(now);
      if (
        Number(
          this.store.db
            .prepare(
              "SELECT COUNT(*) n FROM analytics_events WHERE user_id=? AND created_at>?",
            )
            .get(user, now - 86400000)!.n,
        ) >= 100 ||
        Number(
          this.store.db
            .prepare("SELECT COUNT(*) n FROM analytics_events")
            .get()!.n,
        ) >= 50000
      )
        throw new DomainError(
          "Metrics collection limit; product features remain available",
          429,
        );
      if (payload.kind === "assembly-confirmed") {
        if (
          !this.store.db
            .prepare(
              "SELECT 1 FROM build_unlocks WHERE account_id=? AND sequence_hash=?",
            )
            .get(user, payload.sequenceHash)
        )
          throw new DomainError("An owned unlocked guide is required", 403);
        const prior = this.store.db
          .prepare(
            "SELECT * FROM analytics_assembly WHERE user_id=? AND sequence_hash=?",
          )
          .get(user, payload.sequenceHash);
        if (
          prior &&
          (Number(prior.total) !== payload.total ||
            (Number(prior.revision) === payload.revision &&
              Number(prior.confirmed) !== payload.confirmed))
        )
          throw new DomainError("Confirmed milestone conflicts", 409);
        this.store.db
          .prepare(
            "INSERT INTO analytics_assembly VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,sequence_hash) DO UPDATE SET revision=excluded.revision,confirmed=excluded.confirmed,total=excluded.total,updated_at=excluded.updated_at WHERE excluded.revision>analytics_assembly.revision",
          )
          .run(
            user,
            payload.sequenceHash,
            payload.revision,
            payload.confirmed,
            payload.total,
            now,
          );
      }
      this.store.db
        .prepare("INSERT INTO analytics_events VALUES(?,?,?,?,?,?,?)")
        .run(randomUUID(), user, v.requestKey, hash, v.kind, raw, now);
      return { recorded: true, duplicate: false };
    });
  }
  export(user: string) {
    this.account(user);
    return {
      version: "opt-in-metrics/1",
      preferences: this.preferences(user),
      events: this.store.db
        .prepare(
          "SELECT kind,payload,created_at FROM analytics_events WHERE user_id=? ORDER BY created_at,id LIMIT 9000",
        )
        .all(user)
        .map((r) => ({
          kind: r.kind,
          ...JSON.parse(String(r.payload)),
          createdAt: Number(r.created_at),
        })),
    };
  }
  prune(now = Date.now()) {
    this.store.db
      .prepare("DELETE FROM analytics_events WHERE created_at<?")
      .run(now - 90 * 86400000);
    this.store.db
      .prepare("DELETE FROM analytics_assembly WHERE updated_at<?")
      .run(now - 90 * 86400000);
  }
  report(now = Date.now()): AnalyticsReport {
    const from = now - 90 * 86400000;
    const photo = (kind: string) =>
      Number(
        this.store.db
          .prepare(
            "SELECT COUNT(DISTINCT e.user_id) n FROM analytics_events e JOIN analytics_preferences p ON p.user_id=e.user_id AND p.enabled=1 WHERE e.kind=? AND e.created_at>=MAX(p.since,?)",
          )
          .get(kind, from)!.n,
      );
    const unlocked = Number(
      this.store.db
        .prepare(
          "SELECT COUNT(DISTINCT b.account_id) n FROM build_unlocks b JOIN analytics_preferences p ON p.user_id=b.account_id AND p.enabled=1 WHERE b.created_at>=MAX(p.since,?)",
        )
        .get(from)!.n,
    );
    const a = this.store.db
      .prepare(
        "SELECT COUNT(CASE WHEN a.confirmed>0 THEN 1 END) started,COUNT(CASE WHEN a.confirmed=a.total THEN 1 END) completed,COUNT(DISTINCT CASE WHEN a.confirmed>0 THEN a.user_id END) users_started,COUNT(DISTINCT CASE WHEN a.confirmed=a.total THEN a.user_id END) users_completed FROM analytics_assembly a JOIN analytics_preferences p ON p.user_id=a.user_id AND p.enabled=1 WHERE a.updated_at>=MAX(p.since,?)",
      )
      .get(from)!;
    const buckets = this.store.db
      .prepare(
        "SELECT CAST(a.confirmed*10/a.total AS INTEGER) bucket,COUNT(*) guides FROM analytics_assembly a JOIN analytics_preferences p ON p.user_id=a.user_id AND p.enabled=1 WHERE a.updated_at>=MAX(p.since,?) GROUP BY bucket ORDER BY bucket",
      )
      .all(from)
      .map((r) => ({ bucket: Number(r.bucket), guides: Number(r.guides) }));
    const settled = this.store.db
      .prepare(
        "SELECT o.user_id u,COUNT(DISTINCT o.id) n FROM orders o JOIN payments pay ON pay.order_id=o.id JOIN analytics_preferences p ON p.user_id=o.user_id AND p.enabled=1 WHERE o.status IN ('paid','fulfilled','return_requested') AND ROUND((julianday(pay.received_at)-2440587.5)*86400000)>=MAX(p.since,?) GROUP BY o.user_id",
      )
      .all(from);
    const refunded = Number(
      this.store.db
        .prepare(
          "SELECT COUNT(DISTINCT o.id) n FROM orders o JOIN payments pay ON pay.order_id=o.id JOIN analytics_preferences p ON p.user_id=o.user_id AND p.enabled=1 WHERE o.status='refunded' AND ROUND((julianday(pay.received_at)-2440587.5)*86400000)>=MAX(p.since,?)",
        )
        .get(from)!.n,
    );
    const support = this.store.db
      .prepare(
        "SELECT COUNT(*) tickets,COUNT(first_reply) answered,AVG((julianday(first_reply)-julianday(created_at))*24) hours FROM (SELECT t.id,t.created_at,MIN(r.created_at) first_reply FROM tickets t JOIN analytics_preferences p ON p.user_id=t.user_id AND p.enabled=1 LEFT JOIN ticket_replies r ON r.ticket_id=t.id WHERE ROUND((julianday(t.created_at)-2440587.5)*86400000)>=MAX(p.since,?) GROUP BY t.id)",
      )
      .get(from)!;
    return {
      version: "opt-in-metrics/1",
      from,
      until: now,
      consentedAccounts: Number(
        this.store.db
          .prepare(
            "SELECT COUNT(*) n FROM analytics_preferences WHERE enabled=1",
          )
          .get()!.n,
      ),
      funnel: {
        photos: photo("photo-selected"),
        previews: photo("preview-ready"),
        unlocked,
        started: Number(a.users_started),
        completed: Number(a.users_completed),
      },
      assembly: {
        selfReported: true,
        guidesStarted: Number(a.started),
        guidesCompleted: Number(a.completed),
        buckets,
      },
      commerce: {
        paidOrders: settled.reduce((n, r) => n + Number(r.n), 0),
        repeatBuyers: settled.filter((r) => Number(r.n) >= 2).length,
        refundedOrders: refunded,
      },
      support: {
        tickets: Number(support.tickets),
        answered: Number(support.answered),
        averageFirstReplyHours:
          support.hours === null ? null : Math.max(0, Number(support.hours)),
      },
    };
  }
}
