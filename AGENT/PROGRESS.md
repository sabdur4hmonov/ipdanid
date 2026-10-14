# Progress — keep this file current (agent updates it after every milestone)

Branch: `feat/full-roadmap`, created from clean `feat/r1-r2-subjects` in this session.
Last update: 2026-10-14 — Phase 0 test-navigation milestone, final verification in progress.
Session commit: `f7fab35` — Checkpoint roadmap protocol and isolated test infrastructure. This milestone adds remaining test corrections and evidence; later milestones record its hash.

## Phase status

| Phase | Status | Notes |
| --- | --- | --- |
| R1/R2 subject input | DONE | Branch `feat/r1-r2-subjects`, see docs/SUBJECT_INPUT_CHECKPOINT.md |
| 0 Test safety | IN PROGRESS | Isolated DB/secrets/ports implemented. 185/185 unit tests, production build, 37 customer HTTP + 67 staff HTTP outcomes passed. Full 154 desktop/mobile outcomes still running; no full-suite pass claim. |
| 1 Research | TODO | |
| 2 String quality | TODO | |
| 3 Generalized solver | TODO | |
| 4 Thread products (text/Arabic/animals) | TODO | |
| 5 Kit login + credits | TODO | |
| 6 QBRIX comparison | TODO | needs owner files in comparison/qbrix/ |
| 7 Design, voice, APK | TODO | voice needs owner recordings |

## Exact next step

Finish the diagnostic 154-outcome sweep (session 10164, `test-results/phase0-full-v3/report.json`, 4289/4429; last observed 145/154, 19 failures already reported across old test revisions). It is not a final-source acceptance run because tests were corrected while it was running.

The complete final desktop suite is running on frozen corrected tests: session 83242, 4296/4436, `test-results/phase0-final-desktop/report.json`; last observed 20/77, no failure reported so far. After the diagnostic sweep ends, start a complete **mobile-browser** suite in a separate fresh DB/ports/artifact folder. Keep one worker per run; desktop/mobile final runs may overlap because their databases/ports are separate. Do not rebuild dist during them. Inspect final reports; correct any remaining failures and repeat the affected complete project. Then record full desktop + mobile outcomes, update records and commit **before Phase 1 public research**.

Current-source TypeScript passes. `npm run build -- --outDir test-results/phase0-checkpoint-build` passed (1875 modules, same asset names as dist, existing warnings), without disrupting previews. Sandbox HTTP verification passed. Targeted corrections v5: 6/7 desktop passed; the remaining assertion expected old default /4, now corrected to the existing R1 /6 default. Continuation's real Worker error was a 400-line routing cap, not a lost photo: 2000 QA allowance passed in v5. No safeguards were removed.

Reproduction: PowerShell env `IP_RASM_TEST_BROWSER_CHANNEL=chrome`, `IP_RASM_TEST_PORT=4289`, `IP_RASM_TEST_API_PORT=4429`, `IP_RASM_TEST_ARTIFACTS=test-results/phase0-full-v3`, `IP_RASM_TEST_REPORT=test-results/phase0-full-v3/report.json`, then `npm run test:e2e`. Choose fresh unused ports for a later run; existing owner services must not be reused/stopped.

## Waiting for owner

- (none yet)

## Known facts carried over

- Additional test-only corrections: More menu vs existing photo candidate scoped separately; explicit interface/guide language; hidden settings opened through summaries without double toggling; upload waits for completion; missing outline photo replaced by committed orientation fixture; delayed digest intercept limited to sequence validation rather than photo hash; geometry checked against actual delivered pointer coordinates and frame bounds at each event with unchanged 6-digit accuracy; synthetic pickup settings; business announcement/settings cleanup between projects. No UI/engine edits.
- Explicit test-server owner-path startup probe failed before SQLite/secrets with the expected owner-data error (exit 1).

- Owner server: `Start-Ip-Rasm.cmd` → http://127.0.0.1:4194 (API 4331). Do not stop it.
- Playwright browsers not installed; use installed Chrome.
- Previous run left test servers on 4283/4411 (may already be closed).
- New test configs refuse port 4194, reject owner DB paths (including junction ancestors), always create fresh DBs under test artifacts and never reuse an existing server. Test processes share their own generated secrets; no test reads local-secrets.json. HTTP script test servers explicitly enable the safety guard.
- Chrome option is `IP_RASM_TEST_BROWSER_CHANNEL=chrome` (no download). Test worker output is in artifacts/browser; DB is in sibling api-* directories so Playwright cleanup cannot remove it.
- Build passed twice (1875 modules, existing chunk-size warnings). Initial unit attempt failed before collecting tests due Windows sandbox temp-cache rename EPERM; rerun outside that sandbox passed 185/185. Evidence: test-results/phase0-unit.json.
- First full e2e attempt interrupted after discovering a hidden Portrait optimization select. Second interrupted after detecting arbitrary-test-port CORS and regenerated-worker secret mismatch; corrections are in current source. One v2 navigation failure coincided with a build clearing dist: no concurrent dist rebuild during live e2e now. Existing continuation test now enters through the saved guide, as the result-only button is limited to compute-limit outcomes.
