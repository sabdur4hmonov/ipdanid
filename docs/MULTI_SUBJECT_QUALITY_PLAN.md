# Ip Rasm: 1–3 people and general subjects — implementation plan

Updated 2026-10-13. Owner explicitly added recognizable one-, two- and three-person artwork, cars, dogs, ordinary objects and other subjects, and requested an exact analysis/implementation handoff. This extends the full product brief; it does not replace the remaining M0–M7 scope. Priority: likeness/buildability, then customer actions, then computation speed.

Preserve HEAD `2d0e39a427d0ef516ad3b6afde1d670cddce796e`, all working changes and private local evidence. No push, public upload, personal-image transmission, default material substitution or transferred assembly progress. Phone testing remains explicitly deferred. This document proposes implementation; it does not claim these categories are already quality-accepted.

## Findings from the actual code and evidence

| Finding | Evidence | Consequence / confidence |
| --- | --- | --- |
| Group detection is not limited to one face. | `face-detection.ts` requests 4 faces; `validPortrait` accepts legacy 2–8 face entries. | Three detected people can exist in data. Claiming “no group support” would be false; reliable reconstruction remains unproven. |
| Manual creation only initializes two people. | `estimatedPairPortrait`, `App.tsx` `mark-two-faces`; `PeopleRegionEditor` only selects existing entries. | A missed third face has no practical add-person path. Confirming the current group marks every entry manual in one action. Need explicit per-person review, add/remove and stable IDs. |
| Groups use a different, more limited solver. | Worker rejects group strategies except continuous/guarded/simplify. App disallows group with resolution >192 or pin basis. | Groups cannot use the richer 320-pixel path. Changing a number or deleting guards would not implement a compatible optimizer. |
| The stronger optimizer assumes human anatomy. | `density.ts` requires enabled portrait, calls `anatomicalImportance` and one `portraitRegions`; new fine contrast rejects `people`. | General objects need a real subject-independent objective contract. Do not fake a portrait box for a car/dog. |
| Foreground processing assumes people. | `PersonBackground` starts enabled; Worker calls person segmentation; semantic cleanup reads label 15 (`person`). | Code-level risk of erasing dogs/cars/objects. Not yet demonstrated on a licensed category benchmark. Keep full original image for general subjects; human masks must not be silently reused. |
| Existing group weights are unions of region pixels. | `engine.ts` applies face/feature weights with `.some`. Individual measurements do exist in `regionMeasurements`. | Larger faces can contribute more aggregate error; there is no acceptance rule protecting every person independently. Preserve individual measurements and add per-person gates. |
| New algorithm registration was duplicated across renderers. | v16 appeared in canvas renderer but not PDF renderer. Visual PDF audit showed a darker vector fallback, despite correct steps/hash. | **Demonstrated software defect.** Now uses one exhaustive typed render-model map for canvas/PDF. New regression must compare decoded PDF RGB to the complete sequence raster, not just hashes. |
| More effort / more feature weight has not solved likeness. | Completed resolved 8+16=24; v16 control/fine comparison; fine 5/control 5 at identical 138,600 evaluations. | v16 is inconclusive/rejected for promotion. Nose/lips/hair remain weak. Preserve strongest previous reference; no automatic latest-result promotion. |
| Fine cross-face texture remains unrelated to true detail. | Common512,1.25mm probe: final fine nose contrast energy 26.68× target, correlation .0388; lips 3.46×, correlation .0530. | Quantifies excess high-frequency texture under this renderer. It does not prove nail geometry is incapable or establish physical appearance. |
| Geometry impossibility has not been established. | 27,720 legal chords checked with positive-density aggregate support bound; none of three tolerances failed. Known-feasible synthetic probe retained. | The aggregate bound is weak: passing is not per-pixel feasibility. Do not advertise a physical ceiling or change pins on this evidence. |

## Product flow to implement

Upload/camera → choose **People / Animal / Vehicle / Object / Keep full image** → inspect original and prepared image → choose circle/heart/rectangle and fit the subject(s) → review important regions → compute a recoverable preview → compare at normal/enlarged size → select immutable guide → exact player, saved progress and offline exports.

Human-face detection is a suggestion. The user can correct 1, 2 or 3 people even when the detector misses one. Each person has independent position, eyes, nose, mouth and optional head/hair outline. General subjects use a silhouette and user-marked important areas; they never display guessed human anatomy. Heart copy recommends two people when appropriate but accepts one or three and reports actual clipping/feature-size limits. A light background is recommended, not compulsory. No “guaranteed quality” score, invented facial/object detail, or source overlay.

Keep simple choices visible; algorithm versions, diagnostic metrics and experimental controls belong in advanced details. Preserve the original image locally and make preparation/crop reversible. Foreground removal for objects is off until explicitly selected and verified. Manual keep/erase correction works even without a usable automatic model.

