export type PhotoBackupStatus = {
  version: "private-photo-backup/1";
  revision: number;
  available: boolean;
  savedAt: number | null;
  expiresAt: number | null;
  checksum: string | null;
};
export type PhotoBackupWrite = {
  consent: "private-photo-backup/1";
  expectedRevision: number;
  requestKey: string;
  archive: string;
};
export type PhotoBackupDelete = {
  expectedRevision: number;
  requestKey: string;
};
export type PhotoBackupRead = { status: PhotoBackupStatus; archive: string };
