import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { freemem } from "node:os";
import UPNGModule from "@pdf-lib/upng";
import { cases, root, fixtureRoot } from "./benchmark";
import { FRAMING_OPTION } from "./framing";
import { framingEligible, smallView } from "./review";
import { scoreRender } from "../p16-1b/review"; // Measurement only; no B candidate/solver imports.
import { generateClassicLeastSquares } from "../../src/core/classic-least-squares";
import { referenceRaster } from "../../src/core/classic-reference";
import { sourceMidcontrast } from "../../src/core/source-midcontrast";
import { validateInstruction } from "../../src/core/validation";
import { hash } from "../../src/core/engine";
import type { GenerateOptions } from "../../src/core/engine";
import type { MaterialProfile } from "../../src/core/types";
const UPNG =
  (UPNGModule as unknown as { default?: typeof UPNGModule }).default ??
  UPNGModule;
const sha = (bytes: Uint8Array | string) =>
  createHash("sha256").update(bytes).digest("hex");
const id = process.argv[2],
  c = cases.find((c) => c.id === id);
assert(c, "Choose one frozen case");
assert(freemem() >= 1.5 * 2 ** 30, "RAM below1.5GiB");
const directory = `${root}/private/${id}`;
assert(
  !existsSync(directory + "/result.json"),
  "Completed review case is sealed",
);
const frozen = JSON.parse(readFileSync("docs/P16_1C_PARAMETERS.json", "utf8"));
const input = fixtureRoot + c.folder + "/";
const options: GenerateOptions = JSON.parse(
  readFileSync(input + "options.json", "utf8"),
);
const archived = await validateInstruction(
  JSON.parse(readFileSync(input + "guide.json", "utf8")),
);
const prior = JSON.parse(
  readFileSync(`output/p16-1b-review/private/${c.priorId}/result.json`, "utf8"),
);
assert.equal(
  prior.rows.baseline.pathSha,
  sha(JSON.stringify(archived.segments[0].path)),
);
const assets = root + "/assets";
mkdirSync(assets, { recursive: true });
function savePng(rgba: Uint8Array, w: number, h: number) {
  const name = randomBytes(12).toString("hex") + ".png";
  writeFileSync(
    `${assets}/${name}`,
    Buffer.from(UPNG.encode([rgba.buffer as ArrayBuffer], w, h, 0)),
  );
  return "assets/" + name;
}
function save(rgba: Uint8Array) {
  return {
    render: savePng(rgba, 1000, 1000),
    small: savePng(smallView(rgba), 250, 250),
    pixelSha: sha(rgba),
  };
}
function checkRoute(p: MaterialProfile, path: number[]) {
  assert.equal(p.pins.length, 240);
  assert.equal(p.threadMm, 0.12);
  assert.equal(p.opacity, 0.9);
  assert.deepEqual(p.colors, ["#000000"]);
  assert.equal(path.length, 3001);
  const used = new Set<number>(),
    degree = new Uint16Array(240);
  for (let j = 1; j < path.length; j++) {
    const a = path[j - 1],
      b = path[j],
      k = Math.min(a, b) * 240 + Math.max(a, b);
    assert(!used.has(k));
    used.add(k);
    degree[a]++;
    degree[b]++;
  }
  assert(degree.every((v) => v <= 160));
}
const original = readFileSync(c.source),
  originalName =
    randomBytes(12).toString("hex") +
    (c.source.endsWith(".jpg") ? ".jpg" : ".png");
writeFileSync(`${assets}/${originalName}`, original);
const bytes = readFileSync(
    "output/p16-1b-review/" + prior.rows.baseline.render,
  ),
  decoded = UPNG.decode(Uint8Array.from(bytes).buffer);
