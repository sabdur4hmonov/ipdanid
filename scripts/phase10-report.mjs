import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import UPNGModule from "@pdf-lib/upng";
const UPNG = UPNGModule.default ?? UPNGModule;
const root = "output/phase10";
mkdirSync(root, { recursive: true });
const names = [
  "synthetic-1-circle",
  "synthetic-2-circle",
  "synthetic-3-circle",
  "owner-phase9-circle",
  "synthetic-1-square",
  "synthetic-pair-heart",
];
const rows = [];
for (const project of ["desktop", "mobile-browser"])
  for (const name of names) {
    const directory = join(root, project, name),
      file = join(directory, "result.json");
    if (existsSync(file))
      rows.push({
        ...JSON.parse(readFileSync(file, "utf8")),
        directory: `${project}/${name}`,
      });
  }
const sha = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const sources = [
  "output/phase10/inputs/synthetic-1.png",
  "output/phase10/inputs/synthetic-2.png",
  "output/phase10/inputs/synthetic-3.png",
  "output/portrait-dispatch/target-320.png",
  "output/portrait-dispatch/target-320.bin",
  "output/reference-classic/reference-2500.png",
];
const provenance = sources
  .filter(existsSync)
  .map((path) => ({ path, sha256: sha(path) }));
const review = existsSync(join(root, "visual-review.json"))
  ? JSON.parse(readFileSync(join(root, "visual-review.json"), "utf8"))
  : null;
writeFileSync(
  join(root, "results.json"),
  JSON.stringify(
    { createdAt: new Date().toISOString(), rows, provenance, review },
    null,
    2,
  ),
);
const escape = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const figures = (row) =>
  [
    ["Prepared target (500px)", `${row.directory}/target.png`],
    [
      "App: actual2500-strand physical render (1000px)",
      `${row.directory}/app.png`,
    ],
    [
      "Owner-supplied reference2500 (different person for synthetic cases)",
      "../reference-classic/reference-2500.png",
    ],
    [
      "Independent reference render of the same exported path",
      `${row.directory}/reference-same-path.png`,
    ],
  ]
    .map(
      ([title, path]) =>
        `<figure><figcaption>${escape(title)}</figcaption><a href="${path}"><img src="${path}" alt="${escape(title)}"></a></figure>`,
    )
    .join("");
writeFileSync(
  join(root, "report.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Ip Rasm Phase10 real UI reference report</title><style>body{font:16px system-ui;background:#f4f6fa;color:#172e49;margin:24px}section{background:white;padding:20px;margin:20px 0;border:1px solid #ccd5dd;border-radius:14px}.comparison{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}figure{margin:0}img{width:100%;height:auto;background:white}figcaption{min-height:3em;font-size:14px}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#193e70}@media(max-width:800px){.comparison{grid-template-columns:1fr 1fr}}</style><h1>Phase10 — actual JPG upload → prepared target → real thread result</h1><p>All photos stayed local. Three original synthetic portraits plus the exact processed owner crop used by Phase9; the owner crop is not an original source-photo/background acceptance. Every case used the ordinary Standard Kit gallery button, real local people models, the default500 grid/240 pins/2500 connections, and legitimate kit-code unlock before exports. Geometry is the printed kit's exact physical coordinates and sector labels.</p><p>The supplied owner reference has a different crop and preparation. Synthetic-person likeness must be compared with its own target; the independent same-path render proves physical rendering identity. Circle/Square decisions are additionally compared with the supplied unmodified reference solver on identical prepared pixels, exact pins and Gaussian weights. Heart retains mandatory concave-layout guards. No photo overlay or cosmetic thread thickening.</p><p>UI generation times include Worker calculation, checkpoints, validation and visible1000px rendering; segmentation/preparation precede Generate. Old160px flow:25.973s desktop/22.916s mobile. New first JPEG regression:5.848s/7.752s.</p><p>Completed evidence rows: ${rows.length}/12. Passing rows: ${rows.filter((r) => r.passed).length}. Visual review: ${review ? escape(JSON.stringify(review)) : "PENDING — implementation and path equality alone do not establish likeness."}</p>${rows.map((r) => `<section><h2>${escape(r.project + " / " + r.name)}</h2><p>${escape(r.uiGenerationMs)}ms UI · ${escape(r.connections)} connections · ${Number(r.metres ?? 0).toFixed(1)}m · ${r.passed ? "PASS" : "INCOMPLETE / FAILED"}</p><div class="comparison">${figures(r)}</div><details><summary>Measured evidence</summary><pre>${escape(JSON.stringify(r, null, 2))}</pre><a href="${r.directory}/guide.json">Exact guide JSON</a> · <a href="${r.directory}/guide.txt">TXT</a> · <a href="${r.directory}/guide.pdf">PDF</a></details></section>`).join("")}<details><summary>Local source hashes</summary><pre>${escape(JSON.stringify(provenance, null, 2))}</pre></details></html>`,
);
// A plain contact sheet for visual inspection; only resamples the actual panels.
for (const row of rows.filter((r) => r.project === "desktop")) {
  const paths = [
    join(root, row.directory, "target.png"),
    join(root, row.directory, "app.png"),
    "output/reference-classic/reference-2500.png",
  ];
  if (!paths.every(existsSync)) continue;
  const out = new Uint8Array(1200 * 400 * 4).fill(255);
  for (let panel = 0; panel < paths.length; panel++) {
    const bytes = Uint8Array.from(readFileSync(paths[panel])),
      decoded = UPNG.decode(bytes.buffer),
      rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
    for (let y = 0; y < 400; y++)
      for (let x = 0; x < 400; x++) {
        const sx = Math.min(
            decoded.width - 1,
            Math.floor(((x + 0.5) * decoded.width) / 400),
          ),
          sy = Math.min(
            decoded.height - 1,
            Math.floor(((y + 0.5) * decoded.height) / 400),
          ),
          a = (sy * decoded.width + sx) * 4,
          b = (y * 1200 + panel * 400 + x) * 4;
        out.set(rgba.subarray(a, a + 4), b);
      }
  }
  writeFileSync(
    join(root, row.directory, "comparison.png"),
    new Uint8Array(UPNG.encode([out.buffer], 1200, 400, 0)),
  );
}
console.log(
  JSON.stringify({
    report: join(root, "report.html"),
    rows: rows.length,
    passed: rows.filter((r) => r.passed).length,
    maxUiMs: Math.max(0, ...rows.map((r) => r.uiGenerationMs ?? 0)),
  }),
);
