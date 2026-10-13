import { randomUUID } from "node:crypto";
import type { CustomerStore } from "./customer-store";
import { DomainError } from "./store";
import {
  DEFAULT_STOREFRONT,
  type StorefrontSettings,
  type Announcement,
} from "../src/business-types";
const clean = (v: unknown, max: number) => {
  if (typeof v !== "string" || v.trim().length > max)
    throw new DomainError("Invalid business settings");
  return v.trim();
};
export class BusinessStore {
  constructor(private store: CustomerStore) {
    store.db
      .exec(`CREATE TABLE IF NOT EXISTS storefront_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS announcements(id TEXT PRIMARY KEY,data TEXT NOT NULL,active INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS announcement_requests(actor TEXT NOT NULL,request_key TEXT NOT NULL,payload TEXT NOT NULL,id TEXT NOT NULL,PRIMARY KEY(actor,request_key));`);
    store.db
      .prepare("INSERT OR IGNORE INTO storefront_settings VALUES(1,0,?)")
      .run(JSON.stringify(DEFAULT_STOREFRONT));
  }
  settings(): StorefrontSettings {
    const row = this.store.db
      .prepare("SELECT revision,data FROM storefront_settings WHERE id=1")
      .get()!;
    return { ...JSON.parse(String(row.data)), revision: Number(row.revision) };
  }
  private transaction<T>(fn: () => T) {
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.store.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.store.db.exec("ROLLBACK");
      throw error;
    }
  }
  private audit(actor: string, action: string, id: string) {
    this.store.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(randomUUID(), actor, action, id, new Date().toISOString());
  }
  saveSettings(actor: string, input: StorefrontSettings): StorefrontSettings {
    if (
      !input ||
      !Number.isSafeInteger(input.revision) ||
      typeof input.deliveryEnabled !== "boolean" ||
      !Number.isSafeInteger(input.deliveryFeeMinor) ||
      input.deliveryFeeMinor < 0 ||
      input.deliveryFeeMinor > 100_000_000 ||
      !input.homeTitle
    )
      throw new DomainError("Invalid business settings");
    const next: StorefrontSettings = {
      revision: input.revision + 1,
      brandName: clean(input.brandName, 60),
      sellerName: clean(input.sellerName, 100),
      sellerPhone: clean(input.sellerPhone, 40),
      paymentDetails: clean(input.paymentDetails, 500),
      pickupAddress: clean(input.pickupAddress, 300),
      deliveryEnabled: input.deliveryEnabled,
      deliveryFeeMinor: input.deliveryFeeMinor,
      homeTitle: {
        uz: clean(input.homeTitle.uz, 100),
        ru: clean(input.homeTitle.ru, 100),
        en: clean(input.homeTitle.en, 100),
        "uz-Cyrl": clean(input.homeTitle["uz-Cyrl"] ?? "", 100),
      },
    };
    if (
      !next.brandName ||
      (next.sellerPhone &&
        (!/^\+?[\d ()-]{7,40}$/.test(next.sellerPhone) ||
          !/^\d{7,15}$/.test(next.sellerPhone.replace(/\D/g, ""))))
    )
      throw new DomainError("Invalid business settings");
    return this.transaction(() => {
      const changed = this.store.db
        .prepare(
          "UPDATE storefront_settings SET revision=?,data=? WHERE id=1 AND revision=?",
        )
        .run(next.revision, JSON.stringify(next), input.revision);
      if (!changed.changes)
        throw new DomainError("Settings changed in another window", 409);
      this.audit(actor, "storefront.update", "1");
      return next;
    });
  }
  announcements(includeInactive = false, now = Date.now()): Announcement[] {
    const rows = includeInactive
      ? this.store.db
          .prepare(
            "SELECT data,active FROM announcements ORDER BY rowid DESC LIMIT 100",
          )
          .all()
      : this.store.db
          .prepare(
            "SELECT data,active FROM announcements WHERE active=1 AND json_extract(data,'$.startsAt')<=? AND json_extract(data,'$.endsAt')>? ORDER BY rowid DESC LIMIT 100",
          )
          .all(now, now);
    return rows
      .map(
        (r) =>
          ({
            revision: 1,
            ...JSON.parse(String(r.data)),
            active: Boolean(r.active),
          }) as Announcement,
      )
      .filter(
        (a) =>
          includeInactive || (a.active && a.startsAt <= now && a.endsAt > now),
      );
  }
  publish(
    actor: string,
    input: Omit<Announcement, "id" | "active" | "revision"> & {
      id?: string;
      revision?: number;
      active?: boolean;
      requestKey?: string;
    },
  ) {
    if (
      !input ||
      !["news", "promotion"].includes(input.kind) ||
      !Number.isSafeInteger(input.startsAt) ||
      !Number.isSafeInteger(input.endsAt) ||
      input.endsAt <= input.startsAt ||
      (input.active !== false && input.endsAt <= Date.now()) ||
      input.endsAt - input.startsAt > 90 * 86400000
    )
      throw new DomainError("Invalid announcement");
    if (
      Object.keys(input).some(
        (k) =>
          ![
            "id",
            "revision",
            "active",
            "requestKey",
            "title",
            "body",
            "kind",
            "startsAt",
            "endsAt",
          ].includes(k),
      ) ||
      (input.active !== undefined && typeof input.active !== "boolean") ||
      (input.id !== undefined &&
        (typeof input.id !== "string" || !input.id || input.id.length > 100))
    )
      throw new DomainError("Invalid global announcement");
    const item: Announcement = {
      id: input.id ?? randomUUID(),
      revision: input.id ? (input.revision ?? 0) + 1 : 1,
      active: input.active ?? true,
      title: clean(input.title, 120),
      body: clean(input.body, 2000),
      kind: input.kind,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    };
    if (!item.title || !item.body)
      throw new DomainError("Invalid announcement");
    return this.transaction(() => {
      if (input.id) {
        const row = this.store.db
          .prepare("SELECT data FROM announcements WHERE id=?")
          .get(input.id);
        if (!row) throw new DomainError("Announcement not found", 404);
        const previous = JSON.parse(String(row.data));
        if (
          !Number.isSafeInteger(input.revision) ||
          (previous.revision ?? 1) !== input.revision
        )
          throw new DomainError("Announcement changed in another window", 409);
        this.store.db
          .prepare("UPDATE announcements SET data=?,active=? WHERE id=?")
          .run(JSON.stringify(item), +item.active, item.id);
        this.audit(actor, "announcement.edit", item.id);
        return item;
      }
      if (
        typeof input.requestKey !== "string" ||
        !input.requestKey ||
        input.requestKey.length > 100
      )
        throw new DomainError("Announcement request key required");
      const payload = JSON.stringify({
        title: item.title,
        body: item.body,
        kind: item.kind,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        active: item.active,
      });
      const old = this.store.db
        .prepare(
          "SELECT payload,id FROM announcement_requests WHERE actor=? AND request_key=?",
        )
        .get(actor, input.requestKey);
      if (old) {
        if (old.payload !== payload)
          throw new DomainError("Announcement retry parameters differ", 409);
        const row = this.store.db
          .prepare("SELECT data,active FROM announcements WHERE id=?")
          .get(old.id)!;
        return {
          revision: 1,
          ...JSON.parse(String(row.data)),
          active: Boolean(row.active),
        } as Announcement;
      }
      this.store.db
        .prepare("INSERT INTO announcements VALUES(?,?,?)")
        .run(item.id, JSON.stringify(item), +item.active);
      this.store.db
        .prepare("INSERT INTO announcement_requests VALUES(?,?,?,?)")
        .run(actor, input.requestKey, payload, item.id);
      this.audit(actor, "announcement.publish", item.id);
      return item;
    });
  }
  revoke(actor: string, id: string, revision: number) {
    return this.transaction(() => {
      const row = this.store.db
        .prepare("SELECT data,active FROM announcements WHERE id=?")
        .get(id);
      if (!row) throw new DomainError("Announcement not found", 404);
      const old = {
        revision: 1,
        ...JSON.parse(String(row.data)),
        active: Boolean(row.active),
      } as Announcement;
      if (old.revision !== revision)
        throw new DomainError("Announcement changed in another window", 409);
      const next = { ...old, active: false, revision: old.revision + 1 };
      this.store.db
        .prepare("UPDATE announcements SET data=?,active=0 WHERE id=?")
        .run(JSON.stringify(next), id);
      this.audit(actor, "announcement.revoke", id);
      return next;
    });
  }
}
