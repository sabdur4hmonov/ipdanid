// One fixed, private matched-kit experiment. No owner image/code in Git.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import assert from "node:assert/strict";
import UPNGModule from "@pdf-lib/upng";
import {
  PROJECTION_CIRCLE,
  generateProjectionCircle,
} from "./projection-circle";
import { validateInstruction } from "../src/core/validation";
import {
  portraitDetailScore,
  portraitDetailImproves,
} from "../src/core/portrait-enhancement";
import { sourceMidcontrast } from "../src/core/source-midcontrast";
import { referenceRaster } from "../src/core/classic-reference";
import { frozenReferenceRaster } from "../tests/helpers/frozen-classic-raster";
import { connectionAllowed } from "../src/core/geometry";
import { hash } from "../src/core/engine";
import type { Instruction } from "../src/core/types";
const input =
    "output/quality-original-20261026/combined-original-20261027-desktop-circle/",
  out = "output/quality-projection-20261027/owner-circle/";
assert(
  !existsSync(out + "metrics.json"),
  "Completed probe is sealed; do not rerun",
);
assert(
  !existsSync(out + "protocol.json"),
  "Started probe already exists; inspect its evidence before resuming",
);
const base = await validateInstruction(
    JSON.parse(readFileSync(input + "guide.json", "utf8")),
  ),
  original = new Uint8Array(readFileSync(input + "target.bin"));
assert.equal(base.params.resolution, 500);
assert.equal(base.params.kitPreparation?.version, "standard-preparation/10");
assert.equal(base.metrics.lines, 3000);
assert.equal(base.profile.shape, "circle");
assert.equal(base.profile.pins.length, 240);
assert.equal(base.profile.threadMm, 0.12);
assert.equal(base.profile.opacity, 0.9);
assert.equal(
  await hash(original),
  base.params.kitPreparation?.tone?.parentImageHash,
);
const begin = performance.now(),
  source = sourceMidcontrast(original, 500);
assert.equal(
  await hash(source),
  base.imageHash,
  "Candidate must use current production preparation10 pixels",
);
const sourcePreparationMs = performance.now() - begin;
mkdirSync(out, { recursive: true });
writeFileSync(
  out + "protocol.json",
  JSON.stringify(
    {
      candidate: PROJECTION_CIRCLE,
      parentSequenceHash: base.sequenceHash,
      originalTargetHash: await hash(original),
      solverTargetHash: base.imageHash,
      pixelsIdenticalToProductionPreparation10: true,
      adaptation:
        "Direct bilinear normalized chord integrals, not MATLAB radon/griddata; fixed budget/guards; published stripe constants unchanged.",
      baselineGenerationIncluded: false,
      externalImageUpload: false,
    },
    null,
    2,
  ),
);
const result = generateProjectionCircle(base.profile, source, 500),
  solveFinished = performance.now();
const seen = new Set<number>(),
  degrees = new Uint16Array(240);
for (let k = 1; k < result.path.length; k++) {
  const a = result.path[k - 1],
    b = result.path[k],
    gap = Math.abs(a - b),
    key = Math.min(a, b) * 240 + Math.max(a, b);
  assert(
    Number.isInteger(a) &&
      Number.isInteger(b) &&
      a >= 0 &&
      b >= 0 &&
      a < 240 &&
      b < 240,
  );
  assert(
    Math.min(gap, 240 - gap) >= 25 &&
      !seen.has(key) &&
      connectionAllowed(base.profile, a, b),
    "Illegal or repeated physical chord",
  );
  seen.add(key);
  degrees[a]++;
  degrees[b]++;
}
assert(Math.max(...degrees) <= 160);
assert.equal(result.metrics.actualLines, Math.max(0, result.path.length - 1));
const control = portraitDetailScore(original, base);
assert.deepEqual(control, {
  faces: [
    {
      face: 0.6158505489781417,
      nose: 0.49652544044974173,
      eyes: 0.6665095680123039,
      mouth: 0.6882849515378566,
    },
  ],
  white: 0.3835131962164373,
});
// Evaluator projection only; NEVER an importable old-engine Instruction.
const physical = {
  profile: base.profile,
  params: base.params,
  metrics: { lines: result.metrics.actualLines },
  segments: [{ color: "#000000", path: result.path }],
};
const candidate = result.complete
    ? portraitDetailScore(original, physical as Instruction)
    : null,
  rgb = referenceRaster(physical as Instruction, 1000),
  independent = frozenReferenceRaster(physical as Instruction, 1000);
