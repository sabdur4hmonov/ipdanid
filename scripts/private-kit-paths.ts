import { resolve, dirname, join, sep } from "node:path";
import { existsSync, realpathSync } from "node:fs";
import { assertTestDatabasePath } from "../server/test-safety.mjs";
export function privateKitDirectory(value: string, mode: "new" | "existing") {
  const root = resolve("output/phase16-private"),
    directory = resolve(value);
  if (
    !directory.startsWith(root + sep) ||
    (mode === "new" ? existsSync(directory) : !existsSync(directory))
  )
    throw Error("Invalid private inventory output");
  for (let path = directory; ; path = dirname(path)) {
    if (
      existsSync(path) &&
      resolve(realpathSync(path)).toLowerCase() !== path.toLowerCase()
    )
      throw Error("Symlinked private output is refused");
    if (dirname(path) === path) break;
  }
  assertTestDatabasePath(join(directory, "database.sqlite"));
  return directory;
}
