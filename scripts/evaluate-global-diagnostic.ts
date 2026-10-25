import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import UPNGModule from "@pdf-lib/upng";
import { validateInstruction } from "../src/core/validation";
import { hash } from "../src/core/engine";
import { referenceRaster } from "../src/core/classic-reference";
import { inside } from "../src/core/geometry";
import {
  viewingImage,
  viewingSsimPrepared,
} from "../tests/helpers/viewing-ssim";
import { globalChordDiagnostic } from "./global-chord-diagnostic";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
const dir = "output/phase13/desktop/owner-phase9-circle",
  out = "output/global-chord-diagnostic/owner-circle";
if (existsSync(out + "/metrics.json"))
  throw Error("Preserve completed diagnostic");
const guide = await validateInstruction(
    JSON.parse(readFileSync(dir + "/guide-v3-3000.json", "utf8")),
  ),
  file = readFileSync(dir + "/target.png"),
  decoded = UPNG.decode(Uint8Array.from(file).buffer),
  pixels = new Uint8Array(UPNG.toRGBA8(decoded)[0]).filter(
    (_, k) => k % 4 !== 3,
  );
if (
  decoded.width !== 500 ||
  decoded.height !== 500 ||
  (await hash(pixels)) !== guide.imageHash
)
  throw Error("Target mismatch");
const faces = guide.params.kitPreparation!.transform.targetFaces,
  face = faces[0];
if (faces.length !== 1) throw Error("Single frontal diagnostic only");
const box = (x: number, y: number, w: number, h: number) => ({
  left: face.left + x * face.width,
  top: face.top + y * face.height,
  width: w * face.width,
  height: h * face.height,
});
const regions = {
  nose: box(0.3, 0.35, 0.4, 0.4),
  eyes: box(0.1, 0.18, 0.8, 0.24),
  mouth: box(0.2, 0.7, 0.6, 0.23),
};
const result = globalChordDiagnostic(guide.profile, pixels, 500, 3000, faces);
const used = new Set<number>(),
  degree = new Uint16Array(240);
for (const [a, b] of result.edges) {
  const k = Math.min(a, b) * 240 + Math.max(a, b);
  if (used.has(k)) throw Error("Duplicate");
  used.add(k);
  degree[a]++;
  degree[b]++;
}
if (Math.max(...degree) > 160 || used.size !== 3000)
  throw Error("Count/degree");
const target = Float32Array.from(
    { length: 250000 },
    (_, k) => pixels[k * 3] / 255,
  ),
  tv = viewingImage(target, 500),
  boardMask = Uint8Array.from({ length: 25600 }, (_, k) =>
    inside(
      guide.profile.shape,
      ((k % 160) + 0.5) / 160,
      (Math.floor(k / 160) + 0.5) / 160,
    )
      ? 1
      : 0,
  );
const score = (rgb: Float32Array) => {
  const v = viewingImage(
    rgb.filter((_, k) => k % 3 === 0),
    1000,
  );
  return {
    face: viewingSsimPrepared(v, tv, { faces, boardMask }).face.ssim,
    ...Object.fromEntries(
      Object.entries(regions).map(([name, b]) => [
        name,
        viewingSsimPrepared(v, tv, { faces: [b], boardMask }).face.ssim,
      ]),
    ),
  };
};
const before = referenceRaster(guide, 1000),
  graph = referenceRaster(
    {
      ...guide,
      segments: result.edges.map((path) => ({
        color: guide.profile.colors[0],
        path,
      })),
    },
    1000,
  );
const excess = (rgb: Float32Array) => {
  let sum = 0,
    n = 0;
  for (let y = 0; y < 1000; y++)
    for (let x = 0; x < 1000; x++)
      if (
        target[Math.floor(y / 2) * 500 + Math.floor(x / 2)] > 0.98 &&
        inside(guide.profile.shape, (x + 0.5) / 1000, (y + 0.5) / 1000)
      ) {
        sum += 1 - rgb[(y * 1000 + x) * 3];
        n++;
      }
  return sum / n;
};
const old = score(before),
  candidate = score(graph),
  white = { old: excess(before), candidate: excess(graph) };
const promising =
  candidate.face >= old.face + 0.02 &&
  candidate.nose >= old.nose + 0.03 &&
  candidate.eyes >= old.eyes - 0.005 &&
  candidate.mouth >= old.mouth - 0.005 &&
  white.candidate <= white.old + 0.01;
const metrics = {
  ...result,
  edges: undefined,
  old,
  candidate,
  white,
  promising,
  verdict: promising
    ? "DIAGNOSTIC ONLY: route with counted connectors before any acceptance"
    : "REJECT routing-only remedy: even relaxed global selection fails fixed detail gates",
  notBuildable: true,
};
mkdirSync(out, { recursive: true });
writeFileSync(out + "/target.png", file);
for (const [name, rgb] of [
  ["before", before],
  ["unrouted-graph", graph],
] as const) {
  const rgba = Uint8Array.from({ length: 4000000 }, (_, k) =>
    k % 4 === 3 ? 255 : Math.round(rgb[Math.floor(k / 4) * 3 + (k % 4)] * 255),
  );
  writeFileSync(
    out + "/" + name + ".png",
    Buffer.from(UPNG.encode([rgba.buffer], 1000, 1000, 0)),
  );
}
writeFileSync(out + "/metrics.json", JSON.stringify(metrics, null, 2));
writeFileSync(
  out + "/edges.json",
  JSON.stringify({
    schema: "iprasm.unrouted-diagnostic/1",
    targetHash: guide.imageHash,
    edges: result.edges,
  }),
);
writeFileSync(
  out + "/report.html",
  `<!doctype html><meta charset="utf-8"><title>Unrouted diagnostic — not buildable</title><style>body{font:16px system-ui;margin:24px}section{display:flex;gap:12px}figure{margin:0;flex:1}img{width:100%}pre{white-space:pre-wrap}</style><h1>Diagnostic only — not an assembly preview</h1><p>3000 independently selected chords. Missing route connectors are NOT hidden: this graph is deliberately non-buildable. ${metrics.verdict}</p><section>${["target", "before", "unrouted-graph"].map((n) => `<figure><img src="${n}.png"><figcaption>${n}</figcaption></figure>`).join("")}</section><pre>${JSON.stringify(metrics, null, 2)}</pre>`,
);
console.log(JSON.stringify(metrics));
