import { generatePaint } from "../src/core/paint.ts";
import { writeFileSync } from "node:fs";
const palette = [
    "#ffffff",
    "#111111",
    "#bbbbbb",
    "#777777",
    "#992211",
    "#334488",
    "#aa8844",
    "#447755",
  ].map((hex, k) => ({ code: "C" + k, hex })),
  rows = [];
for (const size of [64, 96]) {
  let state = 7181;
  const pixels = Uint8Array.from({ length: size * size * 3 }, () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state >>> 24;
    }),
    start = performance.now();
  const g = await generatePaint(pixels, size, size, 4, 12, palette);
  rows.push({
    columns: size,
    rows: size,
    regions: g.regions.length,
    minimumRegionCells: 12,
    milliseconds: performance.now() - start,
    source: "deterministic synthetic noise",
    device: "desktop Node; not phone",
    sourceHash: g.sourceHash,
    sequenceHash: g.sequenceHash,
  });
}
writeFileSync("output/paint/benchmark.json", JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows));
