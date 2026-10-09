# Portrait sampling and contour objective — 2026-10-09

Continues preserved `e778b00` in the isolated `codex/product-completion` checkout. Owner wants direct implementation, highest portrait quality first, fewer unnecessary assembly actions only with preserved quality, then speed. Existing guides, crops, templates and progress are preserved. No uploads, publication, pushes or background automation.

## Implemented product behavior

Before generation, UZ/RU/EN now shows the manually marked eye/nose/mouth windows' sample-center spans, usable sample fraction inside the selected board and 5th–95th percentile luminance range on the **exact current processed target**. Small windows, off-board windows and very low tonal range receive actionable advice. The shorter-side8px and tonal-range4% thresholds are explicitly heuristics, not detected anatomy, a blur classifier or a physical/likeness score. Warnings leave generation enabled. Inputs, target pixels, saved sequences and physical defaults are not rewritten. Resolution/shape/crop/edit changes update the diagnostic. A simple light background is advice, not a mandatory upload restriction.

Source and all experiments remain private local artifacts: SHA256 `b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4`,960×1280. No source/report/experimental float files are included in the website bundle or APK.

## Completed sampling audit

`scripts/sampling-audit.ts` reconstructs each preserved240-pin circle at319/383 sample centers, composites every real strand, then averages physical cell areas back to160/192. `core/optical-area.ts` is **evaluation only**; it is not used by the optimizer or product preview. Center alignment and nonlinear overlap have independent numerical tests. Targets, sequences and geometry stay unchanged.

| Preserved guide | Nose RGB gap RMS | Mouth RGB gap RMS | Native nose MSE | Area-average nose MSE |
|---|---:|---:|---:|---:|
| circle240 /160|0.001902|0.001896|0.001526617|0.001545040|
| circle240 /192|0.002171|0.002241|0.001652505|0.001677915|

These small average feature gaps do **not establish overlap averaging as the main cause** of weak nose/lips. Maximum face differences are larger at some boundary/detail samples; the finer optical raster is still a provisional subpixel approximation, not measured physical ground truth. No forward-model change is promoted. Exact diagnostics: output/sampling/audit.json.

## Paired contour-weight experiment

Both separate two-sweep fits start from the exact preserved240-pin circle `aeec21d270520f97bfd59d13bab381a32f22ecd3a69682f85f7e5b27351ffe30`. Same400×400mm board,0.1mm thread,160sampling, unrotated240pins, same crop/target/manual windows, same physical contrast distances and32pair/160incident guards. Only contrast weight changes2→4. Timings below are **additional fit stages**, excluding the already-existing reference generation; no faster full-generation claim.

| Variant | Connections | Thread estimate | Additional fit stage | Max pair / incident |
|---|---:|---:|---:|---:|
| Preserved reference |2,063|749.871m|historical|20/76|
| Weight2 control |2,041|748.543m|47.351s|18/68|
| Weight4 |2,060|760.551m|56.471s|18/72|

Control hash `028a43977ddd634e9df366a245aab5dc3802e43840375ba1b5856d1309ea9d96`; weight4 hash `38c133eba6a0170f5c0f1c7cbddd1c3009b7a1d3bb4274eac017bd3613d9b505`. All share target `4309a85f104751f78fc6452d0694ff2958d684bab4e25718fecb18142fd8ecfd`.

Native160 metrics favor stronger contours, but independent **common384** replay against one canonical source target exposes tradeoffs. Weight4 vs its equal-budget weight2 control: eye RGB improves1.79%, eye edge worsens0.27%; nose RGB worsens1.22%, nose edge improves2.39%; mouth RGB improves3.00%, mouth edge worsens2.03%. Against the preserved reference, mouth edge worsens6.61%. Ordinary previews remain soft. **INCONCLUSIVE; no default promotion, quality acceptance or equivalent simplification.** Fewer control connections do not qualify as quality-preserving savings.

Private report http://127.0.0.1:5183/output/contour/report.html. Three preview PNGs and complete float rasters replay exactly. Both new projects reload/resume/export offline with exact instruction/crop/hash/progress0. Both PDFs have54rendered pages and independently match all2,041/2,060ordered steps/hash/progress; each template verifies1,440actual-coordinate occurrences and all240labels. Contact sheets were visually inspected. No physical print trial.

## Face framing experiment

A separate `--face-framing`240-pin circle retains source-aligned anatomy and uses the existing manual face rectangle/4mm-clearance fitter. Zoom changes1.020822→1.292869 (approximately26.65%larger); hair can be cropped. This is explicitly **not whole-head containment**. Source crop and processed target change, so native error differences cannot establish equivalent quality savings. Default and whole-head guides are preserved.

