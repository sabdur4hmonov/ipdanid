// Run with: node --import tsx scripts/start-lan-build.mjs [private-ip] [--test]
// New P2 private runtime and sandbox. Never opens a frozen preview DB.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { backup } from "node:sqlite";
import { createServer as socketServer } from "node:net";
import { networkInterfaces } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import QRCode from "qrcode";
import { KitStore } from "../server/kit-store.ts";
import { assertTestPorts } from "../server/test-safety.mjs";
import { privateKitDirectory } from "./private-kit-paths.ts";
import { snapshotServerRuntime } from "./snapshot-server-runtime.mjs";
import { createLanBuildGate, isPrivateIpv4 } from "./lan-build-gate.mjs";

const args = process.argv.slice(2);
const testing = args.includes("--test");
const testSession = testing && process.env.IP_RASM_P2_TEST_SESSION
  ? process.env.IP_RASM_P2_TEST_SESSION
  : randomBytes(6).toString("hex");
assert(/^[0-9a-f]{12}$/.test(testSession), "Invalid isolated test session identifier");
const selected = args.filter(x => x !== "--test");
assert(selected.length <= 1 && (!selected.length || isPrivateIpv4(selected[0])), "Specify one private IPv4 address");
const candidates = Object.entries(networkInterfaces()).flatMap(([name, addresses]) =>
  (addresses ?? []).filter(a => !a.internal && a.family === "IPv4" && isPrivateIpv4(a.address))
    .map(a => ({ ...a, name })));
let ip = selected[0] ?? (candidates.length === 1 ? candidates[0].address : undefined);
if (!ip && process.stdin.isTTY && candidates.length > 1) {
  for (const a of candidates) console.log(`${a.address}  ${a.name}`);
  const input = createInterface({ input: process.stdin, output: process.stdout });
  try { ip = (await input.question("Uy Wi-Fi IPv4 manzilini kiriting: ")).trim(); }
  finally { input.close(); }
}
const lan = candidates.find(a => a.address === ip);
assert(lan, "No selected private LAN interface. Supply the home Wi-Fi adapter IPv4.");
const webPort = testing ? 4952 : 4950;
const apiPort = webPort + 1;
assertTestPorts(webPort, apiPort);
const gate = createLanBuildGate(lan.address, lan.netmask, webPort);
const loopbackOrigin = `http://127.0.0.1:${webPort}`;
const apiBase = `http://127.0.0.1:${apiPort}`;
for (const [host, port] of [[lan.address, webPort], ["127.0.0.1", apiPort]]) {
  const probe = socketServer();
  await new Promise((ok, fail) => probe.once("error", fail).listen({ host, port, exclusive: true }, ok));
  await new Promise(ok => probe.close(ok));
}

const root = resolve(".");
const build = resolve("output/p2-lan-dist");
const dir = resolve(testing
  ? "output/phase16-private/p2-lan-test-" + testSession
  : "output/phase16-private/p2-lan-owner");
const web = join(dir, "web");
// A test may reuse its dedicated database/runtime while checking a newer UI build.
const webRoot = testing ? build : web;
const runtimeInfo = join(dir, "runtime.json");
const keyPath = join(dir, "private-keys.json");
const instructions = join(dir, "manual-testing.txt");
const dbPath = join(dir, "database.sqlite");
const existing = existsSync(dir);
privateKitDirectory(dir, existing ? "existing" : "new");
if (testing || !existing) {
  const flags = JSON.parse(readFileSync(join(build, "build-runtime.json"), "utf8"));
  assert(flags.protectedGeneration && !flags.nativeApiBase, "Build the protected P2 web bundle first");
}
if (existing) {
  for (const needed of [runtimeInfo, keyPath, instructions, dbPath, join(web, "index.html")])
    assert(existsSync(needed) && realpathSync(needed).toLowerCase() === needed.toLowerCase(),
      "The P2 directory is incomplete or has redirected files.");
} else {
  mkdirSync(dir, { mode: 0o700 });
  const keys = Object.fromEntries(["CODE_PEPPER", "SANDBOX_PAYMENT_KEY", "LOCAL_ADMIN_TOKEN"]
    .map(name => [name, randomBytes(32).toString("base64url")]));
  const store = new KitStore(":memory:", keys.CODE_PEPPER, keys.SANDBOX_PAYMENT_KEY);
  try {
    store.seed();
    const { codes } = store.issueKitBatch("admin", "standard-base-r1", 1, "p2-lan-owner-test");
    assert.equal(codes[0].quota, 3);
    await backup(store.db, dbPath);
    writeFileSync(instructions, `P2 sandbox kit (3 works): ${codes[0].code}\nAdmin sandbox token: ${keys.LOCAL_ADMIN_TOKEN}\n`,
      { mode: 0o600, flag: "wx" });
  } finally { store.close(); }
  writeFileSync(keyPath, JSON.stringify(keys), { mode: 0o600, flag: "wx" });
  console.log("Birinchi ishga tushirish: alohida sandbox va runtime tayyorlanmoqda…");
  cpSync(build, web, { recursive: true, force: false, errorOnExist: true });
  const snapshot = snapshotServerRuntime(root, join(dir, "runtime"));
  writeFileSync(runtimeInfo, JSON.stringify(snapshot), { flag: "wx" });
}
const keys = JSON.parse(readFileSync(keyPath, "utf8"));
assert.deepEqual(Object.keys(keys).sort(), ["CODE_PEPPER", "LOCAL_ADMIN_TOKEN", "SANDBOX_PAYMENT_KEY"]);
assert(Object.values(keys).every(value => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value)),
  "Invalid sandbox runtime keys");
