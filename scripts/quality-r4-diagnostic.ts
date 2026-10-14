import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  copyFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import UPNGModule from "@pdf-lib/upng";
import { hash, rgb } from "../src/core/engine";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { validateInstruction } from "../src/core/validation";
import { rasterSequence, strandFootprint } from "../src/core/optical";
import { inside } from "../src/core/geometry";
import { portraitRegions, contains } from "../src/core/portrait";
import { anatomicalImportance } from "../src/core/anatomical-importance";
import {
  PhysicalContrast,
  defaultPhysicalContrast,
  physicalOffset,
} from "../src/core/physical-contrast";
import {
  featureContrast,
  DEFAULT_FEATURE_CONTRAST,
} from "../src/core/feature-contrast";
import { regionQuality } from "../src/core/quality-screen";
import { Distribution } from "../src/core/distribution";
import { assemblyEffort } from "../src/core/simplify";
import type { RegionBox } from "../src/core/types";

// Read-only diagnosis of sealed experiments. No fit sweep, candidate search or source overlay.
const out = "output/quality-r4",
  source = "output/portrait-dispatch",
  n = 320;
if (existsSync(`${out}/manifest.json`))
  throw Error("R4 diagnosis is sealed; preserve it");
const paths = {
  root: "output/resolved-convergence/final.json",
  fit: "output/resolved-convergence/fit-24.json",
  target: `${source}/target-320.bin`,
  prior: `${source}/resolved240.json`,
  priorFit: `${source}/resolved240-fit.json`,
  context: "output/portrait-resolved/candidate.json",
  features: "output/feature-contrast/features.json",
  featureFit: "output/feature-contrast/features-fit.json",
  original: `${source}/original-512.png`,
};
const file = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const rootFile = file(paths.root),
  root = await validateInstruction(rootFile.project.instruction),
  prior = await validateInstruction(file(paths.prior).project.instruction),
  context = await validateInstruction(file(paths.context).project.instruction),
  features = await validateInstruction(
    file(paths.features).project.instruction,
  ),
  pixels = new Uint8Array(readFileSync(paths.target)),
  cp: DensityCheckpoint = file(paths.fit),
  priorCp: DensityCheckpoint = file(paths.priorFit),
  fcp: DensityCheckpoint = file(paths.featureFit);
if (
  root.sequenceHash !==
    "8d1f2dd8f3424a0d23c7bb09240228e447ebab8fb9b520310e636ac9873c8323" ||
  root.imageHash !==
    "1d06c780d790a1554daf646c888824d2ae7f2ad97140c7b707239b16a9c727fa" ||
  (await hash(pixels)) !== root.imageHash ||
  context.sequenceHash !==
    "eeb26cf5539462c9d0321579f2025307ea0d94735d08e0ca5497ef3ec8ebc944" ||
  features.imageHash !== root.imageHash
)
  throw Error("Frozen reference identity mismatch");
for (const state of [cp, priorCp, fcp]) {
  const { checksum, ...payload } = state;
  if ((await hash(JSON.stringify(payload))) !== checksum)
    throw Error("Checkpoint checksum mismatch");
}
const replay = await generateDensity(
  {
    profile: prior.profile,
    pixels,
    resolution: n,
    lines: prior.params.requestedLines,
    portrait: prior.params.portrait,
    mode: prior.params.mode,
  },
  {
    resolved: true,
    physical: defaultPhysicalContrast(),
    edgeWeight: 2,
    sweeps: 24,
    extension: {
      version: "resolved-convergence/1",
      checkpoint: priorCp,
      priorSweepLimit: 8,
      reference: prior,
    },
    resume: cp,
    materializeOnly: true,
  },
);
if (JSON.stringify(replay.segments) !== JSON.stringify(root.segments))
  throw Error("Checkpoint does not reproduce complete routed segments");
const portrait = root.params.portrait!,
  boxes = portraitRegions(portrait),
  eye = boxes.eyes,
  face = boxes.face;
