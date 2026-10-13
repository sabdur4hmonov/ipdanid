import { readFileSync, writeFileSync, existsSync } from "node:fs";
import {
  validateInstruction,
  parseProjectFile,
  toTxt,
} from "../src/core/validation";
import { hash } from "../src/core/engine";
import { rasterSequenceAtResolution } from "../src/core/optical";
import { remapPortrait } from "../src/core/shape-crop";
import { regionMeasurements, contains } from "../src/core/portrait";
import { sampleToDisplay, displayToSample } from "../src/core/coordinates";
import { qualityDifferences, assemblyEffort } from "../src/core/simplify";
import { Distribution } from "../src/core/distribution";
const f = "output/head-quality",
  prior = "output/portrait-resolved",
  manual = JSON.parse(readFileSync(f + "/manual-regions.json", "utf8")),
  audit = JSON.parse(readFileSync(prior + "/audit.json", "utf8")),
  files = [
    { name: "reference", path: prior + "/candidate.json" },
    { name: "four", path: f + "/candidate-4.json" },
    { name: "candidate", path: f + "/candidate.json" },
    { name: "cycles", path: f + "/cycles.json" },
  ];
if (existsSync(f + "/comparison-cycles.json"))
  throw Error("Preserve sealed comparison");
const rows = [];
for (const file of files) {
  const payload = JSON.parse(readFileSync(file.path, "utf8"));
  await parseProjectFile(JSON.stringify(payload));
  const i = await validateInstruction(payload.project.instruction),
    d = new Distribution(i.profile.pins.length, i.segments);
  if (i.imageHash !== manual.targetHash) throw Error("Target changed");
  if (payload.project.progress.confirmed !== 0)
    throw Error("Transferred progress");
  rows.push({
    ...file,
    i,
    evidence: payload.evidence,
    maxChord: Math.max(...d.pairs.values()),
    maxIncident: Math.max(...d.degree),
    effort: assemblyEffort(i, 8),
  });
  writeFileSync(f + `/${file.name}-cycles-audit.txt`, toTxt(i), { flag: "wx" });
}
if (
  JSON.stringify(rows[0].i.profile) !== JSON.stringify(rows[2].i.profile) ||
  JSON.stringify(rows[0].i.params.portrait) !==
    JSON.stringify(rows[2].i.params.portrait)
)
  throw Error("Materials/regions changed");
const results = [];
for (const n of [160, 320, 512]) {
  const target = new Uint8Array(
      readFileSync(
        n === 512 ? f + "/target-512.bin" : prior + `/target-${n}.bin`,
      ),
    ),
    portrait =
      n === 320
        ? rows[0].i.params.portrait!
        : remapPortrait(
            rows[0].i.params.portrait!,
            audit.edits,
            audit.edits,
            960,
            1280,
            1,
            n,
            1,
            320,
          ),
    reference = rasterSequenceAtResolution(rows[0].i, n),
    variants = [];
  if (n === 320 && (await hash(target)) !== manual.targetHash)
    throw Error("Exact target hash failed");
  for (const row of rows) {
    const raster = rasterSequenceAtResolution(row.i, n),
      evalInstruction = structuredClone(row.i);
    evalInstruction.params.portrait = portrait;
    if (evalInstruction.params.optimization?.head)
      evalInstruction.params.optimization.head.points =
        manual.selection.points.map((p: { x: number; y: number }) => ({
          x: displayToSample(sampleToDisplay(p.x, 320), n),
          y: displayToSample(sampleToDisplay(p.y, 320), n),
        }));
    let sum = 0,
      edge = 0,
      dark = 0,
      count = 0,
      terms = 0;
    const lum = (a: ArrayLike<number>, p: number) =>
      (a[p * 3] + a[p * 3 + 1] + a[p * 3 + 2]) / 3;
    const hair = manual.hairEvaluation;
    for (let k = 0; k < n * n; k++) {
      const x = k % n,
        y = Math.floor(k / n);
      if (!contains(hair, x / (n - 1), y / (n - 1))) continue;
      const a = lum(raster, k),
        t = lum(target, k) / 255;
      sum += (a - t) ** 2;
      dark += Math.max(0, t - a);
      count++;
      for (const j of [x + 1 < n ? k + 1 : -1, y + 1 < n ? k + n : -1])
        if (j >= 0) {
          edge += (a - lum(raster, j) - (t - lum(target, j) / 255)) ** 2;
          terms++;
        }
    }
    const errors = regionMeasurements(
        target,
        raster,
        n,
        row.i.profile,
        portrait,
      ),
      differences = qualityDifferences(
        reference,
        raster,
        target,
        n,
        evalInstruction,
      );
    variants.push({
      name: row.name,
      hash: row.i.sequenceHash,
      errors,
      differences,
      hair: {
        mse: sum / count,
        edgeMse: edge / terms,
        meanDarkExcess: dark / count,
        pixels: count,
        note: manual.hairEvaluationNote,
      },
    });
    writeFileSync(
      f + `/${row.name}-cycles-audit-${n}.bin`,
      Uint8Array.from(raster, (v) => Math.round(v * 255)),
      { flag: "wx" },
    );
  }
  results.push({ n, variants });
}
writeFileSync(
  f + "/comparison-cycles.json",
  JSON.stringify({ manual, rows, results, physicalAcceptance: false }, null, 2),
  { flag: "wx" },
);
console.log(
  JSON.stringify(
    rows.map((r) => ({
      name: r.name,
      hash: r.i.sequenceHash,
      lines: r.i.metrics.lines,
      meters: r.i.metrics.estimatedMeters,
      guard: [r.maxChord, r.maxIncident],
      durationMs: r.i.metrics.durationMs,
    })),
    null,
    2,
  ),
);
