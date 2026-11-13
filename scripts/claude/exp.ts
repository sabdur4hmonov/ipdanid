import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import UPNGModule from "@pdf-lib/upng";
import { generateClassicLeastSquares, leastSquaresImportance, squareChordExcluded, SquareWeave } from "../../src/core/classic-least-squares";
import { referenceRaster, classicPins, referenceLinePixels } from "../../src/core/classic-reference";
import { connectionAllowed } from "../../src/core/geometry";
import { Distribution } from "../../src/core/distribution";
import { sourceMidcontrast } from "../../src/core/source-midcontrast";
import { scoreRender } from "../p16-1b/review";
import type { GenerateOptions } from "../../src/core/engine";
const UPNG = (UPNGModule as any).default ?? UPNGModule;
const U = (process.env.U ?? "output/");
const OUT = process.env.OUT ?? "output/claude-audit/exp/";
mkdirSync(OUT, { recursive: true });
export const CASES: Record<string, { folder: string; prep10: boolean }> = {
  "photo-01": { folder: "combined-original-20261027-desktop-circle", prep10: true },
  "photo-02": { folder: "recheck-original-20261027-desktop-square", prep10: false },
  "photo-04": { folder: "combined-regression-20261027-desktop-synthetic-1", prep10: true },
  "photo-05": { folder: "combined-regression-20261027-desktop-synthetic-2", prep10: true },
  "photo-06": { folder: "combined-regression-20261027-desktop-synthetic-3", prep10: true },
};
export function load(id: string) {
  const c = CASES[id];
  const options: GenerateOptions = JSON.parse(readFileSync(U + "quality-original-20261026/" + c.folder + "/options.json", "utf8"));
  const src = new Uint8Array(readFileSync(U + `p16-1c-review/private/${id}/F2-target.bin`));
  const fr = JSON.parse(readFileSync(U + `p16-1c-review/private/${id}/F2-framing.json`, "utf8"));
  const pixels = c.prep10 ? sourceMidcontrast(src, 500) : src;
  const kp = structuredClone(options.kitPreparation!) as any;
  kp.transform = fr.framing.transform;
  return { o: { ...options, pixels, kitPreparation: kp } as GenerateOptions, src, faces: fr.framing.transform.targetFaces };
}
export type V = { lambda?: number; dark?: number; gamma?: number; lines?: number; amp?: number; blur?: number };
// Same greedy as classic3 (no acceleration), plus optional asymmetric over-darkening penalty.
export function solve(o: GenerateOptions, v: V) {
  const n = o.resolution, p = o.profile, lines = v.lines ?? o.lines;
  const faces = (o.kitPreparation as any)?.transform.targetFaces ?? [];
  const imp0 = leastSquaresImportance(n, faces);
  const amp = v.amp ?? 1;
  const importance = Float32Array.from(imp0, (x) => 1 + (x - 1) * amp);
  const dk = v.dark ?? 0.08, g = v.gamma ?? 1.6, lam = v.lambda ?? 1;
  const darkness = Float64Array.from(importance, (x) => dk * x);
  const err = Float64Array.from({ length: n * n }, (_, k) => Math.pow(1 - o.pixels[k * 3] / 255, g) * importance[k]);
  const pins = classicPins(p, n), count = pins.length;
  const cache = new Map<number, Int32Array>(), legal = new Map<number, boolean>(), used = new Set<number>();
  const dist = new Distribution(count), weave = new SquareWeave(p);
  const key = (a: number, b: number) => (a < b ? a * count + b : b * count + a);
  const path = [0]; let prev = -1;
  const f = (r: number) => (r >= 0 ? r * r : lam * r * r);
  for (let s = 0; s < lines; s++) {
    const cur = path[path.length - 1];
    let best = -1, bs = -Infinity;
    for (let b = 0; b < count; b++) {
      const d = Math.abs(b - cur), gap = Math.min(d, count - d), k = key(cur, b);
      if (gap < 25 || b === prev || used.has(k) || squareChordExcluded(p, cur, b) || !weave.allows(cur, b) || dist.degree[cur] >= 160 || dist.degree[b] >= 160) continue;
      if (s + 1 < lines && dist.degree[b] >= 159) continue;
      if (!legal.has(k)) legal.set(k, connectionAllowed(p, cur, b));
      if (!legal.get(k)) continue;
      let px = cache.get(k);
      if (!px) { px = referenceLinePixels(pins[cur], pins[b], n); cache.set(k, px); }
      let sum = 0;
      if (lam === 1) for (let j = 0; j < px.length; j++) { const e = err[px[j]], dd = darkness[px[j]]; sum += dd * (2 * e - dd); }
      else for (let j = 0; j < px.length; j++) { const e = err[px[j]], dd = darkness[px[j]]; sum += f(e) - f(e - dd); }
      const sc = sum / px.length;
      if (sc > bs) { bs = sc; best = b; }
    }
    if (best < 0) throw Error("no path");
    const px = cache.get(key(cur, best))!;
    for (let j = 0; j < px.length; j++) err[px[j]] -= darkness[px[j]];
    used.add(key(cur, best)); dist.apply([[cur, best]]); weave.add(cur, best);
    path.push(best); prev = cur;
  }
  return { profile: p, segments: [{ color: p.colors[0], path }], params: { resolution: n } as any, metrics: { lines } as any };
}
export function save(name: string, rgb: Float32Array) {
  const rgba = Uint8Array.from({ length: 4000000 }, (_, k) => (k % 4 === 3 ? 255 : Math.round(rgb[Math.floor(k / 4) * 3 + (k % 4)] * 255)));
  writeFileSync(OUT + name + ".png", Buffer.from(UPNG.encode([rgba.buffer], 1000, 1000, 0)));
}
export function evaluate(name: string, inst: any, src: Uint8Array, faces: any, shape: any) {
  const rgb = referenceRaster(inst, 1000);
  save(name, rgb);
  const s = scoreRender(src, rgb, faces, shape)[0];
  return s;
}
if (process.argv[1]?.endsWith("exp.ts")) {
  const ids = (process.env.IDS ?? "photo-01").split(",");
  const variants: Record<string, V> = JSON.parse(process.env.VARIANTS ?? '{"base":{}}');
  for (const id of ids) {
    const { o, src, faces } = load(id);
    for (const [vn, v] of Object.entries(variants)) {
      const t = performance.now();
      const inst = vn === "prod" ? await generateClassicLeastSquares(o) : solve(o, v);
      const ms = performance.now() - t;
      const s = evaluate(`${id}-${vn}`, inst, src, faces, o.profile.shape);
      console.log(JSON.stringify({ id, vn, ms: Math.round(ms), ...Object.fromEntries(Object.entries(s).map(([k, x]) => [k, +(x as number).toFixed(4)])), pathHead: inst.segments[0].path.slice(0, 6).join(",") }));
    }
  }
}
