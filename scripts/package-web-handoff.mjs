import assert from "node:assert/strict";
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

assert(process.env.CI === "true", "Only package a fresh CI build");
assert(/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA ?? ""), "Missing source commit");
const root = resolve("dist"), destination = resolve("web-handoff");
assert(!existsSync(destination), "Never replace a handoff");
const unit = JSON.parse(readFileSync(".ci-evidence/unit.json", "utf8"));
const browser = JSON.parse(readFileSync(".ci-evidence/browser.json", "utf8"));
assert.equal(unit.numFailedTests, 0);
assert.equal(unit.numPendingTests, 0);
assert.equal(browser.stats.unexpected, 0);
assert.equal(browser.stats.skipped, 0);
assert.equal(browser.stats.flaky, 0);
assert.equal(browser.errors.length, 0);
function files(dir) {
  assert(!lstatSync(dir).isSymbolicLink());
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    assert(!e.isSymbolicLink());
    const path = join(dir, e.name);
    return e.isDirectory() ? files(path) : [path];
  });
}
const entries = files(root).map(path => {
  const name = relative(root, path).replaceAll("\\", "/");
  assert(!/(^|\/)(?:tmp|output|test-results)(\/|$)|\.sqlite(?:-wal|-shm)?$|\.(?:db|jks|keystore)$|(^|\/)\.env|local-secrets/i.test(name));
  return { path: name, bytes: lstatSync(path).size, sha256: createHash("sha256").update(readFileSync(path)).digest("hex") };
});
assert(entries.some(e => e.path === "asset-manifest.json"));
mkdirSync(destination);
cpSync(root, join(destination, "dist"), { recursive: true, errorOnExist: true, force: false });
cpSync(".ci-evidence/unit.json", join(destination, "unit.json"));
cpSync(".ci-evidence/browser.json", join(destination, "browser.json"));
writeFileSync(join(destination, "verification.json"), JSON.stringify({
  schema: "iprasm.web-handoff/1", sourceCommit: process.env.GITHUB_SHA,
  unitPassed: unit.numPassedTests, browser: browser.stats, files: entries,
  privatePhotosIncluded: false, realPayments: false, phoneInstalled: false,
}, null, 2));
console.log(JSON.stringify({ sourceCommit: process.env.GITHUB_SHA, unitPassed: unit.numPassedTests, browserPassed: browser.stats.expected, files: entries.length }));
