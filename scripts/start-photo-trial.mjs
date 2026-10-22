import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, sep } from "node:path";
import net from "node:net";
import { freshTestDatabase } from "./test-artifacts.mjs";

assert(
  process.argv.slice(2).every((v) => v === "--portrait-repair"),
  "Unknown preview option",
);
const repair = process.argv.includes("--portrait-repair");
const reportPath = repair ? "photo-repair" : "photo-test";
const webDir = repair
    ? "output/phase15-portrait-repair-dist"
    : "output/phase15-photo-trial-dist",
  evidence = repair
    ? "output/phase15/portrait-repair"
    : "output/phase15/photo-trial",
  proof = JSON.parse(readFileSync(`${evidence}/snapshot.json`, "utf8")),
  root = realpathSync(webDir);
assert.equal(proof.snapshot, webDir.replaceAll("/", sep));
assert(
  !existsSync(`${evidence}/preview-launch.json`),
  "An owner photo trial was already published; preserve it",
);
for (const [file, expected] of Object.entries(proof.files)) {
  const path = realpathSync(join(root, file));
  assert(path.startsWith(root + sep) && lstatSync(path).isFile());
  assert.equal(
    createHash("sha256").update(readFileSync(path)).digest("hex"),
    expected,
  );
}
async function freePort(start) {
  for (let port = start; port < start + 50; port++) {
    const free = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
    });
    if (free) return port;
  }
  throw Error("No free photo-trial port");
}
// Separate from all old previews, final4201/API4483 and automated test ports.
const port = await freePort(repair ? 4211 : 4210),
  apiPort = await freePort(repair ? 4651 : 4650),
  site = `http://127.0.0.1:${port}`,
  api = `http://127.0.0.1:${apiPort}/api`,
  isolated = freshTestDatabase("owner-photo-trial"),
  admin = randomBytes(32).toString("base64url");
const child = spawn(process.execPath, ["scripts/run-local.mjs"], {
  env: {
    ...process.env,
    NODE_ENV: "development",
    APP_ORIGIN: site,
    IP_RASM_LOCAL_PORT: String(port),
    IP_RASM_API_PORT: String(apiPort),
    IP_RASM_WEB_DIR: webDir,
    IP_RASM_TEST_SERVER: "1",
    IP_RASM_TEST_ORIGIN: site,
    DATABASE_PATH: isolated.databasePath,
    LOCAL_ADMIN_TOKEN: admin,
    CODE_PEPPER: randomBytes(32).toString("base64url"),
    SANDBOX_PAYMENT_KEY: randomBytes(32).toString("base64url"),
    PAYMENTS_SANDBOX: "1",
    FCM_MODE: "disabled",
    TRANSACTIONAL_EMAIL_MODE: "disabled",
    CLICK_SERVICE_ID: "12345",
    CLICK_SECRET_KEY: randomBytes(32).toString("base64url"),
    PAYME_LOGIN: "Paycom-test",
    PAYME_TEST_KEY: randomBytes(32).toString("base64url"),
  },
  windowsHide: true,
  stdio: "inherit",
});
const metadata = {
  pid: process.pid,
  childPid: child.pid,
  site,
  api,
  webDir,
  databasePath: isolated.databasePath,
  ownerDataUsed: false,
  frozenSnapshot: `${evidence}/snapshot.json`,
};
writeFileSync(
  join(isolated.directory, "launch.json"),
  JSON.stringify(metadata, null, 2),
);
child.on("error", () => {
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill());
try {
  let ready = false;
  for (let n = 0; n < 120; n++) {
    try {
      const health = await (
        await fetch(`${api}/health`, { signal: AbortSignal.timeout(1000) })
      ).json();
      assert.equal(health.sandbox, true);
      assert.equal(health.livePayments, false);
      assert.equal(health.liveMessages, false);
      const html = await (await fetch(site)).text();
      if (html === readFileSync(`${webDir}/index.html`, "utf8")) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, "Photo-trial services not ready");
  const config = await (await fetch(`${api}/kit-profiles`)).json();
  const response = await fetch(`${api}/admin/kits/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${admin}`,
    },
    body: JSON.stringify({
      profile: `standard-base-r${config.revision}`,
      count: 1,
      requestKey: crypto.randomUUID(),
    }),
  });
  assert(response.ok, "Could not create legitimate isolated test kit");
  const batch = await response.json();
  writeFileSync(
    `${evidence}/manual-testing.txt`,
    `IP RASM — NAMUNAVIY RASM SINOVI\nTaqqoslash: ${site}/${reportPath}/\nIlova: ${site}/\nRasm: ${site}/${reportPath}/namuna-portret.jpg\nKit kodi (${batch.codes[0].quota} natija): ${batch.codes[0].code}\nAdministrator tokeni: ${admin}\nAPI: ${api}\nFaqat yangi mahalliy sinov; eski serverlar va tmp/data ishlatilmagan. Portret sifati va Phase15 ishlari davom etadi, bu yakuniy reliz emas.\n`,
    { mode: 0o600 },
  );
  writeFileSync(
    `${evidence}/preview-launch.json`,
    JSON.stringify(
      {
        ...metadata,
        report: `${site}/${reportPath}/`,
        quota: batch.codes[0].quota,
        credentialPath: `${evidence}/manual-testing.txt`,
      },
      null,
      2,
    ),
  );
  console.log(
    `Photo trial ready: ${site}/${reportPath}/; credentials only in ignored ${evidence}/manual-testing.txt`,
  );
} catch (error) {
  child.kill();
  throw error;
}
