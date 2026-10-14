# Progress — keep this file current (agent updates it after every milestone)

Branch: `feat/full-roadmap`, created from clean `feat/r1-r2-subjects` in this session.
Last update: 2026-10-14 — Phase 0 complete; Phase 1 is next.
Session commits: `f7fab35` — isolated infrastructure/protocol; `44b9f74` — legacy browser workflow corrections. Phase 0 completion is committed with this record; later milestones record its hash.

## Phase status

| Phase | Status | Notes |
| --- | --- | --- |
| R1/R2 subject input | DONE | Branch `feat/r1-r2-subjects`, see docs/SUBJECT_INPUT_CHECKPOINT.md |
| 0 Test safety | DONE / TESTED | 186/186 unit tests (56 files), 154 unique executed browser outcomes, build, 37 customer HTTP + 67 staff HTTP + sandbox checks passed. Final full desktop 77/77; full mobile 76 passed/1 legacy desktop-only skip, then that missing case passed 1/1 on mobile with skip removed. |
| 1 Research | TODO | |
| 2 String quality | TODO | |
| 3 Generalized solver | TODO | |
| 4 Thread products (text/Arabic/animals) | TODO | |
| 5 Kit login + credits | TODO | |
| 6 QBRIX comparison | TODO | needs owner files in comparison/qbrix/ |
| 7 Design, voice, APK | TODO | voice needs owner recordings |

## Exact next step

Phase 1 public research: inspect official public QBRIX, RingString, String Ring, Let's String and public product listings, without code-gate bypass/photo uploads/private API scraping. Read public papers/GitHub licenses; write docs/COMPETITOR_WORKFLOW.md and docs/ALGORITHM_SURVEY.md with verified specs, unknowns, licenses, a comparison against the actual current engine, and ranked new hypotheses. Do not rerun completed/rejected experiments. Then validate build/relevant checks, update PROGRESS/LOG/OWNER_TESTS and commit before Phase 2 R4 diagnostic.

No test process is left running from this session. All final test services were on separate ports from the owner and terminated after their runs. Aggregate evidence is test-results/phase0-final/summary.json: it verifies exactly 154 unique project/file/title cases passed across the final complete project runs plus the explicit supplemental mobile case. The earlier diagnostic full-v3 completed at 134 pass /19 fail /1 skip while tests changed; its evidence remains and is not presented as final acceptance.

Final build: npm run build passed, 1875 modules, existing warnings; same product asset names as before Phase 0. Final unit JSON: test-results/phase0-final-unit.json (186/186, 56 files). Final browser JSONs: phase0-final-desktop/report.json (77 passed, 14.6 min), phase0-final-mobile/report.json (76 passed +1 legacy skip, 13.1 min), phase0-mobile-worker/report.json (1 passed, 10.4 sec). Desktop-only skip was removed for future full runs. All reside beneath test-results.

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
