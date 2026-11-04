// O07 owner-requested restart only: never run the one-shot issuance launcher.
import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  readFileSync,
  realpathSync,
  mkdirSync,
  openSync,
  closeSync,
} from "node:fs";
import { createRequire } from "node:module";
import { createConnection } from "node:net";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const script = fileURLToPath(import.meta.url);
const root = resolve(dirname(script), "..");
const runtime = join(
  root,
  "output/phase16-private/final-runtime-20261028/runtime",
);
const web = join(root, "output/phase16-owner-20261028-bab0cfaa-dist");
const privateDir = join(
  root,
  "output/phase16-private/owner-review-20261028-bab0cfaa",
);
const database = join(privateDir, "database.sqlite");
const site = "http://127.0.0.1:4217";
const api = "http://127.0.0.1:4657";
const delay = (ms) => new Promise((done) => setTimeout(done, ms));

export async function listening(port) {
  return new Promise((done) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const finish = (up) => {
      socket.destroy();
      done(up);
    };
    socket.setTimeout(700);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

function assertFrozenFiles() {
  // Do not create a directory, seed inventory, copy a DB, or fall back to tmp/data.
  for (const path of [
    runtime,
    web,
    privateDir,
    database,
    join(privateDir, "private-keys.json"),
    join(privateDir, "erasure-intents.sqlite"),
    join(root, "output/phase16/manual-testing.txt"),
  ]) {
    assert(
      existsSync(path),
      "Existing frozen handoff is incomplete; refusing restart",
    );
    assert.equal(
      realpathSync(path).toLowerCase(),
      path.toLowerCase(),
      "Linked handoff refused",
    );
  }
  const metadata = JSON.parse(
    readFileSync(join(root, "output/phase16/preview-launch.json"), "utf8"),
  );
  assert.equal(metadata.webDir, web);
  assert.equal(metadata.databasePath, database);
  assert.equal(metadata.frozenRuntime.directory, runtime);
  assert.equal(metadata.site, site);
  assert.equal(metadata.api, api + "/api");
}

async function serve() {
  assertFrozenFiles();
  const frozenRequire = createRequire(join(runtime, "package.json"));
  const children = [];
  if (!(await listening(4657))) {
    const keys = JSON.parse(
      readFileSync(join(privateDir, "private-keys.json"), "utf8"),
    );
    const manual = readFileSync(
      join(root, "output/phase16/manual-testing.txt"),
      "utf8",
    );
    const admin = /^Administrator tokeni:\s*(\S+)\s*$/m.exec(manual)?.[1];
    assert(
      admin && admin.length >= 32,
      "Existing admin credential missing; no replacement issued",
    );
    assert(
      keys.CODE_PEPPER?.length >= 32 && keys.SANDBOX_PAYMENT_KEY?.length >= 32,
    );
    const env = {
      ...process.env,
      NODE_OPTIONS: "--max-old-space-size=512",
      TSX_TSCONFIG_PATH: join(runtime, "tsconfig.json"),
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: "4657",
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
    };
    delete env.ESBUILD_BINARY_PATH;
    delete env.NODE_PATH;
    const loader = frozenRequire.resolve("tsx");
    assert(loader.startsWith(join(runtime, "node_modules")));
    const child = spawn(
      process.execPath,
      [
        "--import",
        pathToFileURL(loader).href,
        join(runtime, "server/index.ts"),
      ],
      { cwd: runtime, env, windowsHide: true, stdio: "inherit" },
    );
    children.push(child);
    child.on("error", () => {
      console.error("Frozen API launch failed; no credentials printed.");
      process.exitCode = 1;
    });
    child.on("exit", (code) => {
      if (code) process.exitCode = 1;
    });
  }
  if (!(await listening(4217))) {
    // No project config/build plugins and no dist writes. Serve the exact frozen files.
    const { preview } = await import(
      pathToFileURL(frozenRequire.resolve("vite")).href
    );
    const server = await preview({
      configFile: false,
      envFile: false,
      root,
      build: { outDir: web },
      preview: {
        host: "127.0.0.1",
        port: 4217,
        strictPort: true,
        proxy: { "/api": api },
      },
    });
    const stop = () => {
      server.httpServer.close();
      for (const child of children) child.kill();
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
  }
}

function adbPath() {
  const local = readFileSync(join(root, "android/local.properties"), "utf8");
  const sdk = /^sdk\.dir=(.+)$/m
    .exec(local)?.[1]
    .trim()
    .replaceAll("\\:", ":")
    .replaceAll("\\\\", "\\");
  assert(sdk, "Existing Android SDK is not configured");
  const adb = join(sdk, "platform-tools/adb.exe");
  assert(
    existsSync(adb),
    "Existing platform-tools/adb.exe not found; nothing installed",
  );
  return adb;
}

export function phoneSerial(devices) {
  const entries = devices
    .split(/\r?\n/)
    .map((line) => /^(\S+)\s+(device|unauthorized|offline)$/.exec(line))
    .filter(Boolean);
  assert.equal(entries.length, 1, "Connect exactly one Android phone");
  assert.equal(
    entries[0][2],
    "device",
    "Accept USB debugging on the unlocked phone, then retry",
  );
  return entries[0][1];
}

async function connect() {
  assertFrozenFiles();
  const adb = adbPath();
  const devices = execFileSync(adb, ["devices"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const serial = phoneSerial(devices);
  if (!(await listening(4217)) || !(await listening(4657))) {
    const logDir = join(root, "output/phone-usb");
    mkdirSync(logDir, { recursive: true });
    const log = openSync(join(logDir, "launcher.log"), "a", 0o600);
    const child = spawn(process.execPath, [script, "--serve"], {
      cwd: root,
      detached: true,
      windowsHide: true,
      stdio: ["ignore", log, log],
    });
    child.unref();
    closeSync(log);
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if ((await listening(4217)) && (await listening(4657))) {
        ready = true;
        break;
      }
      await delay(300);
    }
    assert(
      ready,
      "Frozen servers did not start; inspect output/phone-usb/launcher.log locally",
    );
  }
  const run = (args) =>
    execFileSync(adb, ["-s", serial, ...args], {
      encoding: "utf8",
      windowsHide: true,
    });
  run(["reverse", "tcp:4657", "tcp:4657"]);
  const reverse = run(["reverse", "--list"]);
  assert(
    /tcp:4657\s+tcp:4657/.test(reverse),
    "USB API forwarding was not installed",
  );
  console.log(
    "Frozen preview 4217 and API 4657 are running. USB API forwarding is ready.",
  );
  console.log(
    "Test codes: output/phase16/manual-testing.txt (no kit code redeemed or printed).",
  );
}

if (process.argv[1] && resolve(process.argv[1]) === script) {
  try {
    if (process.argv[2] === "--serve") await serve();
    else if (process.argv.length === 2) await connect();
    else throw Error("Unsupported argument");
  } catch {
    console.error(
      "USB setup failed. Check the cable, USB authorization and existing frozen files; no data was replaced.",
    );
    process.exitCode = 1;
  }
}
