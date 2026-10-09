// Operator CLI: encrypted consistent SQLite snapshot + matching local configuration.
import { DatabaseSync } from "node:sqlite";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  sealLocalBackup,
  openLocalBackup,
  type LocalSecrets,
} from "../server/backup";
const [mode, pathArg] = process.argv.slice(2),
  passphrase = process.env.IP_RASM_BACKUP_PASSPHRASE;
if (!passphrase)
  throw Error(
    "Set IP_RASM_BACKUP_PASSPHRASE in this process. Never pass it on the command line or commit it.",
  );
if (mode === "create") {
  const database = resolve(
      process.env.DATABASE_PATH ?? "tmp/data/iprasm.sqlite",
    ),
    config = resolve("tmp/data/local-secrets.json");
  if (!existsSync(database) || !existsSync(config))
    throw Error(
      "Existing local database/configuration required; no new service is seeded.",
    );
  const saved = JSON.parse(readFileSync(config, "utf8")) as LocalSecrets;
  const secrets = {
    LOCAL_ADMIN_TOKEN: process.env.LOCAL_ADMIN_TOKEN ?? saved.LOCAL_ADMIN_TOKEN,
    CODE_PEPPER: process.env.CODE_PEPPER ?? saved.CODE_PEPPER,
    SANDBOX_PAYMENT_KEY:
      process.env.SANDBOX_PAYMENT_KEY ?? saved.SANDBOX_PAYMENT_KEY,
  };
  const out = resolve(
    pathArg ??
      `tmp/backups/iprasm-${new Date().toISOString().replace(/[:.]/g, "-")}.iprasm-backup`,
  );
  if (existsSync(out))
    throw Error("Preserve the existing backup; choose a new output file.");
  mkdirSync(resolve("tmp/backup-work"), { recursive: true });
  const snapshot = resolve(`tmp/backup-work/${randomUUID()}.sqlite`);
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    db.prepare("VACUUM INTO ?").run(snapshot);
    const version = Number(
      (
        db.prepare("SELECT max(version) AS n FROM migrations").get() as {
          n: number;
        }
      ).n,
    );
    const sealed = sealLocalBackup(
      readFileSync(snapshot),
      secrets,
      passphrase,
      version,
    );
    mkdirSync(resolve(out, ".."), { recursive: true });
    writeFileSync(out, sealed, { flag: "wx", mode: 0o600 });
    console.log(
      JSON.stringify({
        output: out,
        encrypted: true,
        consistentSnapshot: true,
        schemaVersion: version,
        photosIncluded: false,
      }),
    );
  } finally {
    db.close();
    if (existsSync(snapshot)) rmSync(snapshot);
  }
} else if (mode === "restore") {
  const destination = process.argv[4];
  if (!pathArg || !destination)
    throw Error(
      "Usage: local-backup.ts restore backup-file NEW-destination-directory",
    );
  const out = resolve(destination);
  if (existsSync(out))
    throw Error(
      "Restore requires a new directory. Existing data is never replaced.",
    );
  const backup = openLocalBackup(readFileSync(resolve(pathArg)), passphrase);
  mkdirSync(out, { recursive: true });
  const database = join(out, "iprasm.sqlite");
  writeFileSync(database, backup.database, { flag: "wx", mode: 0o600 });
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    const integrity = db.prepare("PRAGMA integrity_check").get();
    if (!integrity || Object.values(integrity)[0] !== "ok")
      throw Error(
        "Restored SQLite integrity check failed; do not activate this directory.",
      );
    const version = Number(
      (
        db.prepare("SELECT max(version) AS n FROM migrations").get() as {
          n: number;
        }
      ).n,
    );
    if (version !== backup.schemaVersion)
      throw Error("Restored migration version mismatch; do not activate.");
  } finally {
    db.close();
  }
  writeFileSync(
    join(out, "local-secrets.json"),
    JSON.stringify(backup.secrets),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      output: out,
      integrityChecked: true,
      configurationRestored: true,
      activeDataReplaced: false,
    }),
  );
} else
  throw Error(
    "Usage: local-backup.ts create [new-backup-file] OR restore backup-file NEW-directory",
  );
