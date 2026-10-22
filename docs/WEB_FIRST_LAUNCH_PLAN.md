# Web-first launch and account continuity — owner direction, 2026-10-22

Priority: finish the freely positioned background-cutout flow, then improve **actual string likeness** with bounded same-input comparisons. Launch the website first; native publication follows. Do not block web launch on experimental native speech commands/camera checkpoints. C19b/C20 remain tracked but move behind web-critical C21–C25 work.

## Existing code versus work still required

| Area | Existing implementation | Required acceptance / next work |
| --- | --- | --- |
| Image | Local background removal, editable mask, whole-photo composition /9, classic-greedy/3, exact physical sequence preview | Compare approved composition to real sequence on synthetic + local-only owner sources. Inspect eyes/nose/mouth/hair at equal size, background leakage and physical haze; no source overlay or invented details. Do not force face/shoulder crops. Test one quality hypothesis at a time; no repeat of rejected log/sum sweeps. |
| Accounts | `server/customer-store.ts`: email/password registration, salted scrypt verification, account-bound sessions/recovery; `src/customer-api.ts` shared client | Web and app use **one production API, database and stable user ID**. Test fresh browser → native-mode client login with same credentials and exact account ownership. Never copy plaintext passwords/session tokens into a new app. |
| Data continuity | CustomerHub guide archive, explicit project/progress sync, account-owned orders/credits; local assembly cursor | Promote C21 next: last-sync status, retry/queue, restore all immutable guides, paid receipts reissued for the new device without charging twice, confirmed step **and paused cursor**, bookmarks/folders where supported. Inventory remaining local-only fields; do not claim all data migrates today. Conflicts must not overwrite newer work or resurrect deletions. |
| Source photos | Local photo processing, no third-party upload | Before promising cross-device re-editing, implement explicit private source-photo backup/restore with owner consent, size/retention/deletion controls. A saved guide alone does not restore the original editable photograph. Public gallery consent remains separate. |
| Checkout | CustomerHub shop/cart, recipient/phone/address, courier or pickup, server-calculated delivery fee and total, order history; country/currency policy | Keep purchase and delivery inside the customer experience; expose a plain Shop / Orders entry and a kit purchase route from results. Exercise complete mobile order flow, changed quote/retry/stock/address rejection and later order status. Do not invent courier tracking or coverage. |
| Money | Click/Payme sandbox invoice/signature/idempotency and cash/pickup; Admin prices, fulfillment, accounting | Show item total, discount, delivery and final total before order confirmation. Payment status comes from the server; no client “paid” button in production. Live acquiring remains disabled until owner merchant keys/contracts/certification. `PAYMENTS_UZ.md`. |
| Promotions | Existing server-priced discounts/referrals, quotas/expiry and Admin controls (`OFFERS_UZ.md`) | Add a separate Instagram trial campaign with account-bound single redemption and explicit grant type. A percentage discount is not a free build entitlement. First campaign default proposal: one digital full-build unlock; physical kit/delivery remain paid unless owner explicitly configures a funded promotion. |

## Instagram follower trial

Initially the owner verifies a follower manually and sends that person a private unique code through Instagram. No scraping, Instagram password collection, unsolicited automated DMs or automatic follower-status claim. If an official supported integration is chosen later, evaluate its actual permissions first.

Campaign configuration: disabled by default; start/end, total grant budget, per-account limit 1, unique hashed code, grant scope, expiry, audit/revocation and failure-safe retry. Bind grant to authenticated user on claim; existing credits/account must survive moving to the app. Public previews remain free. A digital trial must not silently waive physical-kit or delivery charges. Controls and sandbox tests can be built without live Instagram or merchant credentials. Actual outreach and campaign budget are owner actions.

## Release sequence and acceptance

1. Free composition milestone: real gallery upload → shape → colour cutout/edit/position → exact preview → voice/manual assembly → Rest/offline reopen. Preserve old guides and previews.
2. Web quality checkpoint: fixed reviewed composition, exact renderer and legal connection budget. Show original/cutout/prepared target/physical output; report failures honestly. Model replacement only if real mask failures justify a bounded existing-vs-candidate comparison.
3. C21 account continuity: two isolated clients, same account/credits/orders/guides and exact manual progress; guest-to-account link, expired session, network loss, duplicate upload, stale revision, deletion, logout and private-photo consent tests. Website → app native-mode test before native release.
4. Checkout/promo closure: fresh mobile customer → login → kit → address/delivery quote → promo → sandbox payment → order history, Admin fulfillment, rest/restart. Repeat callback must not duplicate charge, credit, order or promotion redemption. No live money/messages.
5. Web launch candidate: C22 locales, C23 throttled performance, C24 security/privacy/backups, C25 cleanup, web portion of C26 runbook/CI/PR. Owner domain/VPS and acquiring setup follow exact docs; do not merge or deploy without existing authorization for those specific actions.
6. App release: point native client at that same HTTPS API; test account continuity first, then signing/store/phone acceptance. Backend migrations are additive, backed up and version-compatible; app installation is not an account migration.

Status: this is an implementation/launch plan, not evidence that production, Instagram distribution, all-field cloud sync or real delivery/payment integrations have shipped. Track execution in AGENT/PROGRESS.md and C21–C26.
