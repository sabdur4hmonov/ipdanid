import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { freemem } from "node:os";
import UPNGModule from "@pdf-lib/upng";
import { benchmark, fixtureRoot, reviewRoot } from "./benchmark";
import {
  fitResearch,
  recipes,
  researchGeometry,
  sketchTarget,
  type Candidate,
} from "./candidates";
import { scoreRender } from "./review";
import { generatePortraitEnhanced } from "../../src/core/portrait-enhancement";
import { sourceMidcontrast } from "../../src/core/source-midcontrast";
import { referenceRaster } from "../../src/core/classic-reference";
import { hash } from "../../src/core/engine";
import { validateInstruction } from "../../src/core/validation";
import type { GenerateOptions } from "../../src/core/engine";
import type { Instruction, RegionBox } from "../../src/core/types";

const UPNG =
  (UPNGModule as unknown as { default?: typeof UPNGModule }).default ??
  UPNGModule;
const sha = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
const opaque = () => randomBytes(12).toString("hex") + ".png";
const id = process.argv[2],
  item = benchmark.find((c) => c.id === id);
assert(item, "Pass exactly one frozen portrait-NN case");
assert(freemem() >= 1.5 * 2 ** 30, "RAM below1.5GiB; no heavy job started");
const privateDir = `${reviewRoot}/private/${id}`,
  assets = `${reviewRoot}/assets`;
assert(
  !existsSync(`${privateDir}/result.json`),
  "Completed case is sealed; do not rerun",
);
const doc = readFileSync("docs/P16_1B_BENCHMARK.md", "utf8");
const frozen = JSON.parse(doc.split("```json\n")[1].split("\n```")[0]).find(
  (c: { id: string }) => c.id === id,
);
for (const [path, expected] of Object.entries(frozen.hashes))
  assert.equal(
    sha(readFileSync(path)),
    expected,
    "Frozen input hash changed: " + path,
  );
mkdirSync(privateDir, { recursive: true });
mkdirSync(assets, { recursive: true });
const input = fixtureRoot + item.folder + "/",
  options: GenerateOptions = JSON.parse(
    readFileSync(input + "options.json", "utf8"),
  );
const pixels = new Uint8Array(readFileSync(input + "target.bin")),
  archived = await validateInstruction(
    JSON.parse(readFileSync(input + "guide.json", "utf8")),
  );
assert.equal(options.lines, 3000);
assert.equal(options.resolution, 500);
assert.equal(archived.profile.pins.length, 240);
const faces = options.kitPreparation!.transform.targetFaces!;
// Actual unchanged production entry point; includes its preparation selection.
const baselinePath = `${privateDir}/baseline.json`;
const priorBaseline = existsSync(baselinePath)
  ? JSON.parse(readFileSync(baselinePath, "utf8"))
  : undefined;
const baselineStart = performance.now();
const current = priorBaseline
  ? archived
  : await generatePortraitEnhanced({ ...options, pixels });
assert.deepEqual(
  current.segments,
  archived.segments,
  "Current production path differs from accepted control",
);
assert.equal(current.imageHash, archived.imageHash);
assert.deepEqual(current.params.kitPreparation, archived.params.kitPreparation);
const baselineRgb = priorBaseline ? undefined : referenceRaster(current, 1000),
  baselineMs: number = priorBaseline?.ms ?? performance.now() - baselineStart;
const rows: Record<string, unknown> = {};

