# Local commerce sandbox

This API implements local transactional behavior, not live merchant integrations. It refuses NODE_ENV=production. Development catalog values are examples, not an offer to sell. The browser creation flow is local/free and has not yet been connected to this service.

Run with Node 24 and `npm run server`. Port 4310 binds loopback. Set LOCAL_ADMIN_TOKEN, CODE_PEPPER, SANDBOX_PAYMENT_KEY to independent secure values (at least 32 characters). Keep these private in an ignored local environment. If unset, ephemeral secrets are generated; previous sessions/code hashes will not work after restart. No permanent default administrator credentials exist.

- GET /api/catalog and /api/health: explicitly labeled sandbox/development data.
- POST /api/session: opaque guest bearer token, seven-day expiry.
- POST /api/orders: {items:[{productId,quantity}],address:{name,city,street},requestKey}. Price and stock are server authoritative; UZS amount is whole sums in this sandbox. Shipping/discounts/COD still need configured policies.
- GET /api/orders/:id and POST /api/orders/:id/cancel: ownership enforced; pending stock restores once.
- POST /api/admin/codes: admin bearer; {profile,quota,expiresAt}. Secure readable code is returned once; only HMAC is stored. Redeem at POST /api/codes/redeem {code}; duplicate retry is free.
- POST /api/admin/sandbox/sign: admin only; {event:{eventId,orderId,amountMinor,currency:"UZS",status:"paid",timestamp}} produces exact raw + signature. POST exact raw to /api/sandbox/callback with X-Sandbox-Signature. This is a synthetic payment event and never evidence of real payment. Signature, amount, age, event uniqueness and order transition enforced.
- GET /api/credits; POST /api/jobs/reserve {requestKey,sequenceHash}; POST /api/jobs/finish {jobId,instruction|null}. Null refunds a failure; validated successful instructions remain downloadable at GET /api/instructions/:id without another charge. This is entitlement storage, not a replacement server algorithm.
- POST /api/gifts {credits,expiresAt,requestKey}: transfers existing sandbox credits into a gift reservation; idempotent request retries return the same secure claim token while active. No purchase or message is implied. POST /api/gifts/redeem {claimToken}: one recipient only, free duplicate retry. POST /api/gifts/:id/cancel: buyer-only refund of an unclaimed gift. Expired gifts refund once during cleanup. Tokens are never stored in plaintext or audit logs.
- POST /api/instructions/:id/progress {progress,expectedRevision}: compare-and-swap conflict; stale state never overwrites newer state.
- POST /api/support {subject,body,orderId?}: ownership-linked local ticket. No emails sent.
- POST /api/admin/messages: records queued messages as sandbox_recorded, never sent. Real delivery/retries/templates pending.

Migration 002 expires abandoned reservations after ten minutes and prevents another debit for an already reserved/successful sequence. Failed validation refunds the reservation. Migration 003 implements gift reservations, one-recipient redemption, cancellation and expiry refunds. Migration 001 provides the full initial entity vocabulary. A table is not an implemented feature: gift purchase/delivery UI, regions, moderation, partners, fulfillment, media TTL, promotions and most admin workflows remain pending. SQLite BEGIN IMMEDIATE + foreign keys/unique constraints protect state. Current tests check stock rollback, session/order isolation, code/gift race/retry, signed callbacks/replay, quota refund/download and stale progress.

Provider adapters for Click/Payme must be implemented from selected current official merchant protocols. No generic sandbox callback is called Click/Payme. Production requires auth/identity/retention/cleanup/backups, provider credentials, policies, operational UI and owner's publication approval.
