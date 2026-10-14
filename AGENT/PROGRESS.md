# Progress — keep this file current (agent updates it after every milestone)

Branch: `feat/full-roadmap`, created from clean `feat/r1-r2-subjects` in this session.
Last update: 2026-10-14 — session checkpoint, Phase 0 validation in progress.
Commits this session before this checkpoint: none. This checkpoint is committed with the test-safety changes; later milestones record its hash.

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

Finish Phase 0 full-suite run `test-results/phase0-full-v3/report.json` (running exec session 10164, preview 4289 / API 4429, installed Chrome). Inspect failures and update tests to current visible navigation/disclosures; do not weaken assertions or change the UI to satisfy old tests. Current run was at 6/154, with no failure yet. Poll session 42989 for the TypeScript + sandbox check. Preserve all failed/interrupted reports. After corrections, run a complete desktop + mobile suite on the final source, build, update this file/LOG.md/OWNER_TESTS.md, and commit before Phase 1.

Reproduction: PowerShell env `IP_RASM_TEST_BROWSER_CHANNEL=chrome`, `IP_RASM_TEST_PORT=4289`, `IP_RASM_TEST_API_PORT=4429`, `IP_RASM_TEST_ARTIFACTS=test-results/phase0-full-v3`, `IP_RASM_TEST_REPORT=test-results/phase0-full-v3/report.json`, then `npm run test:e2e`. Choose fresh unused ports for a later run; existing owner services must not be reused/stopped.

## Waiting for owner

- (none yet)

## Known facts carried over

- Owner server: `Start-Ip-Rasm.cmd` → http://127.0.0.1:4194 (API 4331). Do not stop it.
- Playwright browsers not installed; use installed Chrome.
- Previous run left test servers on 4283/4411 (may already be closed).
- New test configs refuse port 4194, reject owner DB paths (including junction ancestors), always create fresh DBs under test artifacts and never reuse an existing server. Test processes share their own generated secrets; no test reads local-secrets.json. HTTP script test servers explicitly enable the safety guard.
- Chrome option is `IP_RASM_TEST_BROWSER_CHANNEL=chrome` (no download). Test worker output is in artifacts/browser; DB is in sibling api-* directories so Playwright cleanup cannot remove it.
- Build passed twice (1875 modules, existing chunk-size warnings). Initial unit attempt failed before collecting tests due Windows sandbox temp-cache rename EPERM; rerun outside that sandbox passed 185/185. Evidence: test-results/phase0-unit.json.
- First full e2e attempt interrupted after discovering a hidden Portrait optimization select. Second interrupted after detecting arbitrary-test-port CORS and regenerated-worker secret mismatch; corrections are in current source. One v2 navigation failure coincided with a build clearing dist: no concurrent dist rebuild during live e2e now. Existing continuation test now enters through the saved guide, as the result-only button is limited to compute-limit outcomes.
