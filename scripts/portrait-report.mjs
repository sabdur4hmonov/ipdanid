import { readFileSync, writeFileSync } from "node:fs";
const dir = "output/portrait",
  read = (name) => JSON.parse(readFileSync(`${dir}/${name}.json`, "utf8"));
const initial = read("initial"),
  before = read("prepared-baseline"),
  after = read("prepared-v4"),
  fineBefore = read("zoom-thin240-baseline"),
  fineAfter = read("zoom-thin240-v4"),
  actual = read("browser-evidence");
const comparison = (a, b) =>
  Object.keys(a.regions)
    .map(
      (name) =>
        `<tr><th>${name}</th><td>${a.regions[name].mse.toFixed(5)} → ${b.regions[name].mse.toFixed(5)}</td><td>${(100 * (1 - b.regions[name].mse / a.regions[name].mse)).toFixed(1)}%</td><td>${a.regions[name].edgeMse.toFixed(5)} → ${b.regions[name].edgeMse.toFixed(5)}</td></tr>`,
    )
    .join("");
const card = (src, title) =>
  `<figure><img src="${src}" alt="${title}"/><figcaption>${title}</figcaption></figure>`;
const description = (data) =>
  `${data.instruction.metrics.lines.toLocaleString("en")} connections · ${data.instruction.metrics.estimatedMeters.toFixed(1)} m · ${(data.durationMs / 1000).toFixed(1)} s`;
writeFileSync(
  `${dir}/report.html`,
  `<!doctype html><meta charset="utf-8"><title>Ip Rasm — local portrait evidence</title><style>body{max-width:1200px;margin:40px auto;padding:0 24px;background:#f8f6ef;color:#253d33;font:16px/1.6 system-ui}h1,h2{line-height:1.2}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}img{width:100%;display:block;background:#eee}figure{margin:0}figcaption{font-size:14px;padding:12px 0}table{border-collapse:collapse;width:100%}th,td{padding:8px;text-align:left;border-bottom:1px solid #ccc}code{overflow-wrap:anywhere;font-size:12px}section{margin:40px 0}.note{padding:16px;background:#e8eee6}@media(max-width:700px){.grid{grid-template-columns:1fr}table{font-size:11px}}</style>
<h1>Ip Rasm: local portrait evidence</h1><p>The exact supplied photo was processed locally. These previews contain only the immutable nail sequences, without photo overlays. They are averaged optical simulations; no physical likeness claim is made.</p>
<section><h2>Reproduced initial failure</h2><div class="grid">${card("source.jpg", "Exact original photograph")}${card("initial-target.png", "Original crop / target, 160 × 160")}${card("initial-preview.png", "Existing /3 sequence: " + description(initial))}</div><p>Stopped at no-improvement before the 1,400 requested lines. Its 352.6 m requirement was below the 1,200 m entered stock. Stock was not the limiting cause in this run.</p></section>
<section><h2>Same prepared target and materials</h2><p>400 mm circle, 120 pins, 0.3 mm thread, opacity 0.85. Crop panY 0.12, background 0.85, local contrast 0.5; manually placed face-relative measurement bands. Both algorithms consume the identical pixel target.</p><div class="grid">${card("prepared-v4-target.png", "Exact shared target")}${card("prepared-baseline-preview.png", "Legacy /3: " + description(before))}${card("prepared-v4-preview.png", "Face-weighted /4 + path refinement: " + description(after))}</div><table><tr><th>Region</th><th>MSE before → after</th><th>Reduction</th><th>Edge MSE before → after</th></tr>${comparison(before, after)}</table><p>Global RGB MSE increased from ${before.instruction.metrics.reconstructionMse.toFixed(5)} to ${after.instruction.metrics.reconstructionMse.toFixed(5)} while facial errors improved. Nose/mouth remain faint. These errors are not human likeness scores.</p></section>
<section><h2>Separate material and crop experiment</h2><p>240 pins, 0.1 mm thread, same 400 mm board and opacity; zoom 1.3. Both results below share this target. This requires different materials, not a software-only improvement over the original setup.</p><div class="grid">${card("zoom-thin240-v4-target.png", "Exact shared target")}${card("zoom-thin240-baseline-preview.png", "Legacy /3 at its 3,000 cap: " + description(fineBefore))}${card("zoom-thin240-v4-preview.png", "/4 beyond the old cap: " + description(fineAfter))}</div><table><tr><th>Region</th><th>MSE before → after</th><th>Reduction</th><th>Edge MSE before → after</th></tr>${comparison(fineBefore, fineAfter)}</table><p>Face-outline edge error worsened in this comparison. More lines do not improve every region. Refinement reached a computation ceiling, not a proven optimum.</p></section>
<section><h2>Actual production website flow</h2><p>${actual.metrics.lines} connections, ${actual.metrics.estimatedMeters.toFixed(1)} m; stock entered 600 m, additional estimated requirement ${Math.ceil(actual.metrics.stockShortfallMeters * 10) / 10} m. Generation ${(actual.generationMs / 1000).toFixed(1)} s on this Windows host. UI face top 0.18 differs slightly from the paired experiment's 0.175; do not mix their target metrics.</p><p>Actual Worker, exact target hash, saved confirmed step 5 after reload, and JSON/TXT/PNG/PDF exports while offline were verified. Native hardware and physical assembly were not tested.</p><code>Sequence SHA-256 ${actual.sequenceHash}</code><p><a href="browser-guide.json">JSON</a> · <a href="browser-guide.txt">TXT</a> · <a href="browser-guide.png">PNG</a> · <a href="browser-guide.pdf">PDF</a></p></section>
<p class="note">Remaining quality work: a broader consented portrait set, better weak nose/mouth reconstruction, balanced regional edge preservation, calibrated optical measurements and physical assembly. This is measured improvement on one photograph, not production validation.</p>`,
);
const continued = read("continued"),
  stage = continued.instruction;
