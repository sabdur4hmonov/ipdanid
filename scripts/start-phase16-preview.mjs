// One-shot owner handoff. Never reuses an old preview, database or public code list.
// Run with the already installed runtime: node --import tsx scripts/start-phase16-preview.mjs --dist=output/phase16-...-dist
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import {
  existsSync,
  realpathSync,
  lstatSync,
  readdirSync,
  readFileSync,
  mkdirSync,
  writeFileSync,
  cpSync,
  copyFileSync,
  constants,
} from "node:fs";
import { resolve, join, dirname, basename, relative } from "node:path";
import net from "node:net";
import { freemem } from "node:os";
import { privateKitDirectory } from "./private-kit-paths.ts";

const args = process.argv.slice(2);
assert(
  args.length === 1 && args[0].startsWith("--dist="),
  "Expected one explicit --dist=output/phase16-...-dist",
);
const source = resolve(args[0].slice(7)),
  root = realpathSync(".");
assert.equal(
  dirname(source),
  join(root, "output"),
  "Build must be an immediate workspace output child",
);
assert(
  /^phase16-[a-z0-9-]+-dist$/.test(basename(source)),
  "Only a fresh Phase16 working build is allowed",
);
assert.equal(realpathSync(source), source, "Symlinked build refused");
assert(
  existsSync(join(source, "index.html")) &&
    existsSync(join(source, "asset-manifest.json")),
  "Complete tested build required",
);
const runtime = JSON.parse(
  readFileSync(join(source, "build-runtime.json"), "utf8"),
);
assert.equal(runtime.version, "iprasm.build-runtime/1");
assert.equal(
  runtime.protectedGeneration,
  true,
  "Owner handoff requires the actually protected client build",
);
assert.equal(
  runtime.nativeApiBase,
  "http://127.0.0.1:4657/api",
  "APK and owner API must match",
);
const manual = resolve("output/phase16/manual-testing.txt");
if (existsSync(dirname(manual)))
  assert.equal(
    realpathSync(dirname(manual)),
    join(root, "output", "phase16"),
    "Symlinked manual directory refused",
  );
assert(!existsSync(manual), "Preserve the existing owner handoff");
assert(freemem() >= 1.5 * 1024 ** 3, "RAM below1.5GiB; no handoff started");
const port = 4217,
  apiPort = 4657;
// Explicit owner handoff ports are reserved against automated test reuse.
// Exclusive OS bind checks below refuse any existing service; no HTTP reuse.
async function free(p) {
  const s = net.createServer();
  await new Promise((ok, no) => {
    s.once("error", no);
    s.listen(p, "127.0.0.1", ok);
  });
  await new Promise((ok) => s.close(ok));
}
await free(port);
await free(apiPort);
const master = privateKitDirectory(
  "output/phase16-private/million-kit-20261027",
  "existing",
);
for (const name of ["database.sqlite", "private-keys.json"])
  assert(
    lstatSync(join(master, name)).isFile() &&
      !lstatSync(join(master, name)).isSymbolicLink(),
    "Regular private bundle files required",
  );
const keys = JSON.parse(
  readFileSync(join(master, "private-keys.json"), "utf8"),
);
assert(
  typeof keys.CODE_PEPPER === "string" &&
    keys.CODE_PEPPER.length >= 32 &&
    typeof keys.SANDBOX_PAYMENT_KEY === "string" &&
    keys.SANDBOX_PAYMENT_KEY.length >= 32,
  "Coherent private bundle keys required",
);
const runId =
    new Date().toISOString().slice(0, 10).replaceAll("-", "") +
    "-" +
    randomUUID().slice(0, 8),
  privateDir = privateKitDirectory(
    "output/phase16-private/owner-review-" + runId,
    "new",
  ),
  webDir = resolve("output/phase16-owner-" + runId + "-dist");
assert(!existsSync(webDir));
function files(dir) {
  assert(!lstatSync(dir).isSymbolicLink());
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    assert(!e.isSymbolicLink());
    const p = join(dir, e.name);
    assert(e.isDirectory() || e.isFile());
    return e.isDirectory() ? files(p) : [p];
  });
}
const entries = files(source),
  sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex"),
  hashes = Object.fromEntries(
    entries.map((p) => [relative(source, p), sha(p)]),
  );
assert(
  !entries.some(
    (p) =>
      /\.(?:sqlite(?:3)?|db|jks|keystore)$/.test(p) ||
      /private-keys|manual-testing|source\.jpg/.test(p),
  ),
  "Private data in build refused",
);
mkdirSync(privateDir, { recursive: true });
const database = join(privateDir, "database.sqlite"),
  input = new DatabaseSync(join(master, "database.sqlite"), { readOnly: true });
try {
  assert.equal(input.prepare("PRAGMA quick_check").get().quick_check, "ok");
  assert.equal(
    Number(input.prepare("SELECT COUNT(*) n FROM kit_codes").get().n),
    1000000,
  );
  assert.equal(
    Number(
      input
        .prepare(
          "SELECT COUNT(*) n FROM kit_codes WHERE account_id IS NULL AND revoked=0",
        )
        .get().n,
    ),
    1000000,
  );
  assert.equal(
    Number(
      input
        .prepare(
          "SELECT COUNT(*) n FROM kit_inventories WHERE total=1000000 AND issued=1000000 AND status='ready'",
        )
        .get().n,
    ),
    1,
  );
  await backup(input, database);
} finally {
  input.close();
}
copyFileSync(
  join(master, "private-keys.json"),
  join(privateDir, "private-keys.json"),
  constants.COPYFILE_EXCL,
);
cpSync(source, webDir, { recursive: true, errorOnExist: true, force: false });
for (const [name, hash] of Object.entries(hashes))
  assert.equal(sha(join(webDir, name)), hash);
