import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, lstatSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

// Reports never include matching text, snippets, values or environment hashes.
export function secretKinds(text, knownValues = []) {
  const kinds = [];
  if (/\bgh[pousr]_[A-Za-z0-9]{20,}\b/.test(text)) kinds.push("github-token");
  if (/\bgithub_pat_[A-Za-z0-9_]{40,}\b/.test(text))
    kinds.push("github-fine-grained-token");
  if (/\bAKIA[A-Z0-9]{16}\b/.test(text)) kinds.push("aws-access-key");
  if (/\bsk_live_[A-Za-z0-9]{20,}\b/.test(text)) kinds.push("live-payment-key");
  if (/\bGOCSPX-[A-Za-z0-9_-]{20,}\b/.test(text))
    kinds.push("oauth-client-secret");
  if (/\b\d{8,12}:[A-Za-z0-9_-]{35}\b/.test(text)) kinds.push("bot-token");
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\s+[A-Za-z0-9+/=\r\n]{80,}\s+-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(
      text,
    )
  )
    kinds.push("private-key");
  if (knownValues.some((value) => value.length >= 16 && text.includes(value)))
    kinds.push("known-environment-value");
  return kinds;
}
export function prohibitedHistoryPath(path) {
  const p = path.replaceAll("\\", "/").toLowerCase(),
    leaf = basename(p);
  return (
    /^(?:tmp|output|photos|node_modules)\//.test(p) ||
    /\.(?:sqlite(?:3)?|db|jks|keystore|p12)$/.test(p) ||
    leaf === ".env" ||
    (leaf.startsWith(".env.") &&
      ![".env.example", ".env.sample"].includes(leaf))
  );
}
function environmentValues(root) {
  const values = [];
  for (const file of [".env", ".env.production"]) {
    const path = resolve(root, file);
    if (!existsSync(path) || lstatSync(path).isSymbolicLink()) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line);
      if (
        !match ||
        !/(?:SECRET|TOKEN|PASSWORD|PEPPER|PRIVATE_KEY)/.test(match[1]) ||
        /(?:_PATH|_FILE|_URL|PUBLIC_KEY)$/.test(match[1])
      )
        continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      )
        value = value.slice(1, -1);
      if (
        value.length < 16 ||
        /^(?:change|replace|your[-_]|example|placeholder|\$\{)/i.test(value) ||
        /^(.)\1+$/.test(value)
      )
        continue;
      values.push(value);
      if (value.includes("\\n")) values.push(value.replaceAll("\\n", "\n"));
    }
  }
  return [...new Set(values)];
}
export function auditHistory(
  root = process.cwd(),
  knownValues = environmentValues(root),
) {
  const git = (args, input) =>
    execFileSync("git", args, {
      cwd: root,
      input,
      maxBuffer: 80 * 1024 * 1024,
      windowsHide: true,
    });
  const entries = git([
    "-c",
    "core.quotePath=false",
    "rev-list",
    "--objects",
    "--all",
  ])
    .toString("utf8")
    .trim()
    .split("\n")
    .filter(Boolean);
  const paths = new Map();
  for (const line of entries) {
    const space = line.indexOf(" ");
    if (space >= 0) paths.set(line.slice(0, space), line.slice(space + 1));
  }
  // rev-list deduplicates objects and may name an aliased blob only once;
  // inspect historical path changes separately so a renamed .env is not missed.
  const allPaths = git([
    "log",
    "--all",
    "--format=",
    "--name-only",
    "--no-renames",
    "-z",
  ])
    .toString("utf8")
    .split("\0")
    .map((p) => p.replace(/^\n+/, ""))
    .filter(Boolean);
  const prohibitedPaths = [...new Set(allPaths.filter(prohibitedHistoryPath))];
  const metadata = git(
    ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
    entries.map((l) => l.split(" ")[0]).join("\n") + "\n",
  )
    .toString("utf8")
    .trim()
    .split("\n");
  const candidates = metadata
    .map((line) => line.split(" "))
    .filter(
      ([oid, type, size]) =>
        type === "blob" && Number(size) <= 4_000_000 && paths.has(oid),
    );
  const findings = [];
  let textBlobs = 0,
    binaryBlobs = 0;
  for (let at = 0; at < candidates.length; at += 16) {
    const group = candidates.slice(at, at + 16),
      body = git(
        ["cat-file", "--batch"],
        group.map((x) => x[0]).join("\n") + "\n",
      );
    let offset = 0;
    for (const [oid, , length] of group) {
      const end = body.indexOf(10, offset);
      if (end < 0) throw Error("Invalid audit batch");
      const size = Number(length),
        bytes = body.subarray(end + 1, end + 1 + size);
      offset = end + 1 + size + 1;
      if (bytes.includes(0)) {
        binaryBlobs++;
        continue;
      }
      textBlobs++;
      const kinds = secretKinds(bytes.toString("utf8"), knownValues);
      if (kinds.length) findings.push({ oid, path: paths.get(oid), kinds });
    }
  }
  const large = metadata
    .map((l) => l.split(" "))
    .filter(([, t, n]) => t === "blob" && Number(n) > 4_000_000);
  const binaryPath = (oid) =>
    /\.(?:wasm|tflite|task|ttf|otf|woff2?|png|jpe?g|webp|gif|ico|pdf|apk|zip)$/i.test(
      paths.get(oid) ?? "",
    );
  return {
    scope:
      "All locally available Git refs/history, not only HEAD; matching values never serialized",
    objects: entries.length,
    textBlobs,
    binaryBlobs,
    oversizeBlobs: large.filter(([oid]) => !binaryPath(oid)).length,
    oversizeBinaryBlobs: large.filter(([oid]) => binaryPath(oid)).length,
    knownEnvironmentValues: knownValues.length,
    prohibitedPaths,
    findings,
    limits:
      "Pattern/known-value scan cannot prove absence of arbitrary unrecognized secrets or identify an unlabelled personal image. Binary blobs are path-checked, not decoded. Oversize text requires separate review.",
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = auditHistory(),
      report = process.argv.find((a) => a.startsWith("--report="))?.slice(9);
    if (report) writeFileSync(report, JSON.stringify(result, null, 2));
    process.stdout.write(
      JSON.stringify({
        objects: result.objects,
        textBlobs: result.textBlobs,
        prohibitedPaths: result.prohibitedPaths.length,
        findings: result.findings.length,
        oversizeBlobs: result.oversizeBlobs,
        valuesPrinted: false,
      }) + "\n",
    );
    if (
      result.prohibitedPaths.length ||
      result.findings.length ||
      result.oversizeBlobs
    )
      process.exitCode = 1;
  } catch {
    process.stderr.write(
      "History audit failed safely; no blob or environment contents printed.\n",
    );
    process.exitCode = 1;
  }
}
