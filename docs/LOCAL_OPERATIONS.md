# Local customer service, staff access and backup

This is a local sandbox. Payment, delivery and outbound messages have no production integration. Core portrait generation, assembly and exports do not require this customer-service backend. All earlier instructions, progress and Android preferences remain intact.

## Start

From this checkout run `npm run build`, then `npm run local`. Website: http://127.0.0.1:4183/; API: http://127.0.0.1:4311/api/health. Development/private evidence uses port5183. Keep private portrait reports on loopback. `tmp/data/local-secrets.json` contains the existing owner credential and two matching local service secrets. Do not commit or distribute that file. The Administration screen accepts its owner token; credentials are held in memory, not browser persistent storage.

## Scoped staff credentials

Only the owner can issue, list or revoke staff access. Choose a name, role and duration of1–30 days. Copy the newly issued token once; the server stores only its HMAC-derived hash. Refresh lists metadata, never credential values. Revocation/expiry is enforced on each API request. A previously open screen cannot authorize a revoked credential.

| Role | Allowed duties |
|---|---|
| Catalog | Read/update catalog and stock |
| Support | Read/reply to local support tickets |
| Fulfillment | Read orders; record tracking/fulfillment |
| Finance | Read orders; sandbox payment/refund actions |
| Codes | Issue/list/revoke kit codes |
| Manager | Business duties above, audit and sandbox message outbox |

No staff role can manage credentials. Unknown admin routes are denied until a server permission is assigned. Business/audit changes record the actual staff identifier. Replies/outbox entries are local records; no email/SMS is sent.

## Encrypted backup

Run `npx tsx scripts/local-backup.ts create NEW-FILE.iprasm-backup`. First set `IP_RASM_BACKUP_PASSPHRASE` in that process environment to a private16–1024-character passphrase, ideally supplied by a password manager. Never put the passphrase in CLI arguments, documentation, Git or logs. A lost passphrase cannot be recovered. Preserve its independent recovery copy.

The CLI requires an existing database and matching local configuration. It creates a consistent SQLite snapshot with `VACUUM INTO`, encrypts the snapshot and three matching secrets with AES-256-GCM and scrypt, and refuses to overwrite an existing backup. Current supported database size is64MiB and schemas1–5. `DATABASE_PATH` can select the current database; explicit environment overrides for the three secrets must match the running service. The backup contains customer/service records and saved instructions; local source photos and device/browser-only project data are separate and are not included.

Restore with `npx tsx scripts/local-backup.ts restore FILE.iprasm-backup NEW-DIRECTORY`. The destination must not exist. Authentication happens before writing; integrity/schema checks run on the restored database. An invalid restored database is an inactive quarantine directory, never an active replacement. The CLI writes the corresponding `local-secrets.json` only after integrity succeeds. Existing active service data is never replaced.

Before activating a restored snapshot, stop the sandbox service, preserve the current database/configuration, and verify the inactive copy. Launch the API with `DATABASE_PATH` pointing to that copy and all three secret environment values loaded securely from its matching configuration. Do not pair a restored database with newly generated secrets: code digests, staff access and sandbox payment signatures depend on them. Restarting the service alone is not a restore rehearsal; verify customer session, credit, scoped staff authorization and instruction/progress records first. The automated CLI rehearsal uses synthetic records, never the owner's live database.

## Verification evidence

67 isolated staff HTTP checks and37 existing customer HTTP checks passed. Desktop/mobile staff issuance, permission-limited UI and revocation passed. Backup tests authenticate complete encrypted files, reject tampering/wrong passwords, preserve synthetic sessions/credits/staff access, and exercise actual create/restore CLI commands with overwrite refusal. This is local functionality, not production deployment acceptance.
