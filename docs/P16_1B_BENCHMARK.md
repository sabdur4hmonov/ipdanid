# P16.1-B frozen benchmark

2026-10-29, frozen before candidate execution. Eight existing accepted portrait **cases**, four distinct source files; repeated shapes/caption/pair are not eight independent people. The pair control already contains a synthetic composite of synthetic-1 and synthetic-2 (both source hashes frozen below); both original sources are shown for that case. No newly uploaded photograph. All private images and generated results remain ignored.

Baseline: archived accepted classic-greedy/3 plus the unchanged preparation9/10 selection; prep10 is used only where it was actually selected. Framing, captions, masks, pin coordinates, sector labels and material remain identical. The original target.bin is the safety reference for all candidates. Selected prep10 solver input is reconstructed with unchanged sourceMidcontrast and verified against the archived guide imageHash.

## Frozen input manifest

```json
[
  {
    "id": "portrait-01",
    "folder": "combined-original-20261027-desktop-circle",
    "source": "output/quality-original-20261026/source.jpg",
    "hashes": {
      "output/quality-original-20261026/source.jpg": "b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4",
      "output/quality-original-20261026/combined-original-20261027-desktop-circle/options.json": "8a213b632152401f560ce8354d71782071a263da0fc9b73efd0ceb9ec17d42d5",
      "output/quality-original-20261026/combined-original-20261027-desktop-circle/guide.json": "759945867461732f68ae353ab298138ae4dc77836113c8c2c7b4e9917ddf6318",
      "output/quality-original-20261026/combined-original-20261027-desktop-circle/target.bin": "db1244e8416f02f1b89c40ebcd6ee509b84fc369c638d1b9e2811a25d7cc9832"
    }
  },
  {
    "id": "portrait-02",
    "folder": "recheck-original-20261027-desktop-square",
    "source": "output/quality-original-20261026/source.jpg",
    "hashes": {
      "output/quality-original-20261026/source.jpg": "b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4",
      "output/quality-original-20261026/recheck-original-20261027-desktop-square/options.json": "abc7e0ecbe3474538883a8e64a06d0d6de452f89b8b1484241a62e7988e402b5",
      "output/quality-original-20261026/recheck-original-20261027-desktop-square/guide.json": "c8d54216eec6f9cc467e1aa360e9081fccb7ff62fea15352675c52f141cd536d",
      "output/quality-original-20261026/recheck-original-20261027-desktop-square/target.bin": "e81408f1abe0b8e5381db48df1b7012471ffdc6b32f0b4cef78a59cd67d09c7e"
    }
  },
  {
    "id": "portrait-03",
    "folder": "combined-original-20261027-desktop-heart",
    "source": "output/quality-original-20261026/source.jpg",
    "hashes": {
      "output/quality-original-20261026/source.jpg": "b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4",
      "output/quality-original-20261026/combined-original-20261027-desktop-heart/options.json": "c892a163b44e387deb1a0d1eb2eda5442d4e9b40b634f4e3216c0e5889bf02a2",
      "output/quality-original-20261026/combined-original-20261027-desktop-heart/guide.json": "f50fe231f1c9b453f0e62dec3bc5d40192204b20a3dbae44baa416ed02ff7988",
      "output/quality-original-20261026/combined-original-20261027-desktop-heart/target.bin": "16bf8a60c661512f1cca9661a81cc0907932c50172dde1d3f5654082358c6e61"
    }
  },
  {
    "id": "portrait-04",
    "folder": "combined-regression-20261027-desktop-synthetic-1",
    "source": "output/phase10/inputs/synthetic-1.png",
    "hashes": {
      "output/phase10/inputs/synthetic-1.png": "39b92face6fa0decab9497d592b5acdc4244e561fb0c918a9a51138dbeedb3cf",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-1/options.json": "42d5b1c0fb38a561bef6fe8c65da711108d5081cedcca61b4b20a04f7694a43d",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-1/guide.json": "f94854075c9b064304f4a5abc2f78d5e649734b177b6b44c24861b418ff0d954",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-1/target.bin": "b177be6885d5f917736c5b191181fca52134175c4de411a26c19366a6aa33401"
    }
  },
  {
    "id": "portrait-05",
    "folder": "combined-regression-20261027-desktop-synthetic-2",
    "source": "output/phase10/inputs/synthetic-2.png",
    "hashes": {
      "output/phase10/inputs/synthetic-2.png": "89ec0c59d913ac1ce05e2002a0b0b190d3ff793d93e990b1177a2a7ea016e464",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-2/options.json": "f901782508ab60c32bb81651dfff35a11940aca9a13bbbe81c7f9f51fc50f4f8",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-2/guide.json": "b8b3af00b45ef7a5306f8616ef4ae45691085e3bffc46d1a5e4ec9cb1c002721",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-2/target.bin": "96a33af1c2c88c31be1ed78e5507039f3ca7a248157b0e6f172a7a8067af131c"
    }
  },
  {
    "id": "portrait-06",
    "folder": "combined-regression-20261027-desktop-synthetic-3",
    "source": "output/phase10/inputs/synthetic-3.png",
    "hashes": {
      "output/phase10/inputs/synthetic-3.png": "9483d3248cf40118a6f574a9827ecf9a432a7fd8bbabefac90fb9d4a4a833501",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-3/options.json": "e9739d389641125ab065cab3d0e5cd80772457a7a900129ddb6165c71f6d28aa",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-3/guide.json": "4953aa360104d5707cbf6837025d1e83c723c21df88ffe5493eb6fde65563c7a",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-3/target.bin": "ed202f3f8d889a27a6de1cdd8e52314330980a7308846d35bdde3a9fd052ac8b"
    }
  },
  {
    "id": "portrait-07",
    "folder": "combined-regression-20261027-desktop-synthetic-pair-heart",
    "source": "output/phase10/inputs/synthetic-1.png",
    "hashes": {
      "output/phase10/inputs/synthetic-1.png": "39b92face6fa0decab9497d592b5acdc4244e561fb0c918a9a51138dbeedb3cf",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-pair-heart/options.json": "b90bfd387134aa7a7765ed68c52fcdf7a92ceede9be6517458371cfff865e707",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-pair-heart/guide.json": "60dd80e26054104d423b57203ec7bb61bf428f0ce21bc813b69120c8bc227f68",
      "output/quality-original-20261026/combined-regression-20261027-desktop-synthetic-pair-heart/target.bin": "e635a896df7f6096e48c8ee72550c4d7e0c110a9f15ddadc8da653f1b545e98d"
    }
  },
  {
    "id": "portrait-08",
    "folder": "combined-regression-20261027-desktop-caption",
    "source": "output/phase10/inputs/synthetic-1.png",
    "hashes": {
      "output/phase10/inputs/synthetic-1.png": "39b92face6fa0decab9497d592b5acdc4244e561fb0c918a9a51138dbeedb3cf",
      "output/quality-original-20261026/combined-regression-20261027-desktop-caption/options.json": "391d8e7e490ebaead6b6600bd1e787c76203501fdc092791fb9d45375c928f34",
      "output/quality-original-20261026/combined-regression-20261027-desktop-caption/guide.json": "5347d916f05242998f0a637645eb671beeab9a79c14b77c6fc5e177593d56cb1",
      "output/quality-original-20261026/combined-regression-20261027-desktop-caption/target.bin": "46c7cb5df8858ef2a2dd161329b00f6753f372590c05b8aaf81b48ad622973af"
    }
  }
]
```

