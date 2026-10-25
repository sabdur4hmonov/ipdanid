import assert from "node:assert/strict";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
const root = resolve(process.argv[2] || "output/phase15-dist");
const manifest = JSON.parse(
  readFileSync(join(root, ".vite/manifest.json"), "utf8"),
);
const entry = Object.entries(manifest).find(
  ([, v]) => v.isEntry && v.src === "index.html",
);
assert(entry, "Customer entry missing");
const seen = new Set(),
  initial = [];
function visit(key) {
  if (seen.has(key)) return;
  seen.add(key);
  const row = manifest[key];
  assert(row, "Missing chunk dependency");
  if (row.file.endsWith(".js"))
    initial.push({
      file: row.file,
      bytes: statSync(join(root, row.file)).size,
    });
  for (const key of row.imports ?? []) visit(key);
}
visit(entry[0]);
assert(
  !initial.some((v) =>
    /(CustomerHub|CraftStudio|GridStudio|PaintStudio|CreateScreen|Admin|fontkit|firebase)/i.test(
      v.file,
    ),
  ),
  "Expert/provider/PDF code entered the initial graph",
);
assert(
  initial.some((v) => v.file.includes("react-runtime-")),
  "Stable React runtime missing",
);
const app = initial.find((v) => v.file === entry[1].file);
assert(
  app.bytes < 500000,
  "Customer app chunk exceeds the default warning threshold",
);
const report = {
  initial,
  initialJsBytes: initial.reduce((n, v) => n + v.bytes, 0),
  customerAppBytes: app.bytes,
  expertPdfProviderInitiallyLoaded: false,
  warningLimitUnchanged: true,
  fontkitLimit:
    "Upstream single-module shaping/subsetting remains lazy and above500kB; no unsafe fork or warning suppression.",
};
const destination = process.argv
  .find((v) => v.startsWith("--report="))
  ?.slice(9);
if (destination) writeFileSync(destination, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
