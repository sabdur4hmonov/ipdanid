import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const f = "output/portrait-resolved";
if (existsSync(f + "/audit.json")) throw Error("Preserve sealed source/target");
const control = JSON.parse(
  readFileSync("output/portrait-detail/white/control-guide.json", "utf8"),
);
if (
  control.project.instruction.sequenceHash !==
  "234715a5229e9a0fe2df51e588f7cb4066b38bc95726a82469e28eda149be68a"
)
  throw Error("Wrong control");
const preparedSourceHash = createHash("sha256")
  .update(readFileSync("output/portrait-detail/white-source.png"))
  .digest("hex");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5183/");
  const result = await page.evaluate(async (control) => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts"),
      { processPortrait, putRgb } = await import("/src/core/portrait.ts"),
      { remapPortrait } = await import("/src/core/shape-crop.ts"),
      { hash } = await import("/src/core/engine.ts"),
      { displayBox } = await import("/src/core/coordinates.ts");
    const source = await loadPhoto(
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
    const i = control.project.instruction,
      edits = control.project.edits,
      rows = [];
    for (const n of [160, 320]) {
      const p =
        n === 160
          ? structuredClone(i.params.portrait)
          : remapPortrait(
              i.params.portrait,
              edits,
              edits,
              source.width,
              source.height,
              1,
              n,
              1,
              160,
            );
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const raw = prepare(c.getContext("2d"), source, edits, 1),
        crop = c.toDataURL(),
        pixels = processPortrait(raw, n, p);
      const targetHash = await hash(pixels);
      if (n === 160 && targetHash !== i.imageHash)
        throw Error("Exact control target failed");
      putRgb(c.getContext("2d"), pixels, n);
      const png = c.toDataURL(),
        ctx = c.getContext("2d");
      for (const name of ["eyes", "nose", "mouth"]) {
        const b = displayBox(p.regions[name], n);
        ctx.strokeStyle = {
          eyes: "#1777bb",
          nose: "#bd741c",
          mouth: "#b13461",
        }[name];
        ctx.lineWidth = 1;
        ctx.strokeRect(b.left * n, b.top * n, b.width * n, b.height * n);
      }
      rows.push({
        n,
        portrait: p,
        targetHash,
        pixels: [...pixels],
        png,
        crop,
        overlay: c.toDataURL(),
      });
    }
    source.close();
    return rows;
  }, control);
  for (const r of result) {
    writeFileSync(`${f}/target-${r.n}.bin`, Buffer.from(r.pixels), {
      flag: "wx",
    });
    for (const [k, name] of [
      ["png", "target"],
      ["crop", "source"],
      ["overlay", "regions"],
    ])
      writeFileSync(
        `${f}/${name}-${r.n}.png`,
        Buffer.from(r[k].split(",")[1], "base64"),
        { flag: "wx" },
      );
    delete r.pixels;
    delete r.png;
    delete r.crop;
    delete r.overlay;
  }
  writeFileSync(
    f + "/audit.json",
    JSON.stringify(
      {
        preparedSourceHash,
        source: "same locally prepared original; never enlarged old target",
        edits: control.project.edits,
        rows: result,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  writeFileSync(f + "/control.json", JSON.stringify(control, null, 2), {
    flag: "wx",
  });
  console.log(
    JSON.stringify(
      result.map((r) => ({
        n: r.n,
        target: r.targetHash,
        regions: r.portrait.regions,
      })),
    ),
  );
} finally {
  await browser.close();
}
