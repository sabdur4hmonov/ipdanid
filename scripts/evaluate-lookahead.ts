import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import UPNGModule from "@pdf-lib/upng";
import { validateInstruction } from "../src/core/validation";
import { hash } from "../src/core/engine";
import {
  referenceRaster,
  classicPins,
  referenceLinePixels,
} from "../src/core/classic-reference";
import { inside, connectionAllowed } from "../src/core/geometry";
import { squareChordExcluded } from "../src/core/classic-least-squares";
import {
  viewingImage,
  viewingSsimPrepared,
} from "../tests/helpers/viewing-ssim";
import { researchLookahead } from "./chord-lookahead";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
const dir = "output/phase13/desktop/owner-phase9-circle",
  out = process.argv.includes("--arithmetic-check")
    ? "output/lookahead-physical-v1-arithmetic/owner-circle"
    : "output/lookahead-physical-v1/owner-circle";
if (existsSync(out + "/metrics.json"))
  throw Error("Preserve completed experiment");
const guide = await validateInstruction(
  JSON.parse(readFileSync(dir + "/guide-v3-3000.json", "utf8")),
);
const file = readFileSync(dir + "/target.png"),
  decoded = UPNG.decode(Uint8Array.from(file).buffer),
  rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]),
  pixels = rgba.filter((_, k) => k % 4 !== 3);
if (
  decoded.width !== 500 ||
  decoded.height !== 500 ||
  (await hash(pixels)) !== guide.imageHash
)
  throw Error("Frozen target mismatch");
const faces = guide.params.kitPreparation!.transform.targetFaces,
  face = faces[0];
if (faces.length !== 1) throw Error("Frontal one-face experiment only");
// Fixed before generating any candidate. Local SSIM is evaluated inside each oval.
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
mkdirSync(out, { recursive: true });
writeFileSync(
  out + "/protocol.json",
  JSON.stringify(
    {
      fixture: dir,
      targetHash: guide.imageHash,
      regions,
      beam: [4, 8],
      gates: {
        face: 0.02,
        nose: 0.03,
        otherRegression: 0.005,
        whiteIncrease: 0.01,
        elapsedMs: 15000,
      },
    },
    null,
    2,
  ),
);
let last = 0;
const control = researchLookahead(guide.profile, pixels, 500, 3000, faces, {
  greedyControl: true,
});
if (control.path.some((p, k) => p !== guide.segments[0].path[k]))
  throw Error("Cached greedy control differs from frozen production path");
console.log(
  JSON.stringify({
    controlExact: true,
    controlMs: control.elapsedMs,
    directionalChords: control.reversedDifferences,
  }),
);
const result = researchLookahead(guide.profile, pixels, 500, 3000, faces, {
  progress: (p) => {
    if (performance.now() - last > 3000) {
      last = performance.now();
      console.log(JSON.stringify({ progress: p }));
    }
  },
});
// Independent route audit, without trusting the generator's internal bookkeeping.
const degrees = new Uint16Array(guide.profile.pins.length),
  used = new Set<number>();
for (let j = 1; j < result.path.length; j++) {
  const a = result.path[j - 1],
    b = result.path[j],
    n = degrees.length,
    key = Math.min(a, b) * n + Math.max(a, b);
  if (
    Math.min(Math.abs(a - b), n - Math.abs(a - b)) < 25 ||
    used.has(key) ||
    !connectionAllowed(guide.profile, a, b) ||
    squareChordExcluded(guide.profile, a, b)
  )
    throw Error("Independent path audit failed");
  used.add(key);
  degrees[a]++;
  degrees[b]++;
}
if (result.path.length !== 3001 || Math.max(...degrees) > 160)
  throw Error("Route count/degree");
const target = Float32Array.from(
    { length: 500 * 500 },
    (_, k) => pixels[k * 3] / 255,
  ),
  targetView = viewingImage(target, 500);
