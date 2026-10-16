// Diagnostic on already prepared private Phase12 targets, never source uploads.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import UPNGModule from "@pdf-lib/upng";
import {
  generateClassicLeastSquares,
  leastSquaresProfile,
  isSquareCentreAxis,
} from "../src/core/classic-least-squares";
import { referenceRaster } from "../src/core/classic-reference";
import { standardProfiles } from "../src/core/standard-kit";
import { validateInstruction } from "../src/core/validation";
import { hash } from "../src/core/engine";
import { viewingSsim } from "../tests/helpers/viewing-ssim";
import { inside } from "../src/core/geometry";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
const cases = [
    "owner-phase9-circle",
    "synthetic-1-circle",
    "synthetic-2-circle",
    "synthetic-3-circle",
    "synthetic-1-square",
    "synthetic-pair-heart",
  ],
  rows = [];
mkdirSync("output/phase13", { recursive: true });
for (const name of cases) {
  const root = `output/phase12/ab/${name}`,
    old = await validateInstruction(
      JSON.parse(readFileSync(root + "/guide-3000.json", "utf8")),
    ),
    decoded = UPNG.decode(
      Uint8Array.from(readFileSync(root + "/target.png")).buffer,
    ),
    rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]),
    pixels = Uint8Array.from(rgba.filter((_, k) => k % 4 !== 3));
  if ((await hash(pixels)) !== old.imageHash)
    throw Error("Prepared target mismatch");
  const p = leastSquaresProfile(
      standardProfiles(old.profile.standardKit!.config).find(
        (p) => p.shape === old.profile.shape,
      )!,
    ),
    next = await generateClassicLeastSquares({
      pixels,
      profile: p,
      resolution: 500,
      lines: 3000,
      mode: "dark",
      kitPreparation: old.params.kitPreparation,
      accessPolicy: "kit-build/1",
    });
  await validateInstruction(next);
  const target = Float32Array.from(
      { length: 500 * 500 },
      (_, k) => pixels[k * 3] / 255,
    ),
    opts = {
      faces: old.params.kitPreparation!.transform.targetFaces,
      boardMask: Uint8Array.from({ length: 160 * 160 }, (_, k) =>
        inside(p.shape, (k % 160) / 159, Math.floor(k / 160) / 159) ? 1 : 0,
      ),
    },
    measure = (i: typeof old) => {
      const rgb = referenceRaster(i, 1000);
      return viewingSsim(
        target,
        500,
        Float32Array.from({ length: 1000 * 1000 }, (_, k) => rgb[k * 3]),
        1000,
        opts,
      );
    },
    a = measure(old),
    b = measure(next),
    axes = (i: typeof old) =>
      i.segments[0].path
        .slice(1)
        .filter((v, k) =>
          isSquareCentreAxis(i.profile, i.segments[0].path[k], v),
        ).length;
  const row = {
    name,
    v2: a.face.ssim,
    v3: b.face.ssim,
    v2Faces: a.faces.map((x) => x.ssim),
    v3Faces: b.faces.map((x) => x.ssim),
    axis2: axes(old),
    axis3: axes(next),
    ms: next.metrics.durationMs,
  };
  rows.push(row);
  writeFileSync(
    "output/phase13/initial-probe.json",
    JSON.stringify(rows, null, 2),
  );
  console.log(JSON.stringify(row));
}
