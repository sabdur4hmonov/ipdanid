import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { DomainError } from "./store.ts";
import type { CustomerStore } from "./customer-store.ts";
import {
  STAFF_ROLES,
  type StaffRole,
  type AdminPermission,
  type AdminSession,
  type StaffAccess,
} from "../src/admin-types.ts";
const permissions: Record<StaffRole, AdminPermission[]> = {
  catalog: ["catalog"],
  support: ["support"],
  fulfillment: ["orders", "fulfill"],
  finance: ["orders", "finance"],
  codes: ["codes"],
  manager: [
    "catalog",
    "support",
    "orders",
    "fulfill",
    "finance",
    "codes",
    "audit",
    "messages",
  ],
};
const owner: AdminPermission[] = [
  "settings",
  "catalog",
  "support",
  "orders",
  "fulfill",
  "finance",
  "codes",
  "audit",
  "messages",
  "access",
];
export class AdminAccess {
  constructor(
    private store: CustomerStore,
    private ownerToken: string,
    private ownerSessions?: {
      authenticate(token: string, now?: number): boolean;
    },
  ) {
    if (ownerToken.length < 32) throw Error("Owner credential too short");
    store.db.exec(
      readFileSync(
        new URL("./migrations/005_staff_access.sql", import.meta.url),
        "utf8",
      ),
    );
  }
  authenticate(token: string, now = Date.now()): AdminSession {
    if (typeof token !== "string" || token.length < 32 || token.length > 200)
      throw new DomainError("Administrator authorization required", 403);
    const a = Buffer.from(token),
      b = Buffer.from(this.ownerToken);
    if (
      this.ownerSessions?.authenticate(token, now) ||
      (!this.ownerSessions && a.length === b.length && timingSafeEqual(a, b))
    )
      return {
        id: "local-owner",
        name: "Owner",
        role: "owner",
        permissions: [...owner],
        expiresAt: null,
      };
    const row = this.store.db
      .prepare(
        "SELECT id,name,role,expires_at FROM staff_access WHERE token_hash=? AND revoked=0 AND expires_at>?",
      )
      .get(this.store.digest(token), now);
    if (!row || !STAFF_ROLES.includes(row.role as StaffRole))
      throw new DomainError("Administrator authorization required", 403);
    return {
      id: String(row.id),
      name: String(row.name),
      role: row.role as StaffRole,
      permissions: [...permissions[row.role as StaffRole]],
      expiresAt: Number(row.expires_at),
    };
  }
  require(token: string, permission: AdminPermission, now = Date.now()) {
    const session = this.authenticate(token, now);
    if (!session.permissions.includes(permission))
      throw new DomainError("This staff role cannot perform that action", 403);
    return session;
  }
  private log(actor: string, action: string, entity: string) {
    this.store.db
      .prepare("INSERT INTO audit VALUES(?,?,?,?,?)")
      .run(randomUUID(), actor, action, entity, new Date().toISOString());
  }
  list(token: string): StaffAccess[] {
    this.require(token, "access");
    return this.store.db
      .prepare(
        "SELECT id,name,role,expires_at,revoked,created_at FROM staff_access ORDER BY created_at DESC LIMIT 200",
      )
      .all()
      .map((r) => ({
        id: String(r.id),
        name: String(r.name),
        role: r.role as StaffRole,
        expiresAt: Number(r.expires_at),
        revoked: Boolean(r.revoked),
        createdAt: String(r.created_at),
      }));
  }
  issue(
    token: string,
    input: { name?: unknown; role?: unknown; days?: unknown },
    now = Date.now(),
  ) {
    const actor = this.require(token, "access", now);
    if (
      !input ||
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.length > 80 ||
      !STAFF_ROLES.includes(input.role as StaffRole) ||
      !Number.isInteger(input.days) ||
      Number(input.days) < 1 ||
      Number(input.days) > 30
    )
      throw new DomainError("Invalid staff access");
    const value = randomBytes(32).toString("base64url"),
      id = randomUUID(),
      expiresAt = now + Number(input.days) * 86400000,
      createdAt = new Date(now).toISOString();
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      this.store.db
        .prepare("INSERT INTO staff_access VALUES(?,?,?,?,?,?,?)")
        .run(
          id,
          input.name.trim(),
          String(input.role),
          this.store.digest(value),
          expiresAt,
          0,
          createdAt,
        );
      this.log(actor.id, "staff.issue", id);
      this.store.db.exec("COMMIT");
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
    return {
      id,
      name: input.name.trim(),
      role: input.role as StaffRole,
      expiresAt,
      createdAt,
      revoked: false,
      token: value,
    };
  }
  revoke(token: string, id: string) {
    const actor = this.require(token, "access");
    this.store.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.store.db
        .prepare("SELECT revoked FROM staff_access WHERE id=?")
        .get(id);
      if (!row) throw new DomainError("Staff access not found", 404);
      if (!row.revoked) {
        this.store.db
          .prepare("UPDATE staff_access SET revoked=1 WHERE id=?")
          .run(id);
        this.log(actor.id, "staff.revoke", id);
      }
      this.store.db.exec("COMMIT");
      return { revoked: true };
    } catch (e) {
      this.store.db.exec("ROLLBACK");
      throw e;
    }
  }
}
// Explicit method+route allowlist: new routes are denied until a permission is assigned.
export function adminRoutePermission(
  method: string,
  path: string,
): AdminPermission | null {
  if (
    (path === "/api/admin/catalog" && method === "GET") ||
    (path === "/api/admin/catalog/sku" && method === "POST")
  )
    return "catalog";
  if (
    (path === "/api/admin/partners" && ["GET", "POST"].includes(method)) ||
    (method === "GET" &&
      /^\/api\/admin\/partners\/[a-f0-9-]{36}\/campaigns$/.test(path)) ||
    (method === "POST" &&
      /^\/api\/admin\/partners\/campaigns\/[a-f0-9-]{36}\/(approve|cancel)$/.test(
        path,
      ))
  )
    return "access";
  if (
    (method === "GET" &&
      ["/api/admin/offers", "/api/admin/offers/report"].includes(path)) ||
    (method === "POST" &&
      ["/api/admin/offers/codes", "/api/admin/offers/policy"].includes(path)) ||
    (method === "POST" &&
      /^\/api\/admin\/orders\/[a-f0-9-]{36}\/costs$/.test(path))
  )
    return "finance";
  if (
    (method === "GET" && path === "/api/admin/gallery") ||
    (method === "GET" &&
      /^\/api\/admin\/gallery\/[a-f0-9-]{36}\/image$/.test(path)) ||
    (method === "POST" &&
      /^\/api\/admin\/gallery\/[a-f0-9-]{36}\/moderate$/.test(path))
  )
    return "support";
  if (
    (method === "GET" && path === "/api/admin/push/status") ||
    (method === "POST" && path === "/api/admin/push/enqueue")
  )
    return "messages";
  if (
    (method === "GET" && path === "/api/admin/kits") ||
    (method === "POST" &&
      [
        "/api/admin/kits/policy",
        "/api/admin/kits/profiles",
        "/api/admin/kits/limits",
        "/api/admin/kits/batch",
        "/api/admin/kits/revoke",
      ].includes(path))
  )
    return "codes";
  if (path === "/api/admin/settings" && ["GET", "POST"].includes(method))
    return "settings";
  if (path === "/api/admin/announcements" && ["GET", "POST"].includes(method))
    return "messages";
  if (
    method === "POST" &&
    /^\/api\/admin\/announcements\/[^/]+\/revoke$/.test(path)
  )
    return "messages";
  if (path === "/api/admin/products" && ["GET", "POST"].includes(method))
    return "catalog";
  if (method === "GET" && path === "/api/admin/orders") return "orders";
  if (
    (method === "GET" && path === "/api/admin/support") ||
    (method === "POST" && /^\/api\/admin\/support\/[^/]+\/reply$/.test(path))
  )
    return "support";
  if (method === "POST" && /^\/api\/admin\/orders\/[^/]+\/fulfill$/.test(path))
    return "fulfill";
  if (
    method === "POST" &&
    (/^\/api\/admin\/orders\/[^/]+\/(test-payment|refund)$/.test(path) ||
      path === "/api/admin/sandbox/sign")
  )
    return "finance";
  if (
    (method === "GET" && path === "/api/admin/codes") ||
    (method === "POST" &&
      ["/api/admin/codes", "/api/admin/codes/revoke"].includes(path))
  )
    return "codes";
  if (method === "GET" && path === "/api/admin/audit") return "audit";
  if (method === "POST" && path === "/api/admin/messages") return "messages";
  if (
    (path === "/api/admin/access" && ["GET", "POST"].includes(method)) ||
    (method === "POST" && /^\/api\/admin\/access\/[^/]+\/revoke$/.test(path))
  )
    return "access";
  return null;
}