## Ordered implementation and acceptance gates

### R0 — finish current correctness checkpoint first

1. Finish the PDF-render regression and rebuild shared web/APK assets. Verify pixel equality, all ordered steps, template numbering and zero new progress. Preserve failed PDF evidence separately.
2. Preserve current v16 experiment, control, checkpoints and decisions; no repeated 24-sweep or fine-feature fits. Update `FEATURE_CONTRAST_CHECKPOINT.md` and current status.
3. Keep the fixed group Continue and exact local-input archive. Rejection of changed target/profile/objective remains required. Keep new fresh-light `consistent-undershoot/1` recovery and all legacy compatibility tests.

Gate: final relevant tests/build/APK/export checks pass, honest open quality status and no changed old guide/progress. These checks are software correctness, not likeness acceptance.

### R1 — subject-safe input and immutable recipe (first new implementation task)

Introduce a versioned **subject plan**, separate from human portrait options:

```
SubjectPlan v1:
  kind: people | animal | vehicle | object | whole-image
  reference: processed-target/sample-centers-v1
  subjects: stable id, bounds/outline, reviewed importance regions
  preparation: original | explicit-person-mask | manual-subject-mask
  provenance: source revision, transform revision, review revision
```

Exact names are an implementation decision; the contract above is binding. Store it in the private recipe and immutable generated metadata. Use an explicit adapter for legacy `PortraitSettings`; do not rewrite old sequence hashes or require new metadata on old imports. Bind changes to target/checkpoint identity and invalidate stale results only for the edited variant. Canvas, Worker, measurements and exports consume one coordinate reference.

Decouple face analysis from background-mask application. Selecting vehicle/animal/object retains source pixels by default, skips person-only cleanup and offers manual foreground correction. A future automatic object model requires local availability, documented license/model hash, multi-object behavior and its own acceptance set; it is not a dependency for the manual path. Switching category must not silently erase corrections or reuse a person mask.

Tests: no-face car/dog/object fixtures retain original pixels; change subject while analysis is pending; stale mask/face responses cannot replace current photo; offline/manual fallback; original/undo; one photo's settings cannot leak into another.

### R2 — complete 1 / 2 / 3 person composition

Add, remove and reorder people with stable IDs; explicit count 1–3 in the main flow. Preserve legacy 4–8 imports without advertising tested quality beyond three. Add a third manually when only two are detected. Mark each person's regions reviewed independently; editing or moving that person's head invalidates the relevant review. Do not mark all faces verified just by viewing one.

Map source landmarks/regions through the existing crop/rotation/pan/zoom/aspect pipeline; preserve source references where available. Fit all selected silhouettes in circle/heart/rectangle, with individual clipping and physical feature-size warnings. Do not squeeze faces independently or distort proportions to make them fit. Show original and processed composition before any expensive job.

Tests: three faces, detector misses third, unequal sizes, touching/overlapping boxes, selection/reordering/deletion,180° photo, sideways photo, pan/zoom, touch handles, language changes, reload and variant-specific persistence. Real photographs are required for visual acceptance; synthetic faces only verify mechanics.

### R3 — unify the actual generation path

Extract subject-independent parts of the current optical fitter: legal chord basis, target/render operator, spatial weight field, physical contrast terms, guarded counts, routing, objective accounting and recovery. Supply reviewed people regions or generic object regions through adapters. Introduce a new algorithm/objective version; retain old engines/import/recovery exactly.

Groups must not silently downgrade to the current 192-pixel greedy route. Enable higher computation only after the generalized fitter supports the same immutable subject plan and renderer. No artificial face count allocation of thread. Use per-subject normalized contributions and explicit worst-subject review gates so a large clear face cannot hide a lost small face. Overlaps must not multiply weights accidentally. Cars/objects emphasize measured source silhouette/contrast and manually marked details; animals can use manually marked eyes/muzzle/fur, without calling human landmarks animal detection.

Do not create separate copies of every algorithm for people/cars/dogs. A capability registry should describe accepted subject kinds, color modes, shapes, sampling, continuation and render model. New unsupported combinations produce a specific explanation; they are never silently sent to another engine.

Tests: independent full-objective vs sparse gain, one/two/three region plans, unequal areas/overlap, dark/light mode, fractional physical distances, actual full routes, distribution limits throughout search/routing/refinement, deterministic checkpoint replay, cancel/reload, strict incompatible-state rejection and legacy exact hashes.

### R4 — testable quality work, not another arbitrary preset sweep

Before a new lengthy photograph fit, freeze a baseline manifest: original/target hashes, crop, materials, regions, exact guide, renderer and full objective. Include current owner photo and the preserved strongest older reference under its own different crop. Never compare different targets as if only an optimizer changed.

