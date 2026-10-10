# Actual portrait quality trials and fine-thread support — 2026-10-10

Continues preserved `521f1404d93161931ef12ce2772cb67e032d833f`. Owner requested higher actual string-art likeness, ideally100%. No100% guarantee is claimed. Quality/buildability precede fewer customer assembly actions and speed. This increment found a useful **different-material** simulation result; portrait/physical/current-native/full-product acceptance remains open.

## Shipped changes

- Material input and reusable settings now accept measured **0.05–2 mm** thread, previously0.1–2 mm. Default0.3 mm is unchanged. Do not tell users to enter0.05 while physically using0.1: this is a different material/operator, not a same-material optimizer fix. UZ/RU/EN guidance explains actual thickness and possible extra assembly work. Core already reconstructed subpixel thread; no optical model, guards, generator default or old sequence was rewritten.
- PDF covers now show the exact immutable guide's thread thickness in UZ/RU/EN. All ordered steps, coordinate scale and hashes remain bound to the original guide. Existing archived PDFs remain intact; new export presentation does not create a new sequence.
- The source-derived v1/v2 styles from the preceding increment remain optional. This useful trial uses the **unchanged original tonal target**, not a whitened/sharpened target substituted to improve selected metrics.

## Four controlled trials

Private owner original prepared source: `output/portrait-detail/white-source.png`, from the consented JPEG using local packaged models. Control target hash `2ac25016bc66390ed89fddab933d9032cbdd63c02e58ce2a4fd7bd53233e4f55`. Same crop, source regions,240 circular pins,400×400 mm,.85 modeled opacity, native160, fresh empty graph/eight sweeps,32 pair/160 incident guards unless explicitly noted. Include all routing. Different host loads mean timings are not controlled speed comparisons.

| Trial | Connections | Estimated thread | Full desktop fit |
| --- | ---: | ---: | ---: |
| Preserved0.1 mm control |1356|526.8907 m|64.08 s|
| New0.05 mm material |2763|1064.8890 m|76.46 s|
| New0.025 mm research |5597|2135.1699 m|70.44 s|
| Complete bounded integer search,0.1 mm |1319|512.3808 m|891.62 s|
| Marked-face refit,0.1 mm,changed crop |2890|889.8499 m|68.04 s|

The0.05 mm trial improves **all eye/nose/lip original-tone and edge MSE at both160 and common512** on this one source. At512, nose edge `.01521004 → .01039734` (~31.6%lower), lips `.01296827 → .00913952` (~29.5%lower); nose tone `.00990578 → .00689598`, lips `.01514600 → .01306862`. These are relative simulation-error changes, not likeness percentages, physical fidelity or general portrait acceptance. Source-derived160 target hash independently reproduced for both profiles. Actual preview, common512 and enlarged features remain visibly imperfect; crossing texture and soft volume persist. This is the best result among these tested material alternatives, not a global optimum or evidence all faces are solved.

**No assembly saving:**1356→2763 steps,526.89→1064.89 m, extra464.889 m against entered600 m stock. More thread/actions are needed. Real0.05 mm availability, measured diameter/opacity/tension, pin capacity, breakage, likeness and human assembly time require kit validation. Do not automatically promote it as a default or recommend buying an unvalidated kit.

0.025 mm fails to outperform0.05; several mouth measurements worsen and it doubles work again. Remains private research, not a suggested UI/preset value (minimum0.05). The complete integer trial considers every allowed single-coordinate delta using the actual objective, but final common512 eye/nose/lip tone/edge errors are worse.37 fewer steps are not accepted quality-equivalent savings. Its private copied solver and exact helper are research scripts only; no new algorithm/Worker option is shipped. Five-sweep snapshot also has mixed evidence. Preserve private counts/checkpoints, do not treat copied solver metadata as a released engine provenance.

The existing reversible `fitMarkedFace` enlarges the face1.2665× and remaps anatomy to the same source; eye quality improves, nose/lips remain mixed. Changed crop means regional errors are different framing tasks, not identical original-target comparisons. It is not auto-applied/default-promoted. No source anatomy was synthesized.

0.05 mm sequence hash `02ab608c777800bf94d59171a5234137e15ffffc8a455cd16eec68e8d09dce29`. Its valid new project starts at0 confirmed steps and is independently importable. Control hash remains `234715a5229e9a0fe2df51e588f7cb4066b38bc95726a82469e28eda149be68a`; previous projects/progress are preserved. `output/strand-quality/report.html` displays original targets, both scales, enlarged features, all gains/losses and changed-material/framing caveats. Only the qualified0.05 guide is linked for owner testing; other trial instructions remain research.

