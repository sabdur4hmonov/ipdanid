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

EXACT NEXT for Q4: commit, export/history scans and normal feature-only push, then start a NEW isolated sandbox preview at http://127.0.0.1:4940/ (API4941). Build: output/q4-apply-dist. Private test code and launch evidence will be in output/q4-apply/manual-testing.txt and launch.json. Do not reuse frozen preview DBs or million master. Check launch.json before any repeat; record actual readiness after launch, then STOP for owner review. No Android, production deployment or fresh-photo quality acceptance is claimed by Q4-apply.

After the Q4 handoff:

1. Owner blind review of /3 vs /4 on fresh photos (optional confirmation; /4 is already the default for new works).
2. Choose a product name and domain (owner).
3. Oracle Cloud deploy: server, HTTPS, scheduled off-server backups + restore drill (audit S2), production feature flags hiding non-core features.
