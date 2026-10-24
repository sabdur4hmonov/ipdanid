// Audit saved experiments without generating another route or changing evidence.
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { validateInstruction } from "../src/core/validation";
import { connectionAllowed } from "../src/core/geometry";
import { squareChordExcluded } from "../src/core/classic-least-squares";
const names = [
  "heart-single",
  "owner-phase9-circle",
  "owner-phase9-square",
  "synthetic-1-circle",
  "synthetic-2-circle",
  "synthetic-3-circle",
  "synthetic-pair-heart",
];
const root = "output/physical-route-ssim-v4";
const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const rows = [];
for (const name of names) {
  const metrics = read(`${root}/${name}/metrics.json`);
  const route = read(`${root}/${name}/route.json`);
  const guide = await validateInstruction(
    read(
      name === "heart-single"
        ? "output/current-heart-repair-v2/desktop/heart/guide.json"
        : `output/phase13/desktop/${name}/guide-v3-3000.json`,
    ),
  );
  assert.equal(route.schema, "iprasm.research-route/1");
  assert.equal(route.parentHash, guide.sequenceHash);
  assert.equal(metrics.sourceSequenceHash, guide.sequenceHash);
  assert.equal(metrics.targetHash, guide.imageHash);
  const path: number[] = route.path;
  const parent = guide.segments[0].path;
  assert.equal(path.length, 3001);
  assert.equal(path[0], parent[0]);
  assert.equal(path.at(-1), parent.at(-1));
  const used = new Set<string>(),
    degrees = new Uint16Array(240);
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i];
    assert(
      Number.isInteger(a) &&
        a >= 0 &&
        a < 240 &&
        Number.isInteger(b) &&
        b >= 0 &&
        b < 240,
    );
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    assert(!used.has(key));
    used.add(key);
    assert(Math.min(Math.abs(a - b), 240 - Math.abs(a - b)) >= 25);
    assert(connectionAllowed(guide.profile, a, b));
    assert(!squareChordExcluded(guide.profile, a, b));
    degrees[a]++;
    degrees[b]++;
  }
  assert(Math.max(...degrees) <= 160);
  assert(metrics.candidate.all.ssim > metrics.old.all.ssim);
  assert.equal(metrics.candidate.faces.length, metrics.old.faces.length);
  metrics.candidate.faces.forEach((face: { ssim: number }, i: number) =>
    assert(face.ssim >= metrics.old.faces[i].ssim),
  );
  rows.push({
    name,
    metrics,
    guards:
      "3000 continuous chords; fixed endpoints; legal shape/minGap/unique chords/degree verified",
  });
}
const fmt = (n: number) => n.toFixed(6);
const verdict =
  "NOT PROMOTED: small metric gains, visible crossing haze remains, refinement alone takes 5.6–15.7 seconds. This does not meet the requested large clarity improvement or the total runtime gate.";
writeFileSync(
  `${root}/report.html`,
  `<!doctype html><meta charset="utf-8"><title>Bounded physical route quality audit</title><style>body{font:16px system-ui;max-width:1450px;margin:auto;padding:24px}section{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}img{width:100%}figure{margin:0}td,th{padding:8px;border:1px solid #ccc}table{border-collapse:collapse}p{line-height:1.5}</style><h1>Physical route quality audit — 2026-10-24</h1><p><strong>${verdict}</strong></p><p>Seven frozen historical targets, identical placement, exact pins, 0.12 mm thread, opacity 0.9. Independent 1000 px physical rendering. No overlay. These are not current free-placement UI acceptance tests. Timings exclude objective construction, original generation and final render. The app and old guides remain unchanged.</p><table><tr><th>Case</th><th>Face SSIM old → trial</th><th>Board SSIM old → trial</th><th>Refinement seconds</th><th>Changed vertices</th></tr>${rows.map(({ name, metrics: m }) => `<tr><td>${name}</td><td>${fmt(m.old.face.ssim)} → ${fmt(m.candidate.face.ssim)}</td><td>${fmt(m.old.all.ssim)} → ${fmt(m.candidate.all.ssim)}</td><td>${(m.elapsedMs / 1000).toFixed(3)}</td><td>${m.accepted}</td></tr>`).join("")}</table><p>Rejected preceding single-Heart trials: raw physical pixel loss face SSIM 0.662474 → 0.372548; area-averaged face loss → 0.627326; exact viewing tone loss → 0.652035. Lower tone error alone failed likeness. Do not rerun these sealed trials.</p>${rows.map(({ name, metrics: m, guards }) => `<h2>${name}</h2><p>${guards}. Each face: ${m.old.faces.map((f: { ssim: number }, i: number) => `${fmt(f.ssim)} → ${fmt(m.candidate.faces[i].ssim)}`).join("; ")}. White-area darkness ${fmt(m.whiteExcess.old)} → ${fmt(m.whiteExcess.candidate)}.</p><section><figure><img src="${name}/target.png"><figcaption>Frozen target</figcaption></figure><figure><img src="${name}/before.png"><figcaption>Current classic3 path</figcaption></figure><figure><img src="${name}/after.png"><figcaption>Research path; not shipped</figcaption></figure></section>`).join("")}<p>Review: synthetic faces retain strong strands over eyes/nose; Heart upper lobes remain grey. Owner Square retains historical profile13 weave artifacts. A minor numerical rise is not evidence that these defects are fixed. Owner sources remain local-only.</p>`,
);
writeFileSync(
  `${root}/audit.json`,
  JSON.stringify(
    { verdict, cases: rows.map(({ name, guards }) => ({ name, guards })) },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({ cases: rows.length, legalRoutes: rows.length, verdict }),
);
