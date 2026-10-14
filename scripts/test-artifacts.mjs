import { mkdirSync, mkdtempSync } from "node:fs";
import { resolve, join } from "node:path";
import { assertTestDatabasePath } from "../server/test-safety.mjs";

export function freshTestDatabase(prefix) {
  if (!/^[a-z][a-z0-9-]*$/.test(prefix)) throw Error("Invalid test prefix");
  if (process.env.DATABASE_PATH) assertTestDatabasePath(process.env.DATABASE_PATH);
  const root = resolve(process.env.IP_RASM_TEST_ARTIFACTS || "test-results");
  assertTestDatabasePath(join(root, "database.sqlite"));
  mkdirSync(root, { recursive: true });
  const directory = mkdtempSync(join(root, prefix + "-"));
  return { directory, databasePath: join(directory, "database.sqlite") };
}
