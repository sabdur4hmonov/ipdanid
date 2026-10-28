// Snapshot already-installed files, never install, resolve a new package or copy owner data.
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statfsSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";
import { privateKitDirectory } from "./private-kit-paths.ts";

const roots = ["server", "src", "public", "node_modules"];
const configFiles = [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "tsconfig.production.json",
];
const caches = new Set([".bin", ".cache", ".vite", ".vite-temp"]);
function included(logical) {
  // Native Gradle products change during APK packaging; they are not Node API
  // dependencies. Keep packaged JS dist/build trees intact elsewhere.
  if (
    /^node_modules\/@capacitor(?:-firebase)?\/[^/]+\/(?:android|capacitor)\/build(?:\/|$)/.test(
      logical.replaceAll("\\", "/"),
    )
  )
    return false;
  const parts = logical.split(/[\\/]/),
    name = parts.at(-1);
  if (
    parts.some(
      (p, k) =>
        p === ".git" ||
        p === ".gradle" ||
        p === ".kotlin" ||
        (k > 0 && parts[k - 1] === "node_modules" && caches.has(p)),
    )
  )
    return false;
  return (
    !/^\.env(?:\.|$)/i.test(name) &&
    name !== "private-keys.json" &&
    !/^manual-testing.*\.txt$/i.test(name) &&
    !/\.(?:sqlite(?:3)?(?:-wal|-shm)?|db|jks|keystore)$/i.test(name)
  );
}
function walk(root, logical = "") {
  if (!included(logical)) return [];
  const value = lstatSync(root);
  assert(!value.isSymbolicLink(), "Symlinked runtime source refused");
  if (value.isDirectory())
    return readdirSync(root)
      .sort()
      .flatMap((name) =>
        walk(join(root, name), logical ? logical + "/" + name : name),
      );
  assert(value.isFile(), "Non-regular runtime source refused");
  return [{ source: root, path: logical, bytes: value.size }];
}
function digest(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
export function snapshotServerRuntime(sourceRoot, destination) {
  const workspace = realpathSync("."),
    candidate = resolve(sourceRoot);
  assert(
    candidate === workspace ||
      candidate.startsWith(join(workspace, "test-results") + sep),
    "Runtime source must be workspace or isolated test fixture",
  );
  const source = realpathSync(candidate),
    target = privateKitDirectory(destination, "new");
  assert.equal(source, candidate, "Symlinked source root refused");
  assert(source !== target && !source.startsWith(target + sep));
  for (const required of ["server", "src", "node_modules", "package.json"])
    assert(
      existsSync(join(source, required)),
      "Complete installed runtime source required",
    );
  const files = [
    ...roots
      .filter((name) => existsSync(join(source, name)))
      .flatMap((name) => walk(join(source, name), name)),
    ...configFiles
      .filter((name) => existsSync(join(source, name)))
      .flatMap((name) => walk(join(source, name), name)),
  ];
  const bytes = files.reduce((sum, file) => sum + file.bytes, 0),
    space = statfsSync(resolve("output"));
  assert(
    space.bavail * space.bsize > bytes + 512 * 1024 * 1024,
    "Insufficient disk space for immutable runtime",
  );
  for (const file of files) file.sha256 = digest(file.source);
  mkdirSync(target, { recursive: true });
  for (const name of [...roots, ...configFiles])
    if (existsSync(join(source, name))) {
      cpSync(join(source, name), join(target, name), {
        recursive: true,
        errorOnExist: true,
        force: false,
        filter: (path) => included(relative(source, path)),
      });
    }
  const copied = walk(target);
  assert.equal(
    copied.length,
    files.length,
    "Unexpected runtime snapshot file count",
  );
  for (const file of files)
    assert.equal(
      digest(join(target, file.path)),
      file.sha256,
      "Runtime snapshot content mismatch",
    );
  const manifest = {
    schema: "iprasm.runtime-snapshot/1",
    files: files.map(({ path, bytes, sha256 }) => ({ path, bytes, sha256 })),
    bytes,
    nodeVersion: process.version,
  };
  const sha256 = createHash("sha256")
    .update(JSON.stringify(manifest))
    .digest("hex");
  writeFileSync(
    join(target, "runtime-snapshot.json"),
    JSON.stringify({ ...manifest, sha256 }),
    { flag: "wx", mode: 0o600 },
  );
  return {
    directory: target,
    files: files.length,
    bytes,
    sha256,
    nodeVersion: process.version,
  };
}

export function inspectServerRuntime(
  directory,
  { verifyFiles = true, sourceRoot } = {},
) {
  const root = privateKitDirectory(directory, "existing");
  const path = join(root, "runtime-snapshot.json");
  assert(
    lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(),
    "Regular runtime manifest required",
  );
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const { sha256, ...content } = manifest;
  assert.equal(content.schema, "iprasm.runtime-snapshot/1");
  assert.equal(
    createHash("sha256").update(JSON.stringify(content)).digest("hex"),
    sha256,
    "Runtime manifest integrity mismatch",
  );
  assert(
    Array.isArray(content.files) &&
      content.files.length > 0 &&
      content.files.length < 200000,
    "Invalid runtime file list",
  );
  const seen = new Set();
  let bytes = 0;
  for (const file of content.files) {
    assert(
      typeof file.path === "string" &&
        !file.path.includes("\\") &&
        !file.path.includes(":") &&
        !file.path.startsWith("/") &&
        !file.path.split("/").some((p) => !p || p === "." || p === ".."),
      "Unsafe runtime file path",
    );
    assert(
      included(file.path) &&
        (roots.includes(file.path.split("/")[0]) ||
          configFiles.includes(file.path)),
      "Runtime file outside source allowlist",
    );
    assert(!seen.has(file.path), "Duplicate runtime file");
    seen.add(file.path);
    assert(
      /^[a-f0-9]{64}$/.test(file.sha256) &&
        Number.isSafeInteger(file.bytes) &&
        file.bytes >= 0,
      "Invalid runtime file metadata",
    );
    bytes += file.bytes;
  }
  assert.equal(bytes, content.bytes);
  assert(Number.isSafeInteger(bytes), "Invalid runtime byte count");
  assert.equal(
    content.nodeVersion,
    process.version,
    "Runtime Node version changed",
  );
  if (verifyFiles) {
    const actual = walk(root).filter(
      (file) => file.path !== "runtime-snapshot.json",
    );
    assert.equal(
      actual.length,
      content.files.length,
      "Runtime file set changed",
    );
    for (const file of content.files)
      assert.equal(
        digest(join(root, file.path)),
        file.sha256,
        "Frozen runtime file changed",
      );
  }
  if (sourceRoot) {
    const source = realpathSync(sourceRoot);
    const original = [
      ...roots
        .filter((name) => existsSync(join(source, name)))
        .flatMap((name) => walk(join(source, name), name)),
      ...configFiles
        .filter((name) => existsSync(join(source, name)))
        .flatMap((name) => walk(join(source, name), name)),
    ];
    assert.equal(
      original.length,
      content.files.length,
      "Workspace runtime source file set changed",
    );
    for (const file of content.files)
      assert.equal(
        digest(join(source, file.path)),
        file.sha256,
        "Workspace runtime differs from snapshot",
      );
  }
  return {
    directory: root,
    files: content.files.length,
    bytes,
    sha256,
    nodeVersion: content.nodeVersion,
  };
}
