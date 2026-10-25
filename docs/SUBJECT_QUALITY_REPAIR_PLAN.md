# Subject-safe cutouts and physical detail — owner rejection, 2026-10-24

The nine owner screenshots reject the 4213 result: missing nose detail in all three shapes, dense haze around a small/offset person or pair, and a cat almost completely erased by the person model. These are product failures, not resolved by unit-test counts. Keep 4213 and its snapshot frozen as the before reference. No source overlay, generative face reconstruction, automatic head crop, shoulder deletion or changed physical thread opacity is allowed to simulate a fix.

## Milestone 1: correct subject processing and discoverability

Confirmed source defect: CustomerStudio defaulted to `people`; its menu-only product selector discarded the source when changed. The cat reached SelfieMulticlass, whose categories are human hair/skin/clothes/accessories. Non-person modes previously fell back to border-colour heuristics rather than the already bundled semantic model.

Use pinned, local DeepLab-v3 for automatic semantic classification and animal/vehicle/object cutouts; refine actual people with the existing selfie model. Keep all selected foreground components. Explicit categories remain selectable on the main screen and can re-cut the current photo without resetting placement. If prediction is empty/fragmentary or the worker fails, keep the complete original for manual review instead of deleting an unknown object. Generated lettering bypasses segmentation; trim only its generated empty margins, retaining Arabic dots/diacritics and Unicode bidi shaping. Uploaded photos keep full-source composition.

