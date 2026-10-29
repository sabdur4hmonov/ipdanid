// Own ephemeral browser/model server. Never connects to an app/API/database.
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { freemem } from "node:os";
import { resolve, join } from "node:path";
import { cases, sources, root, fixtureRoot } from "./benchmark.ts";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
assert(freemem() >= 1.5 * 2 ** 30, "RAM below1.5GiB");
assert(
  !existsSync(root + "/private/preparation.json"),
  "Completed preparation is sealed",
);
mkdirSync(root + "/private", { recursive: true });
const originalManifest = JSON.parse(
  readFileSync("docs/P16_1B_BENCHMARK.md", "utf8")
    .split("```json\n")[1]
    .split("\n```")[0],
);
for (const c of cases)
  for (const [p, expected] of Object.entries(
    originalManifest.find((r) => r.id === c.priorId).hashes,
  ))
    assert.equal(sha(readFileSync(p)), expected, "Frozen input changed");
await build({
  entryPoints: ["scripts/p16-1c/prepare-browser.ts"],
  outfile: root + "/private/prepare.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  logLevel: "silent",
});
const vendor = new Set([
  "vision_bundle.js",
  "face_landmarker.task",
  "selfie_multiclass_256x256.tflite",
  "deeplab_v3.tflite",
  "wasm/vision_wasm_internal.js",
  "wasm/vision_wasm_internal.wasm",
  "wasm/vision_wasm_nosimd_internal.js",
  "wasm/vision_wasm_nosimd_internal.wasm",
]);
const server = createServer((req, res) => {
  const p = new URL(req.url, "http://127.0.0.1").pathname;
  if (p === "/") {
    res.setHeader("Content-Type", "text/html");
    res.end('<!doctype html><script type="module" src="/prepare.js"></script>');
    return;
  }
  let file;
  if (p === "/prepare.js") file = resolve(root, "private/prepare.js");
  else if (
    p.startsWith("/vendor/portrait-segmentation/") &&
    vendor.has(p.slice(30))
  )
    file = join("public/vendor/portrait-segmentation", p.slice(30));
  if (!file) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader(
    "Content-Type",
    file.endsWith(".js")
      ? "text/javascript"
      : file.endsWith(".wasm")
        ? "application/wasm"
        : "application/octet-stream",
  );
  res.end(readFileSync(file));
});
await new Promise((ok, fail) => {
  server.once("error", fail);
  server.listen(4890, "127.0.0.1", ok);
});
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  // Offline-only model assets; no source pixels or requests may leave loopback.
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === "http://127.0.0.1:4890"
      ? route.continue()
      : route.abort(),
  );
  await page.goto("http://127.0.0.1:4890/");
  await page.waitForFunction(() => !!window.p16framing);
  const analyses = {},
    settings = [];
  for (const source of sources) {
    assert(freemem() >= 1.5 * 2 ** 30, "RAM below1.5GiB before analysis");
    const bytes = readFileSync(source.source),
      mime = source.source.endsWith(".jpg") ? "image/jpeg" : "image/png";
    analyses[source.source] = await page.evaluate(
      async ({ id, data }) => window.p16framing.analyze(id, data),
      {
        id: source.source,
        data: `data:${mime};base64,${bytes.toString("base64")}`,
      },
    );
    console.log("Prepared existing source " + source.id + " locally");
  }
  for (const c of cases) {
    const options = JSON.parse(
      readFileSync(fixtureRoot + c.folder + "/options.json", "utf8"),
    );
    const face = options.kitPreparation.transform.faces[0],
      analysis = analyses[c.source];
    for (const level of ["F1", "F2"]) {
      const result = await page.evaluate(
        ({ source, face, nose, shape, level }) =>
          window.p16framing.frame(source, face, nose, shape, level),
        {
          source: c.source,
          face,
          nose: analysis.nose,
          shape: options.profile.shape,
          level,
        },
      );
      const directory = `${root}/private/${c.id}`;
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        `${directory}/${level}-target.bin`,
        Buffer.from(result.pixels, "base64"),
      );
      const { pixels, ...metadata } = result;
      writeFileSync(
        `${directory}/${level}-framing.json`,
        JSON.stringify(metadata, null, 2),
      );
      settings.push({
        id: c.id,
        source: c.source,
        sourceSha: sha(readFileSync(c.source)),
        shape: options.profile.shape,
        ...metadata,
      });
    }
  }
  writeFileSync(
    root + "/private/preparation.json",
    JSON.stringify(
      { analyses, settings, requestsOutsideLoopback: false },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(
    "Four sources / six cases / twelve parameter-only framings prepared",
  );
} finally {
  await browser?.close();
  await new Promise((ok) => server.close(ok));
}
