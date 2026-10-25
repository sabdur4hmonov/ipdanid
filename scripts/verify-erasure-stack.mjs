// Isolated production-mode restore test. Cached images only; no pull/install,
// real providers, owner DB, privileged host changes or existing Compose projects.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import net from "node:net";
import { hashAdminPassword } from "../server/production-auth.ts";

mkdirSync("test-results", { recursive: true });
const root = resolve("."),
  out = mkdtempSync(resolve("test-results/c21-production-stack-")),
  project = "iprasm-c21-" + randomUUID().replaceAll("-", "").slice(0, 10),
  config = join(out, "compose-private.json"),
  envFile = join(out, "synthetic.env");
const secret = () => randomBytes(32).toString("base64url"),
  password = "Synthetic-stack-password-" + secret(),
  fixture = {
    APP_DOMAIN: "example.invalid",
    APP_IMAGE_TAG: "phase14-test",
    ADMIN_PASSWORD_HASH: await hashAdminPassword(password),
    CODE_PEPPER: secret(),
    SANDBOX_PAYMENT_KEY: secret(),
    PAYMENTS_SANDBOX: "0",
    FCM_MODE: "disabled",
    TRANSACTIONAL_EMAIL_MODE: "disabled",
    FCM_PROJECT_ID: "",
    FCM_CLIENT_EMAIL: "",
    FCM_PRIVATE_KEY: "",
    FCM_WEB_API_KEY: "",
    FCM_WEB_APP_ID: "",
    FCM_SENDER_ID: "",
    FCM_VAPID_PUBLIC_KEY: "",
    TRANSACTIONAL_EMAIL_FROM: "",
    RESEND_API_KEY: "",
    CLICK_SERVICE_ID: "",
    CLICK_SECRET_KEY: "",
    PAYME_LOGIN: "",
    PAYME_TEST_KEY: "",
  },
  environment = { ...process.env, ...fixture };
