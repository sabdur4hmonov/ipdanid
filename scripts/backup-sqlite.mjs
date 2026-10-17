import { DatabaseSync, backup } from "node:sqlite";
import {
  existsSync,
  mkdirSync,
  chmodSync,
  renameSync,
  readdirSync,
  statSync,
  unlinkSync,
  realpathSync,
} from "node:fs";
import { resolve, join, dirname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { assertTestDatabasePath } from "../server/test-safety.mjs";
export async function backupSqlite(source, directory, now = new Date()) {
  if (!source || !directory)
    throw Error("Explicit database and backup directory required");
  assertTestDatabasePath(source);
  assertTestDatabasePath(join(directory, "backup.sqlite"));
  if (!existsSync(source)) throw Error("Database not ready");
  const input = realpathSync(resolve(source));
  mkdirSync(directory, { recursive: true });
  const targetDir = realpathSync(resolve(directory));
  if (input === targetDir || input.startsWith(targetDir + sep))
    throw Error("Database cannot be inside the backup directory");
  const name = "iprasm-" + now.toISOString().replaceAll(":", "-") + ".sqlite",
    part = join(targetDir, name + ".part"),
    target = join(targetDir, name);
  if (existsSync(part) || existsSync(target))
    throw Error("Backup already exists");
  let db;
  try {
    db = new DatabaseSync(input, { readOnly: true });
    await backup(db, part);
    db.close();
    db = undefined;
    const check = new DatabaseSync(part, { readOnly: true });
    try {
      if (check.prepare("PRAGMA quick_check").get().quick_check !== "ok")
        throw Error("Backup integrity check failed");
    } finally {
      check.close();
    }
    chmodSync(part, 0o600);
    renameSync(part, target);
    return { path: target, bytes: statSync(target).size };
  } finally {
    db?.close();
  }
}
export function pruneBackups(directory, now = Date.now(), keepDays = 14) {
  const root = realpathSync(directory);
  let removed = 0;
  for (const name of readdirSync(root)) {
    if (!/^iprasm-[0-9T.Z-]+\.sqlite$/.test(name)) continue;
    const file = join(root, name);
    if (realpathSync(file) !== file || !file.startsWith(root + sep)) continue;
    if (statSync(file).mtimeMs < now - keepDays * 86400000) {
      unlinkSync(file);
      removed++;
    }
  }
  return removed;
}
async function once() {
  const result = await backupSqlite(
    process.env.DATABASE_PATH,
    process.env.BACKUP_DIR,
  );
  const removed = pruneBackups(process.env.BACKUP_DIR);
  console.log(
    JSON.stringify({ backup: result.path, bytes: result.bytes, removed }),
  );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (process.argv.includes("--daemon")) {
    const run = async () => {
      try {
        await once();
        setTimeout(run, 86400000);
      } catch {
        console.error("Daily SQLite backup failed; retrying in10minutes");
        setTimeout(run, 600000);
      }
    };
    await run();
  } else await once();
}