## One fixed trial, three research options

A: p16-1b/feature-finish/1. First2550 connections exactly the accepted greedy path; final450 use a spatial objective weight1+3*featureMask, while preserving original Float32 residual/dose and all guards. Fixed soft anatomical masks are registered to the archived reviewed face boxes: bridge, tip/nostrils, eyes, mouth. These are face-relative landmark proxies, not newly measured nostril keypoints. No feature geometry is synthesized into the image.

B: p16-1b/masked-xdog/1. Selected solver target plus a fixed XDoG line layer only within soft nose/eye masks: sigma1.0, ratio1.6, tau0.98, epsilon-0.015, phi10, strength0.18. Background, mouth and unmasked pixels unchanged. No parameter search.

C: p16-1b/alternating-front/1. Replace the requested post-greedy swap because commit c778607 (docs/ROUTE_TWO_OPT_PLAN.md) already tested continuous degree-preserving two-edge removal/addition with256 tentative swaps and0 retained; commit7ba598a also tested vertex replacement (docs/PHYSICAL_ROUTE_QUALITY_CHECKPOINT.md). Instead grow a continuous route alternately from its two ends, scoring only one end per iteration under the unchanged greedy objective. This changes the construction order without swaps, beam search, extra connections or changed material. No prior alternating-front implementation found.