const regionalBoxes: Record<string, RegionBox> = {
  leftEye: { ...eye, width: eye.width * 0.48 },
  rightEye: {
    ...eye,
    left: eye.left + eye.width * 0.52,
    width: eye.width * 0.48,
  },
  nose: boxes.nose,
  mouth: boxes.mouth,
  jaw: {
    ...face,
    top: face.top + face.height * 0.75,
    height: face.height * 0.25,
  },
  hair: { left: 0.18, top: 0.03, width: 0.65, height: 0.46 },
};
const target = Float64Array.from(
    { length: n * n },
    (_, k) => (pixels[k * 3] + pixels[k * 3 + 1] + pixels[k * 3 + 2]) / 765,
  ),
  mask = new Uint8Array(n * n),
  weight = new Float64Array(n * n),
  importance = anatomicalImportance(portrait),
  regions: Record<string, Uint8Array> = {};
for (const key of [...Object.keys(regionalBoxes), "skin"])
  regions[key] = new Uint8Array(n * n);
for (let k = 0; k < n * n; k++) {
  const x = (k % n) / (n - 1),
    y = Math.floor(k / n) / (n - 1);
  mask[k] = +inside(root.profile.shape, x, y);
  if (!mask[k]) continue;
  weight[k] = importance(x, y);
  for (const [key, b] of Object.entries(regionalBoxes))
    regions[key][k] = +(
      contains(b, x, y) &&
      (key !== "hair" || target[k] < 0.6)
    );
  regions.skin[k] = +(
    contains(face, x, y) &&
    target[k] >= 0.6 &&
    target[k] <= 0.92 &&
    ![boxes.eyes, boxes.nose, boxes.mouth].some((b) => contains(b, x, y))
  );
}
const physical = new PhysicalContrast(
    n,
    root.profile,
    mask,
    weight,
    2,
    defaultPhysicalContrast(),
  ),
  fine = featureContrast(
    n,
    root.profile,
    portrait,
    target,
    mask,
    weight,
    DEFAULT_FEATURE_CONTRAST,
  );
const weightSum = weight.reduce((a, b) => a + b, 0),
  ink = rgb(root.profile.colors[0]).reduce((a, b) => a + b) / 3;
function terms(d: Float64Array, includeFine = false) {
  let tone = 0;
  for (let k = 0; k < d.length; k++)
    if (mask[k]) {
      const e = d[k] - target[k],
        overshoot =
          1 + 1.5 * Math.max(0, Math.min(1, (target[k] - 0.35) / 0.45)) ** 2;
      tone += weight[k] * e * e * (e < 0 ? overshoot : 1);
    }
  const residual = Float64Array.from(d, (v, k) => v - target[k]),
    contrast = physical.objective(residual),
    feature = includeFine ? fine.operator.objective(residual) : 0;
  return {
    tone,
    physical: contrast,
    feature,
    total: tone + contrast + feature,
    normalized: (tone + contrast + feature) / weightSum,
  };
}
const meanRaster = (i: typeof root) => {
  const r = rasterSequence(i);
  return Float64Array.from(
    { length: n * n },
    (_, k) => (r[k * 3] + r[k * 3 + 1] + r[k * 3 + 2]) / 3,
  );
};
const rootFit = new Float64Array(cp.density),
  rootRoute = meanRaster(root),
  featureFit = new Float64Array(fcp.density),
  featureRoute = meanRaster(features);
const rows: Record<string, unknown> = {};
for (const [name, d, withFine, state] of [
  ["rootFit", rootFit, false, cp],
  ["rootRouted", rootRoute, false, null],
  ["featureFit", featureFit, true, fcp],
  ["featureRouted", featureRoute, true, null],
] as const) {
  const shares = terms(d, withFine);
  if (
    state &&
    Math.abs(shares.total - state.objective) >
      1e-6 * Math.max(1, state.objective)
  )
    throw Error(`${name} independently calculated objective mismatch`);
  if (
    !state &&
    Math.abs(
      shares.normalized -
        (name === "rootRouted" ? root : features).metrics.weightedError!.final,
    ) > 1e-6
  )
    throw Error(`${name} routed objective mismatch`);
  rows[name] = {
    objective: shares,
    regions: Object.fromEntries(
      Object.entries(regions).map(([key, roi]) => [
        key,
        regionQuality(target, d, roi, n, root.profile),
      ]),
    ),
  };
}
// Fixed diagnostic perturbations of existing chords; not a new optimizer/probe search.
const probes = [];
const occupied: number[] = [];
for (let k = 0; k < cp.counts.length; k++)
  if (cp.counts[k] > 0) occupied.push(k);
