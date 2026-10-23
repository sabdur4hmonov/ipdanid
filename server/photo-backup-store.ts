import { createHash } from "node:crypto";
import {
  decodePhotoDraft,
  MAX_DRAFT_BYTES,
  DRAFT_TTL,
} from "../src/photo-draft";
import { standardProfiles } from "../src/core/standard-kit";
import type {
  PhotoBackupStatus,
  PhotoBackupRead,
  PhotoBackupWrite,
  PhotoBackupDelete,
} from "../src/photo-backup-types";
import type { CustomerStore } from "./customer-store";
import { DomainError } from "./store";

function fields(input: unknown, names: string[]) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).sort().join() !== names.sort().join()
  )
    throw new DomainError("Invalid private photo fields");
  const b = input as PhotoBackupDelete;
  if (
    !Number.isSafeInteger(b.expectedRevision) ||
    b.expectedRevision < 0 ||
    typeof b.requestKey !== "string" ||
    !/^[-\w]{16,100}$/.test(b.requestKey)
  )
    throw new DomainError("Invalid private photo revision");
}
type Row = {
  user_id: string;
  revision: number;
  archive: Uint8Array | null;
  checksum: string | null;
  saved_at: number | null;
  expires_at: number | null;
  request_key: string | null;
  request_hash: string | null;
};
export class PhotoBackupStore {
  constructor(
    private store: CustomerStore,
    private maxBytes = 256 * 1024 * 1024,
  ) {
    if (
      !Number.isSafeInteger(maxBytes) ||
      maxBytes < 1 ||
      maxBytes > 2 * 1024 * 1024 * 1024
    )
      throw Error("Invalid private photo capacity");
    store.db.exec(`CREATE TABLE IF NOT EXISTS photo_backups(
      user_id TEXT PRIMARY KEY REFERENCES users(id),revision INTEGER NOT NULL,
      archive BLOB,checksum TEXT,saved_at INTEGER,expires_at INTEGER,request_key TEXT,request_hash TEXT);
      CREATE INDEX IF NOT EXISTS photo_backup_expiry ON photo_backups(expires_at);`);
  }
  authorize(user: string) {
    if (
      this.store.db.prepare("SELECT role FROM users WHERE id=?").get(user)
        ?.role !== "maker"
    )
      throw new DomainError("Sign in to a customer account first", 403);
  }
  private row(user: string) {
    return this.store.db
      .prepare("SELECT * FROM photo_backups WHERE user_id=?")
      .get(user) as Row | undefined;
  }
  private tx<T>(fn: () => T): T {
    this.store.db.exec("SAVEPOINT private_photo");
    try {
      const result = fn();
      this.store.db.exec("RELEASE SAVEPOINT private_photo");
      return result;
    } catch (e) {
      this.store.db.exec("ROLLBACK TO SAVEPOINT private_photo");
      this.store.db.exec("RELEASE SAVEPOINT private_photo");
      throw e;
    }
  }
  prune(now = Date.now()) {
    this.store.db
      .prepare(
        `UPDATE photo_backups SET archive=NULL,checksum=NULL,saved_at=NULL,expires_at=NULL,
      request_key=NULL,request_hash=NULL,revision=revision+1 WHERE archive IS NOT NULL AND expires_at<=?`,
      )
      .run(now);
  }
  status(user: string, now = Date.now()): PhotoBackupStatus {
    this.authorize(user);
    this.prune(now);
    const r = this.row(user);
    return {
      version: "private-photo-backup/1",
      revision: r?.revision ?? 0,
      available: !!r?.archive,
      savedAt: r?.saved_at ?? null,
      expiresAt: r?.expires_at ?? null,
      checksum: r?.checksum ?? null,
    };
  }
  read(user: string, now = Date.now()): PhotoBackupRead {
    const status = this.status(user, now),
      r = this.row(user);
    if (!r?.archive) throw new DomainError("No private photo backup", 404);
    return { status, archive: Buffer.from(r.archive).toString("base64") };
  }
  async save(
    user: string,
    input: unknown,
    stillAuthorized: () => void = () => {},
    now = Date.now(),
  ): Promise<PhotoBackupStatus> {
    this.authorize(user);
    fields(input, ["consent", "expectedRevision", "requestKey", "archive"]);
    const b = input as PhotoBackupWrite;
    if (
      b.consent !== "private-photo-backup/1" ||
      typeof b.archive !== "string" ||
      b.archive.length > Math.ceil(MAX_DRAFT_BYTES / 3) * 4 ||
      b.archive.length % 4 !== 0 ||
      /[^A-Za-z0-9+/=]/.test(b.archive)
    )
      throw new DomainError(
        "Explicit private photo consent and valid archive required",
      );
    const bytes = Buffer.from(b.archive, "base64");
    if (bytes.toString("base64") !== b.archive)
      throw new DomainError("Invalid private photo encoding");
    let draft;
    try {
      draft = await decodePhotoDraft(Uint8Array.from(bytes), now);
      standardProfiles(draft.config);
    } catch {
      throw new DomainError("Invalid or expired private photo archive");
    }
    const checksum = createHash("sha256").update(bytes).digest("hex"),
      fingerprint = `save:${b.expectedRevision}:${checksum}`;
    // Validation yields to crypto: logout/account erasure during it must win.
    stillAuthorized();
    this.authorize(user);
    return this.tx(() => {
      const current = this.status(user, now),
        old = this.row(user);
      if (old?.request_key === b.requestKey) {
        if (old.request_hash !== fingerprint || !old.archive)
          throw new DomainError("Private photo conflict", 409);
        return current;
      }
      if (current.revision !== b.expectedRevision)
        throw new DomainError("Private photo conflict: refresh first", 409);
      const total = Number(
        this.store.db
          .prepare(
            "SELECT coalesce(sum(length(archive)),0) AS n FROM photo_backups",
          )
          .get()?.n ?? 0,
      );
      if (total - (old?.archive?.length ?? 0) + bytes.length > this.maxBytes)
        throw new DomainError("Private photo storage is full", 507);
      this.store.db
        .prepare(
          `INSERT INTO photo_backups VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
        revision=excluded.revision,archive=excluded.archive,checksum=excluded.checksum,saved_at=excluded.saved_at,
        expires_at=excluded.expires_at,request_key=excluded.request_key,request_hash=excluded.request_hash`,
        )
        .run(
          user,
          current.revision + 1,
          bytes,
          checksum,
          now,
          Math.min(now + DRAFT_TTL, draft.savedAt + DRAFT_TTL),
          b.requestKey,
          fingerprint,
        );
      return this.status(user, now);
    });
  }
  remove(user: string, input: unknown, now = Date.now()): PhotoBackupStatus {
    this.authorize(user);
    fields(input, ["expectedRevision", "requestKey"]);
    const b = input as PhotoBackupDelete;
    return this.tx(() => {
      const current = this.status(user, now),
        old = this.row(user),
        fingerprint = `delete:${b.expectedRevision}`;
      if (old?.request_key === b.requestKey) {
        if (old.request_hash !== fingerprint)
          throw new DomainError("Private photo conflict", 409);
        return current;
      }
      if (current.revision !== b.expectedRevision)
        throw new DomainError("Private photo conflict: refresh first", 409);
      this.store.db
        .prepare(
          `INSERT INTO photo_backups VALUES(?,?,NULL,NULL,NULL,NULL,?,?) ON CONFLICT(user_id)
        DO UPDATE SET revision=excluded.revision,archive=NULL,checksum=NULL,saved_at=NULL,expires_at=NULL,request_key=excluded.request_key,request_hash=excluded.request_hash`,
        )
        .run(user, current.revision + 1, b.requestKey, fingerprint);
      return this.status(user, now);
    });
  }
  eraseAccount(user: string) {
    this.store.db
      .prepare(
        `UPDATE photo_backups SET revision=revision+1,archive=NULL,checksum=NULL,saved_at=NULL,expires_at=NULL,request_key=NULL,request_hash=NULL WHERE user_id=?`,
      )
      .run(user);
  }
}
