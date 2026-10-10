# Actual strand portrait detail — 2026-10-10

Continues preserved `7a34282bd309837b210095d85b5d40aac910f14e`. The owner's current priority is actual string-art likeness, before assembly simplification and then speed. Other engines are not this increment's focus. Software described below is implemented; portrait/physical/current-native and full product acceptance remain OPEN.

## Implemented

Opt-in UZ/RU/EN **Prioritize portrait → Separate facial contours** uses source-derived local grayscale contrast without moving the face/eye/nose/mouth coordinates, synthesizing facial anatomy, or putting a source image on top of the result. **Retain more original shading**, checked on enabling, selects `contour-preparation/2`: uniform fields stay exact, pixel changes are bounded to 20/255. Uncheck it for `contour-preparation/1`, which substantially lightens flat midtones while retaining dark local details. The exact generation target is shown before generating. Turn contour preparation off for the original tonal processing, byte-exact. Global default remains off; generator, board/material defaults and winding safeguards are unchanged.

The style is versioned in the immutable instruction, JSON/TXT metadata, strict continuation identity, presets, source reuse and per-photo settings. Saved progress stays attached to its original ordered sequence. Cancellation/recovery still use the existing bound Worker flow; no new solver version is shipped. Switching the style creates a different target/sequence, never a claim of quality-equivalent simplification.

## Controlled owner-photo evidence

The original consented JPEG `output/outline/source.jpg` was locally prepared using the packaged photo Worker and composited on white. It detected one face. No external inference/upload occurred. `portrait-detail-prepare.mjs` records this prerequisite and refuses to overwrite preserved inputs. Source/crop/materials/normalized facial regions remain common: 240 circular pins, 400 × 400 mm, 0.1 mm dark thread, 160 computation, 32 chord traversal /160 incident guards. All new white-source fits start empty and receive eight integer sweeps; routing is included.

| Target | Connections | Estimated thread | Full fit on desktop |
| --- | ---: | ---: | ---: |
| Original tonal control | 1,356 | 526.8907 m | 64.08 s |
| Lighter contour v1 | 1,044 | 386.9552 m | 70.11 s |
| Original-shading contour v2 | 1,406 | 538.9517 m | 669.74 s |

Host load changed substantially during v2, so these elapsed times are not a controlled speed comparison or phone benchmark. All guides start at zero confirmed steps. V2 does not save thread/actions. V1's smaller count is a different tonal target, not accepted equal-quality savings.

Exact control hash `234715a5229e9a0fe2df51e588f7cb4066b38bc95726a82469e28eda149be68a`; v1 `04f33fcc75a572db17ff3f8d3e596701d4225cd04c49b8b70b9552535d23e261`; v2 `f6a9892196ee89ba27a0906345de277d210f5cf93bca53f58c11691c86927245`. Complete validated import envelopes, processed binaries and fit checkpoints are private under `output/portrait-detail/{white,natural}`. No existing sequence/hash was replaced.

**Quality is mixed, not accepted.** Against the independently reproduced original tonal target at native160, v2 eye/nose/lip tone MSE and edge MSE improve; nose edge `.00251406 → .00228034`, mouth `.00467954 → .00317688`. At the same physical board/thread rasterized at512, nose tone slightly improves but mouth/whole-face tone worsens, and all facial edge MSE increases: nose `.01521004 → .01526307`, mouth `.01296827 → .01428510`. Signed gradient-direction cosine rises at both scales but remains low at512; it is not a recognition/likeness score. Nose shading, lip separation and crossing texture still need work. Native improvements alone do not justify default promotion.

V1 common512 nose/lip edge errors fall about42%/28%, but original tonal error rises substantially (nose `.0099058 → .0370807`, mouth `.0151460 → .0619716`). Lighter faces visibly trade away shading. The separate patterned-background v1 comparison is 1768 preserved control /1214 newly generated connections, 668.85/444.15 m; the old control was not rerun. Its changed target also precludes an equal-quality saving claim. The report explicitly displays all original tone/edge losses as well as gains.

