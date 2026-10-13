# GitHub readiness audit — 2026-10-12

Read TEST_READINESS_CHECKPOINT.md first for the quality/recovery implementation and exact local test package. This audit adds CI fixes; it does not change the portrait optimizer, material profile, existing sequence/template/progress, or current APK. All latest source changes remain uncommitted in the preserved working tree; current HEAD is2d0e39a427d0ef516ad3b6afde1d670cddce796e. The session mounts .git read-only; no index/branch mutation, commit, fetch, push or publication was performed. Private photographs remain local.

## Observed GitHub state

- Origin is https://github.com/sabdur4hmonov/ipdanid.git. Local branch main's cached upstream reports origin/main gone; this alone would not prove remote deletion.
- Read-only remote queries were then performed with interactive credential prompts disabled. `git ls-remote --symref origin HEAD refs/heads/* refs/tags/*` returned exit0 and no refs. `git ls-remote --exit-code origin refs/heads/*` independently returned exit2 (no matching branch refs), with no network/authentication error in those escalated queries. No published branch could be verified at that time; the evidence does not establish a deleted repository or a successful upload.
- The official GitHub REST API timed out; live repository metadata, branch protection and Actions runs/conclusions are unavailable. Public page lookup also did not return before cancellation. Do not claim GitHub CI is green. Raw compact record: output/github-audit/remote.json.
- Latest whole-head/recovery/test-readiness/CI files are modified or untracked locally. They are not new committed GitHub deliverables. All prior commits and the linked product-completion worktree remain untouched.

## Demonstrated CI defects fixed

The former workflow ran all local Playwright experiments. recovery-ready.spec.ts reads ignored output/portrait-resolved/candidate.json and local target bytes at module import; fine-thread.spec.ts and other experiments also require ignored personal portrait evidence. A public source checkout cannot supply them. Local tests remain available unchanged; their exclusion from public CI is not exclusion from quality acceptance.

New `playwright.ci.config.ts` uses an explicit3-file allowlist: ci-public, optical-render, photo-actions.14 desktop/touch tests use the original built-in illustration, committed colour/transparency fixtures, synthetic algorithm targets and fake browser camera frames. They verify actual Worker generation, progress/reload, validated immutable offline JSON, all3languages, pixel-exact sequence previews and camera capture/cancellation/denial/stale-photo handling. They are software/geometry tests, never real portrait likeness or physical/device tests. `npm run test:e2e:ci` is the new public command. Full local suite remains separately available and still needs ongoing modernization of historical UI cases.

The previous workflow uploaded all output/ and test-results/. output/ intentionally holds personal source photographs, derived portrait crops and private saved experiments on this host. Git ignore would not protect those files from an artifact upload. No such upload was performed. The new workflow permits only .ci-evidence/unit.json and .ci-evidence/browser.json for web verification. Private output, screenshots/traces and saved guides are excluded; only the existing separate compiled Android APK artifact remains. Workflow token permissions are contents:read. Replaced unit default5s timeout with the documented30s allowance for genuinely slow local geometry/optical checks; no assertions were removed. Jobs have30min bounds.

The synthetic optical-render test also now opens My projects before importing an instruction, matching the simplified photo-first UI. Its pixel-for-pixel assertions remain.

## Verification

An isolated source copy was built under tmp/github-audit-2026-10-12. Only source/configuration/scripts/tests/public assets were copied: no original output/, personal photographs, saved projects, local experiment targets or server secrets. Windows denied creating a dependency junction; it was not required. The build resolved the existing ancestor node_modules installation. This is a source/fixture-independence test, not a clean npm installation or a Linux GitHub runner test.

- Fresh-copy TypeScript/Vite production build passed. All31 assets match the live dist/current Android package byte-for-byte: output/github-audit/build.json. Shared product code unchanged, so no APK rebuild was needed for this CI-only increment.
- **14/14 desktop/touch public CI cases passed**,0skipped/failed/flaky,57.947s; output/github-audit/browser.json. Private experimental modules were not collected. The known139domain regressions passed in the preceding source checkpoint; they were not needlessly rerun because domain code did not change.
- Final root TypeScript check and git diff --check verified separately. CI config is included in tsconfig.json. Live GitHub Actions was not triggered or verified.
- Local source changes are backed up separately under ignored output/github-audit/ without photos, dependency folders or .git. Manifest/patch/archive paths are recorded by the final backup command; preserve the whole original working tree too. The backup is local and not uploaded.

## Remaining product work, with scope retained

| Priority | Remaining concrete work | Evidence/status |
| --- | --- | --- |
|1 portrait fidelity|Nose volume/nostrils, lip separation, natural hair highlights, crossing texture; varied original portrait set|v12 strongest one-photo reference retained; v13 rejected/v14 inconclusive; acceptance OPEN|
|1 separate layout hypothesis|Buildable interior hair-area pin experiment with immutable coordinates, numbered physical template and complete routed comparison|Not yet implemented; changes real board and must stay opt-in; no automatic promotion or optimum claim|
|1 physical buildability|Real thread use, usable nail wrap capacity, tension and printed template/portrait assembly|Digital32/160 limits provisional; actual human assembly OPEN|
|2 customer effort/usability|Quality-equivalent simplification and long instructions without losing a single physical action|Prior pruned guide preserved; customer timing/human trials OPEN|
|3 current mobile reliability|Current APK real-device photo/model inference, offline exports/audio/persistence/performance; iOS separate build/device/signing|Current APK packaged/signer checked, not installed; older native evidence historical|
|production services|Actual merchant/payment/message/shipping configuration, reconciliation, selected provider credentials and deployment approval|Local sandbox/session/code/progress/support/admin flows exist; live acceptance OPEN|
|remaining engines/features|MODEL-01 3D layers,QR-01 scannable physical QR,GUIDE-01 kids/cardboard/Ebru assets,BOOK-01 folding;EXP-03 GIF/video/3D-frame export,SOCIAL-01/B2B and other full M0–M7 items|Unimplemented/partial as separately listed in FEATURE_MATRIX; not silently reduced to an MVP|

No exact overall completion percentage is justified: implemented, locally tested, physically validated and production-active states are separate. Don't call the repository/product complete based on14software checks. Next portrait task remains the testable separate interior-pin hypothesis, followed by varied local originals and physical acceptance; production publishing remains owner-authorized only.
