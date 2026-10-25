# C28 private digital trial

Core accepted 2026-10-25. Disabled by default, strict revisioned policy, bounded global promises, 120-bit private random codes stored only as domain-separated HMACs. Authenticated durable accounts may claim once; exact/same-code replay is idempotent, cross-account/cross-code claims are refused. No Instagram automation or physical-kit/order/delivery waiver.

An additive KitStore credit provider spends a valid trial first inside the existing unlock transaction. Physical kit ownership limits, three-build grants, old receipt contracts and device reissue remain intact. Expiry, erasure guard, pending promises, injected SQL rollback and admin permission boundaries covered. Erasure retention registry includes all four new tables; no private plaintext code storage.

Executed:17/17 focused unit tests (trial, kit, privacy registry and erasure restore), TypeScript and isolated2125-module build18.29s. Fresh HTTP1/1 passed5.8s at4520/API4666, including real signed unlock, duplicate/no-credit/foreign-user/guest/admin/query/budget checks. Logs test-results/c28-trial-core-final-unit.json, c28-trial-core-build.log, c28-trial-http/report.json. No full-suite/mobile UI acceptance yet.

Next after core commit/scan/push: lazy four-locale customer claim/Admin policy/batch UI with session-response fences, explicit lost-response recovery, original retry body/key; plain Shop/Orders entry and actual sandbox delivery checkout. No live charges/messages or owner input required. C28 remains ACTIVE.
