import { readFileSync, writeFileSync } from "node:fs";
import { PhysicalContrast } from "../src/core/physical-contrast";
import { rasterSequence } from "../src/core/optical";
import { inside } from "../src/core/geometry";
import { portraitRegions, contains } from "../src/core/portrait";
import { validateInstruction } from "../src/core/validation";
const i = await validateInstruction(
    JSON.parse(readFileSync("output/contrast/physical-2.json", "utf8"))
      .instruction,
  ),
  n = i.params.resolution,
  p = i.profile,
  regions = portraitRegions(i.params.portrait!),
  rgb = rasterSequence(i),
  pixels = new Uint8Array(readFileSync("output/resolution/target.bin"));
const target = new Float64Array(n * n),
  r = new Float64Array(n * n),
  mask = new Uint8Array(n * n),
  w = new Float64Array(n * n);
let tone = 0,
  sum = 0;
for (let k = 0; k < n * n; k++) {
  const x = (k % n) / (n - 1),
    y = Math.floor(k / n) / (n - 1);
  mask[k] = +inside(p.shape, x, y);
  if (!mask[k]) continue;
  target[k] = (pixels[k * 3] + pixels[k * 3 + 1] + pixels[k * 3 + 2]) / 765;
  r[k] = (rgb[k * 3] + rgb[k * 3 + 1] + rgb[k * 3 + 2]) / 3 - target[k];
  w[k] = ["eyes", "nose", "mouth"].some((name) => contains(regions[name], x, y))
    ? 16
    : contains(regions.face, x, y)
      ? 8
      : 1;
  sum += w[k];
  tone +=
    w[k] *
    r[k] ** 2 *
    (r[k] < 0
      ? 1 + 1.5 * Math.max(0, Math.min(1, (target[k] - 0.35) / 0.45)) ** 2
      : 1);
}
const contrast = new PhysicalContrast(
    n,
    p,
    mask,
    w,
    2,
    i.params.optimization!.contrastPhysical!,
  ).objective(r),
  actual = (tone + contrast) / sum,
  stored = i.metrics.weightedError!.final;
if (Math.abs(actual - stored) > 1e-6)
  throw Error("Complete actual raster objective mismatch");
const evidence = {
  sequenceHash: i.sequenceHash,
  completeConnections: i.metrics.lines,
  routingConnections: i.metrics.densityFit!.routingConnections,
  recordedObjective: stored,
  independentCompleteRasterObjective: actual,
  difference: actual - stored,
  tolerance: 1e-6,
  reason:
    "Float64 coordinate updates start from Float32 seed mean; final ordered RGB optical replay rounds each strand to Float32. Difference must stay within disclosed numerical tolerance.",
  physicalContrastSettings: i.params.optimization!.contrastPhysical,
};
writeFileSync(
  "output/contrast/objective-integrity.json",
  JSON.stringify(evidence, null, 2),
);
console.log(evidence);
