import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const f = "output/portrait-dispatch";
if (existsSync(f + "/audit.json")) throw Error("Preserve sealed audit");
const baseline = JSON.parse(readFileSync(f + "/owner-baseline.json", "utf8"));
const freshAfterMismatch = process.argv.includes("--fresh-after-mismatch");
const face = JSON.parse(readFileSync(f + "/source-proposals.json", "utf8"));
// Owner-specific coordinates are archived model proposals from the current UI,
// never application defaults. Review occurred on the source and target.
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5184/");
  const rows = await page.evaluate(
    async ({ baseline, face, freshAfterMismatch }) => {
      const { loadPhoto, prepare } = await import("/src/core/image.ts");
      const { processPortrait, putRgb, DEFAULT_PORTRAIT } =
        await import("/src/core/portrait.ts");
      const { reviewedFacePortrait } =
        await import("/src/core/face-features.ts");
      const { hash } = await import("/src/core/engine.ts");
      const { displayBox } = await import("/src/core/coordinates.ts");
      const source = await loadPhoto(
        new File(
          [
            await (
              await fetch("/output/portrait-dispatch/prepared-source.png")
            ).blob(),
          ],
          "source.png",
          { type: "image/png" },
        ),
      );
      const edits = baseline.project.edits,
        rows = [];
      for (const n of [160, 320, 512]) {
        const c = document.createElement("canvas");
        c.width = c.height = n;
        const raw = prepare(c.getContext("2d"), source, edits, 1),
          crop = c.toDataURL();
        const rawHash = await hash(raw);
        if (n === 160 && rawHash !== baseline.project.instruction.imageHash) {
          const original = await loadPhoto(
            new File(
              [await (await fetch("/output/portrait/source.jpg")).blob()],
              "original.jpg",
              { type: "image/jpeg" },
            ),
          );
          const originalHash = await hash(
            prepare(c.getContext("2d"), original, edits, 1),
          );
          original.close();
          const sourceCanvas = document.createElement("canvas");
          sourceCanvas.width = source.width;
          sourceCanvas.height = source.height;
          sourceCanvas.getContext("2d").drawImage(source, 0, 0);
          const canvasHash = await hash(
            prepare(c.getContext("2d"), sourceCanvas, edits, 1),
          );
          if (!freshAfterMismatch)
            throw Error(
              JSON.stringify({
                reason: "Exact target mismatch; do not claim matched baseline",
                rawHash,
                originalHash,
                canvasHash,
                expected: baseline.project.instruction.imageHash,
                dimensions: [source.width, source.height],
              }),
            );
        }
        const p = reviewedFacePortrait(
          face,
          { ...DEFAULT_PORTRAIT, background: 0, localContrast: 0 },
          edits,
          source.width,
          source.height,
          1,
          n,
          "circle",
        );
        const pixels = processPortrait(raw, n, p);
        putRgb(c.getContext("2d"), pixels, n);
        const target = c.toDataURL();
        for (const key of ["eyes", "nose", "mouth"]) {
          const b = displayBox(p.regions[key], n);
          const ctx = c.getContext("2d");
          ctx.strokeStyle = {
            eyes: "#1777bb",
            nose: "#bd741c",
            mouth: "#b13461",
          }[key];
          ctx.lineWidth = 1;
          ctx.strokeRect(b.left * n, b.top * n, b.width * n, b.height * n);
        }
        rows.push({
          n,
          portrait: p,
          rawHash,
          targetHash: await hash(pixels),
          pixels: [...pixels],
          raw: [...raw],
          crop,
          target,
          overlay: c.toDataURL(),
        });
      }
      source.close();
      return rows;
    },
    { baseline, face, freshAfterMismatch },
  );
  for (const r of rows) {
    for (const [key, name] of [
      ["crop", "source"],
      ["target", "target"],
      ["overlay", "regions"],
    ]) {
      writeFileSync(
        `${f}/${name}-${r.n}.png`,
        Buffer.from(r[key].split(",")[1], "base64"),
        { flag: "wx" },
      );
      delete r[key];
    }
    writeFileSync(`${f}/target-${r.n}.bin`, Buffer.from(r.pixels), {
      flag: "wx",
    });
    writeFileSync(`${f}/raw-${r.n}.bin`, Buffer.from(r.raw), { flag: "wx" });
    delete r.pixels;
    delete r.raw;
  }
  writeFileSync(
    f + "/audit.json",
    JSON.stringify(
      {
        edits: baseline.project.edits,
        historicalTargetHash: baseline.project.instruction.imageHash,
        historicalTargetReproduced:
          rows[0].rawHash === baseline.project.instruction.imageHash,
        sourceSha: createHash("sha256")
          .update(readFileSync("output/portrait/source.jpg"))
          .digest("hex"),
        preparedSha: createHash("sha256")
          .update(readFileSync(f + "/prepared-source.png"))
          .digest("hex"),
        sourceFace: face,
        rows,
        confounds:
          "Historical off-mode RGB target could not be reproduced from the current exported prepared source. Preserve it as historical, not a matched-target control. New guarded/physical120 targets are identical grayscale-only preparation of the frozen same crop. Resolved240 separately changes materials and sampling. No softening/enhancement.",
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(
    rows.map((r) => ({ n: r.n, rawHash: r.rawHash, targetHash: r.targetHash })),
  );
} finally {
  await browser.close();
}
