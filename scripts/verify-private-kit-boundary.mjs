// An actual fresh Vite server must refuse ignored private bundles, not merely
// omit them from a build. Test only artificial canaries; never HTTP-fetch keys.
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  existsSync,
  realpathSync,
} from "node:fs";
import { resolve, join, dirname, basename } from "node:path";
import { createServer } from "vite";
import { assertTestPorts } from "../server/test-safety.mjs";
const port = Number(process.env.PRIVATE_KIT_BOUNDARY_PORT ?? 4807);
assertTestPorts(port, port + 1);
const report = resolve(
  process.env.PRIVATE_KIT_BOUNDARY_REPORT ??
    "output/phase16-private-boundary.json",
);
assert.equal(dirname(report), resolve("output"));
assert(
  /^phase16-[a-z0-9-]+\.json$/.test(basename(report)) && !existsSync(report),
  "Preserve an existing boundary report",
);
mkdirSync("output/phase16-private", { recursive: true });
assert.equal(
  realpathSync("output/phase16-private"),
  resolve("output/phase16-private"),
);
const dir = mkdtempSync(resolve("output/phase16-private/dev-canary-")),
  path = join(dir, "private-keys.json"),
  marker = "PRIVATE_KIT_CANARY_NOT_A_CREDENTIAL";
writeFileSync(path, JSON.stringify({ canary: marker }), { flag: "wx" });
const manualDir = mkdtempSync(resolve("output/phase16-manual-canary-")),
  manualPath = join(manualDir, "manual-testing.txt");
writeFileSync(manualPath, marker, { flag: "wx" });
const server = await createServer({
  logLevel: "silent",
  server: { port, host: "127.0.0.1", strictPort: true, watch: null },
});
let checks = 0;
try {
  await server.listen();
  for (const file of [path, manualPath]) {
    const relative = file.slice(resolve(".").length).replaceAll("\\", "/");
    for (const url of [
      relative,
      "/@fs/" + file.replaceAll("\\", "/"),
      relative + "?raw",
      relative + "?import",
    ]) {
      const r = await fetch(`http://127.0.0.1:${port}` + url);
      const body = await r.text();
      console.log(
        JSON.stringify({
          check: checks + 1,
          kind: file === manualPath ? "manual" : "private",
          status: r.status,
          containsCanary: body.includes(marker),
          contentType: r.headers.get("content-type"),
        }),
      );
      assert.equal(r.status, 403, "Private bundle HTTP denial");
      assert(!body.includes(marker), "Private canary must not leak");
      checks++;
    }
  }
  writeFileSync(
    report,
    JSON.stringify(
      { passed: true, checks, port, realSecretsRequested: false },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({ passed: true, checks, realSecretsRequested: false }),
  );
} finally {
  await server.close();
}
