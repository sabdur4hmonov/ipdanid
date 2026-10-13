# Fine-feature contrast and multi-subject handoff — 2026-10-13

HEAD verified `2d0e39a427d0ef516ad3b6afde1d670cddce796e`; existing working edits preserved. Read `MULTI_SUBJECT_QUALITY_PLAN.md` for the owner's latest explicit request: analyze and prepare implementation for 1,2,3 people, cars, dogs and ordinary objects. Current digital quality, physical acceptance, real-device acceptance and full product completion remain OPEN. No push/photo upload or phone installation. This supersedes the running-state notes in `FEATURE_CONTRAST_IN_PROGRESS.md`; historical evidence remains.

## Implemented and diagnosed

- Added separately versioned `density-feature/16` / `source-feature-contrast/1`, opt-in only, preserving the fixed target/crop/materials/reviewed regions. Actual source gradients at1.25mm in smooth reviewed nose/mouth windows add a fine contrast term to the unchanged resolved physical objective. No image synthesis, source overlay, edge drawings or material substitution. Fractional sample-center distances and exact sparse/full objective checks at64/160/320.
- Worker/import/render/archival/continuation metadata supports the new objective. Old budgets/checkpoints are never relabeled. Completed fit retained and strict incompatible input rejected. Experimental result button localized UZ/RU/EN/Cyrillic.
- Fixed the independently reproduced **fresh light non-basis initial-objective recovery inconsistency** through explicit `consistent-undershoot/1` metadata. New initial loss, deltas, checkpoint binding and replay agree. Both normal/exchange checkpoint payloads carry the policy. Old incompatible state remains rejected instead of forged. Dark/basis legacy computation unchanged; this was not the cause of the owner's dark portrait.
- Found a second demonstrated defect during PDF visual review: v16 was absent from a duplicated PDF renderer allowlist and fell back to much darker vector lines, even though the guide hash/steps were correct. Replaced canvas/PDF lists with exhaustive typed `render-model.ts`. New browser regression decodes PDF RGB and compares every pixel to the exact complete native sequence raster. Failed PDFs preserved as `*-guide-before-render-fix.pdf`. This defect is separate from underlying portrait quality.

## Completed controlled experiment — do not rerun

Folder `output/feature-contrast`, runner `scripts/portrait-feature-experiment.ts`. It skips sealed outputs and writes genuine per-sweep recovery. Original target320 SHA`1d06c780d790a1554daf646c888824d2ae7f2ad97140c7b707239b16a9c727fa`; same original/crop/preprocessing as the preceding resolved experiment.400mm circle,240 unrotated pins,.1mm thread,.85 opacity, same actual colors,7.5° minimum angular gap,32 chord/160 incidence safeguards.

Both new refinements started from the **complete** prior24-sweep guide including all54 routes, hash`8d1f2dd8f3424a0d23c7bb09240228e447ebab8fb9b520310e636ac9873c8323`. Each had a new8-sweep maximum; neither reran the completed old8/24 search nor pretended its routed guide was the saved old fitting graph.

| Variant | Actual sweeps / evaluations | Connections / routing | Thread m | Max chord / incident | Wall seconds / sampled RSS MiB |
| --- | --- | --- | --- | --- | --- |
| Preserved root24 | prior8+16=24 |1852/54|643.147|6/78|Prior checkpoint, not regenerated|
| Unchanged-objective control |5/138600, plateau|1850/49|644.190|6/78|659.062 /347.64|
| Fine objective matched snapshot |5/138600|1852/52|644.048|6/78|Part of fine run; snapshot materialization adds no fitting evaluations|
| Fine final |8/221760, plateau|1849/52|640.965|6/78|589.697 /331.63|

Complete new fitting wall1248.759s (20.81min), excluding creation of the preserved root, reporting and snapshot replay. Sequential host/JIT effects prevent claiming a speed improvement. Peak values are sampled process RSS, not proven instantaneous peak. Fit versus routed final objective: fine .0511083192 → .0512619787; control .0509779337 → .0511699151. Objectives differ; their absolute values cannot rank likeness.

Immutable hashes:

- control: `bc6c33a259d7fba22aad61f734fab71c42a83e62dc18c0ddcfe12a3c31b719b5`
- fine5: `97f5714e35f3d8c1d43aa02d2a38e0260d583cd5b7f0d9a7bf5dac3b50770db8`
- fine8: `4bd6e90bc8fb799d1072163d3aedc518e12be2c3378cf1881ae9187ac366da4d`

All new projects have zero transferred progress. Final1849 connections means1851 estimated actions,1 start included in2 knots,0 color changes;247.2min at8s/connection,20s/knot,30s/color change. Thread stock1200m is an entered estimate;0m computed shortfall under that estimate, not supplied or physically measured stock. All routing is included. Three fewer connections than the root is **not** an accepted quality-preserving simplification.

## Quality decision

