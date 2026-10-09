// One controlled pair, local source only. Sealed guides are never overwritten.
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { generate, hash } from "../src/core/engine";
import { generateDensity } from "../src/core/density";
import { validateInstruction, progressFor } from "../src/core/validation";
import { rasterSequence } from "../src/core/optical";
import { Distribution } from "../src/core/distribution";
import type { EditParams, PortraitSettings, Project } from "../src/core/types";
const folder = "output/outline";
mkdirSync(folder, { recursive: true });
const reference = JSON.parse(readFileSync(folder + "/baseline.json", "utf8"))
  .project as Project;
const baseline = await validateInstruction(reference.instruction);
const sourceHash = createHash("sha256")
  .update(readFileSync(folder + "/source.jpg"))
  .digest("hex");
if (
  sourceHash !==
  "b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4"
)
  throw Error("Wrong source");
// Manual inspection of the supplied960×1280photo, covering hair/ears/jaw. Not anatomy detection.
const sourcePoints = [
  [505, 30],
  [615, 44],
  [720, 82],
  [791, 174],
  [832, 278],
  [826, 370],
  [793, 451],
  [768, 478],
  [754, 580],
  [727, 653],
  [687, 740],
  [636, 824],
  [574, 882],
  [500, 908],
  [433, 904],
  [373, 876],
  [326, 820],
  [305, 737],
  [284, 640],
  [251, 590],
  [232, 524],
  [217, 479],
  [200, 416],
  [202, 305],
  [230, 202],
  [272, 117],
  [343, 58],
  [424, 30],
].map(([x, y]) => ({ x: x / 960, y: y / 1280 }));
const browser = await chromium.launch({ headless: true });
let prepared: any;
try {
  const page = await browser.newPage();
  await page.route("**/*", (r) =>
    new URL(r.request().url()).hostname === "127.0.0.1"
      ? r.continue()
      : r.abort(),
  );
  await page.goto("http://127.0.0.1:5183/");
  prepared = await page.evaluate(
    async ({ reference, sourcePoints }) => {
      const { loadPhoto, prepare } = await import("/src/core/image.ts");
      const { processPortrait, putRgb } = await import("/src/core/portrait.ts");
      const { hash } = await import("/src/core/engine.ts");
      const { fitMarkedFace, remapPortrait } =
        await import("/src/core/shape-crop.ts");
      const { sourceToTarget } = await import("/src/core/coordinates.ts");
      const { outlineBounds, fitMarkedOutline } =
        await import("/src/core/head-outline.ts");
      const image = await loadPhoto(
        new File(
          [await (await fetch("/output/outline/source.jpg")).blob()],
          "source.jpg",
          { type: "image/jpeg" },
        ),
      );
      const bounded = document.createElement("canvas"),
        ratio = Math.min(1, 1536 / Math.max(image.width, image.height));
      bounded.width = Math.round(image.width * ratio);
      bounded.height = Math.round(image.height * ratio);
      bounded
        .getContext("2d")!
        .drawImage(image, 0, 0, bounded.width, bounded.height);
      image.close();
      const i = reference.instruction,
        n = i.params.resolution,
        old = reference.edits,
        portrait = i.params.portrait;
      const projected = sourcePoints.map((p) =>
        sourceToTarget(
          p.x * bounded.width,
          p.y * bounded.height,
          bounded.width,
          bounded.height,
          old,
          1,
          n,
        ),
      );
      const start = performance.now();
      const rectangle = fitMarkedFace(
        "heart",
        outlineBounds(projected),
        old,
        1,
        400,
        400,
        n,
      );
      const outline = fitMarkedOutline(
        "heart",
        sourcePoints,
        old,
        1,
        400,
        400,
        bounded.width,
        bounded.height,
        n,
      );
      const geometryMs = performance.now() - start;
      const variants: Record<string, any> = {};
      for (const [name, fit] of Object.entries({
        baseline: { edits: old, ratio: 1 },
        rectangle,
        outline,
      })) {
        const edits = fit.edits,
          settings = remapPortrait(
            portrait,
            old,
            edits,
            bounded.width,
            bounded.height,
            1,
            n,
          );
        const c = document.createElement("canvas");
        c.width = c.height = n;
        const raw = prepare(c.getContext("2d")!, bounded, edits, 1),
          source = c.toDataURL(),
          pixels = processPortrait(raw, n, settings);
        putRgb(c.getContext("2d")!, pixels, n);
        variants[name] = {
          edits,
          portrait: settings,
          ratio: fit.ratio,
          source,
          target: c.toDataURL(),
          pixels: Array.from(pixels),
          imageHash: await hash(pixels),
        };
      }
      if (variants.baseline.imageHash !== i.imageHash)
        throw Error("Sealed target did not reproduce");
      const annotated = document.createElement("canvas");
      annotated.width = bounded.width;
      annotated.height = bounded.height;
      const ctx = annotated.getContext("2d")!;
      ctx.drawImage(bounded, 0, 0);
      ctx.strokeStyle = "#19ddd6";
      ctx.lineWidth = 4;
      ctx.beginPath();
      sourcePoints.forEach((p, j) =>
        j
          ? ctx.lineTo(p.x * bounded.width, p.y * bounded.height)
          : ctx.moveTo(p.x * bounded.width, p.y * bounded.height),
      );
      ctx.closePath();
      ctx.stroke();
      sourcePoints.forEach((p, j) => {
        ctx.fillStyle = "#123c35";
        ctx.beginPath();
        ctx.arc(p.x * bounded.width, p.y * bounded.height, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "12px sans-serif";
        ctx.fillText(
          String(j + 1),
          p.x * bounded.width - 4,
          p.y * bounded.height + 4,
        );
      });
      return { variants, geometryMs, annotated: annotated.toDataURL() };
    },
    { reference, sourcePoints },
  );
} finally {
  await browser.close();
}
writeFileSync(
  folder + "/marked-head.png",
  Buffer.from(prepared.annotated.split(",")[1], "base64"),
);
writeFileSync(
  folder + "/selection.json",
  JSON.stringify(
    {
      sourceHash,
      sourcePoints,
      referenceHash: baseline.sequenceHash,
      geometryMs: prepared.geometryMs,
      selection: "manual-source-normalized/1",
      qualityAcceptance: "open",
    },
    null,
    2,
  ),
);
for (const [name, v] of Object.entries(prepared.variants) as [string, any][]) {
  for (const key of ["source", "target"])
    writeFileSync(
      folder + "/" + name + "-" + key + ".png",
      Buffer.from(v[key].split(",")[1], "base64"),
    );
  writeFileSync(folder + "/" + name + "-target.bin", new Uint8Array(v.pixels));
  writeFileSync(
    folder + "/" + name + "-settings.json",
    JSON.stringify(
      {
        edits: v.edits,
        portrait: v.portrait,
        ratio: v.ratio,
        imageHash: v.imageHash,
      },
      null,
      2,
    ),
  );
  if (name === "baseline") continue;
  const file = folder + "/" + name + "-guide.json";
  if (existsSync(file)) {
    const saved = await validateInstruction(
      JSON.parse(readFileSync(file, "utf8")).project.instruction,
    );
    if (saved.imageHash !== v.imageHash)
      throw Error("Preserve prior experiment with a different target");
    console.log("Retained", name, saved.sequenceHash);
    continue;
  }
  const started = performance.now();
  let last = 0,
    peak = process.memoryUsage().rss;
  const progress = (f: number) => {
    peak = Math.max(peak, process.memoryUsage().rss);
    if (performance.now() - last > 15000) {
      console.log(name, "compute", Math.round(f * 100) + "%; no ETA");
      last = performance.now();
    }
  };
  const options = {
    pixels: new Uint8Array(v.pixels),
    resolution: 160,
    profile: baseline.profile,
    portrait: v.portrait as PortraitSettings,
    lines: baseline.params.requestedLines,
    mode: baseline.params.mode,
    onProgress: progress,
    guarded: true,
  };
  const basis = await generate(options);
  await validateInstruction(basis);
  const instruction = await generateDensity(
    { ...options, seed: basis },
    {
      edgeWeight: 2,
      sweeps: 8,
      physical: baseline.params.optimization!.contrastPhysical,
    },
  );
  await validateInstruction(instruction);
  if (instruction.imageHash !== (await hash(options.pixels)))
    throw Error("Target mismatch");
  const distribution = new Distribution(
    instruction.profile.pins.length,
    instruction.segments,
  );
  const project: Project = {
    id: crypto.randomUUID(),
    name: "Separate " + name + " head-fit / same160 heart/.1mm",
    instruction,
    edits: v.edits as EditParams,
    progress: progressFor(instruction),
  };
  writeFileSync(
    file,
    JSON.stringify({ schema: "iprasm.project/1", project }, null, 2),
    { flag: "wx" },
  );
  const raster = rasterSequence(instruction);
  writeFileSync(
    folder + "/" + name + "-sequence.f32",
    Buffer.from(raster.buffer, raster.byteOffset, raster.byteLength),
  );
  writeFileSync(
    folder + "/" + name + "-compute.json",
    JSON.stringify(
      {
        fullMs: performance.now() - started,
        sampledPeakRss: peak,
        sourceHash,
        imageHash: instruction.imageHash,
        sequenceHash: instruction.sequenceHash,
        connections: instruction.metrics.lines,
        meters: instruction.metrics.estimatedMeters,
        fitRatio: v.ratio,
        maxRepeat: Math.max(...distribution.pairs.values()),
        maxIncident: Math.max(...distribution.degree),
        qualityAcceptance: "open",
        physicallyValidated: false,
      },
      null,
      2,
    ),
  );
  console.log(
    name,
    "sealed",
    instruction.sequenceHash,
    instruction.metrics.lines,
    instruction.metrics.estimatedMeters,
  );
}
