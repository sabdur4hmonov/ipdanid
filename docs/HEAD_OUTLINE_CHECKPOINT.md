# Whole-head outline and native package — 2026-10-09

Continues preserved 33b1aed / 4172e04 on codex/product-completion. Owner requested direct work in this chat. Priority stays likeness and buildability, then unnecessary assembly actions, then computation time. All earlier guides, templates and confirmed progress remain intact. No push, publication or original-photo upload.

## Implemented

Experimental whole-head outline in UZ/RU/EN: mark 6–48 ordered points around hair, ears and jaw; mouse/touch dragging, numerical correction, remove/clear, reversible uniform fit. Points are normalized to the original decoded source, not the current crop. Independent corrected eye/nose/lip windows follow the same affine crop; per-photo marks survive switching within this session. New photos start without another photo's marks. Marks are session-only and excluded from reusable presets; a saved immutable project retains its resulting crop, not original photo pixels.

Source polygon checks reject incomplete/nonfinite/repeated/crossing/touching selections. Fitting is a bounded candidate search, not a globally optimal solver. Conservative geometry uses nominal 4 mm clearance plus a cell on a 192-cell grid, full edge sampling and actual heart-polygon edge blocking. An initial independent test caught the narrow heart cusp falling between grid centers; retaining the actual boundary prevents that false containment. Physical limits, 32-chord/160-incident safeguards and default 160-pixel unrotated settings are unchanged. Generator Worker remains generator.worker-BZJU0Rfi.js.

## Controlled local experiment and decision

Owner-authorized local photo SHA256 b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4. Manually inspected 28-point source-relative whole-head boundary. Same 160-pin heart, 400×400 mm, 0.1 mm thread, opacity 0.85, 160 computation, portrait background 0.85/local contrast 0.5, 20000 requested-line ceiling, v6→v8 with eight physical sweeps/weight2 and unchanged physical contrast distances. Original facial annotations remapped to the same source pixels.

| Guide | Connections incl. routing | Thread estimate | Uniform scale relative to baseline | New full generation |
| --- | ---: | ---: | ---: | ---: |
| Sealed baseline | 2579 / 44 routing | 618.697698 m | 1 | Historical; not rerun |
| Conservative whole-head rectangle | 994 / 47 routing | 266.721869 m | 0.474724 | 60.473 s |
| Manual whole-head outline | 1128 / 43 routing | 301.434211 m | 0.556129 | 71.266 s |

All have one start/two knots. Actual maximum chord repetition/incident count: baseline32/140, rectangle8/58, outline6/54. No new guide consumes confirmed progress; both start at zero. Supply stock is an estimate and remains independent of the quality search.

Rectangle sequence b0424312b10a402bb995e878b2af4adad24232648b2bd048807056e176e75000; target0fb1efac41ee30761ad48a6c00b34e6552f8b0b208c98f1d4c429a154df0c6cd.

Outline sequence4f319d71fe69db447d5d9177833be89138a16c106c85da6895c291a76ab96bd1; targetca160c7a7162d38e7d569b395fdf91639885d1d146480f522961bd47ab46a428.

Sealed baseline sequencee739731c26d8aa580b24f2228160d4e3536b341d2b8c1fb66df5971ce01b4d0a and targetd4535650908819c2eaeeb1ef45576ad5cc0fa6f5bf548aa1c4cb72320749a357 reproduce exactly; no optimizer rerun presented as new evidence.

**INCONCLUSIVE likeness improvement; reject default promotion.** Outline fits a head about 17.1% larger than the rectangular selection, but only about 55.6% of the baseline size and shifts it into a heart lobe. Nose volume, nostrils and upper/lower lip separation remain weak. The outline lip window has only about 19.3×6.4 native sample pixels. Reduced connections/meters here come from a changed crop and smaller facial area, not quality-preserving simplification or measured customer-time savings. Numerical errors on equal source-relative windows are diagnostics with preprocessing/sampling confounds. No overlay, fabricated facial feature or sharpening was used in sequence images.

## Verification

- Full 77 tests / 22 files PASS, 211.14 s. After adding independent interior checks, final three outline tests PASS, 5.11 s. No application code changed after the full run/build.
- Six desktop/mobile framing, outline and workflow outcomes passed. Final six outcomes (outline including actual mouse/touch handle dragging plus customer regression) PASS, 80.04 s; ten unique relevant outcomes across those runs. The first six-case browser run was inadvertently dispatched twice while waiting on regression output; both passed, but duplicates are not additional coverage.
- Three report images exactly match native PNG pixels reconstructed from every immutable strand, including routed strands. Both new guides survive actual production offline reload/import/player/JSON export with exact instruction, crop, hash and progress0. No browser errors.
- Matching TXT/PDF exports: rectangle30pages/all994ordered steps, outline33pages/all1128ordered steps/hash/progress independently checked. Every page rendered; contact sheets inspected. Each template has960actual hole-coordinate checks and160intact numbered labels. No actual-size print or physical assembly trial.
- Production build PASS; unchanged Worker. Android scoped app + instrumentation compilation PASS, 3m59s. All16dist assets byte-match the new APK, no stale compiled assets, manual-outline controls verified in bundle. Initial copy invocation used the android subdirectory and failed before copying; corrected project-root command passes.
- output/mobile/ip-rasm-outline-debug.apk: 5,315,097bytes; SHA2562bc476d8e2a744c39b0fb10a02c45e77882785b765e41805c85681a6c7b0f7fe. Debug certificate unchanged8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90.
- **This new APK has not been installed or executed on the phone.** ADB currently lists no devices; owner was asked to reconnect. Earlier build's three actual-device tests remain historical evidence, not acceptance of this build. No app data cleared or device reset.

## Reproduce and exact continuation

From the retained checkout: `npm run build`, `npm run local` gives website4183/API4311 using this checkout's existing separate private SQLite/config. Source-derived report remains local at http://127.0.0.1:5183/output/outline/report.html (`npm run dev -- --port 5183 --strictPort`). Never copy private source/report assets into dist/APK or upload them externally. Local scripts outline-experiment.ts/evidence.ts/report.py/template.py/browser.mjs use ignored output/outline. Sealed generation refuses to overwrite different targets; evidence replays existing guides rather than regenerating them.

1. When USB returns: update-install the new APK with `adb install -r` using the same signer, preserving data; run existing native core tests and then actual source-picker cancellation/denial, network-disconnected core operation and audible voice behavior. Keep own local API4311/reverse separate from old4310. Test app-window-only screenshots, no personal-system overlays. Do not declare phone acceptance from viewport tests.
2. This containment experiment is complete. Do not repeat its generation or completed convergence/prune searches as a new improvement. Next quality decision must address lost native facial area: compare a centered whole-head circle against the accepted heart with separately disclosed physical pin layout/materials, same original source/annotation, clear resource budget and equal source-relative visual audit. This is a proposed separate board, not a silently changed default or quality win. No quality acceptance until nose/lips and whole portrait improve; quality precedes simplification.
3. Obtain consented varied portraits and actual physical trials before universal portrait/buildability claims. PHYSICAL_TRIAL.md remains unperformed.
4. PRODUCT_COMPLETION_PLAN.md and original master M0–M7 remain: other real photo engines, production roles/payment/shipping/message adapters, advanced gallery/B2B/analytics, iOS/signing and security/operations/device/physical acceptance. Current commerce/admin are functioning local sandbox flows. Full product remains unfinished.

No scheduled background execution. Preserve all historical reports and owner data.
