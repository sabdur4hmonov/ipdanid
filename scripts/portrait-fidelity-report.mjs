import { readFileSync, writeFileSync } from "node:fs";
const dir = "output/fidelity",
  read = (n) => JSON.parse(readFileSync(`${dir}/${n}.json`, "utf8"));
const variant = process.argv[2] ?? "distributed-contours",
  before = read("baseline"),
  after = read(variant),
  i = after.instruction,
  m = read("measurements");
const old = JSON.parse(readFileSync("output/portrait/continued.json", "utf8"));
if (
  before.sequenceHash !== i.params.parentSequenceHash ||
  before.imageHash !== i.imageHash ||
  JSON.stringify(before.profile) !== JSON.stringify(i.profile)
)
  throw new Error("Comparison settings differ");
const rows = Object.keys(before.metrics.regions.final)
  .map((name) => {
    const a = before.metrics.regions.final[name],
      b = i.metrics.regions.final[name];
    return `<tr><th>${name}</th><td>${a.mse.toFixed(6)} → ${b.mse.toFixed(6)}</td><td>${a.edgeMse.toFixed(6)} → ${b.edgeMse.toFixed(6)}</td><td>${(100 * (1 - b.edgeMse / a.edgeMse)).toFixed(1)}%</td></tr>`;
  })
  .join("");
const tight = Object.entries(m.regions.baseline)
  .map(([name, a]) => {
    const b = m.regions[variant][name];
    return `<tr><th>${name}</th><td>${a.mse.toFixed(6)} → ${b.mse.toFixed(6)}</td><td>${a.edgeMse.toFixed(6)} → ${b.edgeMse.toFixed(6)}</td><td>${a.gradientCorrelation.toFixed(3)} → ${b.gradientCorrelation.toFixed(3)}</td><td>${(100 * a.darkExcessFraction).toFixed(2)}% → ${(100 * b.darkExcessFraction).toFixed(2)}%</td></tr>`;
  })
  .join("");
const trials = [
  "density-e1-s8",
  "density-e0-s24",
  "density-e0.35-s16",
  "shuffled-optical",
  "reroute-short",
  "rerouted-optical",
  "rerouted-contours",
  "balanced-contours",
  "distributed-contours",
]
  .map((n) => {
    const d = read(n),
      x = d.instruction;
    return `<tr><th>${n}</th><td>${x.metrics.lines}</td><td>${x.metrics.estimatedMeters.toFixed(1)} m</td><td>${(d.durationMs / 1000).toFixed(1)} s</td><td>${x.metrics.regions.final.nose.mse.toFixed(6)}</td><td>${x.metrics.regions.final.mouth.edgeMse.toFixed(6)}</td></tr>`;
  })
  .join("");
const card = (n, title) =>
  `<figure><img src="${n === "balanced-contours" ? variant : n}.png" width="320" height="320"><figcaption>${title}</figcaption></figure>`;
