import { readFileSync, writeFileSync } from "node:fs";
import {
  classicGreedy,
  circlePins,
  renderPreview,
} from "./classic-string-art.ts";

const [size, lines, dark, out, minGap] = [
  +process.argv[2],
  +process.argv[3],
  +process.argv[4],
  process.argv[5],
  +(process.argv[6] ?? 20),
];
const buf = readFileSync(process.env.TGT ?? "target.f32");
const target = new Float32Array(buf.buffer, buf.byteOffset, size * size);
const pins = circlePins(240, size);
// importance: face oval (centre) gets more weight
const imp = new Float32Array(size * size);
for (let y = 0; y < size; y++)
  for (let x = 0; x < size; x++) {
    const dx = (x - size * 0.5) / (size * 0.2),
      dy = (y - size * 0.6) / (size * 0.26);
    let v = 1 + (+(process.env.IMP ?? 0.5)) * Math.exp(-(dx * dx + dy * dy));
    const F = +(process.env.FEAT ?? 0);
    for (const [fx, fy, rx, ry] of [[0.38, 0.53, 0.07, 0.035], [0.61, 0.53, 0.07, 0.035], [0.5, 0.63, 0.06, 0.06], [0.5, 0.76, 0.1, 0.04]]) {
      const ex = (x / size - fx) / rx, ey = (y / size - fy) / ry;
      v += F * Math.exp(-(ex * ex + ey * ey));
    }
    imp[y * size + x] = v;
  }
const t0 = Date.now();
const r = classicGreedy(target, {
  size,
  pins,
  lines,
  minGap,
  lineDarkness: dark,
  maxChordRepeat: 1,
  importance: imp,
  overdrawPenalty: +(process.env.PEN ?? 1),
  darknessGamma: +(process.env.GAM ?? 1),
  scoring: (process.env.SCORE as any) ?? "mean",
});
const ms = Date.now() - t0;
const prev = renderPreview(r.sequence, pins, size, 1000, 460, 0.12, 0.9);
writeFileSync(out + ".f32", Buffer.from(prev.buffer));
// thread length
let len = 0;
for (let s = 1; s < r.sequence.length; s++) {
  const a = pins[r.sequence[s - 1]],
    b = pins[r.sequence[s]];
  len += (Math.hypot(a.x - b.x, a.y - b.y) * 460) / (size - 3);
}
console.log(
  JSON.stringify({ segments: r.segments, ms, metres: +(len / 1000).toFixed(1) }),
);