function png(rgba: Uint8Array, w: number, h: number) {
  const name = opaque();
  writeFileSync(
    `${assets}/${name}`,
    Buffer.from(UPNG.encode([rgba.buffer as ArrayBuffer], w, h, 0)),
  );
  return "assets/" + name;
}
function save(rgb: Float32Array, faceBoxes: RegionBox[]) {
  const rgba = Uint8Array.from({ length: 4000000 }, (_, k) =>
    k % 4 === 3 ? 255 : Math.round(rgb[Math.floor(k / 4) * 3 + (k % 4)] * 255),
  );
  const noses = faceBoxes.map((f) => {
    const x = Math.max(0, Math.floor((f.left + 0.25 * f.width) * 1000)),
      y = Math.max(0, Math.floor((f.top + 0.3 * f.height) * 1000));
    const w = Math.min(1000 - x, Math.ceil(0.5 * f.width * 1000)),
      h = Math.min(1000 - y, Math.ceil(0.5 * f.height * 1000));
    const crop = new Uint8Array(w * h * 4);
    for (let j = 0; j < h; j++)
      crop.set(
        rgba.subarray(((y + j) * 1000 + x) * 4, ((y + j) * 1000 + x + w) * 4),
        j * w * 4,
      );
    return { src: png(crop, w, h), width: w, height: h };
  });
  return { render: png(rgba, 1000, 1000), noses, pixelSha: sha(rgba) };
}
rows.baseline = priorBaseline ?? {
  recipe: "unchanged-classic3/preparation-selection",
  ms: baselineMs,
  scores: scoreRender(pixels, baselineRgb!, faces, options.profile.shape),
  pathSha: sha(JSON.stringify(current.segments[0].path)),
  imageHash: current.imageHash,
  ...save(baselineRgb!, faces),
};
assert.equal(
  (rows.baseline as { pathSha: string }).pathSha,
  sha(JSON.stringify(archived.segments[0].path)),
);
writeFileSync(
  `${privateDir}/baseline.json`,
  JSON.stringify(rows.baseline, null, 2),
);
// Each candidate constructs its own geometry: cold timing cannot hide cache cost.
for (const candidate of ["A", "B", "C"] as Candidate[]) {
  const completedPath = `${privateDir}/${candidate}-metrics.json`;
  if (existsSync(completedPath)) {
    rows[candidate] = JSON.parse(readFileSync(completedPath, "utf8"));
    continue;
  }
  assert(
    freemem() >= 1.5 * 2 ** 30,
    "RAM below1.5GiB before candidate " + candidate,
  );
  const start = performance.now();
  let target =
    archived.params.kitPreparation!.version === "standard-preparation/10"
      ? sourceMidcontrast(pixels, 500)
      : pixels;
  assert.equal(
    await hash(target),
    archived.imageHash,
    "Selected prep10 solver input mismatch",
  );
  if (candidate === "B") target = sketchTarget(target, 500, faces);
  // The current caption path is a single cold solve, so skip the costly inverse
  // incidence index there. Same ordered sums/routes; measured parity is required.
  const geometryStart = performance.now(),
    geometry = options.kitPreparation?.transform.caption
      ? false
      : researchGeometry(options.profile, 500),
    geometryMs = performance.now() - geometryStart;
  const fitStart = performance.now(),
    route = await fitResearch(
      { ...options, pixels: target },
      candidate,
      geometry,
    ),
    fitMs = performance.now() - fitStart;
  if (candidate === "A")
    assert.deepEqual(
      route.path.slice(0, 2551),
      current.segments[0].path.slice(0, 2551),
      "A must preserve exact2550 greedy prefix",
    );
  // This view is for rendering only, never serialized as a production guide.
  const projection = {
    profile: options.profile,
    segments: [{ color: options.profile.colors[0], path: route.path }],
    params: { resolution: 500 },
    metrics: { lines: 3000 },
  } as Instruction;
  const rgb = referenceRaster(projection, 1000),
    ms = performance.now() - start;
  const scores = scoreRender(pixels, rgb, faces, options.profile.shape);
  const row = {
    recipe: recipes[candidate],
    ms,
    geometryMs,
    fitMs,
    indexedCache: !!geometry,
    ratio: ms / baselineMs,
    scores,
    targetSha: sha(target),
    pathSha: sha(JSON.stringify(route.path)),
    ...save(rgb, faces),
  };
  const formerPath = `${privateDir}/diagnostics/indexed-cache/${candidate}-metrics.json`;
  if (existsSync(formerPath)) {
    const former = JSON.parse(readFileSync(formerPath, "utf8"));
    assert.equal(
      row.pathSha,
      former.pathSha,
      "Cold-cache optimization changed route",
    );
    assert.equal(
      row.pixelSha,
      former.pixelSha,
      "Cold-cache optimization changed physical output",
    );
  }
  rows[candidate] = row;
  writeFileSync(
    `${privateDir}/${candidate}-route.json`,
    JSON.stringify({
      ...route,
      importableGuide: false,
      pins: options.profile.pins,
      sectors: options.profile.standardKit,
      material: {
        threadMm: 0.12,
        opacity: 0.9,
        renderer: "classic-coverage/2",
      },
    }),
  );
  writeFileSync(
    `${privateDir}/${candidate}-metrics.json`,
    JSON.stringify(row, null, 2),
  );
  console.log(
    JSON.stringify({
      id,
      candidate,
      baselineMs: Math.round(baselineMs),
      ms: Math.round(ms),
      ratio: +row.ratio.toFixed(3),
      faces: scores.length,
    }),
  );
}
const originals = [
  item.source,
  ...(id === "portrait-07" ? ["output/phase10/inputs/synthetic-2.png"] : []),
].map((path) => {
  const suffix = path.endsWith(".jpg") ? ".jpg" : ".png",
    name = randomBytes(12).toString("hex") + suffix;
  writeFileSync(`${assets}/${name}`, readFileSync(path));
  return "assets/" + name;
});
writeFileSync(
  `${privateDir}/result.json`,
  JSON.stringify(
    {
      id,
      folder: item.folder,
      shape: options.profile.shape,
      faces,
      originalSources: originals,
      rows,
      baselineMatchesArchived: true,
      frozenHashes: frozen.hashes,
    },
    null,
    2,
  ),
  { flag: "wx" },
);
console.log(id + " complete; private results sealed.");
