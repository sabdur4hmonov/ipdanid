import { randomUUID } from "node:crypto";
import type { KitStore } from "./kit-store";
import { DomainError } from "./store";

// Construct after feature stores. A tombstone retains no credentials or photos.
export class AccountErasureStore {
  private tables: Set<string>;
  private cursor = "";
  constructor(private store: KitStore) {
    this.tables = new Set(
      store.db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all()
        .map((r) => String(r.name)),
    );
    for (const [table, column, condition] of [
      ["accounts", "user_id", "1"],
      ["media", "user_id", "1"],
      ["progress", "user_id", "1"],
      ["reviews", "user_id", "1"],
      ["account_recovery", "user_id", "1"],
      ["photo_backups", "user_id", "NEW.archive IS NOT NULL"],
      ["gallery_posts", "user_id", "NEW.image IS NOT NULL"],
      ["analytics_events", "user_id", "1"],
      ["analytics_assembly", "user_id", "1"],
      ["analytics_preferences", "user_id", "1"],
      ["mail_preferences", "user_id", "1"],
      ["transactional_outbox", "user_id", "1"],
      ["push_devices", "account_id", "NEW.cipher!=''"],
    ])
      if (this.tables.has(table))
        for (const action of ["INSERT", "UPDATE"])
          store.db
            .exec(`CREATE TRIGGER IF NOT EXISTS erased_${table}_${action} BEFORE ${action} ON ${table}
        WHEN (${condition}) AND EXISTS(SELECT 1 FROM account_erasure WHERE user_id=NEW.${column})
        BEGIN SELECT RAISE(ABORT,'Account erased'); END;`);
  }
  private tx<T>(fn: () => T): T {
    const db = this.store.db;
    db.exec("SAVEPOINT erase_account");
    try {
      const result = fn();
      db.exec("RELEASE SAVEPOINT erase_account");
      return result;
    } catch (e) {
      db.exec("ROLLBACK TO SAVEPOINT erase_account");
      db.exec("RELEASE SAVEPOINT erase_account");
      throw e;
    }
  }
  preview(user: string) {
    this.store.assertAccountActive(user);
    if (
      this.store.db.prepare("SELECT role FROM users WHERE id=?").get(user)
        ?.role !== "maker"
    )
      throw new DomainError("Registered or kit account required", 403);
    return {
      version: "account-erasure/1" as const,
      credential: this.store.db
        .prepare("SELECT 1 FROM accounts WHERE user_id=?")
        .get(user)
        ? "password"
        : "kit-code",
      activeOrders: Number(
        this.store.db
          .prepare(
            "SELECT count(*) AS n FROM orders WHERE user_id=? AND status NOT IN ('fulfilled','cancelled','refunded')",
          )
          .get(user)!.n,
      ),
      financialRecordsRetained: true as const,
    };
  }
  erase(user: string, input: unknown) {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).sort().join() !== "confirm,credential" ||
      (input as { confirm: unknown }).confirm !== "erase-account/1"
    )
      throw new DomainError("Explicit account erasure confirmation required");
    this.store.confirmAccountErasure(
      user,
      (input as { credential: unknown }).credential,
    );
    const details = this.preview(user),
      db = this.store.db;
    return this.tx(() => {
      const remove = (table: string, column = "user_id") => {
        if (this.tables.has(table))
          db.prepare(`DELETE FROM ${table} WHERE ${column}=?`).run(user);
      };
      for (const table of [
        "account_recovery",
        "progress",
        "reviews",
        "gallery_posts",
        "photo_backups",
        "analytics_events",
        "analytics_assembly",
        "analytics_preferences",
        "transactional_outbox",
        "mail_preferences",
        "messages",
        "media",
      ])
        remove(table);
      remove("push_deliveries", "account_id");
      remove("push_devices", "account_id");
      for (const table of ["analytics_blocks", "notification_blocks"])
        if (this.tables.has(table))
          db.prepare(`INSERT OR IGNORE INTO ${table}(user_id) VALUES(?)`).run(
            user,
          );
      db.prepare(
        "UPDATE jobs SET instruction_id=NULL,status=CASE WHEN status='reserved' THEN 'failed' ELSE status END WHERE user_id=?",
      ).run(user);
      db.prepare(
        "DELETE FROM instructions WHERE project_id IN (SELECT id FROM projects WHERE user_id=?)",
      ).run(user);
      remove("projects");
      remove("build_requests", "account_id");
      // Preserve claimed ownership and accounting: erasure never frees a code.
      db.prepare("UPDATE kit_codes SET revoked=1 WHERE account_id=?").run(user);
      remove("accounts");
      remove("sessions");
      if (this.tables.has("offer_codes"))
        db.prepare("UPDATE offer_codes SET active=0 WHERE owner_id=?").run(
          user,
        );
      if (this.tables.has("offer_quotes"))
        db.prepare(
          "DELETE FROM offer_quotes WHERE user_id=? AND order_id IS NULL",
        ).run(user);
      if (this.tables.has("digital_purchases"))
        for (const row of db
          .prepare(
            "SELECT order_id,snapshot FROM digital_purchases WHERE buyer_id=?",
          )
          .all(user)) {
          const snapshot = JSON.parse(String(row.snapshot));
          snapshot.name = "";
          db.prepare(
            "UPDATE digital_purchases SET payload='{}',snapshot=? WHERE order_id=?",
          ).run(JSON.stringify(snapshot), row.order_id);
        }
      if (this.tables.has("partner_accounts"))
        for (const row of db
          .prepare("SELECT id,data FROM partner_accounts WHERE account_id=?")
          .all(user)) {
          const data = JSON.parse(String(row.data));
          data.name = "Deleted account";
          data.enabled = false;
          db.prepare(
            "UPDATE partner_accounts SET data=?,revision=revision+1 WHERE id=?",
          ).run(JSON.stringify(data), row.id);
          if (this.tables.has("partner_campaigns"))
            db.prepare(
              "UPDATE partner_campaigns SET name='Deleted account' WHERE partner_id=?",
            ).run(row.id);
        }
      db.prepare("INSERT INTO account_erasure VALUES(?,?)").run(
        user,
        Date.now(),
      );
      this.scrubOperations(user);
      db.prepare("INSERT INTO audit VALUES(?,?,?,?,?)").run(
        randomUUID(),
        user,
        "account.erase",
        user,
        new Date().toISOString(),
      );
      return { ...details, erased: true as const };
    });
  }
  private scrubOperations(user: string) {
    const db = this.store.db;
    db.prepare(
      "UPDATE orders SET address='{}' WHERE user_id=? AND status IN ('fulfilled','cancelled','refunded')",
    ).run(user);
    db.prepare(
      "UPDATE fulfillments SET tracking=NULL WHERE order_id IN (SELECT id FROM orders WHERE user_id=? AND status IN ('fulfilled','cancelled','refunded'))",
    ).run(user);
    db.prepare(
      "DELETE FROM ticket_replies WHERE ticket_id IN (SELECT t.id FROM tickets t LEFT JOIN orders o ON o.id=t.order_id WHERE t.user_id=? AND (o.id IS NULL OR o.status IN ('fulfilled','cancelled','refunded')))",
    ).run(user);
    db.prepare(
      "UPDATE tickets SET subject='Deleted account',body='' WHERE user_id=? AND (order_id IS NULL OR order_id IN (SELECT id FROM orders WHERE status IN ('fulfilled','cancelled','refunded')))",
    ).run(user);
    if (this.tables.has("commissions"))
      for (const row of db
        .prepare("SELECT id,data FROM commissions WHERE buyer_id=?")
        .all(user)) {
        const data = JSON.parse(String(row.data));
        const active =
          typeof data.orderId === "string" &&
          db
            .prepare(
              "SELECT 1 FROM orders WHERE id=? AND user_id=? AND status NOT IN ('fulfilled','cancelled','refunded')",
            )
            .get(data.orderId, user);
        if (!active)
          db.prepare("DELETE FROM commissions WHERE id=?").run(row.id);
        else {
          data.note = "";
          data.acceptPayload = null;
          db.prepare(
            "UPDATE commissions SET payload='{}',data=? WHERE id=?",
          ).run(JSON.stringify(data), row.id);
        }
      }
  }
  prune() {
    // Bound work per minute. No need to scan every erased account in one tick.
    return this.tx(() => {
      const rows = this.store.db
        .prepare(
          "SELECT user_id FROM account_erasure WHERE user_id>? ORDER BY user_id LIMIT 200",
        )
        .all(this.cursor);
      for (const row of rows) this.scrubOperations(String(row.user_id));
      this.cursor = rows.length === 200 ? String(rows.at(-1)!.user_id) : "";
    });
  }
}