const boardMask = Uint8Array.from({ length: 160 * 160 }, (_, k) =>
  inside(
    guide.profile.shape,
    ((k % 160) + 0.5) / 160,
    (Math.floor(k / 160) + 0.5) / 160,
  )
    ? 1
    : 0,
);
const scores = (rgb: Float32Array) => {
  const view = viewingImage(
    rgb.filter((_, k) => k % 3 === 0),
    1000,
  );
  return {
    main: viewingSsimPrepared(view, targetView, { faces, boardMask }),
    regions: Object.fromEntries(
      Object.entries(regions).map(([name, b]) => [
        name,
        viewingSsimPrepared(view, targetView, { faces: [b], boardMask }).face
          .ssim,
      ]),
    ),
  };
};
const excess = (rgb: Float32Array) => {
  let sum = 0,
    count = 0;
  for (let y = 0; y < 1000; y++)
    for (let x = 0; x < 1000; x++)
      if (
        target[Math.floor(y / 2) * 500 + Math.floor(x / 2)] > 0.98 &&
        inside(guide.profile.shape, (x + 0.5) / 1000, (y + 0.5) / 1000)
      ) {
        sum += 1 - rgb[(y * 1000 + x) * 3];
        count++;
      }
  return sum / count;
};
const before = referenceRaster(guide, 1000),
  after = referenceRaster(
    {
      ...guide,
      segments: [{ color: guide.profile.colors[0], path: result.path }],
    },
    1000,
  );
const old = scores(before),
  next = scores(after),
  white = { old: excess(before), next: excess(after) };
const accepted =
  next.main.face.ssim >= old.main.face.ssim + 0.02 &&
  next.regions.nose >= old.regions.nose + 0.03 &&
  ["eyes", "mouth"].every((k) => next.regions[k] >= old.regions[k] - 0.005) &&
  white.next <= white.old + 0.01 &&
  result.elapsedMs <= 15000;
const save = (rgb: Float32Array, n: number, name: string) => {
  const rgba = Uint8Array.from({ length: n * n * 4 }, (_, k) =>
    k % 4 === 3
      ? 255
      : Math.round(
          Math.max(0, Math.min(1, rgb[Math.floor(k / 4) * 3 + (k % 4)])) * 255,
        ),
  );
  writeFileSync(
    out + "/" + name + ".png",
    Buffer.from(UPNG.encode([rgba.buffer], n, n, 0)),
  );
};
save(before, 1000, "before");
save(after, 1000, "after");
writeFileSync(out + "/target.png", file);
// Diagnostic only: solver additive model versus the real coverage render. Not a preview.
const counts = new Uint16Array(500 * 500),
  pins = classicPins(guide.profile, 500);
for (let j = 1; j < guide.segments[0].path.length; j++)
  for (const p of referenceLinePixels(
    pins[guide.segments[0].path[j - 1]],
    pins[guide.segments[0].path[j]],
    500,
  ))
    counts[p]++;
const additive = Float32Array.from({ length: 500 * 500 * 3 }, (_, k) =>
  Math.max(0, 1 - 0.08 * counts[Math.floor(k / 3)]),
);
save(additive, 500, "solver-additive-diagnostic");
const metrics = {
  ...result,
  path: undefined,
  controlExact: true,
  controlMs: control.elapsedMs,
  old,
  next,
  white,
  accepted,
  verdict: accepted
    ? "FIRST-CASE PASS ONLY — multi-case and UI acceptance still required"
    : "REJECTED — no default change; no beam/weight sweep",
};
writeFileSync(out + "/metrics.json", JSON.stringify(metrics, null, 2));
writeFileSync(
  out + "/route.json",
  JSON.stringify({
    schema: "iprasm.research-route/1",
    parentHash: guide.sequenceHash,
    path: result.path,
  }),
);
writeFileSync(
  out + "/report.html",
  `<!doctype html><meta charset="utf-8"><title>Two-chord lookahead</title><style>body{font:16px system-ui;margin:24px}section{display:flex;gap:12px}figure{margin:0;flex:1}img{width:100%}pre{white-space:pre-wrap}</style><h1>Owner Circle: fixed 4×8 lookahead</h1><p>Same target, pins, 3000 chords, .12mm/.9. Independent exact physical render. ${metrics.verdict}</p><section>${["target", "before", "after", "solver-additive-diagnostic"].map((n) => `<figure><img src="${n}.png"><figcaption>${n}</figcaption></figure>`).join("")}</section><pre>${JSON.stringify(metrics, null, 2)}</pre>`,
);
console.log(JSON.stringify(metrics));
