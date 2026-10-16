import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import UPNGModule from "@pdf-lib/upng";
import { viewingSsim } from "../tests/helpers/viewing-ssim";
const UPNG =
  (UPNGModule as unknown as { default: typeof UPNGModule }).default ??
  UPNGModule;
const root = resolve("output/phase13/reference-parity");
mkdirSync(root, { recursive: true });
const load = (path: string) => {
  const d = UPNG.decode(Uint8Array.from(readFileSync(path)).buffer),
    r = new Uint8Array(UPNG.toRGBA8(d)[0]);
  return {
    size: d.width,
    pixels: Float32Array.from(
      { length: d.width * d.height },
      (_, k) => r[k * 4] / 255,
    ),
  };
};
const target = load("output/reference-classic/target.png"),
  results = [];
writeFileSync(root + "/target.f32", Buffer.from(target.pixels.buffer));
for (const name of ["reference-2500", "reference-v3-3000"]) {
  const render = load(`output/reference-classic/${name}.png`),
    path = root + "/" + name + ".f32";
  writeFileSync(path, Buffer.from(render.pixels.buffer));
  const ts = viewingSsim(
      target.pixels,
      target.size,
      render.pixels,
      render.size,
    ),
    py = spawnSync(
      "py",
      [resolve("AGENT/reference/score-viewing-ssim.py"), path],
      { cwd: root, encoding: "utf8" },
    );
  if (py.status !== 0) throw Error(py.stderr);
  const all = Number(py.stdout.match(/ssim_all=([-\d.]+)/)![1]),
    face = Number(py.stdout.match(/ssim_face=([-\d.]+)/)![1]);
  if (
    Math.abs(ts.face.ssim - face) > 0.0006 ||
    Math.abs(ts.all.ssim - all) > 0.0006
  )
    throw Error("Reference Python/TS mismatch");
  results.push({
    name,
    ts,
    pythonReported: { all, face },
    input:
      "provided PNG decoded to float32; exact original Python script, unchanged",
  });
  console.log(JSON.stringify({ name, tsFace: ts.face.ssim, pythonFace: face }));
}
writeFileSync(root + "/result.json", JSON.stringify(results, null, 2));