writeFileSync(
  `${dir}/report.html`,
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>Ip Rasm — portrait fidelity checkpoint</title><style>body{max-width:1350px;margin:32px auto;padding:0 24px;background:#faf8ef;color:#253d33;font:16px/1.6 system-ui}h1,h2{line-height:1.25}.grid{display:flex;gap:20px;flex-wrap:wrap}figure{margin:0;width:320px}figure img{width:320px;height:320px}figcaption{font-size:14px}.wide{width:100%;height:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:8px;text-align:left;border-bottom:1px solid #ccd2cc}code{font-size:12px;overflow-wrap:anywhere}.note{padding:20px;background:#e5eddf}section{margin:32px 0}</style>
<h1>Portrait fidelity: measured increment, quality acceptance still open</h1><p>The same original photograph stayed local. Identical crop (zoom 1.3, zero pan/rotation), 160 × 160 processed target, 400 mm circle, 240 pins, 0.1 mm thread, opacity 0.85, stock estimate 600 m. No physical material was substituted. Reconstructions contain only their immutable sequences, including routing strands.</p>
<section><h2>Source, target and reconstruction at the same scale</h2><div class="grid">${card("crop", "Exact source crop")}${card("target", "Exact processed target")}${card("baseline", "Preserved v4 stage-2 baseline")}${card("balanced-contours", "New globally rerouted variant")}</div><p>At ordinary display size the eyes and facial shading are cleaner. Nostril and lip separation remain weak. Enlarging the optical pixels does not add thread detail.</p><h2>Native 160 px display</h2><img class="wide" style="width:720px;max-width:100%" src="ordinary-comparison.png"><h2>Enlarged measured regions</h2><img class="wide" src="regions-comparison.png"></section>
<section><h2>Processed-target investigation</h2><p>The source crop still contains the features. Processing preserves eye/nose/mouth gradient correlation at approximately 0.993–0.995 and modestly increases contrast; the reconstruction is where contour agreement falls. These are manually fixed diagnostic windows, not detected landmarks. Cropping retains natural proportions, nostrils, both eyes and lips; the background remains partially visible around the face. No extra outlines were drawn.</p><p>Exact target SHA-256: <code>${i.imageHash}</code>. Original JPEG SHA-256: <code>${after.sourceHash}</code>. Full residual data, windows, bias, contrast and multiscale face errors: <a href="measurements.json">measurements.json</a>.</p></section>
<section><h2>Paired immutable sequences and material requirements</h2><table><tr><th></th><th>Baseline</th><th>New variant</th></tr><tr><th>Connections</th><td>${before.metrics.lines}</td><td>${i.metrics.lines}</td></tr><tr><th>Thread including wraps, waste and knots</th><td>${before.metrics.estimatedMeters.toFixed(3)} m</td><td>${i.metrics.estimatedMeters.toFixed(3)} m</td></tr><tr><th>Additional stock required</th><td>${before.metrics.stockShortfallMeters.toFixed(3)} m</td><td>${i.metrics.stockShortfallMeters.toFixed(3)} m</td></tr><tr><th>Measured stage time on this Windows host</th><td>${(old.durationMs / 1000).toFixed(1)} s for stage-2 refinement; prior generation was 101.5 s</td><td>${(after.durationMs / 1000).toFixed(1)} s for global optimization, reusing the baseline</td></tr><tr><th>Global RGB MSE</th><td>${before.metrics.reconstructionMse.toFixed(6)}</td><td>${i.metrics.reconstructionMse.toFixed(6)}</td></tr></table><p>The new time excludes earlier baseline generation. It is not a phone performance measurement. ${i.metrics.densityFit.removedConnections} strand removals and ${i.metrics.densityFit.routingConnections} added routing strands are included in the final path. It reached its eight-sweep computation ceiling, not a demonstrated optimum.</p><p>Baseline hash <code>${before.sequenceHash}</code><br>New hash <code>${i.sequenceHash}</code>. Its parent is the baseline; confirmed progress starts at zero. These are different projects. Do not splice the new instructions onto an assembly already started.</p></section>
<section><h2>Facial-band measurements</h2><p>RGB MSE and central gradient error use the existing proportional face bands. Lower errors do not establish human likeness.</p><table><tr><th>Region</th><th>MSE before → after</th><th>Edge error before → after</th><th>Edge error reduction</th></tr>${rows}</table><h2>Tighter manual windows</h2><p>Luminance measurements in the pixel windows listed in measurements.json. Dark excess is the fraction at least 0.08 darker than the target. Correlation is signed adjacent-pixel gradient agreement, not a quality score.</p><table><tr><th>Window</th><th>MSE</th><th>Edge MSE</th><th>Gradient correlation</th><th>Dark excess</th></tr>${tight}</table></section>
<section><h2>What the experiments demonstrated</h2><p>The log-density objective and lexicographic fitting produced washed-out details and nail fans. Deterministically dispersing candidate order removed the fan but the from-blank fit still lost detail despite 8,331 connections. Those candidates were rejected. Global reversible fitting initialized from the stronger v4 sequence improves contours; it can remove earlier dark strands, unlike append-only generation or the v4 refinement that only reroutes two adjacent edges. The new route is a connected Euler walk using legal connections. Continuity is restored with measured strands and explicit start/end knots.</p><p>The selected objective uses actual optical luminance residuals and adjacent contrast, weights manual facial bands, and protects light pixels more strongly from overshoot. It does not shorten strands as a quality target: boundary nails inherently create long chords through the face. Several multiscale residual measurements improved, but the optimizer does not yet include a new pyramid objective; v4 already has its coarse/fine loss.</p><table><tr><th>Trial</th><th>Connections</th><th>Thread</th><th>Stage time</th><th>Nose MSE</th><th>Mouth edge error</th></tr>${trials}</table></section>
<section><h2>Sequence-derived exports</h2><p><a href="balanced-contours-guide.json">New project JSON</a> · <a href="balanced-contours-guide.txt">TXT</a> · <a href="balanced-contours-guide.png">PNG</a> · <a href="balanced-contours-guide.pdf">Assembly PDF</a>. Ordered steps, knots, material allowance and preview refer to one hash; the photograph is absent from these exports. <a href="balanced-contours-pdf-evidence.json">PDF extraction evidence</a>.</p></section>
<p class="note">Remaining demonstrated limitation: mouth tonal contrast is still substantially weaker than the target, and the nose remains faint. Quality checkpoint is NOT complete. Next experiment: add matched multiscale local-contrast residuals (2 and 4 px neighborhoods) to reversible fitting, measure their gain separately from raw edge noise, and compare against this same 160 px target/profile. Only then evaluate a separately labeled 192 px computation run without changing physical thickness or pins. Simulated quality is measured on one photograph; thread opacity, nail loading, knots, tension and physical portrait likeness remain unvalidated. No production publication or mobile device test is claimed.</p></html>`,
);
const route = read("route-diagnostics"),
  summary = `<section><h2>Chord placement and provisional winding guards</h2><p>The earlier unguarded prototype reaches 256 traversals of one chord and 247 visits to one nail; it is preserved as an experiment. The selected route has ${route.selected.maxSameChordTraversals} maximum chord repeats and ${route.selected.maxPinArrivals} visits to its busiest nail. The solver now guards at 32 repeats and 160 incident edges per nail. These are provisional distribution constraints, not measured physical winding capacities.</p><p>Mean chord length changes from ${route.baseline.meanChordMm.toFixed(1)} to ${route.selected.meanChordMm.toFixed(1)} mm; chords over 300 mm: ${route.baseline.chordsAbove300Mm} → ${route.selected.chordsAbove300Mm}. Cleaner shading therefore does not demonstrate that shortening strands alone is the answer. <a href="route-diagnostics.json">Exact route diagnostics</a>.</p></section>`;
writeFileSync(
  `${dir}/report.html`,
  readFileSync(`${dir}/report.html`, "utf8")
    .replaceAll("balanced-contours-guide", `${variant}-guide`)
    .replaceAll("balanced-contours-pdf-", `${variant}-pdf-`)
    .replace("actual optical luminance", "actual optical mean RGB tone")
    .replace(
      "Deterministically dispersing candidate order removed the fan but the from-blank fit still lost detail despite 8,331 connections.",
      "The dispersed-order trial lacked the fan, but also changed edge weight and sweep count; it does not isolate an ordering cause. That from-blank fit still lost detail despite 8,331 connections.",
    )
    .replace('<p class="note">', summary + '<p class="note">'),
);
console.log(`${dir}/report.html`);
const worker = read("worker-evidence"),
  pdf = read(`${variant}-pdf-evidence`),
  apk = JSON.parse(readFileSync("output/mobile/build-evidence.json", "utf8"));
if (
  worker.sequenceHash !== i.sequenceHash ||
  pdf.sequenceHash !== i.sequenceHash
)
  throw new Error("Verification evidence refers to another variant");
const verification = `<section><h2>Final verification</h2><p>Production build, 28 automated tests and fourteen browser checks pass. The production Worker reproduces this exact sequence offline in ${(worker.reportedStageMs / 1000).toFixed(1)} s, excluding creation of its reused baseline. PDF: ${pdf.pages} rendered/reviewed pages, all ${pdf.orderedSteps} ordered steps, confirmed zero and matching sequence hash. Android debug APK rebuilt; all ${apk.webAssetsVerified} assets byte-match the web build. Native device and physical validation remain unverified.</p><p><a href="worker-evidence.json">Worker evidence</a> · <a href="../mobile/ip-rasm-debug.apk">Android debug APK</a> · <a href="../mobile/build-evidence.json">APK evidence</a>. Nothing was pushed or published.</p></section>`;
writeFileSync(
  `${dir}/report.html`,
  readFileSync(`${dir}/report.html`, "utf8").replace(
    '<p class="note">',
    verification + '<p class="note">',
  ),
);
