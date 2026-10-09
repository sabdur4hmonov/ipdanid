# Circle portrait and local operations — 2026-10-09

Continues preserved `6e4d634`. Owner asked for direct implementation and now prioritizes portrait quality while obtaining a physical kit. Priority remains likeness/buildability, then unnecessary assembly actions, then computation speed. No background automation is scheduled. Old instructions, profile coordinates, templates and progress remain preserved.

## Implemented

- Optional manual head-outline background lightening in UZ/RU/EN. It uses the existing64×64 manual mask format and a four-cell edge guard. Every pixel within the marked head stays unchanged; old active manual corrections remain. In the owner's separate test,11,969 selected-head pixels were preserved and11,160 external pixels lightened. This is manual selection, not automatic segmentation. Undo restores prior preprocessing; crop/source changes invalidate corrections. No blanket white-background requirement.
- Computation resolution changes remap manual anatomy through the original photo's sample-center coordinates. Switching160/192 retains source-aligned eye/nose/mouth windows and clears crop-bound masks. Undo snapshots from a different grid are invalidated rather than restoring misplaced anatomy.
- Owner-issued staff credentials with six server-enforced roles,1–30-day expiry, immediate revocation and actor-specific audit records. Tokens are returned only at issuance and stored as derived hashes. Staff cannot administer credentials or acquire permissions from client-supplied role values. UI shows permitted duties only; see LOCAL_OPERATIONS.md.
- Consistent encrypted SQLite/configuration backup and authenticated restoration into a new inactive directory. AES-256-GCM/scrypt;64MiB database cap; overwrite refusal; actual synthetic CLI restore rehearsal. No backup of the owner's active private database was made or distributed.

## Separate portrait experiments

Source remains local: SHA256 `b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4`,960×1280. The preserved heart-outline result has1,128 connections/301.434m and fit ratio0.556129; its lip window is approximately19.3×6.4 native pixels. The new circle has fit ratio1.020822 and lip window35.4×11.8 at160 sampling. Changing board/crop improves retained facial area; it invalidates claims of equivalent thread savings against the heart.

All new circles use400×400mm,0.1mm thread, the preserved optical assumptions, unrotated pins,32 chord/160 incident guards and eight physical-contrast sweeps at weight2. Source annotations remain the same. Progress starts at0; no old project is rewritten.

| Separate variant | Connections | Estimated thread | Full computation | Max pair / incident |
|---|---:|---:|---:|---:|
| Circle160pins /160pixels |1,934|717.703m|205.140s|15/84|
| Circle240pins /160pixels |2,063|749.871m|611.735s|20/76|
| Circle240pins /160pixels /external lightening |1,723|673.517m|496.881s|6/38|
| Circle240pins /192pixels /same crop |1,963|737.541m|818.735s|8/50|

The first two circles have the same target hash `4309a85f104751f78fc6452d0694ff2958d684bab4e25718fecb18142fd8ecfd`. Background lightening has a different target, but selected-head values are exact. Its eye/nose/mouth RGB errors worsen27.38%/23.41%/22.45%; edge errors worsen14.92%/14.05%/5.79% against the same240-pin circle. Therefore its340 fewer connections are **not accepted quality-equivalent simplification**. The tool remains optional, not the default.

Centered-circle faces are larger and recognizable in ordinary previews, but nose volume, lip separation and crossing texture remain unresolved. Human likeness acceptance is OPEN. No claim of globally best quality or physically calibrated capacity is supported. Software success does not close portrait acceptance.

Sequence hashes:

- 160circle: `a9979e462f4e20a08005dbe67d2c81a5aabeab9f3402aa82063293ba4802d8cf`
- 240circle: `aeec21d270520f97bfd59d13bab381a32f22ecd3a69682f85f7e5b27351ffe30`
- 240lightened: `6156ba719fd3a5425fcfdc86f556e7f119d382782a0a13b723d5e682891d6523`
- 240circle/192: `53495db7717440a70c94cee7ad52a715396d03e2c0f5db3cf768ea6d4861c1c2`

