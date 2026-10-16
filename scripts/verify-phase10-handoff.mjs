import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { assertTestDatabasePath } from "../server/test-safety.mjs";
const launch = JSON.parse(
  readFileSync("output/phase10/preview-launch.json", "utf8"),
);
for (const value of [launch.site, launch.api]) {
  const url = new URL(value);
  if (
    url.hostname !== "127.0.0.1" ||
    url.protocol !== "http:" ||
    [4194, 4195, 4331, 4465].includes(Number(url.port))
  )
    throw Error("Refusing protected/nonlocal service");
}
assertTestDatabasePath(launch.databasePath);
if (
  launch.ownerDataUsed !== false ||
  launch.webDir !== "output/phase10-dist" ||
  !existsSync(launch.databasePath)
)
  throw Error("Wrong isolated preview");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const html = await (await fetch(launch.site)).text(),
  localHtml = readFileSync(join(launch.webDir, "index.html"), "utf8");
if (html !== localHtml) throw Error("Preview HTML differs from verified build");
const main = html.match(/<script[^>]*src="([^"]+)"/)[1],
  code = await (await fetch(new URL(main, launch.site))).text();
if (!code.includes("classic-greedy/2") || !code.includes("classic-coverage/2"))
  throw Error("Wrong runtime build");
const credentials = readFileSync(launch.credentialPath, "utf8"),
  kit = credentials.match(/Kit kodi \((\d+) natija\): ([^\r\n]+)/),
  admin = credentials.match(/Administrator tokeni: ([^\r\n]+)/)?.[1];
if (
  !credentials.includes(launch.site) ||
  !kit ||
  Number(kit[1]) !== 3 ||
  !admin
)
  throw Error("Missing local test code/URL");
const stateResponse = await fetch(launch.api + "/admin/kits", {
  headers: { Authorization: `Bearer ${admin}` },
});
if (!stateResponse.ok) throw Error("Fresh preview admin read failed");
const state = await stateResponse.json();
if (
  state.codes.length !== 1 ||
  state.codes[0].quota !== 3 ||
  state.codes[0].account_id !== null ||
  state.accounts.length !== 0
)
  throw Error("Test kit already used or wrong fresh data");
const old4194 = JSON.parse(
  readFileSync(
    "output/mobile/ip-rasm-full-roadmap-20261014-87d130777145-evidence.json",
    "utf8",
  ),
);
for (const asset of old4194.assets)
  if (sha(readFileSync(join("dist", asset.path))) !== asset.sha256)
    throw Error("Protected4194 asset changed");
const old4195 = JSON.parse(
  readFileSync(
    "output/mobile/ip-rasm-photo-preview-20261016-f6cb7ddf0eea-evidence.json",
    "utf8",
  ),
);
for (const asset of old4195.assets)
  if (
    sha(readFileSync(join("output/phase9-dist", asset.path))) !== asset.sha256
  )
    throw Error("Protected4195 asset changed");
const publication = JSON.parse(
  readFileSync("output/photo-preview-fix/publication.json", "utf8"),
);
for (const [path, expected] of Object.entries(publication.oldAssetHashes))
  if (sha(readFileSync(join("output/phase9-dist", path))) !== expected)
    throw Error("Retained4195 legacy asset changed");
const apkEvidence = process.argv[2];
let packagedAssets;
if (apkEvidence) {
  if (
    !resolve(apkEvidence).startsWith(resolve("output/mobile") + "/") &&
    !resolve(apkEvidence).startsWith(resolve("output/mobile") + "\\")
  )
    throw Error("Wrong APK evidence path");
  const apk = JSON.parse(readFileSync(apkEvidence, "utf8"));
  if (
    !apk.classicReferenceVerified ||
    apk.webDirectory.replaceAll("\\", "/") !== launch.webDir
  )
    throw Error("Reference APK not verified");
  for (const asset of apk.assets)
    if (sha(readFileSync(join(launch.webDir, asset.path))) !== asset.sha256)
      throw Error("Served assets differ from packaged APK");
  packagedAssets = apk.assets.length;
}
const evidence = {
  site: launch.site,
  api: launch.api,
  isolatedDatabase: launch.databasePath,
  ownerDataUsed: false,
  freshKitQuota: 3,
  freshKitUnredeemed: true,
  htmlExact: true,
  runtimeClassic2: true,
  owner4194Contacted: false,
  owner4195Contacted: false,
  owner4194FilesUnchanged: old4194.assets.length,
  owner4195CurrentFilesUnchanged: old4195.assets.length,
  owner4195RetainedAssetsUnchanged: Object.keys(publication.oldAssetHashes)
    .length,
  apkEvidence,
  packagedAssets,
};
writeFileSync(
  "output/phase10/final-verification.json",
  JSON.stringify(evidence, null, 2),
);
console.log(JSON.stringify(evidence));
