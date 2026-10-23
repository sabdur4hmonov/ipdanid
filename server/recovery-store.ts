import { validateRecoveryWrite } from "../src/recovery-contract";
import type {
  RecoveryDetails,
  RecoverySnapshot,
  RecoveryWrite,
} from "../src/recovery-types";
import type { CustomerStore } from "./customer-store";
import { DomainError } from "./store";

export function recoveryWrite(
  value: unknown,
  hash: string,
  lines: number,
): RecoveryWrite {
  try {
    return validateRecoveryWrite(value, hash, lines);
  } catch {
    throw new DomainError("Invalid recovery data");
  }
}

export class RecoveryStore {
  constructor(private store: CustomerStore) {
    store.db.exec(`CREATE TABLE IF NOT EXISTS account_recovery(
      instruction_id TEXT NOT NULL REFERENCES instructions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL, request_key TEXT NOT NULL, payload TEXT NOT NULL, details TEXT NOT NULL,
      PRIMARY KEY(instruction_id,user_id));`);
  }
  read(user: string, id: string): RecoverySnapshot {
    const progress = this.store.progress(user, id); // Ownership + tombstone, even on retry.
    const row = this.store.db
      .prepare(
        "SELECT revision,details FROM account_recovery WHERE instruction_id=? AND user_id=?",
      )
      .get(id, user);
    // A legacy progress write must not inherit an older device's cursor.
    return {
      version: "account-recovery/1",
      progress,
      details:
        row?.revision === progress.revision
          ? (JSON.parse(String(row.details)) as RecoveryDetails)
          : null,
    };
  }
  save(user: string, id: string, input: unknown): RecoverySnapshot {
    const db = this.store.db;
    db.exec("SAVEPOINT account_recovery_write");
    try {
      const guide = this.store.instruction(user, id),
        body = recoveryWrite(input, guide.sequenceHash, guide.metrics.lines);
      const current = this.read(user, id),
        payload = JSON.stringify(body);
      const previous = db
        .prepare(
          "SELECT revision,request_key,payload FROM account_recovery WHERE instruction_id=? AND user_id=?",
        )
        .get(id, user);
      if (previous?.request_key === body.requestKey) {
        if (
          previous.payload !== payload ||
          previous.revision !== current.progress.revision
        )
          throw new DomainError(
            "Recovery conflict: reload before choosing which copy to keep",
            409,
          );
        db.exec("RELEASE SAVEPOINT account_recovery_write");
        return current;
      }
      const progress = this.store.saveProgress(
        user,
        id,
        { ...current.progress, confirmed: body.confirmed },
        body.expectedRevision,
      );
      const details: RecoveryDetails = {
        resume: body.resume,
        library: body.library,
      };
      db.prepare(
        `INSERT INTO account_recovery VALUES(?,?,?,?,?,?) ON CONFLICT(instruction_id,user_id)
        DO UPDATE SET revision=excluded.revision,request_key=excluded.request_key,payload=excluded.payload,details=excluded.details`,
      ).run(
        id,
        user,
        progress.revision,
        body.requestKey,
        payload,
        JSON.stringify(details),
      );
      db.exec("RELEASE SAVEPOINT account_recovery_write");
      return { version: "account-recovery/1", progress, details };
    } catch (error) {
      db.exec("ROLLBACK TO SAVEPOINT account_recovery_write");
      db.exec("RELEASE SAVEPOINT account_recovery_write");
      throw error;
    }
  }
}