for (const position of [0, 0.25, 0.5, 0.75, 1]) {
  const key = occupied[Math.floor(position * (occupied.length - 1))],
    a = Math.floor(key / root.profile.pins.length),
    b = key % root.profile.pins.length,
    footprint = strandFootprint(root.profile, a, b, n),
    before = terms(rootFit);
  for (const delta of [-1, 1]) {
    const changed = new Float64Array(rootFit);
    footprint.pixels.forEach((k, j) => {
      if (mask[k])
        changed[k] +=
          (changed[k] - ink) * Math.expm1(-delta * footprint.density[j]);
    });
    const after = terms(changed);
    probes.push({
      a,
      b,
      delta,
      toneGain: before.tone - after.tone,
      physicalGain: before.physical - after.physical,
      totalGain: before.total - after.total,
    });
  }
}
const taper = (box: RegionBox, x: number, y: number) =>
  contains(box, x, y)
    ? ((1 - Math.cos((2 * Math.PI * (x - box.left)) / box.width)) *
        (1 - Math.cos((2 * Math.PI * (y - box.top)) / box.height))) /
      4
    : 0;
let energy = 0,
  lowTaperEnergy = 0,
  uncoveredEnergy = 0,
  gradientTerms = 0,
  coveredTerms = 0;
for (let k = 0; k < n * n; k++) {
  const x = k % n,
    y = Math.floor(k / n),
    t = Math.max(
      taper(boxes.nose, x / (n - 1), y / (n - 1)),
      taper(boxes.mouth, x / (n - 1), y / (n - 1)),
    );
  if (
    !mask[k] ||
    ![boxes.nose, boxes.mouth].some((b) =>
      contains(b, x / (n - 1), y / (n - 1)),
    )
  )
    continue;
  for (const axis of [0, 1]) {
    const pos =
        (axis ? y : x) +
        physicalOffset(
          1.25,
          axis ? root.profile.heightMm : root.profile.widthMm,
          n,
        ),
      lo = Math.floor(pos),
      hi = Math.ceil(pos),
      f = pos - lo;
    if (hi >= n) continue;
    const b = axis ? lo * n + x : y * n + lo,
      c = axis ? hi * n + x : y * n + hi;
    if (!mask[b] || !mask[c]) continue;
    const e = (target[k] - (1 - f) * target[b] - f * target[c]) ** 2,
      covered = !!(fine.active[k] && fine.active[b] && fine.active[c]);
    energy += e;
    gradientTerms++;
    if (t < 0.25) lowTaperEnergy += e;
    if (!covered) uncoveredEnergy += e;
    else coveredTerms++;
  }
}
const distribution = new Distribution(root.profile.pins.length, root.segments);
const diagnosis = {
  version: "r4-diagnostic/1",
  reference:
    "native 320 sample centers; frozen processed target; RGB arithmetic mean, not linear-light luminance",
  regionalBoxes,
  maskPolicy: {
    eyes: "Two halves of reviewed eyes box, with central 4% excluded",
    skin: "Face, excluding reviewed features; target mean RGB .6–.92 (proxy, not semantic skin segmentation)",
    hair: "Manually frozen upper-head box, target mean RGB <.6 (proxy, not semantic hair segmentation)",
    jaw: "Lower 25% of reviewed face",
  },
  rows,
  probes,
  taper: {
    sourceGradientEnergy: energy,
    lowTaperEnergyFraction: lowTaperEnergy / energy,
    uncoveredEnergyFraction: uncoveredEnergy / energy,
    gradientTerms,
    coveredTerms,
  },
  distribution: {
    maximumChord: Math.max(...distribution.pairs.values()),
    maximumIncident: Math.max(...distribution.degree),
  },
  effort: assemblyEffort(root, 8),
  routingConnections: root.metrics.densityFit?.routingConnections,
  hypothesis:
    "Local unsupported texture is measurable in the fit itself. Test a fixed-target excess-gradient penalty in light-tone skin; do not strengthen v16 taper or repeat its fit. No numerical/visual acceptance yet.",
};
mkdirSync(out, { recursive: true });
const UPNG: any = (UPNGModule as any).default ?? UPNGModule;
function png(name: string, data: Float64Array) {
  const rgba = new Uint8Array(n * n * 4);
  for (let k = 0; k < n * n; k++) {
    for (let c = 0; c < 3; c++) rgba[k * 4 + c] = Math.round(data[k] * 255);
    rgba[k * 4 + 3] = 255;
  }
  writeFileSync(
    `${out}/${name}.png`,
    new Uint8Array(UPNG.encode([rgba.buffer], n, n, 0)),
    { flag: "wx" },
  );
}
png("target", target);
png("root-fit", rootFit);
png("root-routed", rootRoute);
png("feature-routed", featureRoute);
copyFileSync(paths.original, `${out}/original.png`);
// Fit is explicitly non-executable. Only routed reconstruction is the guide preview.
const images = [
    "original",
    "target",
    "root-fit",
    "root-routed",
    "feature-routed",
  ],
  labels = [
    "Original crop (512 scaled to 320)",
    "Frozen target (mean RGB)",
    "Root24 fit graph — NOT assembly guide",
    "Root24 complete sequence",
    "Sealed v16 complete sequence",
  ];
