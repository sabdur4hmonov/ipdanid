import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  renameSync,
} from "node:fs";
import { generateDensity, type DensityCheckpoint } from "../src/core/density";
import { validateInstruction, progressFor } from "../src/core/validation";
const out = "output/portrait-detail/white";
mkdirSync(out, { recursive: true });
const ref = await validateInstruction(
  JSON.parse(readFileSync("output/pin-basis/control-240.json", "utf8")).project
    .instruction,
);
let cancel = false;
process.on("SIGINT", () => {
  cancel = true;
});
for (const detail of [false, true]) {
  const name = detail ? "candidate" : "control",
    file = `${out}/${name}.json`;
  if (existsSync(file)) throw Error("Preserved white comparison exists");
  const pixels = new Uint8Array(
      readFileSync(
        `output/portrait-detail/white-${detail ? "detail" : "tone"}.bin`,
      ),
    ),
    portrait = {
      ...structuredClone(ref.params.portrait!),
      ...(detail ? { detailStyle: "contour-preparation/1" as const } : {}),
    },
    stateFile = `${out}/${name}-fit.json`;
  let last = 0;
  const start = performance.now();
  const i = await generateDensity(
    {
      pixels,
      resolution: 160,
      profile: ref.profile,
      portrait,
      lines: ref.params.requestedLines,
      mode: ref.params.mode,
      cancelled: () => cancel,
      onProgress: (f) => {
        if (performance.now() - last > 15000) {
          last = performance.now();
          console.log(name, Math.round(f * 100) + "%");
        }
      },
    },
    {
      edgeWeight: 2,
      sweeps: 8,
      physical: ref.params.optimization!.contrastPhysical,
      resume: existsSync(stateFile)
        ? (JSON.parse(readFileSync(stateFile, "utf8")) as DensityCheckpoint)
        : undefined,
      onCheckpoint: (s) => {
        writeFileSync(stateFile + ".next", JSON.stringify(s));
        renameSync(stateFile + ".next", stateFile);
      },
    },
  );
  await validateInstruction(i);
  const evidence = {
    stageMs: performance.now() - start,
    sequenceHash: i.sequenceHash,
    targetHash: i.imageHash,
    connections: i.metrics.lines,
    meters: i.metrics.estimatedMeters,
    preparedSource: "../white-source.png",
    compute: "fresh empty graph, eight integer sweeps",
    qualityAcceptance: "open",
    physicalAcceptance: false,
  };
  writeFileSync(
    file,
    JSON.stringify(
      {
        schema: "iprasm.project/1",
        project: {
          id: crypto.randomUUID(),
          name: `Local-white ${detail ? "contour" : "tone"} portrait`,
          edits: JSON.parse(
            readFileSync("output/circle-head-240/circle-settings.json", "utf8"),
          ).edits,
          instruction: i,
          progress: progressFor(i),
        },
        evidence,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(JSON.stringify(evidence));
}
