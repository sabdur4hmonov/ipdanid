import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
export type LocalSecrets = {
  LOCAL_ADMIN_TOKEN: string;
  CODE_PEPPER: string;
  SANDBOX_PAYMENT_KEY: string;
};
const FORMAT = "iprasm.local-backup/1",
  MAX_BYTES = 64 * 1024 * 1024;
function key(passphrase: string, salt: Buffer) {
  if (
    typeof passphrase !== "string" ||
    passphrase.length < 16 ||
    passphrase.length > 1024
  )
    throw Error("Backup passphrase must contain16–1024characters");
  return scryptSync(passphrase, salt, 32, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
}
function secretsValid(value: unknown): value is LocalSecrets {
  return (
    !!value &&
    typeof value === "object" &&
    ["LOCAL_ADMIN_TOKEN", "CODE_PEPPER", "SANDBOX_PAYMENT_KEY"].every(
      (k) =>
        typeof (value as Record<string, unknown>)[k] === "string" &&
        (value as Record<string, string>)[k].length >= 32 &&
        (value as Record<string, string>)[k].length <= 1024,
    )
  );
}
function decode(value: unknown, bytes?: number) {
  if (
    typeof value !== "string" ||
    !value.length ||
    value.length > Math.ceil(MAX_BYTES * 2) ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  )
    throw Error("Invalid backup data");
  const result = Buffer.from(value, "base64");
  if (
    result.toString("base64") !== value ||
    (bytes !== undefined && result.length !== bytes)
  )
    throw Error("Invalid backup data");
  return result;
}
export function sealLocalBackup(
  database: Buffer,
  secrets: LocalSecrets,
  passphrase: string,
  schemaVersion: number,
) {
  if (
    database.length < 16 ||
    database.length > MAX_BYTES ||
    database.subarray(0, 16).toString() !== "SQLite format 3\0" ||
    !secretsValid(secrets) ||
    !Number.isInteger(schemaVersion) ||
    schemaVersion < 1 ||
    schemaVersion > 5
  )
    throw Error("Invalid local snapshot");
  const salt = randomBytes(16),
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(passphrase, salt), iv);
  cipher.setAAD(Buffer.from(FORMAT));
  const payload = Buffer.from(
    JSON.stringify({
      database: database.toString("base64"),
      secrets,
      createdAt: new Date().toISOString(),
      schemaVersion,
    }),
  );
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return Buffer.from(
    JSON.stringify({
      format: FORMAT,
      salt: salt.toString("base64"),
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      data: encrypted.toString("base64"),
    }),
  );
}
export function openLocalBackup(encoded: Buffer, passphrase: string) {
  if (encoded.length > MAX_BYTES * 2)
    throw Error("Backup exceeds supported size");
  try {
    const envelope = JSON.parse(encoded.toString("utf8"));
    if (envelope.format !== FORMAT) throw Error("Unsupported format");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(passphrase, decode(envelope.salt, 16)),
      decode(envelope.iv, 12),
    );
    decipher.setAAD(Buffer.from(FORMAT));
    decipher.setAuthTag(decode(envelope.tag, 16));
    const payload = JSON.parse(
      Buffer.concat([
        decipher.update(decode(envelope.data)),
        decipher.final(),
      ]).toString("utf8"),
    );
    const database = decode(payload.database);
    if (
      database.length > MAX_BYTES ||
      database.subarray(0, 16).toString() !== "SQLite format 3\0" ||
      !secretsValid(payload.secrets) ||
      !Number.isInteger(payload.schemaVersion) ||
      payload.schemaVersion < 1 ||
      payload.schemaVersion > 5
    )
      throw Error("Unsupported snapshot");
    return {
      database,
      secrets: payload.secrets as LocalSecrets,
      schemaVersion: Number(payload.schemaVersion),
      createdAt: String(payload.createdAt),
    };
  } catch {
    throw Error(
      "Backup could not be authenticated. Check the passphrase and complete original file.",
    );
  }
}
