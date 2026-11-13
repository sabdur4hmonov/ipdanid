// Owner preview only: creates a NEW sandbox from our own seed, never an owner DB.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { backup } from "node:sqlite";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  readdirSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { freemem } from "node:os";
import net from "node:net";
import { KitStore } from "../server/kit-store.ts";
import { freshTestDatabase } from "./test-artifacts.mjs";
import { snapshotServerRuntime } from "./snapshot-server-runtime.mjs";
import { privateKitDirectory } from "./private-kit-paths.ts";

const root = resolve("."),
  build = resolve("output/website-w2-dist"),
  evidence = resolve("output/website-w2");
assert(
  process.argv.length === 2 ||
    (process.argv.length === 3 && process.argv[2] === "--resume"),
);
const resume = process.argv[2] === "--resume";
const web = resolve(
  resume
    ? "output/website-w2-owner-" +
        createHash("sha256")
          .update(readFileSync(join(build, "asset-manifest.json")))
          .digest("hex")
          .slice(0, 12) +
        "-dist"
    : "output/website-w2-owner-20261113-final-dist",
);
const privateDir = privateKitDirectory(
  "output/phase16-private/website-w2-20261113-final",
  resume ? "existing" : "new",
);
assert(
  resume
    ? existsSync(join(privateDir, "database.sqlite")) &&
        existsSync(join(evidence, "manual-testing.txt"))
    : !existsSync(web) && !existsSync(join(evidence, "manual-testing.txt")),
  "Preserve existing W2 handoff",
);
assert(freemem() >= 1.5 * 1024 ** 3, "RAM below 1.5 GiB");
assert.equal(
  JSON.parse(readFileSync(join(build, "build-runtime.json"), "utf8"))
    .protectedGeneration,
  true,
);
for (const port of [4920, 4921]) {
  const socket = net.createServer();
  await new Promise((ok, no) => {
    socket.once("error", no);
    socket.listen(port, "127.0.0.1", ok);
  });
  await new Promise((ok) => socket.close(ok));
}
mkdirSync(privateDir, { recursive: true });
mkdirSync(evidence, { recursive: true });
const keys = resume
  ? JSON.parse(readFileSync(join(privateDir, "private-keys.json"), "utf8"))
  : {
      CODE_PEPPER: randomBytes(32).toString("base64url"),
      SANDBOX_PAYMENT_KEY: randomBytes(32).toString("base64url"),
      LOCAL_ADMIN_TOKEN: randomBytes(32).toString("base64url"),
    };
assert(
  Object.values(keys).every((v) => typeof v === "string" && v.length >= 32),
);
let code;
if (!resume) {
  console.log(JSON.stringify({ stage: "creating-new-isolated-W2-sandbox" }));
  const seed = freshTestDatabase("website-w2-seed");
  const store = new KitStore(
    seed.databasePath,
    keys.CODE_PEPPER,
    keys.SANDBOX_PAYMENT_KEY,
  );
  try {
    store.seed();
    const issued = store.issueKitBatch(
      "admin",
      "standard-base-r1",
      1,
      "website-w2-owner-test",
    );
    assert.equal(issued.codes[0].quota, 3);
    code = issued.codes[0].code;
    await backup(store.db, join(privateDir, "database.sqlite"));
  } finally {
    store.close();
  }
  writeFileSync(join(privateDir, "private-keys.json"), JSON.stringify(keys), {
    flag: "wx",
    mode: 0o600,
  });
}
if (!existsSync(web))
  cpSync(build, web, { recursive: true, errorOnExist: true, force: false });
const digest = (p) =>
  createHash("sha256").update(readFileSync(p)).digest("hex");
function verify(dir, relative = "") {
  for (const entry of readdirSync(join(build, relative), {
    withFileTypes: true,
  })) {
    const name = join(relative, entry.name);
    if (entry.isDirectory()) verify(dir, name);
    else
      assert.equal(
        digest(join(build, name)),
        digest(join(dir, name)),
        "Refuse altered website snapshot",
      );
  }
}
verify(web);
const previous = resume
  ? JSON.parse(readFileSync(join(evidence, "launch.json"), "utf8"))
  : undefined;
