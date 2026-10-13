# Whole head and face preservation checkpoint — 2026-10-11

Continues local `2d0e39a427d0ef516ad3b6afde1d670cddce796e` without rewriting existing guides, projects, progress, templates, or hashes. The source photograph, the private 960×1280 prepared source, exact 320 target, crop, corrected facial boxes, 400 mm board, unrotated 240 perimeter pins, 0.1 mm thread, opacity, and 32/160 provisional safeguards remain fixed. No push, publication, device install, or external photograph upload.

## Question tested

Does manually raising objective weight over the whole head improve hair depiction, and can added hair strands retain the best face unchanged? The selection is a manually inspected whole-head polygon using `processed-target/sample-centers-v1`, saved in each experimental sequence. It is not face detection or a segmentation mask. The common upper-head measurement window also contains white margins and is not a hair-only metric.

## Preserved result and separate trials

The unchanged 320 quality reference remains the leader: SHA-256 `eeb26cf5539462c9d0321579f2025307ea0d94735d08e0ca5497ef3ec8ebc944`, 1,322 executable connections including 62 routing, 505.314606 m estimated thread, eight physical-contrast sweeps, and zero assembly progress.

Fresh whole-head objective `density-head/13` used a fresh graph, identical target/material/profile/regions, manual 20-point head selection, four and eight bounded sweeps. The eight-sweep result is `4ec3baa827f4ff0fff6b41e332febf65f74b98a12d5ffc0cb552f1532544ce3a`: 1,788 connections including all 53 routes, 681.823188 m, 182.353 s optimizer time (exact wrapper and checkpoints in private evidence), sampled RSS peak about 366 MB. Maximum chord multiplicity3/32, nail incidence42/160. Stop: compute allowance; not convergence. It has an estimated 81.823 m shortfall against the example 600 m stock. Four-sweep result is separately preserved. Both have zero progress.

Decision: reject this objective as a quality leader. The manual upper-head-window tone MSE at common512 falls .054684→.027297, but its edge MSE changes .009991→.009686 and excess darkening .038489→.051942. More importantly, all eyes/nose/lips tone errors worsen at common160,320,512 versus the unchanged reference. It darkens face areas and does not visibly improve natural hair detail at ordinary size. Lower head-window loss does not outweigh degraded anatomy.

The separate `hair-cycles/14` experiment starts directly from the preserved v12 sequence. It tests two legal out-and-back connections inserted at existing visits, with the full 0.1 mm raster and board-mm physical contrast objective. Candidate chords that intersect a manually defined face box expanded4mm are excluded. Each complete sequence is rerendered and checked for exact native face-pixel equality; every original route remains in order. Bounded pool256, 100,000 evaluations, up to512 cycles; cancellation checkpoints saved every16 accepted cycles. Actual result `eff0f3e4c808f88c309ed9d1e91ae934d7b246138fb7e4ab26bbd6b13c99acb2`: 1,660 complete connections, 338 added connections/169 cycles, 641.160303 m, 94.708 s refinement, 55,641 evaluations. Maximum chord4/32 and incidence50/160. Estimated stock shortfall41.160 m. The 338 additional assembly actions estimate45.067 minutes at8 seconds each; this is not measured customer time.

Decision: keep cycles diagnostic only; do not promote. At common512 the manual upper-head-window tone error moves .054684→.048462, while edge error worsens .009991→.010713 and dark excess rises .038489→.048461. Eye/nose/lip pixels remain exactly equal. Ordinary-size and identical enlarged crops do not demonstrate a clearly more faithful hair texture. Exact sequence and evidence stay local with the private output.

## Inspectable evidence

`output/head-quality/report.html` contains the original and same-scale complete sequence reconstructions, head-target outline, same-pixel enlarged eyes/nose/lips, metrics, costs, decisions, and limitations. `comparison-cycles.json` has same-target/common160/320/512 regional outputs, thread/distribution statistics, hashes, and variants. `cycles.json`, `cycles.txt`, and the exported PDF are new experimental data; original guides are unchanged. Pixel reconstructions are sequence-only, with no source overlay.

The known ceiling is the radial perimeter routing basis: its straight crossings cannot independently trace tight curved hair highlights without competing with or crossing the face. The whole-head-only weighting visibly trades face accuracy for tone. Merely adding strand repetitions does not resolve this. A future targeted hypothesis is a separately versioned buildable interior-pin layout following manually marked hair arcs, plus a new explicit physical template and real capacity/tension trial. This changes physical geometry and is a separate opt-in experiment, never a silent board substitution.

## Verification completed after the experiments

- Production build passed TypeScript and Vite. Existing chunk-size warnings remain.
- Full browser test imported the immutable `hair-cycles/14` sequence, checked zero transferred progress and SHA-bound player data, compared screen reconstruction pixels with independent sequence rasterization, exported/reopened JSON, and exported the exact PDF: 1/1 desktop scenario passed.
- The 46-page PDF has 1,660 ordered connection steps, all 62 original route connections, 0.1 mm material, zero completed steps, and SHA-256 `eff0f3e4c808f88c309ed9d1e91ae934d7b246138fb7e4ab26bbd6b13c99acb2`. Direct text audit found no embedded original photo. All pages were rendered and visually reviewed; the page-2 actual-size template states pin0 at top, increments clockwise from the front, 0° phase, and not to flip. Software checks do not validate a printed template or physical construction.
- Android debug and instrumentation APK build passed offline after `npx cap sync android`. `verify-apk.py --archive-name ip-rasm-head-quality` confirmed all31 packaged web assets match `dist`, algorithm13/14 and localized opt-in control are present, and no private output/photo files were packaged. APK SHA-256 `af67608d5408a28f7609f139601706aa39122e57e7a485d4943b637768dfb37f`; preserved signing certificate `8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90`. Built, not installed or device-tested.
- Full suite passed **41 files / 135 tests** in341.59s with `TEMP`/`TMP` set to ignored workspace `tmp/vitest-temp` and `--testTimeout=15000`. The prior sandbox `EPERM` run and serial 134/135-default-timeout run are retained separately; the slow outline test passed3/3 alone in8.5s with20s. No test failure remains.

## Exact resume point

1. Open `http://127.0.0.1:4190/` for the runnable local app and `http://127.0.0.1:5183/output/head-quality/report.html` for inspectable evidence. Preserve all existing user data and the 320 v12 quality leader.
2. Keep v13 rejected and v14 diagnostic only. Next hypothesis is a separately versioned buildable interior-pin layout following manually marked hair arcs, with its own numbered orientation template and a physical capacity/tension trial; do not change the default board silently.
3. Validate varied local original portraits before promoting quality. Physical assembly/nail capacity/tension, actual Android offline/audio/persistence and iOS, production services, and remaining M0–M7 remain independent acceptance tasks. No source photo was uploaded; do not publish or push.

Git checkpoint: original HEAD `2d0e39a` is preserved. Current verified implementation/docs/tests are present as workspace changes but remain uncommitted: the sandbox mounts `.git` read-only, so index update/commit was denied. Resume directly from this working tree; do not redo the experiments or builds. Build artifacts, comparison data and personal photos remain under ignored local `output/`.
