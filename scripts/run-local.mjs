import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
const webDir=process.env.IP_RASM_WEB_DIR || "dist";
if(!/^[a-zA-Z0-9_./-]+$/.test(webDir)||webDir.includes(".."))throw Error("Invalid local web directory");
if (!existsSync(`${webDir}/index.html`)) throw new Error("Run the selected web build first.");
const port = Number(process.env.IP_RASM_LOCAL_PORT || 4183);
const apiPort = Number(process.env.IP_RASM_API_PORT || 4311);
if (!Number.isSafeInteger(apiPort) || apiPort < 1024 || apiPort > 65535)
  throw new Error("Invalid IP_RASM_API_PORT");
if (
  !Number.isSafeInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  port === apiPort
)
  throw new Error("Invalid IP_RASM_LOCAL_PORT.");
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
function run(args, env = process.env) {
  const child = spawn(process.execPath, args, { env, stdio: "inherit" });
  children.push(child);
  child.on("error", () => stop(1));
  child.on("exit", (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
async function probe(url) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  } catch (e) {
    if (e?.cause?.code === "ECONNREFUSED") return;
    throw new Error(`Cannot check ${url}: ${e.message}`);
  }
  if (!response.ok)
    throw new Error(`Unexpected service at ${url}: HTTP ${response.status}`);
  return response.json();
}
const api = await probe(`http://127.0.0.1:${apiPort}/api/health`);
if (api) {
  if (
    api.sandbox !== true ||
    api.livePayments !== false ||
    api.liveMessages !== false ||
    api.apiVersion !== "business-sandbox/2"
  )
    throw new Error(
      `Port ${apiPort} has a different/older API. Existing processes were preserved. Use a free IP_RASM_API_PORT.`,
    );
  console.log(`Using the existing local sandbox on ${apiPort}.`);
} else
  run(["--import", "tsx", "server/index.ts"], {
    ...process.env,
    PORT: String(apiPort),
  });
try {
  const site = await probe(`http://127.0.0.1:${port}/manifest.webmanifest`);
  if (site) {
    if (site.name !== "Ip Rasm" || site.start_url !== "/")
      throw new Error("Website port is occupied by an unexpected service.");
    const html = await (
      await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(3000),
      })
    ).text();
    if (html.trim() !== readFileSync(`${webDir}/index.html`, "utf8").trim())
      throw new Error(
        `Port ${port} serves an older build. It was preserved. Set IP_RASM_LOCAL_PORT to a free port, such as 4192.`,
      );
    console.log(`Current Ip Rasm website: http://127.0.0.1:${port}/`);
  } else {
    run(
      [
        "node_modules/vite/bin/vite.js",
        "preview",
        "--outDir",webDir,
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--strictPort",
      ],
      { ...process.env, IP_RASM_BACKEND_PROXY: `http://127.0.0.1:${apiPort}` },
    );
    console.log(`Local website: http://127.0.0.1:${port}/`);
  }
} catch (e) {
  console.error(e.message);
  stop(1);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
