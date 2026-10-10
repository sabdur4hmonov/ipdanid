// Uses the existing reversible marked-face fit, preserving source anatomy.
import { chromium } from "@playwright/test";
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { generateDensity } from "../src/core/density";
import {
  parseProjectFile,
  progressFor,
  validateInstruction,
} from "../src/core/validation";
const out = "output/face-focus";
mkdirSync(out, { recursive: true });
const source = JSON.parse(
  readFileSync("output/portrait-detail/white/control-guide.json", "utf8"),
);
const control = await validateInstruction(source.project.instruction);
if (existsSync(out + "/candidate.json"))
  throw Error("Preserved face-focus experiment exists");
const browser = await chromium.launch({ headless: true });
let prepared: any;
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5183/");
  prepared = await page.evaluate(
    async ({ portrait, profile }) => {
      const { loadPhoto, prepare } = await import(
        "/src/core/image.ts" as string
      );
      const { fitMarkedFace, remapPortrait } = await import(
        "/src/core/shape-crop.ts" as string
      );
      const { processPortrait, putRgb } = await import(
        "/src/core/portrait.ts" as string
      );
      const settings = await (
        await fetch("/output/circle-head-240/circle-settings.json")
      ).json();
      const im = await loadPhoto(
        new File(
          [
            await (
              await fetch("/output/portrait-detail/white-source.png")
            ).blob(),
          ],
          "source.png",
          { type: "image/png" },
        ),
      );
      const fit = fitMarkedFace(
        profile.shape,
        portrait.face,
        settings.edits,
        1,
        profile.widthMm,
        profile.heightMm,
        160,
      );
      const mapped = remapPortrait(
        portrait,
        settings.edits,
        fit.edits,
        im.width,
        im.height,
        1,
        160,
      );
      const c = document.createElement("canvas");
      c.width = c.height = 160;
      const pixels = processPortrait(
        prepare(c.getContext("2d"), im, fit.edits, 1),
        160,
        mapped,
      );
      putRgb(c.getContext("2d"), pixels, 160);
      const result = {
        pixels: Array.from(pixels),
        png: c.toDataURL(),
        edits: fit.edits,
        portrait: mapped,
        ratio: fit.ratio,
      };
      im.close();
      return result;
    },
    { portrait: control.params.portrait, profile: control.profile },
  );
} finally {
  await browser.close();
}
writeFileSync(out + "/target.bin", new Uint8Array(prepared.pixels));
writeFileSync(
  out + "/target-160.png",
  Buffer.from(prepared.png.split(",")[1], "base64"),
);
writeFileSync(
  out + "/settings.json",
  JSON.stringify(
    {
      edits: prepared.edits,
      portrait: prepared.portrait,
      ratio: prepared.ratio,
    },
    null,
    2,
  ),
);
if (process.argv.includes("--prepare-only")) {
  console.log(
    JSON.stringify({ ratio: prepared.ratio, portrait: prepared.portrait }),
  );
  process.exit(0);
}
let cancelled = false,
  last = 0;
process.on("SIGINT", () => {
  cancelled = true;
});
const start = performance.now(),
  stateFile = out + "/fit.json";
const instruction = await generateDensity(
  {
    pixels: new Uint8Array(prepared.pixels),
    profile: control.profile,
    resolution: 160,
    portrait: prepared.portrait,
    lines: control.params.requestedLines,
    mode: control.params.mode,
    cancelled: () => cancelled,
    onProgress: (f) => {
      if (performance.now() - last > 15000) {
        last = performance.now();
        console.log("face-focus", Math.round(f * 100) + "%");
      }
    },
  },
  {
    edgeWeight: 2,
    sweeps: 8,
    physical: control.params.optimization!.contrastPhysical,
    resume: existsSync(stateFile)
      ? JSON.parse(readFileSync(stateFile, "utf8"))
      : undefined,
    onCheckpoint: (s) => {
      writeFileSync(stateFile + ".next", JSON.stringify(s));
      renameSync(stateFile + ".next", stateFile);
    },
  },
);
await validateInstruction(instruction);
const file = {
  schema: "iprasm.project/1",
  project: {
    ...source.project,
    id: crypto.randomUUID(),
    name: "Marked-face framing",
    edits: prepared.edits,
    instruction,
    progress: progressFor(instruction),
  },
  evidence: {
    stageMs: performance.now() - start,
    framingChanged: true,
    ratio: prepared.ratio,
    qualityAcceptance: "open",
    physicalAcceptance: false,
  },
};
await parseProjectFile(JSON.stringify(file));
writeFileSync(out + "/candidate.json", JSON.stringify(file, null, 2), {
  flag: "wx",
});
writeFileSync(out + "/control.json", JSON.stringify(source, null, 2), {
  flag: "wx",
});
console.log(
  JSON.stringify({
    connections: instruction.metrics.lines,
    meters: instruction.metrics.estimatedMeters,
    hash: instruction.sequenceHash,
    ms: file.evidence.stageMs,
  }),
);
