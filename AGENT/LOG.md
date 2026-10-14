# Work log — agent appends a dated entry after every milestone (newest at the bottom)

## 2026-10-14 — setup
- AGENT/ folder created: MASTER_PLAN.md (plan + rules), PROGRESS.md (state + next step), LOG.md (this file), OWNER_TESTS.md (things for the owner to test).
- Starting point: branch `feat/r1-r2-subjects` (R1/R2 done: 183/183 unit tests, 24/24 targeted e2e desktop + mobile).

## 2026-10-14 — session work reconciled with repository protocol

- Read the original attached roadmap and required diagnostic/input checkpoints. Started from a clean worktree on feat/r1-r2-subjects; created feat/full-roadmap. No commits had been made before this checkpoint; no push/history rewrite.
- Phase 0 implementation: fresh Playwright DB under IP_RASM_TEST_ARTIFACTS, separate browser output, no existing-server reuse, installed-Chrome env option, reserved owner port, isolated secrets propagated to workers, and test-only loopback CORS origin. Test-server guard rejects tmp/data including traversal/junction ancestors. Server startup creates only the configured DB parent; fully configured isolated tests never read/write owner secrets.
- Updated old More-menu navigation and hidden control disclosures in tests, without changing the product UI or relaxing guide/progress assertions. Saved-guide continuation replaces a result-only button that only exists at a compute limit.
- Production builds passed twice; 1875 modules, known chunk-size warnings. Unit evidence: test-results/phase0-unit.json, 185 passed / 0 failed. First sandboxed unit attempt collected no tests because Windows refused Vitest temp-cache rename; elevated rerun passed.
- HTTP checks passed: 37 customer outcomes (including restart/ownership), 67 staff outcomes (6 roles/revocation/no secrets in audit). Their DBs were isolated; later script defaults moved from tmp/* to test-results/*.
- Full browser attempts are incomplete: phase0-full interrupted after hidden select failure; phase0-full-v2 interrupted after isolation CORS/secret errors, plus a dist-clearing build race and obsolete continuation entry. All reports/traces retained. Current phase0-full-v3 is running all 154 outcomes on 4289/4429 with Chrome; last observed 6/154, no failure yet. TypeScript/sandbox session 42989 is pending.
- Owner 4194 service and tmp/data were not touched. No algorithm/default/photo/APK changes, no external photo upload.
- Exact next step: finish current full suite, repair remaining obsolete test navigation, validate a full final run + build, record real results and commit before starting Phase 1 public research.