if (previous) {
  assert.equal(previous.privateDir, privateDir);
  assert.equal(previous.runtime.directory, join(privateDir, "runtime"));
  if (!existsSync(join(evidence, "launch-first.json")))
    writeFileSync(
      join(evidence, "launch-first.json"),
      JSON.stringify(previous, null, 2),
      { flag: "wx" },
    );
}
if (!resume)
  console.log(
    JSON.stringify({ stage: "snapshotting-and-verifying-installed-runtime" }),
  );
const frozen = resume
  ? previous.runtime
  : snapshotServerRuntime(root, join(privateDir, "runtime"));
const requireFrozen = createRequire(join(frozen.directory, "package.json"));
const loader = requireFrozen.resolve("tsx");
const child = spawn(
  process.execPath,
  [
    "--import",
    pathToFileURL(loader).href,
    join(frozen.directory, "server/index.ts"),
  ],
  {
    cwd: frozen.directory,
    windowsHide: true,
    stdio: "inherit",
    env: {
      ...process.env,
      ...keys,
      NODE_ENV: "development",
      NODE_OPTIONS: "--max-old-space-size=512",
      HOST: "127.0.0.1",
      PORT: "4921",
      DATABASE_PATH: join(privateDir, "database.sqlite"),
      ERASURE_LEDGER_PATH: join(privateDir, "erasure-intents.sqlite"),
      TSX_TSCONFIG_PATH: join(frozen.directory, "tsconfig.json"),
      IP_RASM_TEST_SERVER: "1",
      IP_RASM_TEST_ORIGIN: "http://127.0.0.1:4920",
      APP_ORIGIN: "http://127.0.0.1:4920",
      SERVER_GENERATION: "1",
      PAYMENTS_SANDBOX: "1",
      FCM_MODE: "disabled",
      TRANSACTIONAL_EMAIL_MODE: "disabled",
      CLICK_SERVICE_ID: "",
      CLICK_SECRET_KEY: "",
      PAYME_TEST_KEY: "",
      PAYME_LOGIN: "",
      NODE_PATH: "",
      ESBUILD_BINARY_PATH: "",
    },
  },
);
const { preview } = await import(
  pathToFileURL(requireFrozen.resolve("vite")).href
);
const server = await preview({
  configFile: false,
  envFile: false,
  root,
  build: { outDir: web },
  preview: {
    host: "127.0.0.1",
    port: 4920,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:4921" },
  },
});
const stop = () => {
  child.kill();
  server.httpServer.close();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", () => server.httpServer.close());
let ready = false;
for (let n = 0; n < 100; n++) {
  try {
    const h = await (await fetch("http://127.0.0.1:4921/api/health")).json();
    assert(h.sandbox && !h.livePayments);
    assert.equal((await fetch("http://127.0.0.1:4920/")).status, 200);
    ready = true;
    break;
  } catch {
    await new Promise((ok) => setTimeout(ok, 300));
  }
}
assert(ready, "New W2 sandbox failed readiness");
if (!resume)
  writeFileSync(
    join(evidence, "manual-testing.txt"),
    `IP RASM — W2 WEBSITE\nURL: http://127.0.0.1:4920/\nAPI: http://127.0.0.1:4921/api\nNew sandbox kit code (3 works): ${code}\n\nFar photo -> Zoom to face -> low-resolution warning. Preview needs no login. Start/PDF -> Buy -> I have a code. Header -> Sign in/Register -> My works.\nContact placeholders must be replaced in src/owner-contact.ts before real orders. No real payments or deliveries.\n`,
    { flag: "wx", mode: 0o600 },
  );
writeFileSync(
  join(evidence, "launch.json"),
  JSON.stringify(
    {
      pid: process.pid,
      apiPid: child.pid,
      web,
      privateDir,
      runtime: frozen,
      site: "http://127.0.0.1:4920",
      api: "http://127.0.0.1:4921/api",
      freshSeedCopy: true,
      kitCodePrinted: false,
    },
    null,
    2,
  ),
  { flag: resume ? "w" : "wx" },
);
console.log(
  JSON.stringify({
    ready: true,
    url: "http://127.0.0.1:4920/",
    codes: "output/website-w2/manual-testing.txt",
    credentialsPrinted: false,
  }),
);