A fractional log-density warm start on the unchanged old target was rejected: 1789 connections/655.21 m and worse eye/nose/lip measurements. Its tentative v12 integration was removed by precise inverse patches after archiving this turn's experiment files; no v12 remains in the application. Private rejected diagnostic JSON is not supported for import by the released app. Preserve it as rejected research only.

## Verification

- Full `portrait-detail-unit-final.json`: **124/124** domain/PDF tests pass. The three augmented v2 cases pass again in `portrait-detail-natural-unit.json`; they verify bounded contrast, exact flat fields/reset, unchanged geometry, metadata/target binding and strict continuation. An earlier assertion mistakenly accessed `.instruction` on `fromFile`'s direct instruction result; failed evidence remains, corrected assertion passes.
- Final `portrait-detail-natural-browser.json`: **8/8 desktop/touch outcomes in one run**, zero skipped/flaky. Four cover v2/v1 target switching/reset, real Worker/style, presets, saved progress, offline reopen and JSON/PDF export; four preserve optical-render byte equality for v10/v11. Earlier failures were test export-label/automatic import-open assumptions and research JSON missing the full project envelope. Separate sealed valid guides and all failed reports/traces remain; no immutable instruction was changed to make import pass.
- V1 UZ/RU/EN guides: **32 pages each**, all1044 ordered steps/hash/progress independently verified; every page rendered and contacts inspected. EN template:1440 coordinates/240 complete pin labels checked. V2 UZ guide: **40 pages**, all1406 steps/hash/progress checked, every page rendered, contact/cover/last page inspected. Actual print/assembly remains untested.
- Final TypeScript/production build passes. Final **app-scoped** offline Android app/instrumentation tasks pass. A previous broad unqualified Gradle task tried to build Capacitor's own library tests and failed on unrelated uncached AndroidX dependencies; the final `:app:assembleDebug :app:assembleDebugAndroidTest` correctly checks this application. Preserve both logs.
- Final APK:37,369,706 bytes, SHA256 `d1dc98a6b1db9864a65bde15879ebf5b12ecd8a52d35c78ed8cbdafb769eb813`. All31 dist assets exactly match packaged bytes, only expected Cordova bridge extras, signer unchanged `8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90`. Instrumentation APK SHA256 `39b71c69daa4c047ba660a49407e16c72d423041df28a794b8fec35cb4816e28`. Compiled instrumentation is not a phone run.
- No phone install/ADB operation, push/publication/photo upload, real message or scheduled background execution this increment. Owner asked to connect at the end. Latest previously installed verified build remains69720e0, not this APK.

## Exact continuation

1. Keep optional styles separate. Do not call v1 fewer threads quality-preserving, v2 globally superior, or all portrait issues fixed. Inspect actual source masks/face coverage and ordinary/enlarged strands on consented original single/group photos. If pursuing optimization, evaluate routing and common physical raster at512 with original tone AND contour errors before promotion. Work on genuine facial crossings and nose/lip volume; preserve control hashes and equal objective/evaluation budgets. Do not repeatedly optimize only a160 preview or weaken physical guards.
2. For assembly savings, simplify only after a high-quality reference is accepted; require exact replay and regional fidelity tolerance. No new equivalent simplification was accepted here.
3. When owner connects the phone, `PYTHONUTF8=1 python scripts/person-background-device.py --artifact portrait-detail` privately backs up Preferences, installs with `-r`, verifies four packaged/camera/gallery tests and checks Preferences exact. `--verify-only` exits before ADB and has already passed. Keep internet on. Actual local model preparation, both styles, capture success, group corrections, sharing and progress/restart must additionally run on-device; those four checks alone are insufficient. Leave UI Uzbek.
4. Kit trial must verify100% template scale, pin capacity/tension, real thread consumption, likeness and actual assembly time. iOS needs macOS/device/signing; production providers and the full M0–M7 roadmap remain separate unfinished acceptance work.

Website `http://127.0.0.1:4183/`, API4311. Local owner-only comparison `http://127.0.0.1:5183/output/portrait-detail/report.html`. APK `output/mobile/ip-rasm-portrait-detail-debug.apk`. Evidence setup/generation/replay/report/export scripts are tracked; consented fixtures and output remain private/ignored, so a fresh clone must supply them. These experiments do not claim identical results from unrelated UI solver presets.