assert(
  Buffer.from(rgb.buffer).equals(Buffer.from(independent.buffer)),
  "Physical Float32 renderer parity failed",
);
const verified = performance.now(),
  qualityPass =
    result.complete &&
    candidate !== null &&
    portraitDetailImproves(control, candidate),
  generationMs = sourcePreparationMs + result.metrics.totalMs,
  metrics = {
    candidate: PROJECTION_CIRCLE.version,
    complete: result.complete,
    reason: result.reason,
    qualityPass,
    promoted: false,
    uiTimingTested: false,
    baseline: control,
    candidateScore: candidate,
    solver: result.metrics,
    sourcePreparationMs,
    samePreparedInputGenerationMs: generationMs,
    generationBelow15s: generationMs < 15000,
    independentVerificationMs: verified - solveFinished,
    preparationSolveAndVerificationMs: verified - begin,
    memory: {
      processHighWaterRssBytes: process.resourceUsage().maxRSS * 1024,
      scope:
        "Whole Node process including imports/preparation/physical verification; not isolated solver peak or phone measurement.",
    },
    allReturnedChordsLegal: true,
    noTeleportOrConnector: true,
    independentPhysicalFloatsExact: true,
    currentPreparation10InputHashMatched: true,
    externalSolverOriginalRuntimeExecuted: false,
    matlabNumericalParity: false,
    sourcePhotoUploaded: false,
  };
writeFileSync(
  out + "route.research.json",
  JSON.stringify(
    {
      ...result,
      parentSequenceHash: base.sequenceHash,
      solverTargetHash: base.imageHash,
      importable: false,
    },
    null,
    2,
  ),
);
writeFileSync(out + "metrics.json", JSON.stringify(metrics, null, 2));
const UPNG = (UPNGModule as any).default ?? UPNGModule;
function save(image: Float32Array, name: string) {
  const rgba = Uint8Array.from({ length: 4000000 }, (_, k) =>
    k % 4 === 3
      ? 255
      : Math.round(image[Math.floor(k / 4) * 3 + (k % 4)] * 255),
  );
  writeFileSync(
    out + name,
    Buffer.from(UPNG.encode([rgba.buffer], 1000, 1000, 0)),
  );
}
save(referenceRaster(base, 1000), "before.png");
save(rgb, "candidate.png");
writeFileSync(
  out + "report.html",
  `<!doctype html><meta charset="utf-8"><title>Projection-domain matched-kit experiment</title><style>body{font:16px system-ui;max-width:1250px;margin:auto;padding:20px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}img{width:100%;background:white}pre{white-space:pre-wrap}</style><h1>Original Circle - fixed projection-domain adaptation</h1><p>Research only, not promoted. Same production-preparation10 input and 240 kit pins. Published analytic stripe constants; direct chord integral adaptation, not MATLAB parity. All displayed strands use the unchanged physical .12mm/.9 renderer. ${result.complete ? "3000 continuous connections." : "Incomplete route: rejected without padding."}</p><div class="grid"><div><img src="../../quality-original-20261026/combined-original-20261027-desktop-circle/target.png">Original evaluation target</div><div><img src="before.png">Current production control</div><div><img src="candidate.png">Research physical route</div></div><pre>${JSON.stringify(metrics, null, 2)}</pre>`,
);
console.log(JSON.stringify(metrics));
