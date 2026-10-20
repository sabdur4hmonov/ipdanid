import { randomUUID } from "node:crypto";
import { DomainError } from "./store";
import type { KitStore } from "./kit-store";
import type {
  PartnerTerms,
  PartnerAccount,
  PartnerQuote,
  PartnerCampaign,
} from "../src/partner-types";
const DAY = 86400000;
type PartnerRow = {
  id: string;
  account_id: string;
  data: string;
  revision: number;
};
type QuoteRow = {
  id: string;
  partner_id: string;
  request_key: string;
  count: number;
  data: string;
  expires_at: number;
  campaign_id: string | null;
};
type CampaignRow = {
  id: string;
  partner_id: string;
  request_key: string;
  name: string;
  quote_id: string;
  data: string;
  status: PartnerCampaign["status"];
  revision: number;
  batch_id: string | null;
  reserved_until: number | null;
};
export class PartnerStore {
  constructor(
    private store: KitStore,
    private clock: () => number = Date.now,
  ) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS partner_accounts(id TEXT PRIMARY KEY,account_id TEXT NOT NULL UNIQUE REFERENCES users(id),data TEXT NOT NULL,revision INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS partner_quotes(id TEXT PRIMARY KEY,partner_id TEXT NOT NULL REFERENCES partner_accounts(id),request_key TEXT NOT NULL,count INTEGER NOT NULL,data TEXT NOT NULL,expires_at INTEGER NOT NULL,campaign_id TEXT,created_at INTEGER NOT NULL,UNIQUE(partner_id,request_key));
      CREATE INDEX IF NOT EXISTS partner_quote_retention ON partner_quotes(expires_at);
      CREATE TABLE IF NOT EXISTS partner_campaigns(id TEXT PRIMARY KEY,partner_id TEXT NOT NULL REFERENCES partner_accounts(id),request_key TEXT NOT NULL,name TEXT NOT NULL,quote_id TEXT NOT NULL UNIQUE REFERENCES partner_quotes(id),data TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,batch_id TEXT REFERENCES kit_batches(id),reserved_until INTEGER,UNIQUE(partner_id,request_key));
      CREATE INDEX IF NOT EXISTS partner_campaign_scope ON partner_campaigns(partner_id,status);`);
  }
  private tx<T>(fn: () => T) {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const r = fn();
      this.store.db.exec("COMMIT");
      return r;
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
  }
  private uuid(v: unknown) {
    if (
      typeof v !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v)
    )
      throw new DomainError("Invalid partner reference");
    return v;
  }
  private text(v: unknown, max = 80) {
    if (
      typeof v !== "string" ||
      !v.trim() ||
      v.length > max ||
      /[\x00-\x1f\x7f]/.test(v)
    )
      throw new DomainError("Invalid partner text");
    return v.trim();
  }
  private exact(v: unknown, keys: string) {
    if (!v || typeof v !== "object" || Object.keys(v).sort().join(",") !== keys)
      throw new DomainError("Invalid partner fields");
  }
  private log(actor: string, action: string, id: string) {
    this.store.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(
        randomUUID(),
        actor,
        action,
        id,
        new Date(this.clock()).toISOString(),
      );
  }
  private partner(id: string) {
    const r = this.store.db
      .prepare("SELECT * FROM partner_accounts WHERE id=?")
      .get(id) as PartnerRow | undefined;
    if (!r) throw new DomainError("Partner not found", 404);
    return r;
  }
  private member(user: string) {
    const r = this.store.db
      .prepare("SELECT * FROM partner_accounts WHERE account_id=?")
      .get(user) as PartnerRow | undefined;
    if (!r || !(JSON.parse(r.data) as PartnerTerms).enabled)
      throw new DomainError("Partner access unavailable", 403);
    return r;
  }
  private product(id: string) {
    const p = this.store.products().find((p) => p.id === id);
    if (
      !p ||
      p.active !== 1 ||
      typeof p.id !== "string" ||
      typeof p.name !== "string" ||
      typeof p.profile_id !== "string" ||
      !p.profile_id ||
      ![p.price_minor, p.stock, p.credits, p.revision].every(
        (n) => typeof n === "number" && Number.isSafeInteger(n) && n >= 0,
      ) ||
      Number(p.price_minor) < 1 ||
      Number(p.credits) < 1 ||
      Number(p.credits) > 100
    )
      throw new DomainError("Partner product unavailable", 409);
    return {
      id: p.id,
      name: p.name,
      profile_id: p.profile_id,
      price_minor: Number(p.price_minor),
      stock: Number(p.stock),
      credits: Number(p.credits),
      revision: Number(p.revision),
    };
  }
  private profile(id: string) {
    const match = id.match(/^standard-base-r([1-9]\d*)$/);
    if (match) {
      this.store.standardKit(Number(match[1]));
      return;
    }
    if (
      !this.store.db
        .prepare("SELECT id FROM profiles WHERE id=? LIMIT 1")
        .get(id)
    )
      throw new DomainError("Partner profile unavailable", 409);
  }
  private terms(v: unknown): PartnerTerms {
    this.exact(
      v,
      "codeDays,creditDays,enabled,maxBatch,maxKits,minBatch,name,productId,revision,tiers",
    );
    const t = v as PartnerTerms;
    if (
      typeof t.enabled !== "boolean" ||
      ![
        t.maxKits,
        t.minBatch,
        t.maxBatch,
        t.codeDays,
        t.creditDays,
        t.revision,
      ].every((n) => Number.isSafeInteger(n) && n >= 0) ||
      t.maxKits < 1 ||
      t.maxKits > 10000 ||
      t.minBatch < 1 ||
      t.maxBatch < t.minBatch ||
      t.maxBatch > 100 ||
      t.maxBatch > t.maxKits ||
      t.codeDays < 1 ||
      t.codeDays > 3650 ||
      t.creditDays > 3650 ||
      !Array.isArray(t.tiers) ||
      !t.tiers.length ||
      t.tiers.length > 6
    )
      throw new DomainError("Invalid partner terms");
    const productId = this.text(t.productId, 100);
    if (!this.store.products().some((p) => p.id === productId))
      throw new DomainError("Partner product not found", 404);
    const p = t.enabled ? this.product(productId) : null;
    if (p) this.profile(p.profile_id);
    let lastCount = 0,
      lastPrice = p?.price_minor ?? Number.MAX_SAFE_INTEGER;
    for (const tier of t.tiers) {
      this.exact(tier, "minCount,unitMinor");
      if (
        !Number.isSafeInteger(tier.minCount) ||
        !Number.isSafeInteger(tier.unitMinor) ||
        !Number.isSafeInteger(tier.unitMinor * t.maxBatch) ||
        tier.minCount <= lastCount ||
        tier.minCount < t.minBatch ||
        tier.minCount > t.maxBatch ||
        tier.unitMinor < 1 ||
        tier.unitMinor > lastPrice
      )
        throw new DomainError("Invalid partner price tiers");
      lastCount = tier.minCount;
      lastPrice = tier.unitMinor;
    }
    if (t.tiers[0].minCount !== t.minBatch)
      throw new DomainError("Partner first tier must match minimum");
    return {
      ...t,
      name: this.text(t.name),
      productId,
      tiers: t.tiers.map((t) => ({ ...t })),
    };
  }
  save(actor: string, input: { accountId?: unknown; terms?: unknown }) {
    this.exact(input, "accountId,terms");
    const accountId = this.uuid(input.accountId),
      terms = this.terms(input.terms);
    return this.tx(() => {
      if (
        this.store.db
          .prepare("SELECT role FROM users WHERE id=?")
          .get(accountId)?.role !== "maker"
      )
        throw new DomainError("Registered or kit account required", 409);
      const old = this.store.db
        .prepare("SELECT * FROM partner_accounts WHERE account_id=?")
        .get(accountId) as PartnerRow | undefined;
      if ((old?.revision ?? 0) !== terms.revision)
        throw new DomainError("Partner terms changed", 409);
      const id = old?.id ?? randomUUID(),
        next = { ...terms, revision: terms.revision + 1 };
      this.store.db
        .prepare(
          "INSERT INTO partner_accounts VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision",
        )
        .run(id, accountId, JSON.stringify(next), next.revision);
      this.log(actor, "partner.save", id);
      return { id, accountId, terms: next } satisfies PartnerAccount;
    });
  }
  list(): PartnerAccount[] {
    return (
      this.store.db
        .prepare("SELECT * FROM partner_accounts ORDER BY rowid DESC LIMIT 200")
        .all() as PartnerRow[]
    ).map((r) => ({
      id: r.id,
      accountId: r.account_id,
      terms: JSON.parse(r.data),
    }));
  }
  portal(user: string) {
    const p = this.member(user);
    return {
      partner: {
        id: p.id,
        accountId: p.account_id,
        terms: JSON.parse(p.data),
      } as PartnerAccount,
      campaigns: this.campaigns(p.id),
    };
  }
  private snapshot(
    p: PartnerRow,
    count: number,
  ): Omit<PartnerQuote, "id" | "expiresAt"> {
    const t = JSON.parse(p.data) as PartnerTerms,
      product = this.product(t.productId);
    this.profile(product.profile_id);
    if (
      !t.enabled ||
      !Number.isSafeInteger(count) ||
      count < t.minBatch ||
      count > t.maxBatch
    )
      throw new DomainError("Partner quantity unavailable", 409);
    const tier = [...t.tiers].reverse().find((t) => t.minCount <= count)!;
    if (tier.unitMinor > product.price_minor || product.stock < count)
      throw new DomainError("Partner price or stock changed", 409);
    return {
      count,
      unitMinor: tier.unitMinor,
      totalMinor: tier.unitMinor * count,
      currency: "UZS",
      productId: product.id,
      productName: product.name,
      profile: product.profile_id,
      quota: product.credits,
      termsRevision: t.revision,
      productRevision: product.revision,
      codeDays: t.codeDays,
      creditDays: t.creditDays,
    };
  }
  quote(user: string, input: { count?: unknown; requestKey?: unknown }) {
    this.exact(input, "count,requestKey");
    const key = this.uuid(input.requestKey);
    if (!Number.isSafeInteger(input.count))
      throw new DomainError("Invalid partner quantity");
    return this.tx(() => {
      const p = this.member(user),
        old = this.store.db
          .prepare(
            "SELECT * FROM partner_quotes WHERE partner_id=? AND request_key=?",
          )
          .get(p.id, key) as QuoteRow | undefined;
      if (old) {
        if (old.count !== input.count)
          throw new DomainError("Partner quote retry changed", 409);
        return JSON.parse(old.data) as PartnerQuote;
      }
      const counts = this.store.db
        .prepare(
          "SELECT COUNT(*) n,SUM(CASE WHEN campaign_id IS NULL AND expires_at>? THEN 1 ELSE 0 END) active FROM partner_quotes WHERE partner_id=? AND created_at>?",
        )
        .get(this.clock(), p.id, this.clock() - DAY)!;
      if (Number(counts.n) >= 100 || Number(counts.active) >= 20)
        throw new DomainError("Partner quote limit", 429);
      const quote: PartnerQuote = {
        ...this.snapshot(p, Number(input.count)),
        id: randomUUID(),
        expiresAt: this.clock() + 15 * 60000,
      };
      this.store.db
        .prepare("INSERT INTO partner_quotes VALUES(?,?,?,?,?,?,NULL,?)")
        .run(
          quote.id,
          p.id,
          key,
          quote.count,
          JSON.stringify(quote),
          quote.expiresAt,
          this.clock(),
        );
      this.log(user, "partner.quote", quote.id);
      return quote;
    });
  }
  request(
    user: string,
    input: { quoteId?: unknown; name?: unknown; requestKey?: unknown },
  ) {
    this.exact(input, "name,quoteId,requestKey");
    const quoteId = this.uuid(input.quoteId),
      key = this.uuid(input.requestKey),
      name = this.text(input.name);
    return this.tx(() => {
      const p = this.member(user),
        old = this.store.db
          .prepare(
            "SELECT * FROM partner_campaigns WHERE partner_id=? AND request_key=?",
          )
          .get(p.id, key) as CampaignRow | undefined;
      if (old) {
        if (old.quote_id !== quoteId || old.name !== name)
          throw new DomainError("Partner campaign retry changed", 409);
        return this.view(old);
      }
      const row = this.store.db
        .prepare("SELECT * FROM partner_quotes WHERE id=? AND partner_id=?")
        .get(quoteId, p.id) as QuoteRow | undefined;
      if (!row || row.campaign_id || row.expires_at <= this.clock())
        throw new DomainError("Partner quote unavailable", 409);
      const q = JSON.parse(row.data) as PartnerQuote,
        now = this.snapshot(p, q.count);
      if (
        Object.entries(now).some(([k, v]) => q[k as keyof PartnerQuote] !== v)
      )
        throw new DomainError("Partner quote changed", 409);
      const n = this.store.db
        .prepare(
          "SELECT COUNT(*) n FROM partner_campaigns WHERE partner_id=? AND status='pending'",
        )
        .get(p.id)!;
      if (Number(n.n) >= 10)
        throw new DomainError("Partner pending limit", 429);
      const id = randomUUID();
      this.store.db
        .prepare(
          "INSERT INTO partner_campaigns VALUES(?,?,?,?,?,?,'pending',1,NULL,NULL)",
        )
        .run(id, p.id, key, name, q.id, JSON.stringify(q));
      this.store.db
        .prepare("UPDATE partner_quotes SET campaign_id=? WHERE id=?")
        .run(id, q.id);
      this.log(user, "partner.request", id);
      return this.view(this.campaign(id, p.id));
    });
  }
  private campaign(id: string, partner?: string) {
    const r = this.store.db
      .prepare("SELECT * FROM partner_campaigns WHERE id=?")
      .get(this.uuid(id)) as CampaignRow | undefined;
    if (!r || (partner && r.partner_id !== partner))
      throw new DomainError("Campaign not found", 404);
    return r;
  }
  private view(r: CampaignRow): PartnerCampaign {
    const counts = r.batch_id
      ? this.store.db
          .prepare(
            "SELECT SUM(CASE WHEN account_id IS NOT NULL THEN 1 ELSE 0 END) claimed,SUM(CASE WHEN account_id IS NULL AND revoked=0 AND (expires_at IS NULL OR expires_at>?) THEN 1 ELSE 0 END) available,SUM(CASE WHEN revoked=1 THEN 1 ELSE 0 END) revoked FROM kit_codes WHERE batch_id=?",
          )
          .get(this.clock(), r.batch_id)
      : undefined;
    return {
      id: r.id,
      name: r.name,
      quote: JSON.parse(r.data),
      status: r.status,
      revision: r.revision,
      batchId: r.batch_id,
      reservationExpiresAt: r.reserved_until,
      claimed: Number(counts?.claimed ?? 0),
      available: Number(counts?.available ?? 0),
      revoked: Number(counts?.revoked ?? 0),
    };
  }
  campaigns(partnerId: string) {
    this.partner(this.uuid(partnerId));
    return (
      this.store.db
        .prepare(
          "SELECT * FROM partner_campaigns WHERE partner_id=? ORDER BY rowid DESC LIMIT 100",
        )
        .all(partnerId) as CampaignRow[]
    ).map((r) => this.view(r));
  }
  approve(
    actor: string,
    id: string,
    input: { revision?: unknown; authorizeIssue?: unknown },
  ) {
    this.exact(input, "authorizeIssue,revision");
    if (input.authorizeIssue !== true || !Number.isSafeInteger(input.revision))
      throw new DomainError("Explicit campaign authorization required");
    return this.tx(() => {
      const r = this.campaign(id),
        q = JSON.parse(r.data) as PartnerQuote,
        p = this.partner(r.partner_id),
        terms = JSON.parse(p.data) as PartnerTerms;
      if (
        r.revision !== input.revision ||
        r.status !== "pending" ||
        q.expiresAt <= this.clock()
      )
        throw new DomainError("Campaign changed or expired", 409);
      const current = this.snapshot(p, q.count);
      if (
        Object.entries(current).some(
          ([k, v]) => q[k as keyof PartnerQuote] !== v,
        )
      )
        throw new DomainError("Campaign price changed", 409);
      const used = (
        this.store.db
          .prepare(
            "SELECT data FROM partner_campaigns WHERE partner_id=? AND status IN('approved','issued','revoked')",
          )
          .all(p.id) as { data: string }[]
      ).reduce((n, r) => n + (JSON.parse(r.data) as PartnerQuote).count, 0);
      if (used + q.count > terms.maxKits)
        throw new DomainError("Partner allocation exceeded", 409);
      const stock = this.store.db
        .prepare(
          "UPDATE products SET stock=stock-? WHERE id=? AND active=1 AND stock>=?",
        )
        .run(q.count, q.productId, q.count);
      if (Number(stock.changes) !== 1)
        throw new DomainError("Partner stock unavailable", 409);
      this.store.db
        .prepare(
          "UPDATE partner_campaigns SET status='approved',revision=revision+1,reserved_until=? WHERE id=?",
        )
        .run(this.clock() + 7 * DAY, id);
      this.log(actor, "partner.approve", id);
      return this.view(this.campaign(id));
    });
  }
  issue(user: string, id: string, input: { revision?: unknown }) {
    this.exact(input, "revision");
    if (!Number.isSafeInteger(input.revision))
      throw new DomainError("Invalid campaign revision");
    return this.tx(() => {
      const p = this.member(user),
        r = this.campaign(id, p.id),
        q = JSON.parse(r.data) as PartnerQuote;
      if (
        r.status !== "approved" ||
        r.revision !== input.revision ||
        !r.reserved_until ||
        r.reserved_until <= this.clock()
      )
        throw new DomainError(
          "Campaign unavailable; issued codes are shown only once",
          409,
        );
      // Terms cannot silently alter an approved campaign's credit/expiry contract.
      const batch = this.store.issueKitBatch(
        "partner:" + p.id,
        q.profile,
        q.count,
        id,
        { quota: q.quota, codeDays: q.codeDays, creditDays: q.creditDays },
      );
      this.store.db
        .prepare(
          "UPDATE partner_campaigns SET status='issued',revision=revision+1,batch_id=?,reserved_until=NULL WHERE id=?",
        )
        .run(batch.id, id);
      this.log(user, "partner.issue", id);
      return { campaign: this.view(this.campaign(id, p.id)), batch };
    });
  }
  cancel(actor: string, id: string, revision: unknown, partnerUser?: string) {
    if (!Number.isSafeInteger(revision))
      throw new DomainError("Invalid campaign revision");
    return this.tx(() => {
      const p = partnerUser ? this.member(partnerUser) : undefined,
        r = this.campaign(id, p?.id),
        q = JSON.parse(r.data) as PartnerQuote;
      if (
        r.revision !== revision ||
        !["pending", "approved", "issued"].includes(r.status)
      )
        throw new DomainError("Campaign changed", 409);
      if (r.status === "approved")
        this.store.db
          .prepare("UPDATE products SET stock=stock+? WHERE id=?")
          .run(q.count, q.productId);
      if (r.status === "issued") this.store.revokeKitBatch(actor, r.batch_id!);
      this.store.db
        .prepare(
          "UPDATE partner_campaigns SET status=?,revision=revision+1,reserved_until=NULL WHERE id=?",
        )
        .run(r.status === "issued" ? "revoked" : "cancelled", id);
      this.log(actor, "partner.cancel", id);
      return this.view(this.campaign(id));
    });
  }
  prune() {
    return this.tx(() => {
      const rows = this.store.db
        .prepare(
          "SELECT c.* FROM partner_campaigns c JOIN partner_quotes q ON q.id=c.quote_id WHERE (c.status='pending' AND q.expires_at<=?) OR (c.status='approved' AND c.reserved_until<=?) ORDER BY c.rowid LIMIT 500",
        )
        .all(this.clock(), this.clock()) as CampaignRow[];
      let expired = 0;
      for (const r of rows) {
        const q = JSON.parse(r.data) as PartnerQuote;
        if (
          r.status === "pending"
            ? q.expiresAt > this.clock()
            : Number(r.reserved_until) > this.clock()
        )
          continue;
        if (r.status === "approved")
          this.store.db
            .prepare("UPDATE products SET stock=stock+? WHERE id=?")
            .run(q.count, q.productId);
        this.store.db
          .prepare(
            "UPDATE partner_campaigns SET status='expired',revision=revision+1,reserved_until=NULL WHERE id=?",
          )
          .run(r.id);
        ++expired;
      }
      this.store.db
        .prepare(
          "DELETE FROM partner_quotes WHERE campaign_id IS NULL AND expires_at<?",
        )
        .run(this.clock() - 30 * DAY);
      return { expired };
    });
  }
}