The larger-face192 experiment keeps the exact240-circle crop and remaps anatomy from its original160 sample-center coordinates. Evaluation reconstructs all actual strands at a common384 grid against one canonical source-derived target at the same crop/preprocessing. Eye/mouth RGB error improves10.48%/9.75%, and edge error improves15.05%/9.69%. Nose RGB error improves2.08%, but nose edge error worsens3.06%. This mixed result is **INCONCLUSIVE for likeness**, not a default promotion or quality-equivalent100-connection simplification. Canonical target and common-grid previews/measurements are in the report/browser evidence. Native160/192 error values are not directly cross-ranked as if their grids were identical.

Private comparison: http://127.0.0.1:5183/output/circle-head/report.html. Complete JSON/TXT/PNG/PDF guides remain in output/circle-head, output/circle-head-240, output/circle-head-240-clean and output/circle-head-240-192. All four preview pixels and float rasters replay exactly from all real strands. Each project imports, reloads offline, resumes and exports unchanged instructions/crop/hash/progress0 in the production website. PDFs independently match every ordered step/hash/progress across51/54/47/52 rendered pages. Templates pass960/1440/1440/1440 actual coordinate checks and160/240/240/240 complete labels; contact sheets were inspected. No physical print trial occurred.

## Verification and limitations

87 unique unit tests have passing evidence: full serial run86/87 passed with one5-second coordinate-test timeout; unchanged resolution assertions then passed3/3 with a60-second allowance. The initial competing-compute parallel run had timing failures and was stopped; it is not passing evidence. Staff/customer HTTP checks passed67+37. Ten relevant desktop/mobile browser outcomes passed; later resolution-control verification is recorded separately below. Build, Android compilation, all16 exact packaged assets and established debug signer passed. No source/report images are packaged.

The prior build's five actual Android tests and owner's confirmed English audibility remain valid historical evidence in NATIVE_SPEECH_CHECKPOINT.md. ADB currently lists no devices, so this build's real-device test is OPEN. Phone internet need not be disabled again. APK compilation does not establish current-device, iOS or physical acceptance.

An initial staff-browser timeout was a select accessible-label issue; the select now has an explicit localized label and both issue/revoke scenarios pass. Initial Node PNG export hit a CJS interoperability error; exported evidence now uses the actual browser PNG/PDF modules. Failed/stopped runs are retained locally. Nothing pushed, published, emailed or uploaded externally.

Final source-aligned resolution/outline/background desktop/mobile scenarios pass2/2 in34.191s; all ten unique relevant browser outcomes have passing evidence across the accepted runs. Final web build28.92s, offline Android compile47s, exact16-asset audit and unchanged signer pass. Final APK: output/mobile/ip-rasm-circle-quality-debug.apk, SHA256 `11c4c53caa0b4360b327f77a0bbeb4cb8620444fe807737095f56ed09501c527`. Earlier same-name APK is retained as a hash-suffixed archive. New-build device execution remains unverified.

## Remaining scope and order

The larger-face192 comparison is complete. Next quality hypothesis: measure the current objective's sampling sensitivity against the common-grid strand raster, especially the nose, before a separately versioned source-faithful contour/forward-model change. Fix a measurable reconstruction issue rather than adding repeated sweeps or pretending a changed target is an equivalent improvement. Do not repeat completed small-heart192/convergence/pin-phase/pruning experiments as new wins. Keep defaults and physical assumptions unchanged while likeness is inconclusive. Only simplify a selected quality reference when complete routed output preserves detail; fewer connections alone do not qualify.

Owner is obtaining the physical kit. PHYSICAL_TRIAL.md covers measured materials,100% print scaling, actual winding capacity/tension/consumption/pace and photographs. Request measurements when actionable; no repeated kit question now. Diverse consented portraits, successful native import/camera/denial/additional-language coverage, iOS/macOS/signing, production payment/fulfillment/messages, other art engines and advanced/master M0–M7 requirements remain open. These are not silently removed from the roadmap. Continue independent local work; request only essential missing provider/business/physical inputs.

Website http://127.0.0.1:4183/ and sandbox API4311: `npm run local` after building. The source photo and reports stay on local filesystem/loopback. Other projects' services and private state are untouched.
