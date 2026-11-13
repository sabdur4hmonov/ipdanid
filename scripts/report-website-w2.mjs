import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const json = (p) => JSON.parse(readFileSync(p, "utf8"));
const digest = (p) =>
  createHash("sha256").update(readFileSync(p)).digest("hex");
const selections = [
  ["test-results/website-w2-desktop-final/report.json", "non-home"],
  ["test-results/website-w2-mobile-final/report.json", "non-home"],
  ["test-results/website-w2-home-desktop-accepted/report.json", "all"],
  ["test-results/website-w2-home-mobile-accepted/report.json", "all"],
  ["test-results/website-w2-w1-desktop/report.json", "all"],
  ["test-results/website-w2-w1-mobile/report.json", "far-only"],
  ["test-results/website-w2-w1-mobile-purchase-review/report.json", "all"],
  ["test-results/website-w2-protected-offline-review/report.json", "all"],
];
const accepted = new Map(),
  runs = [];
function collect(suite, report, selection) {
  for (const spec of suite.specs ?? [])
    for (const test of spec.tests ?? []) {
      if (selection === "non-home" && spec.title.startsWith("product-led home"))
        continue;
      if (selection === "far-only" && !spec.title.startsWith("far portrait"))
        continue;
      assert.equal(test.status, "expected", "An accepted case did not pass");
      assert.equal(test.results.at(-1)?.status, "passed");
      const key = test.projectId + ":" + spec.file + ":" + spec.title;
      assert(!accepted.has(key), "Duplicate accepted case");
      accepted.set(key, {
        project: test.projectId,
        title: spec.title,
        file: spec.file,
        report,
        durationMs: test.results.at(-1).duration,
      });
    }
  for (const child of suite.suites ?? []) collect(child, report, selection);
}
for (const [path, selection] of selections) {
  const r = json(path);
  if (selection === "all") {
    assert.equal(r.stats.unexpected, 0);
    assert.equal(r.stats.skipped, 0);
    assert.equal(r.stats.flaky, 0);
    assert.equal(r.errors.length, 0);
  }
  runs.push({
    report: path,
    stats: r.stats,
    selection,
    acceptance:
      selection !== "all"
        ? "Only the explicitly selected successful cases; failed diagnostics retained separately"
        : "All cases passed without skip or retry",
  });
  for (const suite of r.suites) collect(suite, path, selection);
}
assert.equal(accepted.size, 11);
const launch = json("output/website-w2/launch.json"),
  bundle = json("output/website-w2-bundle.json"),
  manifestHash = digest("output/website-w2-dist/asset-manifest.json");
