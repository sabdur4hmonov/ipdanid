# Synthetic portrait owner trial — 2026-10-21

The owner requested an immediate trial with one picture during Phase15. This is an interim demonstration of the accepted C17 customer build, not completion of C18–C26 or a new APK release. No engine, preprocessing default or customer screen was changed for the demonstration.

## Reproduction and measured results

`tests/e2e/phase15-photo-trial.spec.ts` chooses the existing original synthetic portrait through the real gallery as a JPG. It covers Circle, Square and single-person Heart on desktop Chrome and the Pixel7 browser viewport. It checks zoom, 90-degree rotation, exact reset, original/prepared switching, shoulders off by default and retained framing after returning from the result.

The generated, validated saved instruction must be classic-greedy/3, 240 actual kit pins and 3000 connections. Every RGB pixel of the displayed 1000px result must equal the physical renderer of that exact saved sequence. No photo overlay, substitute preview or altered thread material is used.

- Final browser run: **6/6 passed**, zero skipped/flaky/unexpected, 79.973 seconds; `test-results/phase15-photo-trial-sealed/report.json`, isolated4463/API4607. Initial6/6 run is separate and predates saving the exact uploaded JPG.
- Final generation milliseconds: desktop Circle4449, Square4272, Heart3346; mobile Circle4298, Square4427, Heart3344. This is generation only, without CPU throttling, not a physical phone timing claim.
- Focused unit: **10/10 passed**, three files, `test-results/phase15-photo-trial-unit.json` (classic least-squares, customer framing, frozen evidence paths).
- TypeScript and isolated build passed: **2102 modules,15.18 seconds**, `test-results/phase15-photo-trial-build-sealed.log`. Existing main-chunk warning remains for C23/C25.
- Published live trial verification: **131/131 HTTP-served files match SHA256**, safe sandbox health, exact JPG download and fresh normal gallery→result on desktop/mobile. The live Circle sequence hash equals the accepted test sequence on both viewports; generation4533/4354ms. `output/phase15/photo-trial/live-verification.json`.
- Visual review: the synthetic face is recognizable in all three shapes; Circle and single-person Heart plus mobile result were inspected. This is no new quality comparison or owner-photo acceptance claim.

## Safe owner handoff

- Comparison and downloadable synthetic JPG: <http://127.0.0.1:4210/photo-test/>.
- Ordinary app: <http://127.0.0.1:4210/>.
- Unused three-build kit and local administrator credential: ignored `output/phase15/photo-trial/manual-testing.txt`, never published in the web snapshot, logs or Git.
- Hidden launcher7780/child6884; isolated `test-results/owner-photo-trial-C8Z6Bp/database.sqlite`; API4650. No existing customer database or old server was contacted.
- Immutable served snapshot `output/phase15-photo-trial-dist`:87 app assets copied exactly from the accepted build plus44 explicit synthetic report/download files. Its SHA manifest is `output/phase15/photo-trial/snapshot.json`. Future builds use `output/phase15-dist`; never rebuild this live snapshot.
- `prepare-photo-trial.mjs` refuses an existing snapshot before writing; the actual refusal was checked. `start-photo-trial.mjs` refuses an already-published launch. All child credentials are fresh, sandbox payment adapters only, external push/email disabled. Only explicitly allowed source/result/screen/metadata files are published; no owner photos, projects, code/token files or database are copied to the web directory.
- The report was requested in the Codex browser panel; the app returned `queued`, so actual foreground navigation is not claimed. The direct URL remains usable.

Run future acceptance into `output/current-photo-trial`, never overwrite the accepted report/live directory. `scripts/verify-photo-trial.mjs` intentionally verifies only the recorded new4210–4259/API4650–4699 trial, without redeeming the owner's unused kit.

C18 native opt-in background audio and C19–C26 remain open. The new preview must stay available while coding continues. Final4201/API4483 remains reserved for C26.
