import { resolve, dirname, basename, join } from "node:path";
import { existsSync, realpathSync } from "node:fs";

export function assertTestPorts(preview, api) {
  const protectedPorts = [
    4194, 4195, 4196, 4197, 4198, 4199, 4200, 4210, 4211, 4212, 4213, 4214,
    4331, 4465, 4478, 4479, 4480, 4481, 4482, 4650, 4651, 4652, 4653, 4654,
  ];
  for (const port of [preview, api])
    if (
      !Number.isInteger(port) ||
      port < 1024 ||
      port > 65535 ||
      protectedPorts.includes(port)
    )
      throw Error(
        "Invalid local test port (owner previews and APIs are reserved)",
      );
  if (preview === api) throw Error("Test ports must differ");
}

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