Completed full generation: **3,314connections,1,021.459593m/+421.459593m against600m stock,526.717s**. Maximum pair8/incident98; sampled Node RSS417,411,072bytes is not an instantaneous/native memory peak. Sequence `4117c20a27f793a0ee3c7bdf5bc33ecc4ff103efe3130bd4111a66e98e8dc857`; target `4bbcfde01c5f6277c51f72d357e6370d2b0167ee153e3c4c15d875490256eb86`. Eye/nose/mouth spans67.697×20.906 /32.854×25.885 /44.801×14.934native pixels; all window samples are inside the board. Six original-source corner checks pass. Genuine native PNG pixels and Float32 strand replay match exactly; production offline reload/resume/export retains instruction/crop/hash/progress0, with no page errors.

Private report http://127.0.0.1:5183/output/circle-head-240-face/report.html includes source/target/native/common384 actual strands and equally enlarged source-relative feature windows. The face is larger, but nose shading, lip separation and crossing texture remain weak. **Quality remains OPEN, not default promotion.** Its1,251extra connections are disclosed, not a simplification. This diagnostic has JSON/PNG/offline replay evidence; its PDF has not been independently exported/checked in this increment. The two same-crop contour PDFs above are fully verified. No physical assembly acceptance.

## Verification

13relevant unit tests across sampling/area/regions/resolution pass. Four unique desktop/touch-browser scenarios across sampling and existing head-outline flows pass46.035s; final two sampling reruns additionally verify generation remains enabled with warnings, pass12.188s. Do not add repeated scenarios to the unique count. Actual desktop/mobile table screenshots have no horizontal overflow; report images decode and no page errors.

Production build passes24.26s. Android offline build/instrumentation compilation passes2m37s. All16packaged website assets match dist exactly and debug certificate stays `8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90`. APK output/mobile/ip-rasm-sampling-debug.apk:5,863,282bytes; SHA256 `e1b84a7993040decb9252b6b03e63aeaecb0c627cf4e47c266b05d601771328b`. Current USB inventory has no devices, so **this build's native execution is unverified**. Earlier actual phone/English audibility evidence remains historical in NATIVE_SPEECH_CHECKPOINT.md. No need to disable the owner's phone internet again.

An export attempt failed because the old5183server had stopped; after restoring only this project's5183/4183/4311services, exact export/offline checks passed. The default Python launcher failed in its sandbox temporary path; report work used the explicit bundled Python runtime successfully. These failures are retained in local logs. No unsafe-approval bypass or false passing evidence.

The added privacy assertion initially misclassified Android's Kotlin `DebugProbesKt.bin` as photo data. Inspection identified that framework resource; the assertion now applies to the website's actual packaged public payload. Source/report buffers remain excluded. This was a verification assertion error, not a source photo in the APK.

## Remaining work

Quality and physical acceptance remain OPEN. Owner is obtaining a kit; PHYSICAL_TRIAL.md retains the measurement/assembly protocol. Diverse consented portraits, native successful photo import/camera/denial/additional-language tests, iOS/macOS/signing, production payment/fulfillment/messages, other engines, advanced features and the complete M0–M7 roadmap remain required. Staff roles/encrypted backup/customer flows from prior checkpoints are retained. Nothing in this increment silently removes master requirements.

Face framing is now completed as a separate diagnostic. Next quality hypothesis: **local anatomical importance rather than increasing contrast everywhere**. Preserve the exact circle240 whole-head target/reference and physical material/crop parameters. A separately versioned opt-in objective may boost source-marked nose/lip importance with a smooth spatial taper while preserving existing eye/face/background weights. Persist the objective/version in immutable params and strict recovery bindings; never weaken the seed's source/profile/portrait identity guard. Before real generation, independently verify sparse gains against a complete objective recomputation, legacy hash replay and cancellation/recovery/export compatibility. Compare equal-budget control/new fits on the same target and an independent common physical grid, including tone, contours, crossings and complete routing. This is a hypothesis, not a promised improvement; keep defaults unchanged until evidence supports promotion.

Do not repeat completed global-weight/phase/convergence/overlap-audit/crop runs as new quality wins. Simplify only a selected quality reference with complete routed output preserving facial detail. No essential external input blocks independent local work; physical and current-device claims require actual evidence.

Website http://127.0.0.1:4183/; API4311; private development/comparison5183. `npm run local` starts website/API; `npm run dev -- --port 5183 --strictPort` starts the development report server. No background scheduling.