const runtime = join(dir, "runtime");
privateKitDirectory(runtime, "existing");
assert.equal(JSON.parse(readFileSync(runtimeInfo, "utf8")).directory, runtime);
const requireRuntime = createRequire(join(runtime, "package.json"));
const { preview } = await import(pathToFileURL(requireRuntime.resolve("vite")).href);
const watchParent = "data:text/javascript," + encodeURIComponent(
  "if (typeof process.send === 'function') process.on('disconnect', () => process.exit(0));",
);
const child = spawn(process.execPath, [
  "--import", pathToFileURL(requireRuntime.resolve("tsx")).href,
  "--import", watchParent, join(runtime, "server/index.ts"),
], {
  cwd: runtime,
  windowsHide: true,
  stdio: ["ignore", "inherit", "inherit", "ipc"],
  // Inherit OS basics only. Real provider credentials and local env files are not used.
  env: {
    PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
    ...keys, NODE_ENV: "development", NODE_OPTIONS: "--max-old-space-size=512",
    HOST: "127.0.0.1", PORT: String(apiPort), DATABASE_PATH: dbPath,
    ERASURE_LEDGER_PATH: join(dir, "erasure-intents.sqlite"),
    TSX_TSCONFIG_PATH: join(runtime, "tsconfig.json"),
    IP_RASM_TEST_SERVER: "1", IP_RASM_TEST_ORIGIN: loopbackOrigin,
    APP_ORIGIN: loopbackOrigin, SERVER_GENERATION: "1", CLASSIC_TUNING: "4",
    PAYMENTS_SANDBOX: "1", FCM_MODE: "disabled", TRANSACTIONAL_EMAIL_MODE: "disabled",
  },
});
let site;
const shutdown = () => {
  site?.httpServer.closeAllConnections();
  site?.httpServer.close();
  if (child.exitCode === null && child.signalCode === null) child.kill();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("exit", shutdown);
child.on("exit", shutdown);
child.on("error", shutdown);

function proxyApi(req, res, next) {
  if (!/^\/api(?:\/|\?|$)/.test(req.url)) return next();
  const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` };
  if (headers.origin) headers.origin = loopbackOrigin;
  for (const name of ["cookie", "referer", "forwarded", "x-real-ip", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto"]) delete headers[name];
  const upstream = request(apiBase, { path: req.url, method: req.method, headers }, reply => {
    const headers = { ...reply.headers, "cache-control": "no-store" };
    delete headers["access-control-allow-origin"];
    res.writeHead(reply.statusCode, headers);
    reply.pipe(res);
  });
  res.once("close", () => upstream.destroy());
  upstream.on("error", () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });
  req.pipe(upstream);
}

try {
  let ready = false;
  for (let n = 0; n < 100 && child.exitCode === null; n++) {
    try {
      const health = await (await fetch(apiBase + "/api/health", { signal: AbortSignal.timeout(800) })).json();
      const cfg = await (await fetch(apiBase + "/api/generation/config", { signal: AbortSignal.timeout(800) })).json();
      if (health.sandbox && !health.livePayments && !health.liveMessages && cfg.enabled) {
        ready = true;
        break;
      }
    } catch { /* Wait for this sandbox to boot. */ }
    await new Promise(ok => setTimeout(ok, 300));
  }
  assert(ready, "LAN sandbox API did not become ready");
  site = await preview({
    configFile: false, envFile: false, root,
    build: { outDir: webRoot },
    preview: { host: lan.address, port: webPort, strictPort: true, cors: false },
    plugins: [{
      name: "local-build-gate",
      configurePreviewServer(server) {
        server.middlewares.use(gate.middleware);
        server.middlewares.use(proxyApi);
      },
    }],
  });
  console.log(`Telefon URL: ${gate.url}\nSinov kodi: ${instructions}`);
  console.log(await QRCode.toString(gate.url, { type: "terminal", small: true, errorCorrectionLevel: "M" }));
  console.log("Ctrl+C — LAN serverini to‘xtatish.");
} catch (error) {
  shutdown();
  throw error;
}
