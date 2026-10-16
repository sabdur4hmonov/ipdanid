import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import net from "node:net";
import { freshTestDatabase } from "./test-artifacts.mjs";
const defaultLines = Number(
  readFileSync("src/customer-defaults.ts", "utf8").match(
    /DEFAULT_CUSTOMER_LINES\s*=\s*(\d+)/,
  )[1],
);
const webDir = "output/phase13-dist";
if (!existsSync(`${webDir}/index.html`))
  throw Error("Build the clean Phase12 web directory first.");
async function freePort(start) {
  for (let port = start; port < start + 100; port++) {
    if (
      [4194, 4195, 4196, 4197, 4198, 4331, 4465, 4478, 4479, 4480].includes(
        port,
      )
    )
      continue;
    const free = await new Promise((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
    });
    if (free) return port;
  }
  throw Error("No free isolated preview port");
}
const port = await freePort(4199),
  apiPort = await freePort(4481),
  site = `http://127.0.0.1:${port}`,
  api = `http://127.0.0.1:${apiPort}/api`,
  isolated = freshTestDatabase("owner-sharper"),
  admin = randomBytes(32).toString("base64url");
const child = spawn(process.execPath, ["scripts/run-local.mjs"], {
  env: {
    ...process.env,
    IP_RASM_LOCAL_PORT: String(port),
    IP_RASM_API_PORT: String(apiPort),
    IP_RASM_WEB_DIR: webDir,
    IP_RASM_TEST_SERVER: "1",
    IP_RASM_TEST_ORIGIN: site,
    DATABASE_PATH: isolated.databasePath,
    LOCAL_ADMIN_TOKEN: admin,
    CODE_PEPPER: randomBytes(32).toString("base64url"),
    SANDBOX_PAYMENT_KEY: randomBytes(32).toString("base64url"),
  },
  stdio: "inherit",
  windowsHide: true,
});
const metadata = {
  pid: process.pid,
  childPid: child.pid,
  site,
  api,
  webDir,
  databasePath: isolated.databasePath,
  ownerDataUsed: false,
};
writeFileSync(
  join(isolated.directory, "launch.json"),
  JSON.stringify(metadata, null, 2),
);
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
let ready = false;
for (let attempt = 0; attempt < 120; attempt++) {
  try {
    const r = await fetch(api + "/health");
    if (r.ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 250));
}
if (!ready) {
  child.kill();
  throw Error("Isolated preview API failed to start");
}
const config = await (await fetch(api + "/kit-profiles")).json();
const response = await fetch(api + "/admin/kits/batch", {
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
if (!response.ok) {
  child.kill();
  throw Error("Cannot issue the legitimate isolated test kit");
}
const batch = await response.json(),
  directory = "output/phase13";
mkdirSync(directory, { recursive: true });
writeFileSync(
  `${directory}/manual-testing.txt`,
  `IP RASM — PHASE13 ALOHIDA SINOV\nIlova: ${site}\nKit kodi (${batch.codes[0].quota} natija): ${batch.codes[0].code}\nAdministrator tokeni: ${admin}\nAPI: ${api}\nProfil: r${config.revision}; classic-greedy/3;500px;preparation4;${defaultLines}ulanish;1000px fizik preview\n4194,4195,4196,4197,4198 va asl tmp/data o'zgarmagan. Faqat mahalliy sinov hisobi; fayl Gitga kirmaydi.\n`,
  { mode: 0o600 },
);
writeFileSync(
  `${directory}/preview-launch.json`,
  JSON.stringify(
    {
      ...metadata,
      quota: batch.codes[0].quota,
      credentialPath: `${directory}/manual-testing.txt`,
    },
    null,
    2,
  ),
);
console.log(
  `Sharper preview ready: ${site}; local kit code: ${directory}/manual-testing.txt; isolated data: ${isolated.directory}`,
);
