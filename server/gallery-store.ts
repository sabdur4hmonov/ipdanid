import { createHash, randomUUID } from "node:crypto";
import { DomainError, type Store } from "./store";
import { normalizeGalleryImage } from "./gallery-image";
import {
  GALLERY_CONSENT,
  type GalleryPage,
  type PrivateGalleryPost,
  type GalleryReason,
} from "../src/gallery-types";
const DAY = 86400000;
type Row = {
  id: string;
  user_id: string;
  title: string;
  alias: string;
  review: string;
  rating: number;
  state: PrivateGalleryPost["state"];
  reason: GalleryReason | null;
  revision: number;
  created_at: number;
  published_at: number | null;
  expires_at: number;
  deleted_at: number | null;
  thumbnail: Uint8Array | null;
  image: Uint8Array | null;
  fingerprint: string;
};
const VIEW =
  "id,title,alias,review,rating,state,reason,revision,created_at,published_at,expires_at,thumbnail";
export class GalleryStore {
  constructor(
    private store: Store,
    private now: () => number = Date.now,
    private limits: {maxItems:number;maxBytes:number} = {maxItems:10000,maxBytes:268435456},
  ) {
    if(!Number.isSafeInteger(limits.maxItems)||limits.maxItems<1||!Number.isSafeInteger(limits.maxBytes)||limits.maxBytes<1)throw Error("Invalid gallery capacity");
    store.db.exec(`CREATE TABLE IF NOT EXISTS gallery_posts(
      id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),request_key TEXT NOT NULL,fingerprint TEXT NOT NULL,
      title TEXT NOT NULL,alias TEXT NOT NULL,review TEXT NOT NULL,rating INTEGER NOT NULL,
      state TEXT NOT NULL,reason TEXT,revision INTEGER NOT NULL,consent_version TEXT NOT NULL,
      created_at INTEGER NOT NULL,published_at INTEGER,expires_at INTEGER NOT NULL,deleted_at INTEGER,
      image BLOB,thumbnail BLOB,UNIQUE(user_id,request_key));
      CREATE INDEX IF NOT EXISTS gallery_public ON gallery_posts(state,published_at,id);
      CREATE INDEX IF NOT EXISTS gallery_owner ON gallery_posts(user_id,created_at);`);
    store.db.exec(
      "CREATE INDEX IF NOT EXISTS gallery_expiry ON gallery_posts(expires_at) WHERE state!='deleted'; CREATE INDEX IF NOT EXISTS gallery_deleted_expiry ON gallery_posts(deleted_at) WHERE state='deleted';",
    );
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
  private log(actor: string, action: string, id: string) {
    this.store.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(randomUUID(), actor, action, id, new Date(this.now()).toISOString());
  }
  private text(value: unknown, max: number, optional = false) {
    if (
      typeof value !== "string" ||
      value.length > max ||
      (!optional && !value.trim()) ||
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f\u202a-\u202e\u2066-\u2069]/.test(value)
    )
      throw new DomainError("gallery/text");
    return value.trim();
  }
  private maker(user: string) {
    return (
      this.store.db.prepare("SELECT role FROM users WHERE id=?").get(user)
        ?.role === "maker"
    );
  }
  private id(value: unknown) {
    if (
      typeof value !== "string" ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        value,
      )
    )
      throw new DomainError("gallery/not-found", 404);
    return value;
  }
  private privateView(row: Row): PrivateGalleryPost {
    return {
      id: row.id,
      title: row.title,
      alias: row.alias,
      review: row.review,
      rating: row.rating,
      thumbnail: row.thumbnail
        ? Buffer.from(row.thumbnail).toString("base64")
        : "",
      publishedAt: row.published_at,
      expiresAt: row.expires_at,
      state: row.state,
      reason: row.reason,
      revision: row.revision,
      createdAt: row.created_at,
    };
  }
  private publicView(row: Row) {
    const {
      state: _s,
      reason: _r,
      revision: _v,
      createdAt: _c,
      ...post
    } = this.privateView(row);
    return post;
  }
  private scrub(where: string, args: (string | number)[], now: number) {
    return this.store.db
      .prepare(
        `UPDATE gallery_posts SET state='deleted',reason=NULL,revision=revision+1,
      title='',alias='',review='',rating=0,fingerprint='',image=NULL,thumbnail=NULL,deleted_at=?,expires_at=?
      WHERE state!='deleted' AND ${where}`,
      )
      .run(now, now, ...args);
  }
  prune(now = this.now()) {
    const n = this.scrub("expires_at<=?", [now], now);
    this.store.db
      .prepare(
        "DELETE FROM gallery_posts WHERE state='deleted' AND deleted_at<=?",
      )
      .run(now - 30 * DAY);
    return { scrubbed: Number(n.changes) };
  }
  mine(user: string) {
    this.prune();
    return {
      canSubmit: this.maker(user),
      items: (
        this.store.db
          .prepare(
            `SELECT ${VIEW} FROM gallery_posts WHERE user_id=? AND state!='deleted' ORDER BY created_at DESC,id DESC LIMIT 10`,
          )
          .all(user) as Row[]
      ).map((r) => this.privateView(r)),
    };
  }
  submit(user: string, input: Record<string, unknown>) {
    const now = this.now();
    this.prune(now);
    if (!this.maker(user)) throw new DomainError("gallery/account", 403);
    if (
      !input ||
      Object.keys(input).sort().join(",") !==
        "alias,consent,consentVersion,finished,image,publish,rating,requestKey,review,rights,title"
    )
      throw new DomainError("gallery/fields");
    if (
      input.consentVersion !== GALLERY_CONSENT ||
      input.consent !== true ||
      input.finished !== true ||
      input.rights !== true ||
      input.publish !== true
    )
      throw new DomainError("gallery/consent");
    const title = this.text(input.title, 80),
      alias = this.text(input.alias, 40),
      review = this.text(input.review, 800, true),
      requestKey = this.id(input.requestKey),
      rating = input.rating;
    if (
      !Number.isInteger(rating) ||
      Number(rating) < 0 ||
      Number(rating) > 5 ||
      (review && !rating) ||
      (!review && rating !== 0)
    )
      throw new DomainError("gallery/rating");
    if (typeof input.image !== "string" || input.image.length > 3_333_336)
      throw new DomainError("gallery/image");
    const fingerprint = createHash("sha256")
      .update(
        JSON.stringify({
          title,
          alias,
          review,
          rating,
          image: input.image,
          consent: GALLERY_CONSENT,
        }),
      )
      .digest("hex");
    return this.tx(() => {
      const old = this.store.db
        .prepare(
          "SELECT * FROM gallery_posts WHERE user_id=? AND request_key=?",
        )
        .get(user, requestKey) as Row | undefined;
      if (old) {
        if (old.state !== "deleted" && old.fingerprint !== fingerprint)
          throw new DomainError("gallery/conflict", 409);
        return this.privateView(old);
      }
      const quota = this.store.db
        .prepare(
          "SELECT COUNT(*) n FROM gallery_posts WHERE user_id=? AND (state!='deleted' OR created_at>?)",
        )
        .get(user, now - DAY)!;
      if (Number(quota.n) >= 10) throw new DomainError("gallery/limit", 429);
      const media = normalizeGalleryImage(input.image),
        id = randomUUID();
      const capacity=this.store.db.prepare("SELECT count(*) AS items,COALESCE(sum(COALESCE(length(image),0)+COALESCE(length(thumbnail),0)),0) AS bytes FROM gallery_posts WHERE state!='deleted'").get()!;
      if(Number(capacity.items)>=this.limits.maxItems || Number(capacity.bytes)+media.image.length+media.thumbnail.length>this.limits.maxBytes)throw new DomainError("gallery/capacity",429);
      this.store.db
        .prepare(
          "INSERT INTO gallery_posts VALUES(?,?,?,?,?,?,?,?,'pending',NULL,1,?,?,NULL,?,NULL,?,?)",
        )
        .run(
          id,
          user,
          requestKey,
          fingerprint,
          title,
          alias,
          review,
          Number(rating),
          GALLERY_CONSENT,
          now,
          now + 30 * DAY,
          media.image,
          media.thumbnail,
        );
      this.log(user, "gallery.submit", id);
      return this.privateView(
        this.store.db
          .prepare("SELECT * FROM gallery_posts WHERE id=?")
          .get(id) as Row,
      );
    });
  }
  page(after?: string): GalleryPage {
    const now = this.now();
    this.prune(now);
    let time = Number.MAX_SAFE_INTEGER,
      id = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    if (after) {
      const parts = after.split(".");
      if (parts.length !== 2 || !/^\d{1,16}$/.test(parts[0]))
        throw new DomainError("gallery/cursor");
      time = Number(parts[0]);
      id = this.id(parts[1]);
      if (!Number.isSafeInteger(time)) throw new DomainError("gallery/cursor");
    }
    const rows = this.store.db
      .prepare(
        `SELECT ${VIEW} FROM gallery_posts WHERE state='approved' AND expires_at>? AND (published_at<? OR (published_at=? AND id<?)) ORDER BY published_at DESC,id DESC LIMIT 13`,
      )
      .all(now, time, time, id) as Row[];
    const stats = this.store.db
      .prepare(
        "SELECT COUNT(*) total,AVG(CASE WHEN rating>0 THEN rating END) average FROM gallery_posts WHERE state='approved' AND expires_at>?",
      )
      .get(now)!;
    const items = rows.slice(0, 12),
      last = items.at(-1);
    return {
      items: items.map((r) => this.publicView(r)),
      next: rows.length > 12 ? last!.published_at + "." + last!.id : null,
      total: Number(stats.total),
      averageRating: stats.average === null ? null : Number(stats.average),
    };
  }
  moderation(state = "pending", after?: string) {
    this.prune();
    if (!["pending", "approved", "rejected"].includes(state))
      throw new DomainError("gallery/state");
    let time = Number.MAX_SAFE_INTEGER,
      id = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    if (after) {
      const parts = after.split(".");
      if (parts.length !== 2 || !/^\d{1,16}$/.test(parts[0]))
        throw new DomainError("gallery/cursor");
      time = Number(parts[0]);
      id = this.id(parts[1]);
      if (!Number.isSafeInteger(time)) throw new DomainError("gallery/cursor");
    }
    const rows = this.store.db
        .prepare(
          `SELECT ${VIEW} FROM gallery_posts WHERE state=? AND (created_at<? OR (created_at=? AND id<?)) ORDER BY created_at DESC,id DESC LIMIT 13`,
        )
        .all(state, time, time, id) as Row[],
      items = rows.slice(0, 12),
      last = items.at(-1);
    return {
      items: items.map((r) => this.privateView(r)),
      next: rows.length > 12 ? last!.created_at + "." + last!.id : null,
    };
  }
  moderate(
    actor: string,
    id: string,
    input: { revision?: unknown; state?: unknown; reason?: unknown },
  ) {
    const now = this.now();
    this.prune(now);
    this.id(id);
    if (
      !input ||
      Object.keys(input).sort().join(",") !== "reason,revision,state" ||
      !Number.isSafeInteger(input.revision) ||
      !["approved", "rejected"].includes(String(input.state)) ||
      (input.state === "approved"
        ? input.reason !== null
        : !["privacy", "not-finished", "rights", "other"].includes(
            String(input.reason),
          ))
    )
      throw new DomainError("gallery/moderation");
    return this.tx(() => {
      const row = this.store.db
        .prepare("SELECT * FROM gallery_posts WHERE id=? AND state!='deleted'")
        .get(id) as Row | undefined;
      if (!row) throw new DomainError("gallery/not-found", 404);
      if (row.revision !== input.revision)
        throw new DomainError("gallery/conflict", 409);
      const published =
          input.state === "approved"
            ? (row.published_at ?? now)
            : row.published_at,
        expires =
          input.state === "approved"
            ? published! + 365 * DAY
            : Math.min(
                row.published_at === null
                  ? row.created_at + 30 * DAY
                  : row.published_at + 365 * DAY,
                now + 30 * DAY,
              );
      this.store.db
        .prepare(
          "UPDATE gallery_posts SET state=?,reason=?,revision=revision+1,published_at=?,expires_at=? WHERE id=?",
        )
        .run(
          String(input.state),
          input.reason as string | null,
          published,
          expires,
          id,
        );
      this.log(actor, "gallery." + String(input.state), id);
      return this.privateView(
        this.store.db
          .prepare("SELECT * FROM gallery_posts WHERE id=?")
          .get(id) as Row,
      );
    });
  }
  withdraw(user: string, id: string, revision: unknown) {
    this.id(id);
    if (!Number.isSafeInteger(revision))
      throw new DomainError("gallery/revision");
    this.prune();
    return this.tx(() => {
      const row = this.store.db
        .prepare("SELECT * FROM gallery_posts WHERE id=? AND user_id=?")
        .get(id, user) as Row | undefined;
      if (!row) throw new DomainError("gallery/not-found", 404);
      if (row.state === "deleted") return { deleted: true };
      if (row.revision !== revision)
        throw new DomainError("gallery/conflict", 409);
      this.scrub("id=?", [id], this.now());
      this.log(user, "gallery.withdraw", id);
      return { deleted: true };
    });
  }
  eraseAccount(user: string) {
    return this.tx(() => {
      const result = this.store.db
        .prepare("DELETE FROM gallery_posts WHERE user_id=?")
        .run(user);
      return { deleted: Number(result.changes) };
    });
  }
  private readImage(id: string, where: string, args: string[]) {
    this.id(id);
    this.prune();
    const row = this.store.db
      .prepare(
        `SELECT image FROM gallery_posts WHERE id=? AND state!='deleted' AND ${where}`,
      )
      .get(id, ...args);
    if (!row?.image) throw new DomainError("gallery/not-found", 404);
    return { image: Buffer.from(row.image as Uint8Array).toString("base64") };
  }
  publicImage(id: string) {
    return this.readImage(id, "state='approved'", []);
  }
  ownImage(user: string, id: string) {
    return this.readImage(id, "user_id=?", [user]);
  }
  moderatorImage(id: string) {
    return this.readImage(id, "1=1", []);
  }
}
