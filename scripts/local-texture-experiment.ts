import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import { createHash } from "node:crypto";
import UPNGModule from "@pdf-lib/upng";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { DEFAULT_LOCAL_TEXTURE } from "../src/core/local-texture";
import { defaultPhysicalContrast } from "../src/core/physical-contrast";
import { hash } from "../src/core/engine";
import {
  validateInstruction,
  progressFor,
  parseProjectFile,
  toTxt,
} from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
import { regionQuality, screenQuality } from "../src/core/quality-screen";
import { assemblyEffort } from "../src/core/simplify";
import { Distribution } from "../src/core/distribution";

const out = "output/local-texture-v17",
  r4 = "output/quality-r4",
  n = 320;
const parent = JSON.parse(
    readFileSync("output/resolved-convergence/final.json", "utf8"),
  ),
  seed = await validateInstruction(parent.project.instruction),
  pixels = new Uint8Array(
    readFileSync("output/portrait-dispatch/target-320.bin"),
  ),
  diagnosis = JSON.parse(readFileSync(`${r4}/diagnosis.json`, "utf8")),
  manifest = JSON.parse(readFileSync(`${r4}/manifest.json`, "utf8"));
if (
  seed.sequenceHash !== manifest.rootSequenceHash ||
  (await hash(pixels)) !== seed.imageHash
)
  throw Error("Wrong frozen seed/target");
const protocol = {
  version: "local-texture-experiment/1",
  parent: seed.sequenceHash,
  target: seed.imageHash,
  diagnosticManifestSha256: createHash("sha256")
    .update(readFileSync(`${r4}/manifest.json`))
    .digest("hex"),
  settings: DEFAULT_LOCAL_TEXTURE,
  controlStrength: 0,
  sweeps: 1,
  search:
    "One full dispersed-order pass; exact -1,+1 objective evaluations for EVERY allowed chord, unavailable changes evaluated but never applied",
  guards: { chord: 32, incident: 160 },
  acceptance:
    "Frozen R4 all-region screen plus same-size/enlarged visual acceptance; no default promotion; strength/budget never tuned after results",
  routing:
    "Complete physical route counted; fitting and route diagnostics separate",
};
mkdirSync(out, { recursive: true });
const protocolText = JSON.stringify(protocol, null, 2);
if (existsSync(`${out}/protocol.json`)) {
  if (readFileSync(`${out}/protocol.json`, "utf8") !== protocolText)
    throw Error("Protocol mismatch");
} else writeFileSync(`${out}/protocol.json`, protocolText, { flag: "wx" });
const UPNG: any = (UPNGModule as any).default ?? UPNGModule;
const target = Float64Array.from(
    { length: n * n },
    (_, k) => (pixels[k * 3] + pixels[k * 3 + 1] + pixels[k * 3 + 2]) / 765,
  ),
  reference = diagnosis.rows.rootRouted.regions;
const masks: Record<string, Uint8Array> = {};
for (const [key, q] of Object.entries(reference) as [string, any][]) {
  const digits = q.maskReference.split("/").at(-1)!,
    mask = new Uint8Array(n * n);
  for (let k = 0; k < mask.length; k++)
    mask[k] = (parseInt(digits[Math.floor(k / 4)], 16) >> (3 - (k % 4))) & 1;
  if (createHash("sha256").update(mask).digest("hex") !== manifest.regions[key])
    throw Error("Wrong frozen mask");
  masks[key] = mask;
}
let stop = false;
process.on("SIGINT", () => (stop = true));
const results: Record<string, any> = {};
for (const name of ["control", "candidate"] as const) {
  const settings = {
      ...DEFAULT_LOCAL_TEXTURE,
      strength: name === "control" ? 0 : protocol.settings.strength,
    },
    statePath = `${out}/${name}-fit.json`,
    options = {
      pixels,
      profile: seed.profile,
      portrait: seed.params.portrait,
      resolution: n,
      mode: seed.params.mode,
      lines: seed.params.requestedLines,
      seed,
      cancelled: () => stop || existsSync(`${out}/cancel.flag`),
      onDiagnostic: (d: Record<string, unknown>) =>
        console.log(JSON.stringify({ name, ...d })),
    },
    tuning = {
      resolved: true,
      physical: defaultPhysicalContrast(),
      edgeWeight: 2,
      sweeps: protocol.sweeps,
      texture: settings,
    };
  let i;
  if (existsSync(`${out}/${name}.json`))
    i = await validateInstruction(
      JSON.parse(readFileSync(`${out}/${name}.json`, "utf8")).project
        .instruction,
    );
  else {
    i = await generateDensity(options, {
      ...tuning,
      resume: existsSync(statePath)
        ? JSON.parse(readFileSync(statePath, "utf8"))
        : undefined,
      onCheckpoint: (cp: DensityCheckpoint) => {
        writeFileSync(`${statePath}.next`, JSON.stringify(cp));
        renameSync(`${statePath}.next`, statePath);
      },
    });
    await validateInstruction(i);
    const file = {
      schema: "iprasm.project/1",
      project: {
        ...parent.project,
        id: crypto.randomUUID(),
        name: `Local texture experimental ${name}`,
        instruction: i,
        progress: progressFor(i),
      },
    };
    await parseProjectFile(JSON.stringify(file));
    writeFileSync(`${out}/${name}.json`, JSON.stringify(file), { flag: "wx" });
    writeFileSync(`${out}/${name}.txt`, toTxt(i), { flag: "wx" });
  }
  // Exact bound resume, no repeated fit. Negative objective binding must fail.
  const cp = JSON.parse(readFileSync(statePath, "utf8"));
  const replay = await generateDensity(options, {
    ...tuning,
    resume: cp,
    materializeOnly: true,
  });
  if (replay.sequenceHash !== i.sequenceHash)
    throw Error("Checkpoint replay changed executable guide");
  let refused = false;
  try {
    await generateDensity(options, {
      ...tuning,
      texture: { ...settings, strength: settings.strength + 0.1 },
      resume: cp,
      materializeOnly: true,
    });
  } catch (e) {
    if (String(e).includes("checkpoint")) refused = true;
    else throw e;
  }
  if (!refused) throw Error("Changed texture settings accepted checkpoint");
  const raster = rasterSequence(i),
    mean = Float64Array.from(
      target,
      (_, k) => (raster[k * 3] + raster[k * 3 + 1] + raster[k * 3 + 2]) / 3,
    ),
    rgba = new Uint8Array(n * n * 4);
  for (let k = 0; k < n * n; k++) {
    for (let c = 0; c < 3; c++)
      rgba[k * 4 + c] = Math.round(raster[k * 3 + c] * 255);
    rgba[k * 4 + 3] = 255;
  }
  if (!existsSync(`${out}/${name}.png`))
    writeFileSync(
      `${out}/${name}.png`,
      new Uint8Array(UPNG.encode([rgba.buffer], n, n, 0)),
      { flag: "wx" },
    );
  const quality = Object.fromEntries(
      Object.entries(masks).map(([key, mask]) => [
        key,
        regionQuality(target, mean, mask, n, seed.profile),
      ]),
    ),
    dist = new Distribution(seed.profile.pins.length, i.segments);
  results[name] = {
    hash: i.sequenceHash,
    fit: i.metrics.densityFit,
    objectiveEvaluations: i.metrics.textureSearch,
    quality,
    screenAgainstRoot: screenQuality(reference, quality),
    effort: assemblyEffort(i, 8),
    meters: i.metrics.estimatedMeters,
    maximumChord: Math.max(...dist.pairs.values()),
    maximumIncident: Math.max(...dist.degree),
    replay: true,
    incompatibleSettingsRefused: true,
  };
}
if (
  results.control.fit.evaluations !== results.candidate.fit.evaluations ||
  results.control.fit.sweeps !== 1 ||
  results.candidate.fit.sweeps !== 1
)
  throw Error("Unequal actual fitting evaluations");
