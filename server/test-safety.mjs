import { resolve, dirname, basename, join } from "node:path";
import { existsSync, realpathSync } from "node:fs";

// Resolve existing ancestors too: a symlink must not redirect tests to owner data.
function canonical(path) {
  let current = resolve(path);
  const suffix = [];
  while (!existsSync(current)) {
    suffix.unshift(basename(current));
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return join(realpathSync(current), ...suffix)
    .replaceAll("\\", "/")
    .toLowerCase();
}

export function assertTestDatabasePath(path) {
  if (!path)
    throw Error("Test server requires an explicit isolated DATABASE_PATH");
  if (path === ":memory:") return;
  for (const value of [
    resolve(path).replaceAll("\\", "/").toLowerCase(),
    canonical(path),
  ]) {
    if (/(^|\/)tmp\/data(\/|$)/.test(value))
      throw Error(
        "Unsafe test DATABASE_PATH: tmp/data is owner data and is forbidden",
      );
  }
}