const secrets = [
  password,
  fixture.ADMIN_PASSWORD_HASH,
  fixture.CODE_PEPPER,
  fixture.SANDBOX_PAYMENT_KEY,
];
writeFileSync(
  envFile,
  Object.entries(fixture)
    .map(([k, v]) => `${k}='${v}'`)
    .join("\n") + "\n",
  { mode: 0o600, flag: "wx" },
);
function docker(args) {
  return execFileSync("docker", args, {
    cwd: root,
    env: environment,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
}
const base = ["compose", "--env-file", envFile, "-p", project, "-f", config],
  compose = (...args) => docker([...base, ...args]);
let model,
  started = false;
const report = {
  project,
  out,
  cachedImages: true,
  newWebImageTested: false,
  productionApiSourceMounted: true,
  realProviders: false,
};
async function freePort() {
  for (let port = 4516; port < 4550; port++) {
    if (
      await new Promise((r) => {
        const s = net.createServer();
        s.once("error", () => r(false));
        s.listen(port, "127.0.0.1", () => s.close(() => r(true)));
      })
    )
      return port;
  }
  throw Error("No isolated port available");
}
try {
  assert(/^iprasm-c21-[a-f0-9]{10}$/.test(project));
  for (const image of ["iprasm-api:phase14-test", "iprasm-web:phase14-test"])
    docker(["image", "inspect", image, "--format", "{{.Id}}"]);
  model = JSON.parse(
    docker([
      "compose",
      "--env-file",
      envFile,
      "-p",
      project,
      "-f",
      "docker-compose.yml",
      "config",
      "--format",
      "json",
    ]),
  );
  model.name = project;
  for (const [k, v] of Object.entries(model.volumes ?? {}))
    v.name = project + "_" + k;
  for (const [k, v] of Object.entries(model.networks ?? {}))
    v.name = project + "_" + k;
  for (const service of Object.values(model.services)) {
    delete service.build;
    service.pull_policy = "never";
  }
  const bind = (source, target) => ({
    type: "bind",
    source: resolve(source),
    target,
    read_only: true,
  });
  model.services.api.volumes.push(
    bind("server", "/app/server"),
    bind("src", "/app/src"),
  );
  // The cached image predates Phase15's pure-JS text/QR dependencies. Reuse the
  // already installed locked packages read-only, keeping its Linux tsx/esbuild.
  const packages = [
    "bidi-js",
    "require-from-string",
    "qrcode",
    "dijkstrajs",
    "pngjs",
  ];
  for (const name of packages)
    model.services.api.volumes.push(
      bind("node_modules/" + name, "/app/node_modules/" + name),
    );
  report.additionalReadonlyPackages = packages;
  model.services.api.environment.NODE_OPTIONS = "--max-old-space-size=512";
  model.services.backup.volumes.push(
    bind("scripts/backup-sqlite.mjs", "/app/scripts/backup-sqlite.mjs"),
  );
  model.services.caddy.volumes.push(
    bind("deploy/Caddyfile", "/etc/caddy/Caddyfile"),
  );
  const port = await freePort(),
    site = `http://127.0.0.1:${port}`;
  report.site = site;
  model.services.caddy.environment.APP_DOMAIN = ":80"; // No public DNS/ACME/TLS request.
  model.services.caddy.ports = [
    {
      target: 80,
      published: String(port),
      host_ip: "127.0.0.1",
      protocol: "tcp",
    },
  ];
  const save = () =>
    writeFileSync(config, JSON.stringify(model, null, 2), { mode: 0o600 });
  save();
  compose("config", "--quiet");
  console.log("Creating only the isolated cached-image project");
  started = true;
  compose("create", "--no-build", "--pull", "never", "api");
  // Cached Phase14 image predates /privacy. Initialize only this fresh named
  // volume to the same node ownership that the current Dockerfile supplies.
  const volume = model.volumes.erasure.name;
  assert(volume === project + "_erasure");
  docker([
    "run",
    "--rm",
    "--pull=never",
    "--network",
    "none",
    "--user",
    "0",
    "--mount",
    `type=volume,source=${volume},target=/privacy`,
    "iprasm-api:phase14-test",
    "node",
    "-e",
    "require('node:fs').chownSync('/privacy',1000,1000)",
  ]);
  compose(
    "up",
    "-d",
    "--no-build",
    "--pull",
    "never",
    "--wait",
    "--wait-timeout",
    "90",
  );
  const call = async (path, { token, body, method = "GET" } = {}) =>
    fetch(site + path, {
      method,
      headers: {
        Origin: "https://example.invalid",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(10000),
    });
  const health = await (await call("/api/health")).json();
  assert.equal(health.sandbox, false);
  assert.equal(health.adminAuth, "password");
  assert.equal(health.erasureReplay, true);
  assert.equal(health.liveMessages, false);
  assert.equal(health.livePayments, false);
  const register = async () => {
    const guest = await (await call("/api/session", { method: "POST" })).json();
    secrets.push(guest.token);
    const email = randomUUID() + "@example.invalid",
      r = await call("/api/account/register", {
        method: "POST",
        token: guest.token,
        body: { email, password },
      });
    assert(r.ok, "Synthetic registration failed");
    const account = await r.json();
    secrets.push(account.token, account.recoveryKey);
    return { ...account, email };
  };
  const account = await register(),
    other = await register();
  console.log(
    "Production API active; taking an old consistent application snapshot",
  );
  compose(
    "exec",
    "-T",
    "api",
    "node",
    "--input-type=module",
    "-e",
    "import{DatabaseSync,backup}from'node:sqlite';const d=new DatabaseSync('/data/iprasm.sqlite',{readOnly:true});await backup(d,'/data/before-erasure.sqlite');d.close();",
  );
  const erased = await call("/api/account/erasure", {
    method: "POST",
    token: account.token,
    body: { confirm: "erase-account/1", credential: password },
  });
  assert(erased.ok, "Erasure failed");
  assert.equal((await erased.json()).erased, true);
  assert.equal(
    (await call("/api/account", { token: account.token })).status,
    401,
  );
  compose("exec", "-T", "backup", "node", "scripts/backup-sqlite.mjs");
  console.log(
    "Erasure and dual backups succeeded; restoring only an older app DB",
  );
  compose("stop", "api", "backup");
  docker([
    "run",
    "--rm",
    "--pull=never",
    "--network",
    "none",
    "--mount",
    `type=volume,source=${model.volumes.sqlite.name},target=/data`,
    "iprasm-api:phase14-test",
    "node",
    "-e",
    "const f=require('node:fs');if(f.existsSync('/data/restored.sqlite'))throw Error('Preserve restore');f.copyFileSync('/data/before-erasure.sqlite','/data/restored.sqlite');",
  ]);
  model.services.api.environment.DATABASE_PATH = "/data/restored.sqlite";
  model.services.backup.environment.DATABASE_PATH = "/data/restored.sqlite";
  save();
  compose(
    "up",
    "-d",
    "--no-build",
    "--pull",
    "never",
    "--wait",
    "--wait-timeout",
    "90",
  );
  assert.equal(
    (await call("/api/account", { token: account.token })).status,
    401,
  );
  assert.equal(
    (
      await call("/api/account/login", {
        method: "POST",
        body: { email: account.email, password },
      })
    ).status,
    401,
  );
  assert(
    (await call("/api/account", { token: other.token })).ok,
    "Foreign account lost after restore",
  );
  const rows = JSON.parse(
    compose(
      "exec",
      "-T",
      "api",
      "node",
      "--input-type=module",
      "-e",
      "import{DatabaseSync}from'node:sqlite';const d=new DatabaseSync(process.env.DATABASE_PATH,{readOnly:true});console.log(JSON.stringify({accounts:Number(d.prepare('SELECT count(*) AS n FROM accounts').get().n),erasures:Number(d.prepare('SELECT count(*) AS n FROM account_erasure').get().n)}));d.close();",
    ),
  );
  assert.equal(rows.accounts, 1);
  assert.equal(rows.erasures, 1);
  const restoredHealth = await (await call("/api/health")).json();
  assert.equal(restoredHealth.erasureReplay, true);
  report.erasedTokenRefused = true;
  report.erasedPasswordRefused = true;
  report.restoredPrivateCredentialsRemoved = true;
  report.foreignAccountPreserved = true;
  report.currentJournalPreserved = true;
  report.dualBackupSucceeded = true;
  report.realPublicHttpsTested = false;
  console.log(
    "Production-mode restore passed; cleaning only the owned project",
  );
} catch (error) {
  let detail = String(error?.stack ?? error);
  for (const value of secrets.filter(Boolean))
    detail = detail.replaceAll(value, "[redacted]");
  writeFileSync(join(out, "failure.txt"), detail, { mode: 0o600 });
  if (started) {
    try {
      let log = compose("logs", "--no-color", "--tail", "30", "api", "backup");
      for (const v of secrets.filter(Boolean))
        log = log.replaceAll(v, "[redacted]");
      writeFileSync(join(out, "containers-redacted.log"), log, { mode: 0o600 });
    } catch {}
  }
  report.failed = true;
  process.exitCode = 1;
  console.error(
    "Production restore test failed; private redacted diagnostics saved in " +
      out,
  );
} finally {
  if (started) {
    try {
      assert(/^iprasm-c21-[a-f0-9]{10}$/.test(project));
      compose("down", "--volumes", "--remove-orphans");
      report.ownedResourcesRemoved = true;
    } catch {
      report.cleanupFailed = true;
      process.exitCode = 1;
    }
  }
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
