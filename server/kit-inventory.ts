// Offline owner issuance. Public HTTP batch limits remain unchanged.
import { KitStore } from "./kit-store";
import { DomainError } from "./store";
export type InventoryRow = {
  id: string;
  actor: string;
  profile: string;
  total: number;
  issued: number;
  status: "staging" | "ready" | "failed" | "revoked";
  created_at: number;
};
export class KitInventory {
  private serial = 0;
  constructor(readonly store: KitStore) {}
  private tx<T>(fn: () => T): T {
    const db = this.store.db,
      nested = db.isTransaction,
      point = "inventory_" + ++this.serial;
    db.exec(nested ? "SAVEPOINT " + point : "BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec(nested ? "RELEASE SAVEPOINT " + point : "COMMIT");
      return result;
    } catch (e) {
      db.exec(nested ? "ROLLBACK TO SAVEPOINT " + point : "ROLLBACK");
      if (nested) db.exec("RELEASE SAVEPOINT " + point);
      throw e;
    }
  }
  get(id: string): InventoryRow {
    const row = this.store.db
      .prepare("SELECT * FROM kit_inventories WHERE id=?")
      .get(id);
    if (!row) throw new DomainError("Inventory not found", 404);
    return row as unknown as InventoryRow;
  }
  begin(actor: string, profile: string, total: number, key: string) {
    if (
      !actor ||
      actor.length > 100 ||
      !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(profile) ||
      !Number.isSafeInteger(total) ||
      total < 1 ||
      total > 1000000 ||
      !/^[-\w]{8,100}$/.test(key)
    )
      throw new DomainError("Invalid private inventory");
    const id =
      "inventory-" +
      this.store.digest("private-kit-inventory:" + actor + ":" + key);
    return this.tx(() => {
      if (
        this.store.db
          .prepare("SELECT 1 FROM kit_inventories WHERE id=?")
          .get(id)
      )
        throw new DomainError(
          "Inventory already exists; inspect it before a new issuance",
          409,
        );
      this.store.db
        .prepare("INSERT INTO kit_inventories VALUES(?,?,?,?,0,'staging',?)")
        .run(id, actor, profile, total, Date.now());
      return this.get(id);
    });
  }
  append(
    id: string,
    count: number,
    consume: (codes: ReturnType<KitStore["issueKitBatch"]>["codes"]) => void,
  ) {
    return this.tx(() => {
      const row = this.get(id);
      if (
        row.status !== "staging" ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 100 ||
        row.issued + count > row.total
      )
        throw new DomainError("Inventory is not appendable", 409);
      const key = "inventory-" + id.slice(10) + "-" + row.issued;
      const batch = this.store.issueKitBatch(
        row.actor,
        row.profile,
        count,
        key,
        { quota: 3, creditDays: 0, codeDays: 0 },
      );
      this.store.db
        .prepare("INSERT INTO kit_inventory_batches VALUES(?,?)")
        .run(batch.id, id);
      consume(batch.codes); // Failure rolls back this chunk; earlier chunks remain STAGING.
      this.store.db
        .prepare("UPDATE kit_inventories SET issued=issued+? WHERE id=?")
        .run(count, id);
      return this.get(id);
    });
  }
  activate(id: string) {
    return this.tx(() => {
      const row = this.get(id);
      if (row.status !== "staging" || row.issued !== row.total)
        throw new DomainError("Inventory export is incomplete", 409);
      this.store.db
        .prepare("UPDATE kit_inventories SET status='ready' WHERE id=?")
        .run(id);
      return this.get(id);
    });
  }
  fail(id: string) {
    this.store.db
      .prepare(
        "UPDATE kit_inventories SET status='failed' WHERE id=? AND status='staging'",
      )
      .run(id);
    return this.get(id);
  }
  revoke(id: string) {
    this.get(id);
    this.store.db
      .prepare("UPDATE kit_inventories SET status='revoked' WHERE id=?")
      .run(id);
    return this.get(id);
  }
}
