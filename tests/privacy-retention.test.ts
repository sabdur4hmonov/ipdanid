import { expect, test } from "vitest";
import { fullServerStore } from "./helpers/full-server-store";
import { AccountErasureStore } from "../server/account-erasure-store";
import { auditRetentionSchema } from "../server/privacy-retention";
test("all production feature tables have a reviewed privacy disposition; new private schema fails the audit", () => {
  const { store } = fullServerStore();
  const erase = new AccountErasureStore(store);
  try {
    const rows = auditRetentionSchema(store.db);
    expect(rows.length).toBeGreaterThan(80);
    expect(rows.find((r) => r.table === "photo_backups")?.disposition).toBe(
      "erase",
    );
    expect(rows.find((r) => r.table === "orders")?.disposition).toBe(
      "conditional",
    );
    expect(rows.find((r) => r.table === "credit_ledger")?.disposition).toBe(
      "accounting",
    );
    store.db.exec(
      "CREATE TABLE unreviewed_private_data(user_id TEXT,payload TEXT)",
    );
    expect(() => auditRetentionSchema(store.db)).toThrow(
      "Unclassified privacy tables",
    );
  } finally {
    erase.close();
    store.close();
  }
});
