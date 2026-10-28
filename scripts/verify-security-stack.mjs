// Isolated host + cached production-container acceptance. No installs/pulls,
// public TLS, real providers or existing project/volume changes.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync, realpathSync } from "node:fs";
import { resolve, join } from "node:path";
import https from "node:https";
import http from "node:http";
import net from "node:net";
import { chromium, expect } from "@playwright/test";
import { hashAdminPassword } from "../server/production-auth.ts";
import { english, photoCases } from "../tests/e2e/phase12-cases.ts";

mkdirSync("test-results", { recursive: true });
const dist = resolve(process.env.IP_RASM_STACK_DIST || "output/phase15-dist");
if (process.env.IP_RASM_STACK_DIST &&
    (!/^phase16-[a-z0-9-]+-dist$/.test(dist.split(/[\\/]/).at(-1)) ||
     !dist.startsWith(resolve('output') + (process.platform === 'win32' ? '\\' : '/')) ||
     realpathSync(dist).toLowerCase() !== dist.toLowerCase()))
  throw Error('Only a fresh non-symlink Phase16 working dist can override stack assets');
const out = mkdtempSync(resolve("test-results/c24-stack-")),
  project = "iprasm-c24-" + randomUUID().replaceAll("-", "").slice(0, 10),
  config = join(out, "compose-private.json"),
  envFile = join(out, "synthetic.env"),
  secret = () => randomBytes(32).toString("base64url"),
  password = "Synthetic-password-" + secret(),
  fixture = {
    APP_DOMAIN: "example.invalid",
    APP_IMAGE_TAG: "phase14-test",
    ADMIN_PASSWORD_HASH: await hashAdminPassword(password),
    CODE_PEPPER: secret(),
    SANDBOX_PAYMENT_KEY: secret(),
    PAYMENTS_SANDBOX: "0",
    FCM_MODE: "disabled",
    TRANSACTIONAL_EMAIL_MODE: "disabled",
  },
  secrets = [password, ...Object.values(fixture).filter((v) => v.length > 30)],
  report = {
    project,
    cachedImages: true,
    currentSourcesMounted: true,
    newImagesTested: false,
    publicTlsTested: false,
    checks: 0,
  };
let environment = { ...process.env, ...fixture },
  started = false,
  child,
  browser;
function docker(args) {
  return execFileSync("docker", args, {
    env: environment,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 8 * 1024 * 1024,
  });
}
const compose = (...args) =>
  docker([
    "compose",
    "--env-file",
    envFile,
    "-p",
    project,
    "-f",
    config,
    ...args,
  ]);
