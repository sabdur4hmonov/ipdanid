import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const phase15 = process.argv.includes("--phase15"),
  base = phase15 ? "40fd2f5" : "fe9e5a3",
  git = (...args) =>
    execFileSync("git", args, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      windowsHide: true,
    });
assert.equal(git("branch", "--show-current").trim(), "feat/full-roadmap");
assert.equal(
  git("remote", "get-url", "origin").trim(),
  "https://github.com/sabdur4hmonov/ipdanid.git",
);
const paths = git("diff", "--name-only", base, "HEAD")
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const prohibited = paths.filter(
  (p) =>
    /^(?:tmp|output|comparison)\/|(?:^|\/)(?:\.env(?:\..*)?|[^/]+\.(?:sqlite|db|jks|keystore|p12|jpg|jpeg|png|webp))$/i.test(
      p,
    ) && p !== ".env.example",
);
assert.equal(
  prohibited.length,
  0,
  "Prohibited export paths detected; values withheld",
);
const credential =
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|AKIA[A-Z0-9]{16})\b/;
const commits = git("rev-list", `${base}..HEAD`)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
let hits = 0;
for (const commit of commits) {
  const patch = git(
    "show",
    "--format=",
    "--no-ext-diff",
    "--unified=0",
    commit,
  );
  if (credential.test(patch)) hits++;
}
assert.equal(hits, 0, "Credential format detected; values withheld");
const report = {
  base,
  head: git("rev-parse", "HEAD").trim(),
  files: paths.length,
  commitsScanned: commits.length,
  prohibitedPaths: 0,
  credentialPatterns: 0,
  ownerPhotoIncluded: false,
  scope:
    "Committed product patches and export paths; private owner env/data never read. Format scan cannot prove the absence of arbitrary unrecognized secrets.",
};
writeFileSync(
  `output/phase${phase15 ? 15 : 14}/source-export-audit.json`,
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report));
