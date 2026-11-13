import { Worker } from "node:worker_threads";
import { readFileSync } from "node:fs";
import { decodeGenerationRecipe } from "../../server/generation-recipe";
import { DEFAULT_STANDARD_KIT } from "../../src/core/standard-kit";
import { randomBytes } from "node:crypto";
import { frameFreePhoto } from "../../src/core/free-photo-framing";
import { validateInstruction } from "../../src/core/validation";
const U = process.env.U ?? "output/";
const rgb = new Uint8Array(readFileSync(U + "p16-1c-review/private/photo-01/F2-target.bin"));
const mono = Buffer.from(Uint8Array.from({ length: 250000 }, (_, k) => rgb[k * 3]));
const b: any = { version: "protected-generation/1", consent: "prepared-target-transfer/1", shape: "circle", revision: 1, lines: 3000, target: "", secret: randomBytes(32).toString("base64url"), requestKey: "claude-e2e-first", preparation: { version: "standard-preparation/9", sourceHash: "a".repeat(64), sourceAspect: 0.75, whiteBackground: "automatic", transform: frameFreePhoto("people", [{ left: 0.3, top: 0.2, width: 0.4, height: 0.35 }], "circle", 0.75) } }; b.target = mono.toString("base64url"); b.lines = 3000;
for (const t of ["classic-reference/4", "classic-reference/3"] as const) {
  const r = decodeGenerationRecipe(b, DEFAULT_STANDARD_KIT, t);
  const s = performance.now();
  const out: any = await new Promise((res, rej) => {
    const w = new Worker(new URL("../../server/generation-thread.mjs", import.meta.url), { workerData: { options: r.options, enhanced: r.enhanced } });
    w.on("message", (m) => { if (m.type === "done") { res(m); w.terminate(); } if (m.type === "error") rej(Error("worker")); });
    w.on("error", rej);
  });
  const i = await validateInstruction(out.instruction);
  console.log(t, i.algorithm, i.params.classic?.version, i.metrics.lines, "png", out.png.length, Math.round(performance.now() - s) + "ms");
}