**INCONCLUSIVE / rejected for default promotion.** Full ordinary-size and enlarged actual eyes/nose/lips/jaw inspected alongside source/target. Nose volume/nostrils, lip separation and hair remain weak; no clear likeness winner. Equal-evaluation5-sweep comparison is mixed. Common512 light-tone proxy decreases .0462108→.0457124 versus root, but fine8 nose/lip metrics are worse than control. Fine1.25mm gradient probe remains dominated by unrelated texture: nose26.68× target energy/correlation .0388; lips3.46×/.0530. These are model diagnostics, not physical quality scores.

Source/target/full-sequence images and41 full/crop panels: `http://127.0.0.1:5184/output/feature-contrast/report.html`. `comparison.json`, `feature-residuals.json`, `chord-support-audit.json` retain exact measurements. Both1280px/390px report checks decode41 images, no overflow/runtime errors. Native320 preview and the independent common512 evaluator are disclosed separately; all use the sequence. Do not interpret display-size differences as additional strands or source overlays.

Positive-density aggregate support diagnostic enumerated27720 legal chords. Minimum light/feature density ratios: eyes.34218,nose.47250,mouth.31271. None violated the coarse necessary bound at tone tolerances.02/.05/.1. **No geometry impossibility demonstrated.** Passing does not establish integer/route/per-pixel feasibility; this is not an optimized graph, guide or physical calibration. No material/layout change justified by this test alone.

Preserve old stronger reference `eeb26cf5539462c9d0321579f2025307ea0d94735d08e0ca5497ef3ec8ebc944` under its own different crop, all preceding v8/v9 references and simplified guides. No new simplification since no demonstrably stronger quality reference was selected.

## Verification and delivery

- Full163/163 tests across59 suites passed (`output/resolved-convergence/unit-feature.json`), including new fine sparse/full math and fresh-light replay. Final focused6/6 after exchange policy propagation (`final-focused-tests.json`).
-8/8 desktop/touch browser scenarios passed: real v16 Worker materialization reproduces exact hash/segments, altered target rejects with correct job association; exact guide/player/zero-progress/JSON/TXT exports; physical completed-state archival and group continuation/delete-preserving-progress. **Initial hash-only PDF export check missed the renderer defect**; do not present that run as PDF image acceptance.
- Initial PDF51 pages contains all1849 ordered steps and correct hash/progress; contact sheet, cover and last page visually inspected and exposed the darker cover. Final pixel-equality export regression and rebuild are tracked below.
- Production build passes, with existing chunk-size warnings. Initial new APK31 assets/signature passed and was not installed; final PDF correction rebuild tracked below. Prior archives preserved. No physical printing/assembly/device success claimed.

## Exact next task

Finish final PDF pixel regression/visual recheck/APK packaging, then execute **R1 in MULTI_SUBJECT_QUALITY_PLAN.md**: subject-safe input and immutable subject recipe. Proceed to manual third person and individual review, then generalized optimizer contract. Do not run another current-photo sweep until loss/gain and taper-coverage diagnostic explains the next hypothesis. Current group count data support does not establish visual quality on three people; object images must not pass silently through person-only masks. Phone remains deferred; iOS/providers/physical/full M0–M7 scope remains in the roadmap. No unattended job is scheduled.


## Final R0 completion

Final corrected PDF desktop/touch regression **2/2 passed**, including every decoded native320 RGB byte against the complete1849-strand sequence. Both51-page guides contain every ordered step and exact hash/zero progress. Final desktop pages all rendered; corrected cover inspected and now matches the optical preview. Initial darker PDFs remain separately preserved. Full163unit + final6focused coverage remains; source after those tests changes only shared renderer selection, covered by exhaustive TypeScript build and final actual exports. Final production build passed,1868modules; expected bundle-size warnings remain.

Android rebuilt after renderer correction;31 assets match dist byte-for-byte, no private photographs/reports packaged; signer unchanged8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90. Final APK `output/mobile/ip-rasm-feature-contrast-debug.apk`,35,937,798bytes, SHA`fc8f2b03398ced249eeb3887aa85e03b3e08f25ffd581cb0f1dad7af48725830`; instrumentation compiled, not executed on a device. Prior new build and old APKs backed up, not overwritten without preservation. Report now explicitly shows native320 separately from common512 evaluation;41 images decode at1280/390 without overflow/runtime errors.

**R0 complete. Exact next implementation is R1 in MULTI_SUBJECT_QUALITY_PLAN.md**, then R2. Current latest owner turn requested the analysis and plan for 1–3 people/general subjects; no claim those new capabilities are implemented. No computation job is running or scheduled.

Source preservation: 144 files in `working-source-and-plan-2026-10-13.zip`, SHA`5c0ac5c1d79aae75549e04b23f6492177552bf9537846149ce7eca97d264a6b4`. Manifest `output/feature-contrast/source-snapshot.json`; snapshot predates this appended note.