Primary references checked 2026-10-24: [Google Image Segmenter model guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter) distinguishes human-only selfie categories from DeepLab cat/dog/general categories. [BiRefNet official repository](https://github.com/ZhengPeng7/BiRefNet) and [MIT license](https://github.com/ZhengPeng7/BiRefNet/blob/main/LICENSE) establish a possible later general high-resolution alternative, not measured superiority on our inputs. Do not download a large model, add a runtime, claim universal object recognition, or substitute a similarly named restricted checkpoint without a pinned browser/RAM/license benchmark. This milestone reuses existing packaged assets, adds no install or remote photo inference.

Acceptance: actual owner-supplied cat screenshot crop (local-only) must retain head/body and whiten a known background patch, explicit Animal re-cut must retain transform, unsupported input must remain intact, mixed Arabic/Latin must render joined glyphs with diacritics and reach the genuine sequence preview. Both desktop/mobile, person/free-placement regression, source/draft/worker unit checks and build. Actual string likeness is a separate gate.

## Milestone 2: determine and address missing physical detail

The retained owner-circle prepared target visibly contains the nostrils and nose contour. The segmentation repair alone cannot repair its string result. Compare prepared target, solver's accumulated additive density and exact 1000px physical render on the identical target/pins/material/path. Measure full face and fixed frontal-nose region as well as white-background excess; do not hide a worse nose behind a global SSIM increase. Current cat and lettering physical outputs must also be inspected, not just the masks.

One distinct bounded hypothesis: current /3 takes only the best immediate chord, which may enter a pin with poor subsequent choices. A research-only two-chord lookahead uses four first candidates/eight second candidates, exact residual-overlap correction and a sparse score cache. Same fixed3000,240pins,500grid,.12mm/.9, minGap25, unique chords, legal Heart paths, degree160 and current Square policy. No target, gamma, importance, opacity, line-budget or material sweep. First validate cached score deltas against independent full recomputation; render independently from the complete legal path. Do not label a research path as an old valid guide.

Predeclared first-case gate (owner Circle): face SSIM improves at least .02, frontal-nose SSIM at least .03; other fixed facial regions regress at most .005, white-region mean dark excess increases at most .01, complete initialization+route within15s. If the mechanism fails, record the failure and do not sweep beam widths/weights. If it passes, run unchanged on owner Square, synthetic single/pair Heart, cat and mixed lettering; require visible improvement at equal size and all legality/individual-subject gates before versioning a new production engine. Existing rejected log-target/sum-score/vertex-refinement/texture experiments stay closed.

## Handoff requirements

Keep a single exact next step, fixture locations/hashes, executed commands, real timings, report and acceptance verdict. A weaker implementation model should only be handed a verified mechanism and precise remaining changes; do not claim the portrait-quality problem is solved or recommend switching solely because scaffolding exists. Later versioning must cover Worker progress/cancel/checkpoint, validators/replay, exact player/PDF/JSON/TXT and old guide compatibility. Protected previews/data remain untouched; milestone commit/export scan/feature-only push before the next substantial stage.

## Source-contrast result and physical-build priority — 2026-10-25

The one predeclared source-derived sigma8-minus-sigma2 positive dark-band probe(.8,luminance<.98) was evaluated against the ORIGINAL unmodified target. Face .612201->.629525,nose .625123->.641253,eyes .657147->.681848,mouth .609024->.617911; white-region darkness .339017->.335621. Preparation162.58ms+route1423.52ms. It still fails the fixed+.02face/+.03nose gates; visible haze and weak nostrils remain. Reject default promotion; no scale/strength sweep. Local report output/source-midcontrast/owner-circle/report.html distinguishes solver input from evaluation target. No product engine/preparation/material/renderer change.

Final related26/26unit plus2/2launcher rejection tests,TSC/build2125/12.21s pass. Earlier actual8/8desktop/mobile remains applicable because later changes are research/launcher only. Accepted subject input/text fixes run at4214/API4654,frozen92file snapshot. Source/photos/reports stay uncommitted; no newAPK/full-browser/physical acceptance.

After the owner's physical-build pack is ready,the next quality action is read-only attribution on the existing frozen3000path at500/1500/3000steps: remaining legal chords' nose improvement versus outside/white damage and actual selected/global ranks; compare proposed additive gains to finite-difference exact1000px physical viewing-SSIM. No fitting/new path until this supports a distinct mechanism. Existing coarse-support bounds are not an impossibility proof and must not be repeated as one. No model downgrade recommendation for an unverified quality recipe.

## Milestone 2 result — 2026-10-25: rejected

Frozen owner Circle, exact original 3000 path reproduced by cached greedy control. Both directional DDA ULPs (12 chords) and reverse summation order matter; retain first-encounter orientation, Float32 target/residual rounding and direct recomputation near ties. Initial symmetric-circle test exposed these issues; corrected control now matches production for Circle, polished Square and Heart. Five tests pass (lookahead-final-unit-v4.json), TSC/build2125/21.89s pass. Independent audit checks unique legal chords, minGap25, degree160 and continuity. Original probe and arithmetic verification are retained separately; identical candidate path/metrics after correction.

| Metric | Original | 4x8 lookahead |
| --- | --- | --- |
| Face SSIM | .612201 | .611339 |
| Nose SSIM | .625123 | .613663 |
| Eyes SSIM | .657147 | .657359 |
| Mouth SSIM | .609024 | .624136 |
| White-region darkness | .339017 | .339871 |

Final initialization+route2.036s,106906670cachebytes, degree66. Runtime is Node research generation, not browser end-to-end. Real physical visual review confirms weak nose and crossing haze. **Reject; no production change, no beam-width or weighting sweep.** Local report: output/lookahead-physical-v1-arithmetic/owner-circle/report.html. scripts/chord-lookahead.ts and evaluate-lookahead.ts are research-only; research route cannot be imported as an old guide. Source/photo/report never committed.

Next bounded diagnosis: separate the current-pin routing restriction from chord-basis/image loss. Run exactly one globally best-chord selection with the same target, 3000 unique legal chords, .08/gamma1.6, exact profile/material and degree160. It is explicitly an UNROUTED GRAPH, not a continuous build or accepted preview. Same frozen regional metrics. If even this relaxed diagnostic loses nose detail, routing/lookahead is not a sufficient remedy; do not spend on an Euler-router implementation. If it materially clears the existing face/nose gates, plan a separately versioned continuous route with all real connector strands counted before any product promotion. No gain may be sold as assembly-ready until routing and multi-case acceptance pass.

## Continuity diagnostic result — 2026-10-25: insufficient

One3000chord globally greedy graph, same source/mean-LS/physical model/minGap/degree/unique guards. Face .612201->.620307, nose .625123->.625813, eyes .657147->.651010, mouth .609024->.624142; white excess .339017->.340328.1.832s,57.18MB cache, degree63, one connected component but122odd vertices: **not buildable as one route**. It fails the fixed face/nose/eyes gates even before routing. Do not implement a new router for this failed basis. Local output/global-chord-diagnostic/owner-circle/report.html explicitly labels the unrouted diagnostic, with no guide/export. Unit1/1, TSC/build2125/12.14s passed. Existing product unchanged.

Next fixed hypothesis follows the observed loss of nose contrast already inside the solver model: source-derived midscale dark-contrast preservation. This is a new PREPARATION probe, not a beam/gamma/material or feature-weight sweep. On the unchanged500px reviewed composition, compute positive `Gaussian(sigma8)-Gaussian(sigma2)` from the actual grayscale source; subtract0.8times that band from source luminance (clamped0..1), only where original luminance<.98. Constants fixed in advance. No face-landmark painting, invented nostrils, per-feature bumps or source overlay. Keep /3's gamma1.6,importance,3000chords and physical rendering identical. Evaluate against the ORIGINAL unmodified target and the SAME frozen regional gates, never the more contrasted solver input. Save both inputs separately. One ownerCircle probe; reject without strength/scale sweep if it fails. A pass requires unchanged multi-case ownerSquare/synthetic/pair/cat/lettering validation and a new preparation identity before any app promotion.
