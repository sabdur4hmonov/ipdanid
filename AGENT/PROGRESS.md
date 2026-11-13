# Progress — current state only (keep this file <= 5 KB)

Full history before 2026-11-13: `AGENT/archive/PROGRESS-2026-11-13.md` and `AGENT/archive/LOG-2026-11-13.md`. Read them only when a task needs that detail.

## Current state (2026-11-13)

- Branch `feat/full-roadmap`. Website W1 (face guard, buy screen, visible accounts) and W2 (product website redesign) are done and await owner visual review.
- P16.1 framing: **accepted** by the manager. P16.1-C F2 (face height 0.65, nose tip at (0.50, 0.42), white below the chin) is the default close framing.
- Portrait solver: **classic-reference/4 tuning** (darknessGamma 1.2, face importance amplitude 3) is now the server default for NEW protected works. It runs on the same `classic-greedy/3` engine, chords, guards and renderer, and stored /3 guides replay unchanged. Rollback: `CLASSIC_TUNING=3`. Evidence: `docs/CLAUDE_AUDIT_2026-11-13.md`, `docs/CLAUDE_Q4_2026-11-13.md`.
- Security: admin login lockout (5 failures per client per 15 min, 200 overall per hour, 15 min lock, persistent, audited).
- Physical kit: first circle board is being built by the owner. 4×A3 template: `output/doira-4xA3/doira-taxta-4xA3.pdf`. Thread must match the 0.12 mm profile or be recalibrated.

## Rules that still apply

- Owner messages: short Uzbek. Code/docs: English.
- Never touch `tmp/data`, frozen previews (4217/API4657, 4900/4901, 4920/4921, 4194), old APKs or the private million-code master.
- Normal feature-only pushes to `origin feat/full-roadmap`. No main/force/merge.
- Do not repeat the full 348-case matrix unless shared code changed broadly; run targeted suites plus the full unit suite.

## Exact next step

Q4-apply verification completed locally on 2026-11-14: full npm test 781/781 tests in 170/170 files (468.96 s), tsc -b PASS, protected Vite build 2155 modules PASS (23.87 s). Golden classic-least-squares 5/5, classic-reference 6/6, new tuning 9/9 and protected-deployment 3/3 all passed. Patch applied unchanged; historical docs archived unchanged. No quality fits repeated or solver values altered beyond the supplied patch.

Q4 product commit e23686b was scanned and pushed to origin feat/full-roadmap; remote HEAD verified. NEW protected preview READY at http://127.0.0.1:4940/ (API4941), launcher23012/API25208. Build output/q4-apply-dist is copied into immutable output/q4-apply-owner-20261114-final-dist. Fresh own seed-copy DB/keys/runtime ONLY output/phase16-private/q4-apply-20261114-final. Runtime20780files/381461995bytes/SHA3fd0d9419137dc4607bb01865bc058ccec4dafbf88ba1bb86ea3cb558d2fc8b1. SERVER_GENERATION=1, CLASSIC_TUNING=4, protected client verified; live payments/messages disabled. Exact served HTML and generation/config checked using ONLY4940/4941. Unused3-build test code ONLY output/q4-apply/manual-testing.txt; launch.json and preview-verification.json hold sanitized evidence. New in-app tab2 opened/visually inspected and marked deliverable. Initial browser-tool initialization timeout was recovered; no full browser generation/quality trial or code redemption claimed.

EXACT NEXT: publish this final handoff documentation if pending (normal feature-only commit/scans/push; skip when already published), then STOP for owner review at4940. Preserve this new handoff and every frozen preview/DB/code/progress. Do not repeat Q4 suites or sealed fits without changed code/new evidence. Restart only through output/q4-apply/start-preview.mjs --resume if explicitly needed; never rerun its fresh issuance path against the existing handoff. No autonomous deploy, solver work, Android rebuild or fresh-photo/physical quality acceptance.

After the Q4 handoff:

1. Owner blind review of /3 vs /4 on fresh photos (optional confirmation; /4 is already the default for new works).
2. Choose a product name and domain (owner).
3. Oracle Cloud deploy: server, HTTPS, scheduled off-server backups + restore drill (audit S2), production feature flags hiding non-core features.