results.candidate.screenAgainstControl = screenQuality(
  results.control.quality,
  results.candidate.quality,
);
const verdict = {
  protocol,
  results,
  metricDecision:
    results.candidate.screenAgainstRoot.metricsPass &&
    results.candidate.screenAgainstControl.metricsPass
      ? "INCONCLUSIVE — visual/set acceptance still required"
      : "REJECTED — regional metric screen failed",
  defaultPromoted: false,
  visualAcceptance:
    "Pending explicit same-size/enlarged review; metrics never establish likeness",
};
writeFileSync(`${out}/results.json`, JSON.stringify(verdict, null, 2), {
  flag: "wx",
});
const images = [
  { src: `../quality-r4/original.png`, label: "Original crop" },
  { src: `../quality-r4/target.png`, label: "Frozen target (mean RGB)" },
  { src: `../quality-r4/root-routed.png`, label: "Root24 complete sequence" },
  {
    src: "control.png",
    label: "Unmodified objective control, fixed ±1 search",
  },
  { src: "candidate.png", label: "Local excess-texture candidate" },
];
let html = `<!doctype html><meta charset="utf-8"><title>Local texture v17</title><style>body{font:16px system-ui;background:#faf8ef;color:#18201d}section{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0;width:320px}img{width:320px;height:320px}.crop{width:320px;height:220px;position:relative;overflow:hidden;border:1px solid #aaa}.crop img{position:absolute;max-width:none}</style><h1>Local texture v17 — frozen one-pass experiment</h1><p>${verdict.metricDecision}. Same ordered sequence drives the actual preview and guide; no photo overlay. Full routing counted. Control and candidate have equal ${results.control.fit.evaluations} actual fitting objective evaluations. <a href="results.json">All metrics, guards, pace assumptions and binding checks</a>.</p><section>`;
images.forEach(
  (v) =>
    (html += `<figure><img src="${v.src}"><figcaption>${v.label}</figcaption></figure>`),
);
html += "</section>";
for (const [key, b] of Object.entries(diagnosis.regionalBoxes) as [
  string,
  any,
][]) {
  const scale = Math.min(320 / (b.width * n), 220 / (b.height * n));
  html += `<h2>${key}</h2><section>`;
  images.forEach(
    (v) =>
      (html += `<figure><div class="crop"><img src="${v.src}" style="width:${n * scale}px;height:${n * scale}px;left:${-b.left * n * scale}px;top:${-b.top * n * scale}px"></div><figcaption>${v.label}</figcaption></figure>`),
  );
  html += "</section>";
}
writeFileSync(`${out}/report.html`, html, { flag: "wx" });
console.log(
  JSON.stringify({
    metricDecision: verdict.metricDecision,
    evaluations: results.control.fit.evaluations,
    candidateAgainstRoot: results.candidate.screenAgainstRoot.failures,
    candidateAgainstControl: results.candidate.screenAgainstControl.failures,
  }),
);