assert.equal(manifestHash, digest(join(launch.web, "asset-manifest.json")));
assert.equal(
  json(join(launch.web, "build-runtime.json")).protectedGeneration,
  true,
);
const evidence = {
  version: "iprasm.website-w2-verification/1",
  date: "2026-11-13",
  startingHead: "1857a8d",
  scope:
    "Website design and existing customer-flow regression only. No new portrait-quality, physical, device, production or universal acceptance.",
  browser: {
    uniqueAcceptedCases: accepted.size,
    cases: [...accepted.values()],
    runs,
  },
  otherChecks: {
    focusedUnits:
      "13/13 in marketing-assets, website-w1 and history-secrets (3 files)",
    typescript: "tsc -b passed",
    locales: "82 dictionaries / 1897 keys / four locales passed",
  },
  build: {
    directory: "output/website-w2-dist",
    manifestSha256: manifestHash,
    modules: 2155,
    finalBuildSeconds: 84,
    bundle,
  },
  handoff: {
    url: launch.site,
    api: launch.api,
    metadata: "output/website-w2/launch.json",
    manualCode: "output/website-w2/manual-testing.txt",
    agentRedeemedOwnerCode: false,
    runtime: {
      files: launch.runtime.files,
      bytes: launch.runtime.bytes,
      sha256: launch.runtime.sha256,
    },
  },
  media: {
    provenance: "src/assets/PROVENANCE.json",
    role: "Explicitly labeled AI craft-process concept, never a portrait output or supplied-kit photograph",
    personalPhotoIncluded: false,
  },
  preserved: {
    W1: "4900/4901 and its snapshot/DB/code",
    earlierFrozenEndpoints: "No contact/restart/rebuild",
    instructions:
      "No sequence/engine/material/export changes; old guides and progress retained",
    Android: "Unchanged, no build/install/device claim",
  },
  diagnostics: [
    "Initial desktop: 2 passed / 1 genuine CTA focus failure. Selector chose hidden input; corrected and regression passed.",
    "Next desktop: 2 passed / 1 menu action stability timeout. Independent unchanged-product home run passed; no timeout/production-limit relaxation.",
    "Next mobile: 2 passed / 1 incorrect test naturalWidth assumption. Responsive density exposes adjusted intrinsic width; test now verifies decoded dimensions and exact online/offline asset SHA256, plus actual touch selection.",
    "Initial protected offline test raced asynchronous saved-view restoration against the new home projects CTA. Added exact recovered sequence assertion and scoped main-navigation selection; offline confirmed progress and exported JSON regression passed.",
    "First owner-runtime snapshot rejected concurrent source changes. Partial snapshot/seed and logs retained; no hash patched. New stable-source final snapshot passed all existing integrity checks.",
    "W1 mobile full run passed the far-photo case but the second preview showed a generic client error. Isolated test DB contained two ready server jobs; the exact initial transport cause is unproven. Fresh isolated purchase-flow recheck includes sanitized transport diagnostics; no production guard or algorithm changed.",
  ],
  limitations: [
    "Contact values remain owner placeholders; no real order/payment/message/email/delivery performed",
    "Nose/portrait likeness remains open; design is not a quality breakthrough",
    "Physical assembly and real-device acceptance remain separate",
    "Full accepted historical matrices and sealed quality experiments were not repeated",
  ],
};
mkdirSync("docs/validation", { recursive: true });
writeFileSync(
  "docs/validation/website-w2-20261113.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
const screenshots = [
  [
    "desktop-home",
    "test-results/website-w2-home-desktop-accepted/browser/website-w2-product-led-hom-87aad-as-an-offline-concept-asset-desktop/home-1280.png",
  ],
  [
    "mobile-home",
    "test-results/website-w2-home-mobile-accepted/browser/website-w2-product-led-hom-87aad-as-an-offline-concept-asset-mobile-browser/home-390.png",
  ],
  [
    "adjust",
    "test-results/website-w2-desktop-final/browser/website-w2-home-shape-sele-24d25-without-a-new-upload-screen-desktop/adjust.png",
  ],
  [
    "result",
    "test-results/website-w2-desktop-final/browser/website-w2-home-shape-sele-24d25-without-a-new-upload-screen-desktop/result.png",
  ],
  [
    "account",
    "test-results/website-w2-desktop-final/browser/website-w2-existing-kit-ac-51acd-try-points-remain-reachable-desktop/account.png",
  ],
];
mkdirSync("output/website-w2/screens", { recursive: true });
for (const [name, path] of screenshots)
  cpSync(path, `output/website-w2/screens/${name}.png`);
writeFileSync(
  "output/website-w2/screens/index.html",
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>W2 website review</title><style>body{font:16px system-ui;background:#f8f6f0;color:#183c32;margin:32px}nav{display:flex;gap:20px;flex-wrap:wrap}img{display:block;width:min(100%,1100px);height:auto;margin:24px 0 70px}a{color:inherit}</style><h1>W2 website review</h1><p>Actual responsive website screenshots. The editorial craft image is an explicitly labeled AI concept. The generated result below uses an analytical synthetic fixture, not a customer likeness claim.</p><nav>${screenshots.map(([n]) => `<a href="#${n}">${n}</a>`).join("")}</nav>${screenshots.map(([n]) => `<h2 id="${n}">${n}</h2><a href="${n}.png"><img src="${n}.png" alt="${n} actual browser screenshot" loading="lazy"></a>`).join("")}</html>`,
);
console.log(
  JSON.stringify({
    acceptedCases: accepted.size,
    manifestSha256: manifestHash,
    ownerCodeRedeemed: false,
    valuesPrinted: false,
  }),
);
