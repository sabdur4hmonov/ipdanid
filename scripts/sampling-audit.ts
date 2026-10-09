import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  rasterSequence,
  rasterSequenceAtResolution,
} from "../src/core/optical";
import { areaAverageRgb } from "../src/core/optical-area";
import {
  regionMeasurements,
  portraitRegions,
  contains,
} from "../src/core/portrait";
import { validateInstruction } from "../src/core/validation";
const out = "output/sampling";
mkdirSync(out, { recursive: true });
const rows = [];
for (const folder of ["circle-head-240", "circle-head-240-192"]) {
  const i = await validateInstruction(
      JSON.parse(readFileSync(`output/${folder}/circle-guide.json`, "utf8"))
        .project.instruction,
    ),
    n = i.params.resolution;
  const target = new Uint8Array(
      readFileSync(`output/${folder}/circle-target.bin`),
    ),
    native = rasterSequence(i),
    fine = rasterSequenceAtResolution(i, 2 * n - 1);
  const base = [1, 3, 5].map(
      (k) => parseInt(i.profile.baseColor.slice(k, k + 2), 16) / 255,
    ),
    area = areaAverageRgb(fine, n, base);
  const gap: Record<string, unknown> = {};
  for (const [name, box] of Object.entries(
    portraitRegions(i.params.portrait!),
  )) {
    let difference = 0,
      bias = 0,
      max = 0,
      count = 0;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++)
        if (contains(box, x / (n - 1), y / (n - 1)))
          for (let c = 0; c < 3; c++) {
            const k = (y * n + x) * 3 + c,
              d = area[k] - native[k];
            difference += d * d;
            bias += d;
            max = Math.max(max, Math.abs(d));
            count++;
          }
    gap[name] = {
      rms: Math.sqrt(difference / count),
      meanBias: bias / count,
      maxAbsolute: max,
    };
  }
  writeFileSync(`${out}/${folder}-area.f32`, Buffer.from(area.buffer));
  rows.push({
    folder,
    n,
    fineGrid: 2 * n - 1,
    sequenceHash: i.sequenceHash,
    geometryUnchanged: true,
    targetUnchanged: true,
    native: regionMeasurements(
      target,
      native,
      n,
      i.profile,
      i.params.portrait!,
    ),
    area: regionMeasurements(target, area, n, i.profile, i.params.portrait!),
    gap,
  });
}
writeFileSync(
  out + "/audit.json",
  JSON.stringify(
    {
      method: "compose at2n-1 then area average; independent evaluation only",
      physicalAcceptance: false,
      rows,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    rows.map((r) => ({
      folder: r.folder,
      gap: r.gap,
      nativeNose: r.native.nose,
      areaNose: r.area.nose,
    })),
  ),
);
