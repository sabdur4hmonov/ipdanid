// An actual fresh Vite server must refuse ignored private bundles, not merely
// omit them from a build. Test only artificial canaries; never HTTP-fetch keys.
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createServer } from "vite";
import { assertTestPorts } from "../server/test-safety.mjs";
const port = Number(process.env.PRIVATE_KIT_BOUNDARY_PORT ?? 4807);
assertTestPorts(port, port + 1);
mkdirSync("output/phase16-private", { recursive: true });
const dir = mkdtempSync(resolve("output/phase16-private/dev-canary-")),
  path = join(dir, "private-keys.json"),
  marker = "PRIVATE_KIT_CANARY_NOT_A_CREDENTIAL";
writeFileSync(path, JSON.stringify({ canary: marker }), { flag: "wx" });
const server = await createServer({
  logLevel: "silent",
  server: { port, host: "127.0.0.1", strictPort: true, watch: null },
});
let checks = 0;
try {
  await server.listen();
  const relative = path.slice(resolve(".").length).replaceAll("\\", "/");
  for (const url of [
    relative,
    "/@fs/" + path.replaceAll("\\", "/"),
    relative + "?raw",
    relative + "?import",
  ]) {
    const r = await fetch(`http://127.0.0.1:${port}` + url);
    assert.equal(r.status, 403, "Private bundle HTTP denial");
    assert(!(await r.text()).includes(marker), "Private canary must not leak");
    checks++;
  }
  writeFileSync(
    "output/phase16-private-boundary.json",
    JSON.stringify(
      { passed: true, checks, port, realSecretsRequested: false },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ passed: true, checks, realSecretsRequested: false }),
  );
} finally {
  await server.close();
}