assert.equal(decoded.width, 1000);
assert.equal(decoded.height, 1000);
const baselineRgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
assert.equal(sha(baselineRgba), prior.rows.baseline.pixelSha);
const baselineAsset = save(baselineRgba);
const rows: Record<string, unknown> = {
  F0: {
    ...prior.rows.baseline,
    ...baselineAsset,
    level: "F0",
    archived: true,
    eligible: true,
    reason: "archived-control",
    controls: options.kitPreparation!.transform,
  },
};
checkRoute(archived.profile, archived.segments[0].path);
for (const level of ["F1", "F2"] as const) {
  assert(freemem() >= 1.5 * 2 ** 30, "RAM below1.5GiB before framing fit");
  const params = frozen.settings.find(
    (s: { id: string; framing: { level: string } }) =>
      s.id === id && s.framing.level === level,
  );
  const sourcePixels = new Uint8Array(
    readFileSync(`${directory}/${level}-target.bin`),
  );
  assert.equal(sha(sourcePixels), params.targetSha256);
  assert.equal(sha(JSON.stringify(options.profile)), params.profileSha256);
  assert.equal(sha(original), params.sourceSha);
  const start = performance.now();
  const enhanced =
    archived.params.kitPreparation!.version === "standard-preparation/10";
  const pixels = enhanced ? sourceMidcontrast(sourcePixels, 500) : sourcePixels;
  const proof = {
    ...structuredClone(options.kitPreparation!),
    sourceHash: sha(original),
    transform: params.framing.transform,
  };
  if (enhanced) {
    proof.version = "standard-preparation/10";
    proof.tone = {
      version: "quality-gated-midcontrast/1",
      parentImageHash: await hash(sourcePixels),
    };
  } else {
    proof.version = "standard-preparation/9";
    delete proof.tone;
  }
  const o = { ...options, pixels, kitPreparation: proof };
  try {
    const fit = await generateClassicLeastSquares(o);
    const rgb = referenceRaster(fit, 1000),
      ms = performance.now() - start + params.frameMs;
    await validateInstruction(fit);
    checkRoute(fit.profile, fit.segments[0].path);
    assert.equal(fit.segments.length, 1);
    assert.equal(fit.algorithm, "classic-greedy/3");
    const eligibility = framingEligible(true, ms, prior.rows.baseline.ms);
    const rgba = Uint8Array.from({ length: 4000000 }, (_, k) =>
      k % 4 === 3
        ? 255
        : Math.round(rgb[Math.floor(k / 4) * 3 + (k % 4)] * 255),
    );
    const row = {
      level,
      option: FRAMING_OPTION,
      controls: params,
      ms,
      ratio: ms / prior.rows.baseline.ms,
      ...eligibility,
      scores: scoreRender(
        sourcePixels,
        rgb,
        proof.transform.targetFaces!,
        fit.profile.shape,
      ),
      pathSha: sha(JSON.stringify(fit.segments[0].path)),
      selectedTone: proof.version,
      ...save(rgba),
    };
    rows[level] = row;
    // Explicit wrapper: never publish an experimental crop as an old guide.
    writeFileSync(
      `${directory}/${level}-route.json`,
      JSON.stringify({
        schema: FRAMING_OPTION,
        importableGuide: false,
        profile: fit.profile,
        path: fit.segments[0].path,
        sourceTargetSha: sha(sourcePixels),
        solverTargetSha: sha(pixels),
        settings: fit.params.classic,
      }),
    );
    writeFileSync(
      `${directory}/${level}-metrics.json`,
      JSON.stringify(row, null, 2),
    );
    if (id === "photo-01" && level === "F2") {
      assert(
        freemem() >= 1.5 * 2 ** 30,
        "RAM below1.5GiB before deterministic replay",
      );
      const replay = await generateClassicLeastSquares(o);
      assert.deepEqual(replay.segments[0].path, fit.segments[0].path);
      writeFileSync(
        `${directory}/determinism.json`,
        JSON.stringify({
          lines: 3000,
          resolution: 500,
          exactPath: true,
          sha: row.pathSha,
        }),
      );
    }
    console.log(
      JSON.stringify({
        id,
        level,
        ms: Math.round(ms),
        ratio: +row.ratio.toFixed(3),
        eligible: row.eligible,
        faceHeight: params.framing.achievedHeight,
      }),
    );
  } catch (error) {
    rows[level] = {
      level,
      eligible: false,
      reason: "hard-constraint-or-generation-failure",
      error: String(error),
    };
    console.log(id + " " + level + " FAILED; saved diagnostic");
  }
}
writeFileSync(
  directory + "/result.json",
  JSON.stringify(
    {
      id,
      source: c.source,
      sourceSha: sha(original),
      original: "assets/" + originalName,
      shape: options.profile.shape,
      rows,
    },
    null,
    2,
  ),
  { flag: "wx" },
);