A differs from earlier full-fit feature weighting (docs/FEATURE_CONTRAST_CHECKPOINT.md) by its exact85% unchanged prefix and objective-only late pass. B differs from the global positive source DoG in77d5c9b by a nonlinear signed XDoG layer restricted to the nose/eyes. No exact prior A/B trial found.

## Predeclared safety and timing

Exactly240 pins,3000 connections, minGap25, no repeated undirected chord, degree<=160, unchanged Square weave/axis and shape guards; deterministic. Exact unchanged physical renderer at1000px, black0.12mm/opacity0.9. No promotion.

Disqualify globally if mean whole-face viewing-SSIM falls more than0.01 below baseline; each case contributes its mean over people, then cases are equally weighted. Also disqualify for any person's eyes or mouth dropping more than0.02SSIM, or clearly worse eyes/mouth on equal-scale visual review. This operationalizes 'clearly worse'; SSIM is not a likeness ranking or an improvement requirement. Report all outcomes, including failures, privately.

Runtime includes selected-target preparation, geometry construction, fit and1000px physical rendering, excludes PNG encoding and QA scoring equally for every option. Baseline uses the unchanged current production entry point and its original preparation selection; candidates perform one fixed fit, without timing credit for nonexistent swaps. Record cold timings plus same-shape shared-geometry fit times separately. Disqualify if total exceeds1.5x current per-case time. RAM>=1.5GiB before each heavy case; one heavy job at a time.

Blind review: independently shuffled random letters per case, no candidate IDs, metrics or mapping in the HTML or asset filenames. Separate key.json is never linked/served. Original source plus equal-scale physical renders and same-scale nose crops. Disqualified options omitted; baseline stays. Stop after the milestone and owner vote instructions.

## Implementation and outcome addendum (after the frozen trial)

The frozen inputs, three recipes and safety thresholds above were not changed after measurement. The first C Square attempt failed its final-route guard: reversed left-end growth must evaluate directed DDA ties and Square crossing bins in final traversal orientation. This implementation defect was corrected; prior failed outputs remain private diagnostics. Completed A/B/baselines were not repeated.

The caption case exposed cold inverse-incidence cache overhead. A mathematically equivalent direct-score path with specialized weighted/unweighted loops was added; all three resulting full3000routes and every1000pxRGBA byte equal the original indexed results. Prior timings remain private, not overwritten. The final measured caption time passes1.5x for A and still fails for B/C. No target/recipe changes or timing substitution rescued a failure.

All three candidates fail at least one predeclared regional guard; B/C also fail the final caption runtime guard. They are excluded globally from the owner page. Consequently the page explicitly contains baseline-only rather than pretending that a one-choice display constitutes a blind comparative vote. Full comparisons and metrics are private; no winner or nose-fix claim. See P16_1B_MANAGER_REPORT.md. One requested milestone then STOP.
