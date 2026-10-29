import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { benchmark, fixtureRoot } from "./benchmark";
const destination = "docs/P16_1B_BENCHMARK.md";
if (existsSync(destination))
  throw Error("Benchmark already frozen; do not overwrite");
const sha = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const rows = benchmark.map((c) => ({
  id: c.id,
  folder: c.folder,
  source: c.source,
  hashes: Object.fromEntries(
    [
      c.source,
      ...["options.json", "guide.json", "target.bin"].map(
        (f) => fixtureRoot + c.folder + "/" + f,
      ),
    ].map((p) => [p, sha(p)]),
  ),
}));
writeFileSync(
  destination,
  `# P16.1-B frozen benchmark\n\n2026-10-29, frozen before candidate execution. Eight existing accepted portrait **cases**, four distinct source files; repeated shapes/caption/pair are not eight independent people. The pair control already contains a synthetic composite; its original source is the existing gallery source, not a newly uploaded photograph. All private images and generated results remain ignored.\n\nBaseline: archived accepted classic-greedy/3 plus the unchanged preparation9/10 selection; prep10 is used only where it was actually selected. Framing, captions, masks, pin coordinates, sector labels and material remain identical. The original target.bin is the safety reference for all candidates. Selected prep10 solver input is reconstructed with unchanged sourceMidcontrast and verified against the archived guide imageHash.\n\n## Frozen input manifest\n\n\`\`\`json\n${JSON.stringify(rows, null, 2)}\n\`\`\`\n\n## One fixed trial, three research options\n\nA: p16-1b/feature-finish/1. First2550 connections exactly the accepted greedy path; final450 use a spatial objective weight1+3*featureMask, while preserving original Float32 residual/dose and all guards. Fixed soft anatomical masks are registered to the archived reviewed face boxes: bridge, tip/nostrils, eyes, mouth. These are face-relative landmark proxies, not newly measured nostril keypoints. No feature geometry is synthesized into the image.\n\nB: p16-1b/masked-xdog/1. Selected solver target plus a fixed XDoG line layer only within soft nose/eye masks: sigma1.0, ratio1.6, tau0.98, epsilon-0.015, phi10, strength0.18. Background, mouth and unmasked pixels unchanged. No parameter search.\n\nC: p16-1b/alternating-front/1. Replace the requested post-greedy swap because commit c778607 (docs/ROUTE_TWO_OPT_PLAN.md) already tested continuous degree-preserving two-edge removal/addition with256 tentative swaps and0 retained; commit7ba598a also tested vertex replacement (docs/PHYSICAL_ROUTE_QUALITY_CHECKPOINT.md). Instead grow a continuous route alternately from its two ends, scoring only one end per iteration under the unchanged greedy objective. This changes the construction order without swaps, beam search, extra connections or changed material. No prior alternating-front implementation found.\n\nA differs from earlier full-fit feature weighting (docs/FEATURE_CONTRAST_CHECKPOINT.md) by its exact85% unchanged prefix and objective-only late pass. B differs from the global positive source DoG in77d5c9b by a nonlinear signed XDoG layer restricted to the nose/eyes. No exact prior A/B trial found.\n\n## Predeclared safety and timing\n\nExactly240 pins,3000 connections, minGap25, no repeated undirected chord, degree<=160, unchanged Square weave/axis and shape guards; deterministic. Exact unchanged physical renderer at1000px, black0.12mm/opacity0.9. No promotion.\n\nDisqualify globally if mean whole-face viewing-SSIM falls more than0.01 below baseline; each case contributes its mean over people, then cases are equally weighted. Also disqualify for any person's eyes or mouth dropping more than0.02SSIM, or clearly worse eyes/mouth on equal-scale visual review. This operationalizes 'clearly worse'; SSIM is not a likeness ranking or an improvement requirement. Report all outcomes, including failures, privately.\n\nRuntime includes selected-target preparation, geometry construction, fit and1000px physical rendering, excludes PNG encoding and QA scoring equally for every option. Baseline uses the unchanged current production entry point and its original preparation selection; candidates perform one fixed fit, without timing credit for nonexistent swaps. Record cold timings plus same-shape shared-geometry fit times separately. Disqualify if total exceeds1.5x current per-case time. RAM>=1.5GiB before each heavy case; one heavy job at a time.\n\nBlind review: independently shuffled random letters per case, no candidate IDs, metrics or mapping in the HTML or asset filenames. Separate key.json is never linked/served. Original source plus equal-scale physical renders and same-scale nose crops. Disqualified options omitted; baseline stays. Stop after the milestone and owner vote instructions.\n`,
  { flag: "wx" },
);
console.log("Frozen eight-case benchmark; no candidate fit executed.");
