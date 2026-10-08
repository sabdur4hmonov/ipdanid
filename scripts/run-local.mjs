import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
if (!existsSync("dist/index.html")) throw new Error("Run npm run build first.");
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
run(["--import", "tsx", "server/index.ts"], { ...process.env, PORT: "4311" });
run([
  "node_modules/vite/bin/vite.js",
  "preview",
  "--host",
  "127.0.0.1",
  "--port",
  "4183",
  "--strictPort",
]);
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
