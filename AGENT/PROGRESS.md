# Progress — keep this file current (agent updates it after every milestone)

Branch: `feat/full-roadmap`, created from clean `feat/r1-r2-subjects` in this session.
Last update: 2026-10-14 — Phase 2 v17 prototype implemented/tested; frozen experiment is next.
Session commits: `f7fab35` — infrastructure/protocol; `44b9f74` — browser workflows; `ec21ec3` — Phase 0 acceptance; `3d914c0` — Phase 1 research; `c8c72b9` — R4 diagnosis. v17 prototype is committed with this record; next milestone records its hash.

## Phase status

| Phase | Status | Notes |
| --- | --- | --- |
| R1/R2 subject input | DONE | Branch `feat/r1-r2-subjects`, see docs/SUBJECT_INPUT_CHECKPOINT.md |
| 0 Test safety | DONE / TESTED | 186/186 unit tests (56 files), 154 unique executed browser outcomes, build, 37 customer HTTP + 67 staff HTTP + sandbox checks passed. Final full desktop 77/77; full mobile 76 passed/1 legacy desktop-only skip, then that missing case passed 1/1 on mobile with skip removed. |
| 1 Research | DONE / DOCUMENTED | Public workflows, market SKU conflicts/unknowns, paper/repository/license survey and ranked new hypotheses. No competitor/code/assets copied; no comparative-quality claim. |
| 2 String quality | IN PROGRESS / R4 DIAGNOSED | Exact hashes/checksums/replayed segments, regional fit/routed/objective/taper/skin diagnosis sealed. No new fit or acceptance. |
| 3 Generalized solver | TODO | |
| 4 Thread products (text/Arabic/animals) | TODO | |
| 5 Kit login + credits | TODO | |
| 6 QBRIX comparison | TODO | needs owner files in comparison/qbrix/ |
| 7 Design, voice, APK | TODO | voice needs owner recordings |

## Exact next step

Phase 2: run `npx tsx scripts/local-texture-experiment.ts` after this implementation commit. It freezes protocol first, then strength0 control / strength1 candidate under v17 identical ±1 one-pass search and full root24 seed. Both exactly two objective evaluations per permitted chord; route objective calls separately counted (no equal total CPU-cost claim). Resume bound completed sweep checkpoints; do not tune strength/budget after results. Inspect output/local-texture-v17/report.html, same-size/enlarged full sequence and fixed R4 screen versus both root/control. Commit verdict and owner instructions. If rejected, no new accepted-reference count knee/simplification/default, then continue Phase3 generalized solver. Preserve all old fits/guide hashes.

v17 implementation: independent exact excess-gradient hinge and sparse gains (fractional physical offsets tested64/320, support includes anchors outside changed pixels); source mask/settings in strict checkpoint binding and immutable guide version. Opt-in only; no default/UI creation choice. Worker/recovery/continuation preserve new strategy rather than silently dispatching old fitter; shared player/PDF uses exact optical sequence. Texture simplification explicitly refused until an exact objective checker exists. Full unit191/191 (58 files), targeted12/12; build1876 modules passes with existing warnings. Initial build caught test fixture TypeScript region typing; fixed explicit eyes/nose/mouth. No fit has run yet.

R4 evidence: output/quality-r4/{manifest.json,diagnosis.json,report.html}. Script refuses overwrite. Zero new fit sweeps; exact replayed root24 segments, source/checkpoint hashes, old context crop excluded. Native320 root skin fine energy 3.9248× source and nose6.0361×, already present in fit; routing only .366% raw objective rise. v16 feature term .312% of fit loss; 69.282% genuine nose/lip gradient energy at taper<.25, only .860% unsupported. Visually weak nose/lips and crossing texture remain. docs/QUALITY_CHECKPOINT.md contains measured details and next isolated hypothesis. Relevant evaluation tests 2/2 passed; build passed1875 modules, unchanged product assets.

