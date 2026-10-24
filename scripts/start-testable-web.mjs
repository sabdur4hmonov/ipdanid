// Fresh, immutable owner preview. Does not inspect or reuse any old server/DB.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import net from "node:net";
import { freshTestDatabase } from "./test-artifacts.mjs";
const root = realpathSync("."),
  source = realpathSync("output/phase15-dist"),
  webDir = "output/phase15-testable-web-dist",
  evidence = "output/phase15/testable-web";
assert.equal(source, join(root, "output", "phase15-dist"));
assert.equal(realpathSync("output"), join(root, "output"));
assert(
  !existsSync(webDir) && !existsSync(evidence),
  "Preserve an already published preview",
);
function files(dir) {
  assert(!lstatSync(dir).isSymbolicLink());
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    assert(!e.isSymbolicLink());
    const p = join(dir, e.name);
    return e.isDirectory() ? files(p) : [p];
  });
}
const entries = files(source),
  digest = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const hashes = Object.fromEntries(
  entries.map((p) => [relative(source, p), digest(p)]),
);
cpSync(source, webDir, { recursive: true, errorOnExist: true, force: false });
for (const [name, hash] of Object.entries(hashes))
  assert.equal(digest(join(webDir, name)), hash);
mkdirSync(evidence, { recursive: true });
writeFileSync(
  `${evidence}/snapshot.json`,
  JSON.stringify({ source, snapshot: resolve(webDir), files: hashes }, null, 2),
);
async function freePort(start) {
  for (let port = start; port < start + 30; port++) {
    const free = await new Promise((resolve) => {
      const s = net.createServer();
      s.once("error", () => resolve(false));
      s.listen(port, "127.0.0.1", () => s.close(() => resolve(true)));
    });
    if (free) return port;
  }
  throw Error("No free test port");
}
const port = await freePort(4213),
  apiPort = await freePort(4653),
  site = `http://127.0.0.1:${port}`,
  api = `http://127.0.0.1:${apiPort}/api`;
const isolated = freshTestDatabase("owner-testable-web"),
  admin = randomBytes(32).toString("base64url");
const child = spawn(process.execPath, ["scripts/run-local.mjs"], {
  windowsHide: true,
  stdio: "inherit",
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
      const health = await (
        await fetch(`${api}/health`, { signal: AbortSignal.timeout(1000) })
      ).json();
      assert.equal(health.sandbox, true);
      assert.equal(health.livePayments, false);
      assert.equal(health.liveMessages, false);
      assert.equal(
        await (await fetch(site)).text(),
        readFileSync(`${webDir}/index.html`, "utf8"),
      );
      ready = true;
      break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert(ready, "Fresh preview not ready");
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
      requestKey: randomUUID(),
    }),
  });
  assert(response.ok, "Could not issue isolated kit");
  const batch = await response.json();
  writeFileSync(
    `${evidence}/manual-testing.txt`,
    `IP RASM — YANGI WEB SINOV\nIlova: ${site}/\nKit kodi (${batch.codes[0].quota} natija): ${batch.codes[0].code}\nAdministrator tokeni: ${admin}\nAPI: ${api}\n\n1. Galereyadan o‘z rasmingizni tanlang.\n2. Doira / Kvadrat / Yurak, keyin surish, kattalashtirish yoki Burish bilan joylashtiring.\n3. Oldin / Keyin bilan qirqimni ko‘ring, kerak bo‘lsa fonni qayta qirqing.\n4. Yaratish → natijani ko‘ring → Yig‘ishni boshlash, yuqoridagi test kit kodini kiriting.\n5. Qadam/ovoz/dam olishni tekshiring; sahifani yangilab qolgan joyga qayting.\n6. Hisob ochsangiz, Menyu → Suratni keyin davom ettirish orqali mahalliy yoki rozilik bilan hisob zaxirasini sinang.\n\nBu yangi ajratilgan sinov bazasi. Eski 4212 hisoblari bu test bazasiga ko‘chirilmagan. Production web va app bir API bilan ayni hisobni ishlatadi. Haqiqiy pul/xabar yuborilmaydi. Sifat tadqiqoti katta o‘sish bermagani uchun standart engine almashtirilmadi. Qolgan qabul ishlari AGENT/PROGRESS.md da.\n`,
    { mode: 0o600 },
  );
  const metadata = {
    pid: process.pid,
    childPid: child.pid,
    site,
    api,
    webDir,
    databasePath: isolated.databasePath,
    ownerDataUsed: false,
    files: entries.length,
    credentialPath: `${evidence}/manual-testing.txt`,
  };
  writeFileSync(
    `${evidence}/preview-launch.json`,
    JSON.stringify(metadata, null, 2),
  );
  writeFileSync(
    join(isolated.directory, "launch.json"),
    JSON.stringify(metadata, null, 2),
  );
  console.log(
    `Fresh owner preview ready: ${site}/; credentials saved locally, not printed.`,
  );
} catch (error) {
  child.kill();
  throw error;
}