const section = `<section><h2>Second bounded refinement stage</h2><p>Same pixels, crop and materials as the production-browser sequence. ${(continued.durationMs / 1000).toFixed(1)} s; ${stage.metrics.refinement.replacements} legal pin replacements; still ${stage.metrics.lines} connections. Estimated thread rises by ${(stage.metrics.estimatedMeters - actual.metrics.estimatedMeters).toFixed(1)} m to ${stage.metrics.estimatedMeters.toFixed(1)} m while eye/nose/mouth errors improve. Additional requirement against 600 m stock: ${(Math.ceil(stage.metrics.stockShortfallMeters * 10) / 10).toFixed(1)} m.</p><div class="grid">${card("replay-target.png", "Exact target remains identical")}${card("replay-preview.png", "Stage 1 immutable sequence")}${card("continued-preview.png", "Stage 2 immutable sequence")}</div><table><tr><th>Region</th><th>MSE stage 1 → 2</th><th>Reduction</th><th>Edge MSE stage 1 → 2</th></tr>${comparison({ regions: actual.metrics.regions.final }, { regions: stage.metrics.regions.final })}</table><code>Stage 2 SHA-256 ${stage.sequenceHash}</code><p><a href="continued-guide.json">Stage 2 project JSON</a> · <a href="continued-guide.txt">TXT</a> · <a href="continued-guide.png">PNG</a> · <a href="continued-guide.pdf">PDF</a>. Progress is reset to zero; the stage-1 confirmed steps belong only to its older hash. Stage 2 also reached a computation ceiling; global optimum is not established.</p></section>`;
writeFileSync(
  `${dir}/report.html`,
  readFileSync(`${dir}/report.html`, "utf8").replace(
    '<p class="note">',
    section + '<p class="note">',
  ),
);
console.log(`${dir}/report.html`);
