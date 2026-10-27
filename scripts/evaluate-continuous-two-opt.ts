// One fixed private-original probe; refuses overwriting a completed experiment.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import UPNGModule from "@pdf-lib/upng";
import { continuousTwoOpt, routeDegrees } from "./continuous-two-opt";
import { validateInstruction } from "../src/core/validation";
import {
  portraitDetailScore,
  portraitDetailImproves,
} from "../src/core/portrait-enhancement";
import { viewingImage } from "../src/core/viewing-ssim";
import { referenceRaster } from "../src/core/classic-reference";
import { connectionAllowed } from "../src/core/geometry";
import {
  squareChordExcluded,
  SquareWeave,
} from "../src/core/classic-least-squares";
import { frozenReferenceRaster } from "../tests/helpers/frozen-classic-raster";
import { hash } from "../src/core/engine";
import type { Instruction } from "../src/core/types";
const input =
    "output/quality-original-20261026/combined-original-20261027-desktop-circle/",
  out = "output/quality-two-opt-20261027/owner-circle/";
assert(
  !existsSync(out + "metrics.json"),
  "Completed probe is sealed; do not rerun",
);
mkdirSync(out, { recursive: true });
const base = await validateInstruction(
    JSON.parse(readFileSync(input + "guide.json", "utf8")),
  ),
  pixels = new Uint8Array(readFileSync(input + "target.bin"));
assert.equal(base.params.resolution, 500);
assert.equal(base.metrics.lines, 3000);
assert.equal(base.profile.pins.length, 240);
assert.equal(base.profile.threadMm, 0.12);
assert.equal(base.profile.opacity, 0.9);
assert.equal(
  await hash(pixels),
  base.params.kitPreparation?.tone?.parentImageHash,
);
const start = performance.now(),
  before = portraitDetailScore(pixels, base),
  rgbBefore = referenceRaster(base, 1000),
  mono = new Float32Array(1000000);
for (let k = 0; k < mono.length; k++) mono[k] = rgbBefore[k * 3];
const goal = viewingImage(
    Float32Array.from({ length: 250000 }, (_, k) => pixels[k * 3] / 255),
    500,
  ),
  view = viewingImage(mono, 1000);
const r = continuousTwoOpt(
  base.profile,
  base.segments[0].path,
  goal,
  view,
  base.params.kitPreparation!.transform.targetFaces!,
);
const used = new Set<number>(),
  count = 240,
  weave = new SquareWeave(base.profile);
for (let k = 1; k < r.path.length; k++) {
  const a = r.path[k - 1],
    b = r.path[k],
    key = Math.min(a, b) * count + Math.max(a, b),
    gap = Math.abs(a - b);
  assert(
    Math.min(gap, count - gap) >= 25 &&
      !used.has(key) &&
      connectionAllowed(base.profile, a, b) &&
      !squareChordExcluded(base.profile, a, b) &&
      weave.allows(a, b),
    "Illegal physical route",
  );
  used.add(key);
  weave.add(a, b);
}
assert.deepEqual(
  routeDegrees(r.path, 240),
  routeDegrees(base.segments[0].path, 240),
);
// This projection contains only physical evaluator fields. It deliberately has
// no algorithm/schema/hash and is NEVER saved or imported as an Instruction.
const raster = {
  profile: base.profile,
  params: base.params,
  metrics: base.metrics,
  segments: [{ color: "#000000", path: r.path }],
};
const after = portraitDetailScore(pixels, raster as Instruction),
  rgbAfter = referenceRaster(raster, 1000),
  old = frozenReferenceRaster(raster, 1000);
assert(
  Buffer.from(rgbAfter.buffer).equals(Buffer.from(old.buffer)),
  "New raster differs from original physical renderer",
);
const totalMs = performance.now() - start,
  qualityPass = portraitDetailImproves(before, after);
writeFileSync(
  out + "route.research.json",
  JSON.stringify(
    {
      ...r,
      parentSequenceHash: base.sequenceHash,
      targetHash: await hash(pixels),
      importable: false,
    },
    null,
    2,
  ),
);
const metrics = {
  hypothesis: "continuous-two-opt/1",
  qualityPass,
  before,
  after,
  refinement: r.metrics,
  totalRefinementAndVerificationMs: totalMs,
  baselineGenerationIncluded: false,
  uiTimingTested: false,
  independentPhysicalFloatsExact: true,
  all3000ChordsLegal: true,
  degreesPreserved: true,
  sourcePhotoUploaded: false,
};
writeFileSync(out + "metrics.json", JSON.stringify(metrics, null, 2));
const UPNG = (UPNGModule as any).default ?? UPNGModule;
const save = (rgb: Float32Array, name: string) => {
  const rgba = Uint8Array.from({ length: 4000000 }, (_, k) =>
    k % 4 === 3 ? 255 : Math.round(rgb[Math.floor(k / 4) * 3 + (k % 4)] * 255),
  );
  writeFileSync(
    out + name,
    Buffer.from(UPNG.encode([rgba.buffer], 1000, 1000, 0)),
  );
};
save(rgbBefore, "before.png");
save(rgbAfter, "after.png");
writeFileSync(
  out + "report.html",
  `<!doctype html><meta charset="utf-8"><title>Actual physical route repair</title><style>body{font:16px system-ui;max-width:1250px;margin:auto;padding:20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}img{width:100%;background:white}pre{white-space:pre-wrap}</style><h1>Original Circle — continuous two-edge repair</h1><p>Research only. Same reviewed source,240pins,3000legal continuous strands,.12mm/.9. No overlay, target change or photographic-equality claim. Not importable as an old guide.</p><div class="grid"><div><img src="../../quality-original-20261026/combined-original-20261027-desktop-circle/target.png">Original evaluation target</div><div><img src="before.png">Current production physical result</div><div><img src="after.png">Research physical result</div></div><pre>${JSON.stringify(metrics, null, 2)}</pre>`,
);
console.log(JSON.stringify(metrics));