const site = `http://127.0.0.1:${port}`,
  api = `http://127.0.0.1:${apiPort}/api`,
  admin = randomBytes(32).toString("base64url");
const child = spawn(process.execPath, ["scripts/run-local.mjs"], {
  windowsHide: true,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
    IP_RASM_LOCAL_PORT: String(port),
    IP_RASM_API_PORT: String(apiPort),
    IP_RASM_WEB_DIR: relative(root, webDir).replaceAll("\\", "/"),
    IP_RASM_TEST_SERVER: "1",
    IP_RASM_TEST_ORIGIN: site,
    APP_ORIGIN: site,
    TRUSTED_PROXY_IPS: "",
    DATABASE_PATH: database,
    ERASURE_LEDGER_PATH: join(privateDir, "erasure-intents.sqlite"),
    LOCAL_ADMIN_TOKEN: admin,
    CODE_PEPPER: keys.CODE_PEPPER,
    SANDBOX_PAYMENT_KEY: keys.SANDBOX_PAYMENT_KEY,
    SERVER_GENERATION: "1",
    PAYMENTS_SANDBOX: "1",
    FCM_MODE: "disabled",
    TRANSACTIONAL_EMAIL_MODE: "disabled",
    CLICK_SERVICE_ID: "12345",
    CLICK_SECRET_KEY: randomBytes(32).toString("base64url"),
    PAYME_LOGIN: "Paycom-test",
    PAYME_TEST_KEY: randomBytes(32).toString("base64url"),
  },
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
child.on("error", () => {
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill());
try {
  let ready = false;
  for (let n = 0; n < 120; n++) {
    try {
      const h = await (
        await fetch(api + "/health", { signal: AbortSignal.timeout(1000) })
      ).json();
      assert.equal(h.sandbox, true);
      assert.equal(h.livePayments, false);
      assert.equal(h.liveMessages, false);
      assert.equal(
        (await (await fetch(api + "/generation/config")).json()).enabled,
        true,
      );
      assert.equal(
        await (await fetch(site)).text(),
        readFileSync(join(webDir, "index.html"), "utf8"),
      );
      ready = true;
      break;
    } catch {}
    await new Promise((ok) => setTimeout(ok, 250));
  }
  assert(ready, "New isolated owner preview not ready");
  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + admin,
  };
  const summaries = await (
    await fetch(api + "/admin/kits", { headers })
  ).json();
  assert(
    summaries.inventories.some(
      (i) =>
        i.total === 1000000 && i.issued === 1000000 && i.status === "ready",
    ),
  );
  const issued = await fetch(api + "/admin/kits/batch", {
    method: "POST",
    headers,
    body: JSON.stringify({
      profile: "standard-base-r1",
      count: 3,
      requestKey: randomUUID(),
    }),
  });
  assert(issued.ok, "Separate private test kit issuance failed");
  const batch = await issued.json();
  assert(batch.codes.every((c) => c.quota === 3));
  mkdirSync(dirname(manual), { recursive: true });
  assert.equal(
    realpathSync(dirname(manual)),
    join(root, "output", "phase16"),
    "Manual instructions cannot escape workspace",
  );
  writeFileSync(
    manual,
    `IP RASM — PHASE16 SINOV\nIlova: ${site}/\nAPI: ${api}\nTest quti kodlari (har biri3ta yangi ish):\n${batch.codes.map((c, k) => `${k + 1}. ${c.code}`).join("\n")}\nAdministrator tokeni: ${admin}\n\n1. Rasm tanlang,shaklni belgilang,surib/kattalashtirib joylashtiring.\n2. Tayyor qora-oq rasm serverga yuborilishi haqidagi matnni ko‘rib,Yaratish bosing.\n3. Bepul PNG chiqadi;Yig‘ishni boshlashda yuqoridagi test kodidan foydalaning.\n4. Ipni bajargach tasdiqlang,Dam olish,qayta ochib ayni qadamdan davom eting.\n5. Avval ochilgan ish internetsiz ishlaydi;yangi ko‘rinish uchun server kerak.\n6. Admin kitlarida haqiqiy1000000chiqarilgan/tayyor yopiq zaxira ko‘rsatiladi;bu brauzerga kodlar ro‘yxatini bermaydi.\n\nHaqiqiy pul,xabar yoki jo‘natma yo‘q. Millionlik asosiy baza o‘zgartirilmagan,bu uning yangi yopiq nusxasi. Kelajak VPSga ayni joriy baza va kalitlarni birga ko‘chiring:docs/KIT_MILLION_UZ.md. Eski sayt/hisoblar o‘zgarmagan. Burun/foto tengligi va telefon/jismoniy taxta qabul holati AGENT/FINAL_REPORT.mdda;100foiz tenglik va’da qilinmaydi.\n`,
    { flag: "wx", mode: 0o600 },
  );
  const metadata = {
    pid: process.pid,
    childPid: child.pid,
    site,
    api,
    webDir,
    databasePath: database,
    source,
    files: entries.length,
    privateInventoryCodes: 1000000,
    separateTestCodes: 3,
    preparedTargetsSentWithConsent: true,
    credentialPath: manual,
    masterDatabaseChanged: false,
  };
  writeFileSync(
    join(privateDir, "snapshot.json"),
    JSON.stringify({ metadata, hashes, master }, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  writeFileSync(
    "output/phase16/preview-launch.json",
    JSON.stringify(metadata, null, 2),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      ready: true,
      site: site + "/",
      api,
      privateInventoryCodes: 1000000,
      credentialsPrinted: false,
    }),
  );
} catch {
  child.kill();
  console.error(
    "Phase16 preview failed; private partial evidence retained, no credentials printed.",
  );
  process.exitCode = 1;
}