## Verification

- Full126/126 domain/PDF tests pass in `fine-thread-unit-final.json`, including two exact private integer-search bound/cancellation tests. The final PDF-label presentation subsequently passes the existing localized PDF regression again in `fine-thread-pdf-final.json`; no new test count is inferred from repeats.
- Final6/6 desktop/touch outcomes pass in `fine-thread-browser-material.json`: real2763-step import/hash, actual0.05 reuse and saved preset/reload, confirmed step1, offline JSON and full PDF export; four optical v10/v11 byte-equality scenarios remain green. Prior two timeouts were test confirm/preset label assumptions, corrected without changing app behavior. Initial failed reports/traces preserved locally.
- Final standalone UZ PDF `thread-fineness/uz-material-guide.pdf`:71 pages, all2763 ordered steps/hash/progress0 checked, every page rendered and contact/cover/last inspected. Independent template audit verifies1440 actual coordinates and240 intact pin labels across the six tiles. Earlier identical-sequence PDF without material cover label remains preserved. Actual final offline production desktop/touch PDFs each have71 pages/all2763 steps/hash/progress1 and exact0.05 cover text; audits recorded separately. Intentional clipped duplicate template labels can be outside raw extracted character bounds; cover/overview/step font bounds are audited separately. No printed-template or winding claim.
- An initial generic comparison harness passed normalized floats to a byte-target measurement API. Its initial metrics are superseded by corrected byte-target replay, retained initial log and final JSON. Sourcehash checks were strict throughout. A first copied-solver patch anchor failed on CRLF before generation; normalization fixed only the research harness. No app source/validation relaxation was used.
- TypeScript/production build and offline `:app:assembleDebug :app:assembleDebugAndroidTest` pass. Final APK37,369,705 bytes /SHA256 `6ef2dbc61f5446f1f6492fb14d564c67e4b79e7cb1bfbb22b5397f3bd83be34d`; all31 packaged dist assets match exactly, only expected Cordova bridge extras. Signer `8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90`, instrumentation APK SHA256 `39b71c69daa4c047ba660a49407e16c72d423041df28a794b8fec35cb4816e28`. Intermediate build audit is superseded by final material-label build; old logs remain.
- No phone operation this increment; new APK has not run natively. Owner deferred USB connection. Last verified installed build remains69720e0. No photo upload, push, publication, real message, purchase or scheduled background work.

## Exact next work

1. Actual likeness at fixed physical materials is still open. Keep these qualified/rejected outcomes; do not repeat coarse160-only parameter tuning or claim small MSE changes close quality acceptance. Compare consented original varied single/group photos and inspect white-mask/source regions; obtain physical evidence of the modeled thin-thread result. Existing0.1 mm material quality remains unresolved. Next solver work should evaluate genuine crossing texture/common physical-scale tone AND contour residuals before promotion, with exact routing and bounded cancellation/recovery.
2. Once a quality reference is accepted, simplify against that exact reference with replay and regional fidelity bounds. More thread was not accepted as required for all photos, and the37-step research reduction is rejected as equivalent.
3. When owner connects, `PYTHONUTF8=1 python scripts/person-background-device.py --artifact thread-fineness`. It privately backs up Preferences, uses install-r, checks packaged assets/camera/gallery and verifies saved Preferences exactly. `--verify-only` already passes and does no ADB. Keep internet on, leave UI Uzbek; additionally test successful photo/model preparation, group correction,0.05 settings, both contour styles, native export/speech and progress/restart. Four helper checks alone do not establish full native acceptance.
4. Physical kit and current phone/iOS/production/full M0–M7 work remain incomplete. Source research scripts and synthetic helper tests are tracked; owner fixtures/output remain private/ignored and must be supplied for fresh-clone local reproduction.

Website `http://127.0.0.1:4183/`, API4311, comparison `http://127.0.0.1:5183/output/strand-quality/report.html`; APK `output/mobile/ip-rasm-thread-fineness-debug.apk`. Exact evidence scripts: `portrait-thread-fineness.ts`, `portrait-face-focus.ts`, private `portrait-integer-experiment.ts`, `strand-quality-evidence.mjs`, `strand-quality-report.py`, `export-fine-thread.ts`, `verify-fine-thread.py`.