async function freePort(start) {
  for (let p = start; p < start + 30; p++) {
    if (
      await new Promise((r) => {
        const s = net.createServer();
        s.on("error", () => r(false));
        s.listen(p, "127.0.0.1", () => s.close(() => r(true)));
      })
    )
      return p;
  }
  throw Error("No isolated port");
}
function request(
  port,
  path,
  { tls = false, method = "GET", body, headers = {} } = {},
) {
  return new Promise((resolve, reject) => {
    const r = (tls ? https : http).request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers,
        ...(tls
          ? { rejectUnauthorized: false, servername: "fixture.localhost" }
          : {}),
      },
      (s) => {
        let text = "";
        s.on("data", (b) => (text += b));
        s.on("end", () =>
          resolve({ status: s.statusCode, headers: s.headers, text }),
        );
      },
    );
    r.on("error", reject);
    r.setTimeout(15000, () => r.destroy(Error("Fixture timeout")));
    r.end(body);
  });
}
async function stop() {
  if (!child) return;
  const c = child;
  child = undefined;
  await new Promise((r) => {
    c.once("exit", r);
    c.kill();
  });
}
function check(actual, expected) {
  assert.equal(actual, expected);
  report.checks++;
}
try {
  const port = await freePort(4684);
  // Untrusted headers must not partition an attacker's socket budget.
  child = spawn(process.execPath, ["--import", "tsx", "server/index.ts"], {
    env: {
      ...environment,
      NODE_ENV: "development",
      PORT: String(port),
      IP_RASM_TEST_SERVER: "1",
      DATABASE_PATH: join(out, "host.sqlite"),
      LOCAL_ADMIN_TOKEN: secret(),
      TRUSTED_PROXY_IPS: "",
      FCM_MODE: "disabled",
      TRANSACTIONAL_EMAIL_MODE: "disabled",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  await new Promise((r, j) => {
    const timer = setTimeout(() => j(Error("Host startup timeout")), 15000);
    child.stdout.once("data", () => {
      clearTimeout(timer);
      r();
    });
    child.once("exit", () => j(Error("Host startup failed")));
  });
  for (const body of ["null", "[]", "3", Buffer.from([0xff])])
    check(
      (await request(port, "/api/session", { method: "POST", body })).status,
      400,
    );
  check(
    (await request(port, "/api/session", { method: "DELETE" })).status,
    405,
  );
  check(
    (
      await request(port, "/api/health", {
        body: "x",
        headers: { "content-length": "1" },
      })
    ).status,
    400,
  );
  check(
    (
      await request(port, "/api/account/login", {
        method: "POST",
        headers: { "content-length": "64001" },
      })
    ).status,
    413,
  );
  for (let k = 0; k < 12; k++)
    check(
      (
        await request(port, "/api/account/login", {
          method: "POST",
          body: "{}",
          headers: { "x-real-ip": "203.0.113." + (k + 1) },
        })
      ).status,
      400,
    );
  const limited = await request(port, "/api/account/login", {
    method: "POST",
    body: "{}",
    headers: { "x-real-ip": "198.51.100.2" },
  });
  check(limited.status, 429);
  check(limited.headers["retry-after"], "60");
  await stop();
  report.untrustedSpoofIgnored = true;
  report.invalidBodiesRefused = true;
  console.log(
    "Host request guards passed; starting only the isolated cached stack",
  );
  for (const image of ["iprasm-api:phase14-test", "iprasm-web:phase14-test"])
    docker(["image", "inspect", image, "--format", "{{.Id}}"]);
  const networks = JSON.parse(
    docker([
      "network",
      "inspect",
      ...docker(["network", "ls", "--format", "json"])
        .trim()
        .split("\n")
        .map(JSON.parse)
        .map((v) => v.ID),
    ]),
  );
  const used = networks
    .flatMap((v) => v.IPAM?.Config ?? [])
    .map((v) => v.Subnet ?? "");
  let subnet;
  for (let n = 80; n < 240; n++) {
    const prefix = `172.29.${n}.`;
    if (
      !used.some(
        (v) =>
          v.startsWith(prefix) ||
          v === "172.29.0.0/16" ||
          v === "172.16.0.0/12",
      )
    ) {
      subnet = prefix;
      break;
    }
  }
  assert(subnet, "No unused fixture subnet");
  Object.assign(fixture, {
    APP_BACKEND_SUBNET: subnet + "0/24",
    APP_PROXY_IP: subnet + "2",
    APP_API_IP: subnet + "3",
    APP_BACKUP_IP: subnet + "4",
  });
  environment = { ...process.env, ...fixture };
  writeFileSync(
    envFile,
    Object.entries(fixture)
      .map(([k, v]) => `${k}='${v}'`)
      .join("\n"),
    { mode: 0o600, flag: "wx" },
  );
  const model = JSON.parse(
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
  for (const [k, v] of Object.entries(model.volumes))
    v.name = project + "_" + k;
  for (const [k, v] of Object.entries(model.networks))
    v.name = project + "_" + k;
  for (const v of Object.values(model.services)) {
    delete v.build;
    v.pull_policy = "never";
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
  for (const name of [
    "bidi-js",
    "require-from-string",
    "qrcode",
    "dijkstrajs",
    "pngjs",
  ])
    model.services.api.volumes.push(
      bind("node_modules/" + name, "/app/node_modules/" + name),
    );
  model.services.api.environment.NODE_OPTIONS = "--max-old-space-size=512";
  model.services.backup.volumes.push(
    bind("scripts/backup-sqlite.mjs", "/app/scripts/backup-sqlite.mjs"),
  );
  const tlsPort = await freePort(4538),
    site = `https://fixture.localhost:${tlsPort}`;
  model.services.api.environment.APP_ORIGIN = site;
  model.services.caddy.environment.APP_DOMAIN = "fixture.localhost";
  // Local container CA only; keep the actual production header/proxy directives.
  const { readFileSync } = await import("node:fs");
  writeFileSync(
    join(out, "Caddyfile"),
    "{\n  skip_install_trust\n}\n" +
      readFileSync("deploy/Caddyfile", "utf8").replace(
        "{$APP_DOMAIN} {",
        "{$APP_DOMAIN} {\n  tls internal\n",
      ),
  );
  model.services.caddy.volumes.push(
    bind(join(out, "Caddyfile"), "/etc/caddy/Caddyfile"),
    bind(dist, "/srv"),
  );
  model.services.caddy.ports = [
    {
      target: 443,
      published: String(tlsPort),
      host_ip: "127.0.0.1",
      protocol: "tcp",
    },
  ];
  writeFileSync(config, JSON.stringify(model), { mode: 0o600 });
  compose("config", "--quiet");
  started = true;
  compose("create", "--no-build", "--pull", "never", "api");
  docker([
    "run",
    "--rm",
    "--pull=never",
    "--network",
    "none",
    "--user",
    "0",
    "--mount",
    `type=volume,source=${project}_erasure,target=/privacy`,
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
  const call = (path, options = {}) =>
    request(tlsPort, path, {
      tls: true,
      ...options,
      headers: { Host: "fixture.localhost:" + tlsPort, ...options.headers },
    });
  const health = JSON.parse((await call("/api/health")).text);
  check(JSON.parse((await call('/api/generation/config')).text).enabled, true);
  check(health.trustedProxy, true);
  check(health.sandbox, false);
  const headers = (await call("/")).headers;
  assert(headers["content-security-policy"].includes("object-src 'none'"));
  report.checks++;
  check(headers["x-content-type-options"], "nosniff");
  const login = await call("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
    headers: { Origin: site, "content-type": "application/json" },
  });
  check(login.status, 200);
  const admin = JSON.parse(login.text).token;
  secrets.push(admin);
  const issued = await call("/api/admin/kits/batch", {
    method: "POST",
    body: JSON.stringify({
      profile: "security-fixture",
      count: 1,
      requestKey: randomUUID(),
    }),
    headers: {
      Origin: site,
      Authorization: "Bearer " + admin,
      "content-type": "application/json",
    },
  });
  check(issued.status, 201);
  const code = JSON.parse(issued.text).codes[0].code;
  secrets.push(code);
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--host-resolver-rules=MAP fixture.localhost 127.0.0.1",
      "--no-proxy-server",
    ],
  });
  const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  const errors = [],
    violations = [];
  let uiAuth = 0;
  page.on("request", (r) => {
    if (
      r.method() === "POST" &&
      /^\/api\/(?:account\/(?:login|recover|register|kit|erasure)|trial\/claim)$/.test(
        new URL(r.url()).pathname,
      )
    )
      uiAuth++;
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__csp = [];
    addEventListener("securitypolicyviolation", (e) =>
      window.__csp.push({
        directive: e.violatedDirective,
        blocked: e.blockedURI,
      }),
    );
  });
  await context.route("**/*", (r) =>
    new URL(r.request().url()).origin === site ||
    /^(data|blob):/.test(r.request().url())
      ? r.continue()
      : r.abort(),
  );
  await page.goto(site);
  await english(page);
  // Do not serialize a tsx-transformed nested named function into the page.
  const jpg = await page.evaluate(async (data) => {
    const i = new Image();
    i.src = "data:image/png;base64," + data;
    await i.decode();
    const c = document.createElement("canvas");
    c.width = i.width;
    c.height = i.height;
    c.getContext("2d").drawImage(i, 0, 0);
    return c.toDataURL("image/jpeg", 0.96).split(",")[1];
  }, readFileSync(photoCases[0].source).toString("base64"));
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "synthetic.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from(jpg, "base64"),
  });
  await expect(page.getByTestId("customer-photo")).not.toHaveAttribute(
    "data-framing",
    "null",
    { timeout: 90000 },
  );
  await expect(
    page.getByRole("button", { name: "Create", exact: true }),
  ).toBeEnabled({ timeout: 30000 });
  await page.screenshot({ path: join(out, "adjust.png") });
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await expect(page.getByTestId("customer-result")).toBeVisible({
    timeout: 60000,
  });
  await page.screenshot({ path: join(out, "result.png") });
  await page
    .getByRole("button", { name: "Start assembling", exact: true })
    .click();
  const gate = page.getByTestId("build-gate");
  await expect(gate).toBeVisible();
  await page.getByTestId("kit-code").fill(code);
  await gate
    .getByRole("button", { name: "Sign in with kit code", exact: true })
    .click();
  await expect(page.getByTestId("kit-credits")).toBeVisible();
  await page.getByTestId("unlock-build").click();
  await expect(gate).toHaveCount(0);
  // The live PDF path loads local fontkit/Noto under the real CSP.
  const pdfButton = page.getByRole("button", { name: /PDF/ }).first();
  await expect(pdfButton).toBeVisible();
  const download = page.waitForEvent("download");
  await pdfButton.click();
  await (await download).saveAs(join(out, "guide.pdf"));
  violations.push(...(await page.evaluate(() => window.__csp)));
  check(violations.length, 0);
  check(errors.length, 0);
  report.localSegmentationWorkerPdfUnderCsp = true;
  await browser.close();
  browser = undefined;
  // Caller-supplied IP must be overwritten by Caddy. A genuinely different
  // container peer must retain its own budget (not collapse onto the proxy).
  // The admin login and the real kit login already consumed attempts above.
  check(uiAuth, 1);
  for (let k = 0; k < 11 - uiAuth; k++)
    check(
      (
        await call("/api/admin/login", {
          method: "POST",
          body: "{}",
          headers: { "x-real-ip": `203.0.113.${k + 1}` },
        })
      ).status,
      401,
    );
  check(
    (
      await call("/api/admin/login", {
        method: "POST",
        body: "{}",
        headers: { "x-real-ip": "198.51.100.2" },
      })
    ).status,
    429,
  );
  const remote = compose(
    "exec",
    "-T",
    "api",
    "node",
    "-e",
    `const h=require('node:https');const r=h.request({host:'caddy',port:443,path:'/api/admin/login',method:'POST',servername:'fixture.localhost',rejectUnauthorized:false,headers:{Host:'fixture.localhost', 'Content-Type':'application/json'}},s=>{console.log(s.statusCode);s.resume()});r.on('error',()=>process.exit(1));r.end('{}')`,
  ).trim();
  check(Number(remote), 401);
  report.caddyOverwritesSpoofedIp = true;
  report.distinctRealClientsIsolated = true;
  console.log(
    "Production proxy, bounded auth, local WASM/Worker and PDF CSP checks passed",
  );
} catch (error) {
  let detail = String(error?.stack ?? error);
  for (const s of secrets.filter(Boolean))
    detail = detail.replaceAll(s, "[redacted]");
  writeFileSync(join(out, "failure.txt"), detail, { mode: 0o600 });
  report.failed = true;
  process.exitCode = 1;
  if (started) {
    try {
      let log = compose("logs", "--no-color", "--tail", "35");
      for (const s of secrets.filter(Boolean))
        log = log.replaceAll(s, "[redacted]");
      writeFileSync(join(out, "containers-redacted.log"), log, { mode: 0o600 });
    } catch {}
  }
  console.error("Security acceptance failed; redacted diagnostics saved");
} finally {
  if (browser) await browser.close();
  await stop();
  if (started) {
    try {
      assert(/^iprasm-c24-[a-f0-9]{10}$/.test(project));
      compose("down", "--volumes", "--remove-orphans");
      report.ownedResourcesRemoved = true;
    } catch {
      report.cleanupFailed = true;
      process.exitCode = 1;
    }
  }
  writeFileSync(join(out, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, out }));
}
