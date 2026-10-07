import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
const folder = "output/workflow",
  project = JSON.parse(
    readFileSync(folder + "/portrait-guide.json", "utf8"),
  ).project;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5173/");
  const result = await page.evaluate(async (project) => {
    const { loadPhoto, prepare } = await import("/src/core/image.ts"),
      { processPortrait, putRgb } = await import("/src/core/portrait.ts"),
      { hash } = await import("/src/core/engine.ts"),
      { previewPng } = await import("/src/core/preview-png.ts"),
      { validateInstruction } = await import("/src/core/validation.ts");
    const image = await loadPhoto(
      new File(
        [await (await fetch("/output/portrait/source.jpg")).blob()],
        "source.jpg",
        { type: "image/jpeg" },
      ),
    );
    const bounded = document.createElement("canvas"),
      ratio = Math.min(1, 1536 / Math.max(image.width, image.height));
    bounded.width = Math.round(image.width * ratio);
    bounded.height = Math.round(image.height * ratio);
    bounded
      .getContext("2d")
      .drawImage(image, 0, 0, bounded.width, bounded.height);
    image.close();
    const i = await validateInstruction(project.instruction),
      n = i.params.resolution,
      c = document.createElement("canvas");
    c.width = c.height = n;
    const raw = prepare(c.getContext("2d"), bounded, project.edits, 1),
      source = c.toDataURL(),
      pixels = processPortrait(raw, n, i.params.portrait);
    if ((await hash(pixels)) !== i.imageHash)
      throw Error("Actual product target did not reproduce");
    putRgb(c.getContext("2d"), pixels, n);
    const target = c.toDataURL();
    const png = previewPng(i),
      sequence = await createImageBitmap(
        new Blob([png], { type: "image/png" }),
      ),
      full = URL.createObjectURL(new Blob([png], { type: "image/png" }));
    const seqCanvas = document.createElement("canvas");
    seqCanvas.width = seqCanvas.height = n;
    seqCanvas.getContext("2d").drawImage(sequence, 0, 0);
    const crops = {};
    for (const [name, b] of Object.entries(i.params.portrait.regions)) {
      if (!["eyes", "nose", "mouth"].includes(name)) continue;
      const l = Math.ceil(b.left * (n - 1)),
        t = Math.ceil(b.top * (n - 1)),
        r = Math.floor((b.left + b.width) * (n - 1)),
        bottom = Math.floor((b.top + b.height) * (n - 1));
      const out = [];
      for (const url of [source, target, seqCanvas.toDataURL()]) {
        const im = await createImageBitmap(await (await fetch(url)).blob()),
          crop = document.createElement("canvas");
        crop.width = r - l + 1;
        crop.height = bottom - t + 1;
        crop
          .getContext("2d")
          .drawImage(
            im,
            l,
            t,
            crop.width,
            crop.height,
            0,
            0,
            crop.width,
            crop.height,
          );
        out.push(crop.toDataURL());
        im.close();
      }
      crops[name] = { bounds: { l, t, r, bottom }, images: out };
    }
    sequence.close();
    URL.revokeObjectURL(full);
    return {
      source,
      target,
      sequence: seqCanvas.toDataURL(),
      crops,
      targetHash: i.imageHash,
      boundedSource: { width: bounded.width, height: bounded.height },
    };
  }, project);
  for (const name of ["source", "target", "sequence"])
    writeFileSync(
      folder + "/" + name + "-160.png",
      Buffer.from(result[name].split(",")[1], "base64"),
    );
  writeFileSync(
    folder + "/target-integrity.json",
    JSON.stringify(
      {
        targetHash: result.targetHash,
        boundedSource: result.boundedSource,
        crops: Object.fromEntries(
          Object.entries(result.crops).map(([k, v]) => [k, v.bounds]),
        ),
        exactTarget: true,
        sequenceOnly: true,
      },
      null,
      2,
    ),
  );
  const metrics = project.instruction.metrics;
  const starts = project.instruction.segments.length,
    knots = starts * 2,
    colorChanges = project.instruction.segments
      .slice(1)
      .filter(
        (s, j) => s.color !== project.instruction.segments[j].color,
      ).length,
    actions = metrics.lines + knots + colorChanges,
    minutes = (metrics.lines * 8 + knots * 20 + colorChanges * 30) / 60;
  const html = `<!doctype html><meta charset="utf-8"><title>Ip Rasm · local workflow checkpoint</title><style>body{font:16px system-ui;max-width:1100px;margin:30px auto;padding:0 20px;background:#faf8f1;color:#203932}h1{font-size:26px}figure{margin:0}img{max-width:100%}.row{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:24px 0}.ordinary img{width:160px;height:160px}.large img{width:100%}.feature img{width:256px;height:auto;image-rendering:auto}code{overflow-wrap:anywhere}p{line-height:1.6}a{color:#23634e}@media(max-width:650px){.row{grid-template-columns:1fr}}</style><h1>Actual local photo → sequence → saved guide</h1><p>NEW 160-pin heart, 400×400 mm, 0.1 mm thread, opacity 0.85, 160 computation pixels. The observed website controls showed 120 pins / 0.3 mm, portrait off and a displaced crop. Their exact binding to the historical displayed guide was not recoverable: one strict replay produced a different hash and was rejected. These current settings are observations, not proven historical generation metadata. This new guide uses explicitly disclosed different settings; no isolated optimizer improvement is claimed. Hair crosses the heart notch; whole-head containment and universal likeness are NOT accepted.</p><p>Source stays local. Portrait search v6 → v8, corrected manual source-relative regions, centered crop. <b>Quality remains open:</b> likeness/eyes/lip line are visible; nostril distinction, nose volume, separate upper/lower lips and crossing texture remain weak. Do not promote based on global error alone. Physical assembly and real-device acceptance are open.</p><div class="row ordinary">${["Source crop", "Exact target", "Complete sequence"].map((label, j) => `<figure><figcaption>${label} · native160</figcaption><img src="${["source", "target", "sequence"][j]}-160.png"></figure>`).join("")}</div><div class="row large">${["source", "target", "sequence"].map((label) => `<figure><figcaption>${label} · equally enlarged</figcaption><img src="${label}-160.png"></figure>`).join("")}</div>${Object.entries(
    result.crops,
  )
    .map(
      ([name, v]) =>
        `<h2>${name} · actual corrected pixels</h2><div class="row feature">${v.images.map((url, j) => `<figure><figcaption>${["Source", "Target", "Sequence"][j]}</figcaption><img src="${url}"></figure>`).join("")}</div>`,
    )
    .join(
      "",
    )}<p>${metrics.lines} connections incl. ${metrics.densityFit.routingConnections} routing; ${metrics.estimatedMeters.toFixed(3)} m thread; ${(Math.ceil(metrics.stockShortfallMeters * 10) / 10).toFixed(1)} m additional beyond600 m. Eight physical sweeps; stop ${metrics.stoppedReason}, optimum unproven. Full UI generation137.609s on this run; fit stage${(metrics.durationMs / 1000).toFixed(3)}s; memory tracked as caches, not claimed peak RSS. Provisional32/160 guards remain. Actual maxima:32 undirected chord repetitions /140 incident connections per nail. Cache peak22,910,664bytes; contrast storage5,322,380bytes; process peak RSS unmeasured.</p><p>${actions} assembly actions: ${metrics.lines} connections, ${starts} start included in ${knots} knots, ${colorChanges} color changes. Estimated ${minutes.toFixed(2)} minutes at8s/connection including wrap/reposition,20s/knot including cut,30s/color change. This is not measured customer time. No quality-equivalent actions-saving claim.</p><p>Hash <code>${project.instruction.sequenceHash}</code>. Zero transferred progress. <a href="portrait-guide.pdf">Matching PDF/template</a> · <a href="portrait-guide.json">Immutable project JSON</a> · <a href="portrait-guide.txt">Every ordered step</a> · <a href="/">Test website</a></p><p>Preserved preceding heart diagnostic (different crop/192 computation, same160 pins/0.1 mm):</p><img width="192" src="../shape-fit/physical.png"><p>No quality-equivalence simplification claim or physical capacity validation. Full roadmap remains open.</p>`;
  writeFileSync(folder + "/report.html", html);
  console.log(
    JSON.stringify({
      targetHash: result.targetHash,
      exactTarget: true,
      hash: project.instruction.sequenceHash,
      crops: result.crops.eyes.bounds,
    }),
  );
} finally {
  await browser.close();
}
