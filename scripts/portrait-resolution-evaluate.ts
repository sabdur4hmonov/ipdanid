// Local common-reference evidence; never a new optimization seed or relabeled instruction.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { validateInstruction } from "../src/core/validation";
import {
  rasterSequenceAtResolution,
  strandFootprint,
} from "../src/core/optical";
const folder = "output/resolution";
for (const name of ["unrotated", "basis", "basis-refined", "multiscale-2"]) {
  const file =
    name === "unrotated"
      ? "output/guarded/multiscale-2.json"
      : `${folder}/${name}.json`;
  const i = await validateInstruction(
    JSON.parse(readFileSync(file, "utf8")).instruction,
  );
  const raster = rasterSequenceAtResolution(i, 192);
  const p = `${folder}/${name}-common.f32`;
  if (!existsSync(p))
    writeFileSync(p, new Uint8Array(raster.buffer), { flag: "wx" });
  else if (!readFileSync(p).equals(Buffer.from(raster.buffer)))
    throw Error("Common evidence changed");
  console.log(name, i.sequenceHash, i.metrics.lines);
}
const profile = JSON.parse(
  readFileSync("output/guarded/multiscale-2.json", "utf8"),
).instruction.profile;
const coverage = [];
for (const [from, to] of [
  [0, 120],
  [14, 85],
  [170, 32],
  [55, 60],
  [71, 160],
])
  for (const n of [160, 192]) {
    const f = strandFootprint(profile, from, to, n);
    coverage.push({
      from,
      to,
      resolution: n,
      areaMm2: (f.alpha.reduce((a, b) => a + b, 0) * 400 * 400) / (n - 1) ** 2,
      peakAlpha: Math.max(...f.alpha),
      cells: f.pixels.length,
    });
  }
const coveragePath = `${folder}/coverage-audit.json`,
  coveragePayload = JSON.stringify(coverage, null, 2);
if (existsSync(coveragePath)) {
  if (readFileSync(coveragePath, "utf8") !== coveragePayload)
    throw new Error("Preserved coverage audit differs");
} else writeFileSync(coveragePath, coveragePayload, { flag: "wx" });