let html = `<!doctype html><meta charset="utf-8"><title>R4 frozen diagnostic</title><style>body{font:16px system-ui;background:#faf8ef;color:#18201d}section{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0;max-width:320px}img{width:320px;height:320px} .crop{width:320px;height:220px;position:relative;overflow:hidden;border:1px solid #aaa}.crop img{position:absolute;max-width:none}</style><h1>R4 frozen diagnostic</h1><p>Exact complete ordered sequence, no source overlay. Fit graph is not executable. Proxy skin/hair masks are frozen evaluation regions. Numbers are engineering diagnostics, not likeness approval.</p><section>`;
images.forEach(
  (name, k) =>
    (html += `<figure><img src="${name}.png"><figcaption>${labels[k]}</figcaption></figure>`),
);
html += "</section>";
for (const [key, b] of Object.entries(regionalBoxes)) {
  const scale = Math.min(320 / (b.width * n), 220 / (b.height * n));
  html += `<h2>${key} — same enlarged crop</h2><section>`;
  images.forEach(
    (name, k) =>
      (html += `<figure><div class="crop"><img src="${name}.png" style="width:${n * scale}px;height:${n * scale}px;left:${-b.left * n * scale}px;top:${-b.top * n * scale}px"></div><figcaption>${labels[k]}</figcaption></figure>`),
  );
  html += "</section>";
}
html +=
  '<p><a href="diagnosis.json">Independent objective / regions / fixed perturbations / taper coverage</a></p>';
writeFileSync(`${out}/diagnosis.json`, JSON.stringify(diagnosis, null, 2), {
  flag: "wx",
});
writeFileSync(`${out}/report.html`, html, { flag: "wx" });
const manifest = {
  version: "frozen-r4/1",
  rootSequenceHash: root.sequenceHash,
  targetHash: root.imageHash,
  contextSequenceHash: context.sequenceHash,
  contextCrop: file(paths.context).project.edits,
  rootCrop: rootFile.project.edits,
  contextExcludedFromMetrics: true,
  checkpointChecksum: cp.checksum,
  replay:
    "Checkpoint routed segments exact; snapshot metadata hash intentionally differs; zero new sweeps",
  regions: Object.fromEntries(
    Object.entries(regions).map(([key, m]) => [
      key,
      createHash("sha256").update(m).digest("hex"),
    ]),
  ),
  sources: Object.fromEntries(
    Object.entries(paths).map(([key, path]) => [
      key,
      {
        path,
        sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
      },
    ]),
  ),
};
writeFileSync(`${out}/manifest.json`, JSON.stringify(manifest, null, 2), {
  flag: "wx",
});
console.log(
  JSON.stringify({
    replay: manifest.replay,
    objective: (rows.rootFit as any).objective,
    routing: diagnosis.routingConnections,
    taper: diagnosis.taper,
    distribution: diagnosis.distribution,
  }),
);
