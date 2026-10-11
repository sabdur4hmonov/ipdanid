import { readFileSync, writeFileSync } from "node:fs";
import {
  validateInstruction,
  parseProjectFile,
  fromFile,
} from "../src/core/validation";
import { Distribution } from "../src/core/distribution";
import { assemblyEffort } from "../src/core/simplify";
const folder = "output/portrait-resolved",
  rows = [];
for (const name of [
  "control",
  "candidate-4",
  "candidate",
  "candidate-pruned",
]) {
  const payload = JSON.parse(
      readFileSync(folder + "/" + name + ".json", "utf8"),
    ),
    i = await validateInstruction(payload.project.instruction);
  await parseProjectFile(JSON.stringify(payload));
  const d = new Distribution(i.profile.pins.length, i.segments);
  rows.push({
    name,
    algorithm: i.algorithm,
    hash: i.sequenceHash,
    targetHash: i.imageHash,
    profile: i.profile,
    params: i.params,
    metrics: i.metrics,
    effort: assemblyEffort(i, 8),
    maxChord: Math.max(...d.pairs.values()),
    maxIncident: Math.max(...d.degree),
    uniqueChords: d.pairs.size,
    progress: payload.project.progress,
    evidence: payload.evidence,
  });
}
const selected = await fromFile(readFileSync(folder + "/selected.txt", "utf8"));
if (selected.sequenceHash !== rows[3].hash) throw Error("Export mismatch");
writeFileSync(
  folder + "/integrity.json",
  JSON.stringify(
    {
      rows,
      checks:
        "strict hash/metadata/material/target/distribution/zero-progress/project parsing; selected TXT hash equality",
      physicalAcceptance: false,
    },
    null,
    2,
  ),
);
console.log(
  rows.map((r) => ({
    name: r.name,
    hash: r.hash,
    lines: r.metrics.lines,
    meters: r.metrics.estimatedMeters,
    maxChord: r.maxChord,
    maxIncident: r.maxIncident,
    routing: r.metrics.densityFit?.routingConnections,
    effort: r.effort,
  })),
);
