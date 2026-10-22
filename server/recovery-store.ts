import type { RecoveryDetails, RecoverySnapshot, RecoveryWrite } from '../src/recovery-types';
import type { CustomerStore } from './customer-store';
import { DomainError } from './store';

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, names: string[]) {
  return Object.keys(value).sort().join() === [...names].sort().join();
}
function text(value: unknown, max: number, empty = false): value is string {
  return typeof value === 'string' && value.length <= max && (empty || !!value.trim()) && !/[\u0000-\u001f\u007f]/.test(value);
}
function step(value: unknown, max: number, min = 1): value is number {
  return Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
}
export function recoveryWrite(value: unknown, hash: string, lines: number): RecoveryWrite {
  if (!object(value) || !keys(value, ['sequenceHash', 'confirmed', 'expectedRevision', 'requestKey', 'resume', 'library']) ||
    value.sequenceHash !== hash || !step(value.confirmed, lines, 0) || !step(value.expectedRevision, Number.MAX_SAFE_INTEGER - 1, 0) ||
    typeof value.requestKey !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(value.requestKey)) throw new DomainError('Invalid recovery data');
  const r = value.resume, l = value.library;
  if (r !== null && (!object(r) || !keys(r, ['current', 'pace', 'resting']) || !step(r.current, lines) ||
    typeof r.pace !== 'number' || !Number.isFinite(r.pace) || r.pace < 2 || r.pace > 120 || typeof r.resting !== 'boolean'))
    throw new DomainError('Invalid recovery position');
  if (!object(l) || !keys(l, ['name', 'folder', 'bookmarks']) || !text(l.name, 120) || !text(l.folder, 80, true) ||
    !Array.isArray(l.bookmarks) || l.bookmarks.length > 100 || l.bookmarks.some(b => !object(b) || !keys(b, ['step', 'label']) ||
      !step(b.step, lines) || !text(b.label, 120, true)) || new Set(l.bookmarks.map(b => b.step)).size !== l.bookmarks.length)
    throw new DomainError('Invalid recovery library');
  // Canonical ordering makes identical retries independent of JSON key order.
  return { sequenceHash: hash, confirmed: value.confirmed, expectedRevision: value.expectedRevision, requestKey: value.requestKey,
    resume: r === null ? null : { current: Number(r.current), pace: Number(r.pace), resting: Boolean(r.resting) },
    library: { name: l.name, folder: l.folder, bookmarks: l.bookmarks.map(b => ({step: b.step, label: b.label})) } };
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
    const row = this.store.db.prepare('SELECT revision,details FROM account_recovery WHERE instruction_id=? AND user_id=?').get(id, user);
    // A legacy progress write must not inherit an older device's cursor.
    return { version: 'account-recovery/1', progress,
      details: row?.revision === progress.revision ? JSON.parse(String(row.details)) as RecoveryDetails : null };
  }
  save(user: string, id: string, input: unknown): RecoverySnapshot {
    const db = this.store.db;
    db.exec('SAVEPOINT account_recovery_write');
    try {
      const guide = this.store.instruction(user, id), body = recoveryWrite(input, guide.sequenceHash, guide.metrics.lines);
      const current = this.read(user, id), payload = JSON.stringify(body);
      const previous = db.prepare('SELECT revision,request_key,payload FROM account_recovery WHERE instruction_id=? AND user_id=?').get(id, user);
      if (previous?.request_key === body.requestKey) {
        if (previous.payload !== payload || previous.revision !== current.progress.revision)
          throw new DomainError('Recovery conflict: reload before choosing which copy to keep', 409);
        db.exec('RELEASE SAVEPOINT account_recovery_write');
        return current;
      }
      const progress = this.store.saveProgress(user, id, { ...current.progress, confirmed: body.confirmed }, body.expectedRevision);
      const details: RecoveryDetails = { resume: body.resume, library: body.library };
      db.prepare(`INSERT INTO account_recovery VALUES(?,?,?,?,?,?) ON CONFLICT(instruction_id,user_id)
        DO UPDATE SET revision=excluded.revision,request_key=excluded.request_key,payload=excluded.payload,details=excluded.details`)
        .run(id, user, progress.revision, body.requestKey, payload, JSON.stringify(details));
      db.exec('RELEASE SAVEPOINT account_recovery_write');
      return { version: 'account-recovery/1', progress, details };
    } catch (error) {
      db.exec('ROLLBACK TO SAVEPOINT account_recovery_write');
      db.exec('RELEASE SAVEPOINT account_recovery_write');
      throw error;
    }
  }
}