**First diagnostic:** compare fit graph vs routed sequence, region-wise coarse tone and physical contrast at the same reference, plus native preview and equally sized report images. The PDF bug is separate from the poor underlying portrait. Check source-detail weighting: quantify how much real nostril/lip gradient energy falls near the current cosine taper edges, and each term's share of the loss/gain. This determines whether the failed v16 term missed the relevant detail or was overruled; do not merely increase strength.

**Next isolated optimizer hypothesis:** if genuine feature contrast is being traded for crossing texture, constrain local excess tone/contrast against one fixed complete reference. Freeze per-eye/nose/lip/skin/hair guards before running. Start with a bounded candidate-selection prototype and an independent full reconstruction checker. Compare equal evaluation budgets against the unmodified objective. If routing is the source of the reversal, test degree-preserving local chord exchanges instead, without repeating the already completed v8 paired probes under a new name. If the objective/search still cannot achieve the features, only then run a separately labeled material/layout experiment with new actual coordinates and template.

Do not claim any proposed hypothesis is a working likeness fix until the controlled run and visual comparison demonstrate it. A changed physical material needs explicit identity, measured/estimated properties and supply status. An optimization graph is never an assembly instruction.

### R5 — representative acceptance set and customer-work reduction

Minimum initial local acceptance matrix: 6 single-person photographs (different hair/skin/lighting/backgrounds),4 two-person,4 three-person,3 dogs,3 vehicles,3 ordinary objects. Include varied size/occlusion, white and patterned backgrounds, and heart/circle/rectangle coverage. This is an initial engineering set, not proof of universal quality. Record authorized local original or public license/source for every asset. Current owner original is available; screenshots of outputs are not source photographs. The owner's group original is not established by the pasted screenshot alone. Continue with procedural mechanics fixtures while obtaining legitimate representative originals; ask for the owner's exact group original only when that specific likeness test is actionable.

For every accepted candidate: show original crop, processed target and exact sequence at the same ordinary display size, plus enlarged important areas. People: both eyes, nose volume/nostrils, lip separation, hair/jaw and proportions **for each person**. Dogs: silhouette, each visible eye, muzzle/ears/fur structure. Cars: silhouette, wheel placement, windows/lights and proportions. Objects: silhouette, marked detail and shading. Numeric summaries alone cannot accept a result.

Fixed screening rule for a candidate/simplification: no regional tone or physical-contrast residual worsens beyond max(2% of reference metric,0.0001); light-tone excess rise ≤1/255. These are engineering screens, not proven perceptual thresholds. Any visible likeness loss rejects the change; any intentional exception is explicitly documented. A small face cannot be excluded from the gate. Compare the full routed sequence, and store evaluations outside immutable guide data with reviewer/decision/version.

Only simplify the selected quality reference. Evaluate removal/replacement with every connecting strand and physical action included. New hash/zero progress; no accumulated tolerances across variants. Report connections, starts, knots, color changes, thread, supply shortfall, and assembly minutes under the same disclosed assumptions. Preserve stronger guide when fewer actions weaken recognizable detail.

### R6 — product acceptance after digital evidence

Run browser/touch/UZ-RU-EN-UZ Cyrillic flows: upload/camera, correction, subject selection, generation stages/cancel/recovery, comparison, selection, player, progress, offline PDF/PNG/TXT/JSON and import. Assert pixel/sequence consistency as well as labels/hashes. Rebuild Android whenever shared code changes. Real Android is deferred by owner; later verify update without data loss, memory/time, background/resume, offline exports and audio. iOS requires separate Apple build/device/signing work.

After a candidate is worth assembling, perform an actual trial: nail wrapping/tension/capacity, real thread consumption, breaks/knots, portrait/object likeness at viewing distance.32 chord /160 incidence remain provisional safeguards, not proven nail capacity. Then complete long-guide usability, customer/session/code/progress/support, commerce/admin/provider activation and remaining engines/full roadmap. Credentials or physical/device inputs are requested only at the actionable dependency. No production acceptance from a compiled APK.

## Exact next handoff

Read `FEATURE_CONTRAST_CHECKPOINT.md` and this plan. Verify HEAD/worktree without resets. Finish any explicitly marked R0 verification; then implement **R1 subject-safe input + immutable SubjectPlan**, with regression for object images passing through people-only preprocessing. Continue to R2 manual third-person/per-person review. Generalize solver only after those inputs are reliable. Do not run another current-photo sweep before R4 diagnostic explains what it tests. Preserve existing best/reference/simplified guides and all failed evidence. No background job, auto model switch, new chat, publication or scheduled work is configured by this plan.
