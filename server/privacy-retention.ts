import type { DatabaseSync } from "node:sqlite";
// Every production table needs a reviewed disposition. This is a schema-drift
// guard, not a legal retention-period certification or physical disk erasure.
export const RETENTION_TABLES = {
  erase: [
    "account_recovery",
    "accounts",
    "analytics_assembly",
    "analytics_events",
    "analytics_preferences",
    "build_requests",
    "gallery_posts",
    "instructions",
    "mail_preferences",
    "media",
    "messages",
    "photo_backups",
    "progress",
    // Owned temporary guides are erased; unclaimed rows expire after30minutes.
    "protected_generations",
    "projects",
    "push_deliveries",
    "push_devices",
    "reviews",
    "sessions",
    "transactional_outbox",
  ],
  conditional: [
    "commissions",
    "digital_purchases",
    "fulfillments",
    "jobs",
    "offer_codes",
    "offer_quotes",
    "orders",
    "partner_accounts",
    "partner_campaigns",
    "ticket_replies",
    "tickets",
  ],
  accounting: [
    "trial_batches","trial_codes","trial_claims",
    "build_unlocks",
    "campaigns",
    "catalog_reservations",
    "code_batches",
    "codes",
    "credit_ledger",
    "finance_reconciliations",
    "gifts",
    "kit_batches",
    "kit_codes",
    "kit_grants",
    "kit_inventories",
    "kit_inventory_batches",
    "kit_limits",
    "manual_receipts",
    "manual_refunds",
    "offer_redemptions",
    "order_actual_cost_history",
    "order_actual_costs",
    "order_commerce",
    "order_lines",
    "partner_quotes",
    "payments",
    "redemptions",
    "referrals",
  ],
  antiRevival: [
    "account_erasure",
    "analytics_blocks",
    "notification_blocks",
    "erasure_ledger_binding",
  ],
  sharedOrStaff: [
    "trial_policy",
    "announcement_requests",
    "announcements",
    "audit",
    "catalog_skus",
    "catalog_state",
    "commerce_regions",
    "commission_products",
    "content",
    "journey_products",
    "kit_settings",
    "kit_signer",
    "migrations",
    "offer_policy",
    "owner_sessions",
    "product_details",
    "products",
    "profiles",
    "promotions",
    "push_batches",
    "region_configuration",
    "staff_access",
    "standard_kit_history",
    "standard_kit_profiles",
    "storefront_settings",
    "users",
  ],
} as const;
export function auditRetentionSchema(db: DatabaseSync) {
  const policy = new Map<string, string>();
  for (const [kind, tables] of Object.entries(RETENTION_TABLES))
    for (const table of tables) {
      if (policy.has(table)) throw Error("Duplicate privacy disposition");
      policy.set(table, kind);
    }
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all();
  const unknown = tables
    .map((r) => String(r.name))
    .filter((name) => !policy.has(name));
  if (unknown.length)
    throw Error("Unclassified privacy tables: " + unknown.join(","));
  return tables.map((r) => ({
    table: String(r.name),
    disposition: policy.get(String(r.name))!,
  }));
}
