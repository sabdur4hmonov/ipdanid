import {
  decodePhotoDraft,
  encodePhotoDraft,
  MAX_DRAFT_BYTES,
  type PhotoDraft,
} from "./photo-draft";
import type {
  PhotoBackupRead,
  PhotoBackupStatus,
  PhotoBackupWrite,
  PhotoBackupDelete,
} from "./photo-backup-types";
export type PendingPhotoBackup = {
  createdAt: number;
  action: "save" | "delete";
  body: PhotoBackupWrite | PhotoBackupDelete;
};
export function checkedPhotoStatus(s: PhotoBackupStatus): PhotoBackupStatus {
  if (
    !s ||
    s.version !== "private-photo-backup/1" ||
    !Number.isSafeInteger(s.revision) ||
    s.revision < 0 ||
    typeof s.available !== "boolean" ||
    (s.available
      ? !Number.isSafeInteger(s.savedAt) ||
        !Number.isSafeInteger(s.expiresAt) ||
        s.savedAt! > s.expiresAt! ||
        !/^[a-f0-9]{64}$/.test(s.checksum ?? "")
      : s.savedAt !== null || s.expiresAt !== null || s.checksum !== null)
  )
    throw Error("photo-backup/status");
  return s;
}
function fromBase64(value: string) {
  if (
    typeof value !== "string" ||
    value.length > Math.ceil(MAX_DRAFT_BYTES / 3) * 4 ||
    value.length % 4 ||
    /[^A-Za-z0-9+/=]/.test(value)
  )
    throw Error("photo-backup/size");
  const raw = atob(value);
  if (btoa(raw) !== value) throw Error("photo-backup/encoding");
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
export async function photoUpload(
  draft: PhotoDraft,
  expectedRevision: number,
): Promise<PhotoBackupWrite> {
  const bytes = await encodePhotoDraft(draft);
  let raw = "";
  for (let i = 0; i < bytes.length; i += 8192)
    raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return {
    consent: "private-photo-backup/1",
    expectedRevision,
    requestKey: crypto.randomUUID(),
    archive: btoa(raw),
  };
}
export async function checkedPhotoRead(read: PhotoBackupRead) {
  const s = checkedPhotoStatus(read.status);
  if (!s.available || s.expiresAt! <= Date.now())
    throw Error("photo-backup/expired");
  const bytes = fromBase64(read.archive);
  const checksum = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (n) => n.toString(16).padStart(2, "0"),
  ).join("");
  if (checksum !== s.checksum) throw Error("photo-backup/checksum");
  return decodePhotoDraft(bytes);
}
export async function checkedPendingPhoto(
  p: PendingPhotoBackup,
  now = Date.now(),
) {
  if (
    !p ||
    Object.keys(p).sort().join() !== "action,body,createdAt" ||
    !Number.isSafeInteger(p.createdAt) ||
    p.createdAt > now + 60000 ||
    p.createdAt <= now - 7 * 86400000 ||
    !["save", "delete"].includes(p.action)
  )
    throw Error("photo-backup/pending");
  const b = p.body;
  if (
    !b ||
    !Number.isSafeInteger(b.expectedRevision) ||
    b.expectedRevision < 0 ||
    typeof b.requestKey !== "string" ||
    !/^[-\w]{16,100}$/.test(b.requestKey) ||
    Object.keys(b).sort().join() !==
      (p.action === "save"
        ? "archive,consent,expectedRevision,requestKey"
        : "expectedRevision,requestKey")
  )
    throw Error("photo-backup/pending");
  if (p.action === "save") {
    const write = b as PhotoBackupWrite;
    if (write.consent !== "private-photo-backup/1")
      throw Error("photo-backup/consent");
    await decodePhotoDraft(fromBase64(write.archive), now);
  }
  return p;
}
