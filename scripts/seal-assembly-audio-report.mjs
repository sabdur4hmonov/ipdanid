import assert from "node:assert/strict";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";
const output = realpathSync("output"),
  destination = join(output, "phase15", "assembly-audio");
assert(
  !existsSync(destination),
  "Accepted audio evidence must not be overwritten",
);
const results = [];
for (const project of ["desktop", "mobile-browser"]) {
  const name = project === "desktop" ? "desktop" : "mobile";
  const stats = JSON.parse(
    readFileSync(
      `test-results/phase15-assembly-audio-${name}-final/report.json`,
      "utf8",
    ),
  ).stats;
  assert.equal(stats.expected, 3);
  assert.equal(stats.unexpected, 0);
  assert.equal(stats.skipped, 0);
  assert.equal(stats.flaky, 0);
  const source = realpathSync(`output/current-assembly-audio/${project}`);
  assert(source.startsWith(join(output, "current-assembly-audio") + sep));
  const data = JSON.parse(readFileSync(join(source, "result.json"), "utf8"));
  assert.equal(data.nativeMock, true);
  assert.equal(data.manualConfirmationOnly, true);
  assert.equal(data.defaultOffAfterRestart, true);
  assert.equal(data.locales, 4);
  results.push({ project, source, data, stats });
}
const unit = JSON.parse(
  readFileSync("test-results/phase15-assembly-audio-final-unit.json", "utf8"),
);
assert.equal(unit.numPassedTests, 23);
assert.equal(unit.numFailedTests, 0);
const native = readFileSync(
  "test-results/phase15-c18-client-native-final.log",
  "utf8",
);
assert(native.includes("BUILD SUCCESSFUL"));
mkdirSync(destination, { recursive: true });
let html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ip Rasm C18 assembly audio</title><style>body{font:17px/1.5 system-ui;max-width:1100px;margin:24px auto;padding:0 16px;background:#f5f7fa;color:#17324f}.row{display:flex;gap:16px;flex-wrap:wrap}img{max-width:100%;height:auto}figure{margin:12px 0;flex:1;min-width:250px;background:white;padding:12px;border-radius:12px}details img{max-width:450px}a{color:#17324f}</style><h1>C18 — opt-in native assembly audio</h1><p><strong>Native bridge mocks in real desktop/mobile Chrome, with a real isolated kit API. No real phone, lock-screen, audio-focus or six-hour device test is claimed.</strong> Native Java source and instrumentation source compile offline; actual Java request guards run in JUnit.</p><p>23/23 JS unit;3/3 native Java guard tests;6/6 current native-bridge UI outcomes. Four old offline assembly/native API outcomes remain a separate regression run. Existing solver/guides/confirmation hashes unchanged. Background mode defaults off, including after restart.</p>`;
for (const r of results) {
  const dir = join(destination, r.project);
  mkdirSync(dir);
  const names = [
    "background-paused-en.png",
    "background-control-en.png",
    "restart-cyrillic.png",
    "background-control-cyrillic.png",
    "retired-start-library.png",
    "result.json",
  ];
  for (const name of names) copyFileSync(join(r.source, name), join(dir, name));
  html += `<h2>${r.project}:3/3 passed (${(r.stats.duration / 1000).toFixed(1)}s)</h2><div class="row">`;
  for (const [file, label] of [
    [
      "background-control-en.png",
      "Explicit opt-in while native playback is paused",
    ],
    [
      "background-control-cyrillic.png",
      "After restart: mode off, Cyrillic copy",
    ],
  ])
    html += `<figure><img src="${r.project}/${file}" alt="${label}"><figcaption>${label}</figcaption></figure>`;
  html += `</div><p>Actual UI checked: default background pause; explicit native start; offline background index change and foreground reconciliation; pause preserves opt-in; restart restores a newer exact project/hash cursor17 without starting voice or confirming progress; four locales/overflow; late start retired on navigation; voice/language/pace changes require a new opt-in; engine error stops native mode without automatic restart.</p><details><summary>Full screens</summary>`;
  for (const name of names.filter(
    (n) => n.endsWith(".png") && !n.includes("control"),
  ))
    html += `<a href="${r.project}/${name}"><img src="${r.project}/${name}" alt="${name}" loading="lazy"></a>`;
  html += `</details>`;
}
html += `<p>Native capabilities: explicit foreground mediaPlayback service; local installed TTS or hashed ordered WAV assets; native MediaSession/notification actions; stale authority/session/request/epoch guards; focus/headphone pause and wake cleanup; non-restarting service; paused expiry. Native confirmed progress is never written. Owner phone/recordings and the final Phase15 APK are separate. C19–C26 remain open.</p></html>`;
writeFileSync(join(destination, "report.html"), html);
const files = {};
function visit(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    assert(!e.isSymbolicLink());
    const file = join(dir, e.name);
    if (e.isDirectory()) visit(file);
    else
      files[relative(destination, file).replaceAll("\\", "/")] = createHash(
        "sha256",
      )
        .update(readFileSync(file))
        .digest("hex");
  }
}
visit(destination);
writeFileSync(
  join(destination, "manifest.json"),
  JSON.stringify(
    {
      nativeMock: true,
      ownerPhotoUsed: false,
      uiCases: 6,
      unitCases: 23,
      javaCases: 3,
      files,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({ destination, files: Object.keys(files).length, uiCases: 6 }),
);
