import { it, expect, afterEach } from "vitest";
import { CustomerStore } from "../server/customer-store";
import { AdminAccess, adminRoutePermission } from "../server/admin-access";
import { STAFF_ROLES } from "../src/admin-types";
const stores: CustomerStore[] = [];
const root = "owner-secret-".repeat(4);
function setup() {
  const s = new CustomerStore(":memory:", "p".repeat(32), "k".repeat(32));
  s.seed();
  stores.push(s);
  return { s, a: new AdminAccess(s, root) };
}
afterEach(() => stores.splice(0).forEach((s) => s.close()));
it("staff credentials are derived, scoped, owner-created and never returned in listings or audit", () => {
  const { s, a } = setup(),
    grant = a.issue(root, { name: "Support", role: "support", days: 1 });
  expect(a.authenticate(grant.token)).toMatchObject({
    id: grant.id,
    permissions: ["support"],
  });
  expect(() => a.require(grant.token, "finance")).toThrow(/cannot/);
  expect(() =>
    a.issue(grant.token, { name: "Escalation", role: "manager", days: 1 }),
  ).toThrow(/cannot/);
  expect(() => a.list(grant.token)).toThrow(/cannot/);
  expect(() => a.authenticate(s.createGuest().token)).toThrow(/authorization/);
  expect(() => a.authenticate("forged".repeat(8))).toThrow(/authorization/);
  const stored = JSON.stringify(
    s.db.prepare("SELECT * FROM staff_access").all(),
  );
  expect(stored).not.toContain(grant.token);
  expect(JSON.stringify(a.list(root))).not.toContain("token");
  expect(JSON.stringify(s.auditHistory())).not.toContain(grant.token);
  expect(s.auditHistory()).toContainEqual(
    expect.objectContaining({
      actor_id: "local-owner",
      action: "staff.issue",
      entity_id: grant.id,
    }),
  );
});
it("expiry is strict, revocation is immediate and repeated revocation does not duplicate the audit", () => {
  const { s, a } = setup(),
    now = Date.now(),
    grant = a.issue(
      root,
      { name: "Packing", role: "fulfillment", days: 1 },
      now,
    );
  expect(a.require(grant.token, "fulfill", grant.expiresAt - 1).id).toBe(
    grant.id,
  );
  expect(() => a.authenticate(grant.token, grant.expiresAt)).toThrow();
  expect(() => a.require(grant.token, "finance")).toThrow();
  a.revoke(root, grant.id);
  a.revoke(root, grant.id);
  expect(() => a.authenticate(grant.token)).toThrow();
  expect(
    s.auditHistory().filter((r) => r.action === "staff.revoke"),
  ).toHaveLength(1);
  expect(a.list(root)[0].revoked).toBe(true);
});
it("all staff roles exclude credential management, reject forged roles/durations and persist across access-service recreation", () => {
  const { s, a } = setup();
  for (const role of STAFF_ROLES) {
    const grant = a.issue(root, { name: role, role, days: 1 });
    expect(() => a.require(grant.token, "access")).toThrow();
    expect(new AdminAccess(s, root).authenticate(grant.token).role).toBe(role);
  }
  for (const input of [
    { name: "a", role: "owner", days: 1 },
    { name: "a", role: "support", days: 31 },
    { name: "a", role: "support", days: 1.5 },
    { name: " ", role: "support", days: 1 },
  ])
    expect(() => a.issue(root, input)).toThrow();
  expect(
    s.db.prepare("SELECT version FROM migrations WHERE version=5").get(),
  ).toBeTruthy();
});
it("route permissions are bound to methods and operations instead of editable frontend role names", () => {
  expect(adminRoutePermission("GET", "/api/admin/orders")).toBe("orders");
  expect(adminRoutePermission("POST", "/api/admin/orders/abc/refund")).toBe(
    "finance",
  );
  expect(adminRoutePermission("POST", "/api/admin/orders/abc/fulfill")).toBe(
    "fulfill",
  );
  expect(adminRoutePermission("GET", "/api/admin/access")).toBe("access");
  expect(adminRoutePermission("POST", "/api/admin/support/abc/reply")).toBe(
    "support",
  );
  expect(adminRoutePermission("DELETE", "/api/admin/products")).toBeNull();
  expect(adminRoutePermission("POST", "/api/admin/unknown")).toBeNull();
});
