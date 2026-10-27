# P16.3 protected generation contract

Written before implementation, 2026-10-28. This is new work, not a claim that the existing client fitter is protected. P16.2 commit7cfb374 is published, with both scans clean (602export files/85commits;5126history objects/3457text blobs).

## Boundary and compatibility

In explicitly configured server mode, the ordinary three-screen flow sends only the reviewed500px monochrome prepared target and its framing proof, after clear consent. Original photos, cutout masks and source files stay local. A prepared target is still personal image data; never call this “no photo transfer”. There is no silent local fallback in protected mode. Existing local/Expert tools, immutable guides, hashes and offline paid assembly remain compatible. Previously delivered JavaScript cannot be made secret or withdrawn from users. This protects new server-held sequences, not all algorithms or browser source.

The server chooses the existing classic3 engine, exact current standard-kit profile, physical renderer and validated line budget. Client engine/material/pin injection is refused. Existing quality-gated preparation selection runs unchanged in the server worker. No source overlay, new nose feature drawing or quality claim.

## Protocol

- `POST /generation/start`: fixed version, explicit prepared-target-transfer consent, shape, current profile revision,2500/3000/3500lines, canonical250000byte grayscale base64 target, canonical preparation9proof, client-created request identity and192+bit private capability. Strict field/size/number/framing validation before worker allocation. Stable identity+payload retry returns the same job; conflicting reuse fails409.
- `POST /generation/status`: job ID and private capability in JSON body, never URL. Returns only state/progress/expiry or, when ready, a physical1000px static PNG, sequence hash and effort metadata. No segments, steps, checkpoint, fitting residuals or reconstructible ordered animation before unlock.
- `POST /generation/cancel`: capability required. Stops only that queued/running job; does not affect another user's work. Expired jobs are unavailable. No raw errors/target/capability in logs.
- `POST /generation/unlock`: capability plus normal authenticated kit/account session, device ID and stable unlock request identity. One SQLite transaction binds the first owner, invokes the existing signed three-build debit, archives the exact validated guide, and returns guide+receipt. Failure rolls everything back. Another account cannot claim an already bound job. Same guide/account/new device is free; fourth distinct guide is denied. Paid guides use existing archive/offline receipt machinery after release.

Unpaid capabilities are bearer secrets, independently random and never included in query strings, public links, reports or browser assets. Possession grants preview access, not a credit bypass. Auth and capability failures disclose no existence details.

## Execution and retention

One bounded Node worker at a time; a small bounded queue and per-IP/global start budgets. Fitting never runs on the HTTP event loop. Progress is bounded/throttled; cancellation and a hard worker deadline terminate resource use. Worker failure produces a generic safe state. No checkpoints/partial sequence are sent to the browser. Main process validates the completed instruction and the PNG before readiness.

Prepared pixels exist only in the pending worker/queue memory; never persist them in SQLite or logs. Server restart marks unfinished jobs failed; retry is explicit, with no credit spent. Ready unpaid sequences/previews expire after30minutes and are periodically deleted; global row/byte caps are enforced. First unlock archives into the account before any debit becomes externally visible. Existing account erasure must delete owned generation rows and block late writes. Deletion is application-level, not a forensic guarantee for storage/backups.

## Acceptance before promotion

Unit tests: strict recipe/profile/target/capability/idempotency validation; before-unlock responses contain no route; ownership/three-credit/fourth/free-reopen; atomic injected rollback; queue/cancel/deadline/restart/expiry/erasure. Real isolated HTTP plus actual worker parity against the unchanged local engine and physical renderer. Desktop/mobile ordinary upload/adjust/consent/generate/static result/login/unlock/offline resume; session/navigation/cancel races and no client worker/sequence before paid unlock. Config/docs/four locales/native-mode bridge retain the same API. Relevant tests/build/PROGRESS/LOG/commit/scans/push at each milestone; do not mark integration complete after server-only tests.