No test process is left running from this session. All final test services were on separate ports from the owner and terminated after their runs. Aggregate evidence is test-results/phase0-final/summary.json: it verifies exactly 154 unique project/file/title cases passed across the final complete project runs plus the explicit supplemental mobile case. The earlier diagnostic full-v3 completed at 134 pass /19 fail /1 skip while tests changed; its evidence remains and is not presented as final acceptance.

Final build: npm run build passed, 1875 modules, existing warnings; same product asset names as before Phase 0. Final unit JSON: test-results/phase0-final-unit.json (186/186, 56 files). Final browser JSONs: phase0-final-desktop/report.json (77 passed, 14.6 min), phase0-final-mobile/report.json (76 passed +1 legacy skip, 13.1 min), phase0-mobile-worker/report.json (1 passed, 10.4 sec). Desktop-only skip was removed for future full runs. All reside beneath test-results.

Phase 1 validation: production build passed, same 1875 modules/assets; safety tests 3/3 passed (test-results/phase1/safety.json). Phase 0 full product evidence remains applicable because Phase 1 only added docs. Two outputs: docs/COMPETITOR_WORKFLOW.md and docs/ALGORITHM_SURVEY.md. Amazon direct listing access and the 2022 author PDF retrieval failed; unknowns/follow-up are explicit. Birsak 2018 author PDF reviewed; Quoteme MIT verified; Roy Hachnochi AGPL excluded from reuse; other compatible licenses not established. No software adoption or external benchmarking performed.

Reproduction: PowerShell env `IP_RASM_TEST_BROWSER_CHANNEL=chrome`, `IP_RASM_TEST_PORT=4289`, `IP_RASM_TEST_API_PORT=4429`, `IP_RASM_TEST_ARTIFACTS=test-results/phase0-full-v3`, `IP_RASM_TEST_REPORT=test-results/phase0-full-v3/report.json`, then `npm run test:e2e`. Choose fresh unused ports for a later run; existing owner services must not be reused/stopped.

## Waiting for owner

- (none yet)

## Known facts carried over

- Additional test-only corrections: More menu vs existing photo candidate scoped separately; explicit interface/guide language; hidden settings opened through summaries without double toggling; upload waits for completion; missing outline photo replaced by committed orientation fixture; delayed digest intercept limited to sequence validation rather than photo hash; geometry checked against actual delivered pointer coordinates and frame bounds at each event with unchanged 6-digit accuracy; synthetic pickup settings; business announcement/settings cleanup between projects. No UI/engine edits.
- Explicit test-server owner-path startup probe failed before SQLite/secrets with the expected owner-data error (exit 1).
- Every HTTP verification script now uses scripts/test-artifacts.mjs for a fresh disk DB beneath the configured artifacts folder, with protected-root validation before mkdir. Playwright protects report/artifact paths as well as DATABASE_PATH. Protected-artifacts config probe also failed before creating directories. New unit checks verify fresh paths and no protected directory creation.

- Owner server: `Start-Ip-Rasm.cmd` → http://127.0.0.1:4194 (API 4331). Do not stop it.
- Playwright browsers not installed; use installed Chrome.
- Previous run left test servers on 4283/4411 (may already be closed).
- New test configs refuse port 4194, reject owner DB paths (including junction ancestors), always create fresh DBs under test artifacts and never reuse an existing server. Test processes share their own generated secrets; no test reads local-secrets.json. HTTP script test servers explicitly enable the safety guard.
- Chrome option is `IP_RASM_TEST_BROWSER_CHANNEL=chrome` (no download). Test worker output is in artifacts/browser; DB is in sibling api-* directories so Playwright cleanup cannot remove it.
- Build passed twice (1875 modules, existing chunk-size warnings). Initial unit attempt failed before collecting tests due Windows sandbox temp-cache rename EPERM; rerun outside that sandbox passed 185/185. Evidence: test-results/phase0-unit.json.
- First full e2e attempt interrupted after discovering a hidden Portrait optimization select. Second interrupted after detecting arbitrary-test-port CORS and regenerated-worker secret mismatch; corrections are in current source. One v2 navigation failure coincided with a build clearing dist: no concurrent dist rebuild during live e2e now. Existing continuation test now enters through the saved guide, as the result-only button is limited to compute-limit outcomes.
