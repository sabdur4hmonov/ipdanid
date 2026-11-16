# P1 — Oracle production readiness

Manager: Claude. Implementer scope: one readiness milestone, then stop. Started at b98c16c; no cloud deployment, provider activation, solver change, Android packaging or private million-master access.

## Server-owned feature policy

`FEATURES` is an exact comma-separated allowlist read once by the server. Production defaults to none; Compose explicitly supplies blank when unset. Bare development without this variable retains historical enabled features. Unknown/duplicate names fail startup. `/api/features` exposes only the versioned boolean map. The client starts closed, validates that response and fails closed when unavailable; the core offline assembly path does not depend on that endpoint. Client hiding is not an authorization mechanism.

| Flag | Surface / API boundary |
|---|---|
| mosaic | Mosaic/brick tools and products |
| diamond | Diamond tools and products |
| paint | Paint tools/products |
| book | Book-folding tools/products |
| qr | QR craft studio |
| models | Solid/3D model studio |
| workshops | Tutorial/workshop tools, guided product family |
| lettering | Dedicated text/lettering studio |
| partner | B2B/partner portal and customer/staff APIs |
| commissions | Commission customer/staff APIs and panels |
| push | Push settings, dispatch adapter/timer, config/device/staff APIs |
| gallery | Customer gallery, moderation and public/private image APIs |
| expert | Expert/Mutaxassis entry points |
| analytics | Opt-in analytics runtime, customer/staff APIs/panels |
| digital | Digital journeys/purchases and staff policies |
| gifts | Gifts/claims and customer APIs |
| offers | Promo/referral panels and customer/staff APIs |
| inbox | Transactional delivery adapter/timer, inbox/mail APIs/panels |
| trials | Trial claims/codes/policy/staff APIs/panels |
| photoBackup | Optional private source-photo cloud storage/API; local drafts remain core |

Core landing/photo/adjust/free preview/buy-kit-code/assembly/player/account/Admin/support/settings/kit profiles remain available. Disabled optional API namespaces return404 before auth, body decoding and OPTIONS. Existing authentication/rate limits remain independent. Catalog and checkout also reject disabled product families or string bundles containing disabled components. Local-only studios have no corresponding server generation route to disable. Paid guided/digital subflows retain their existing capabilities/dependencies; saved immutable guides and progress are not rewritten or deleted.

API endpoint data and menu visibility come from the same policy. Existing code/tests remain. Optional engines can be re-enabled without rebuilding the frontend by changing the allowlist and restarting through the deploy wrapper.

## Backup and restoration

`scripts/production-backup.mjs` uses the existing Node SQLite online-backup primitive and quick_check while the writer remains open. It snapshots the application first, privacy journal second. This is a consistent snapshot of each DB, not an atomic transaction spanning two DBs. The app DB includes the original `kit_signer` private/public keys. A versioned encrypted manifest includes CODE_PEPPER, SANDBOX_PAYMENT_KEY, ADMIN_PASSWORD_HASH and non-secret deployment selection together with file sizes/SHA256. Missing signer or required secrets refuses creation.

Final archives are AES-256-GCM with fresh nonce and authenticated version header. `BACKUP_ENCRYPTION_KEY` is an independent random32-byte key, never placed in its own archive; keep it securely off-server. Plain consistent snapshots and restore-authentication staging use private temporary directories; Compose provides a tmpfs. The final backup volume contains encrypted `.ipb` files. The inactive restore destination deliberately contains plaintext DBs/private runtime-secrets.json with0600/0700 permissions; protect/remove it after a drill.

Daemon: startup and03:00 UTC daily; retry failures after10minutes. Retention preserves the newest archive for each of14 distinct daily dates and8 UTC Monday-based weekly buckets, plus8 predeploy archives. Names are narrowly matched; unrelated files are untouched. This is retention by successful snapshots, not a promise that every calendar day succeeded. Payload bound2GiB, private scratch tmpfs5GiB; monitor RAM/disk and plan before exceeding this tested design.

`deploy.sh` builds first, then requires a successful predeploy archive/upload before replacing existing services. Backup failure stops deployment. An explicit FIRST_DEPLOY acknowledgment is available only when there is no existing API container, for the documented first clean master import; preserve that import's off-server original. Orphaned volumes otherwise fail closed when no backup is possible. Direct manual `compose up` can bypass an operator script: use the documented wrapper for updates.

Restore authenticates the complete archive before publishing results, verifies file hashes/SQLite/signer, and refuses any existing destination. It never automatically replaces the active DB. Preserve and replay the newest authenticated erasure journal when restoring an older app snapshot; restoring both old files cannot know erasures after that backup. RPO/off-server freshness remains an operational obligation.

Optional OCI S3-compatible path-style HTTPS PUT uses SigV4, an explicit full payload hash/Content-Length, no redirects/public ACL, bounded network timeout. All location/credential fields are required together; unset means no upload. Upload failure retains the local archive and fails the predeploy operation. Local14/8 pruning does not delete remote objects; configure a private bucket lifecycle separately. Real OCI credentials/bucket/upload remain unverified; tests use a clearly labeled transport mock.

## Deployment and contacts

`scripts/setup-production-env` is a bash wrapper for the existing hidden-TTY password setup. It refuses an existing .env, uses umask077/chmod600, creates independent runtime/backup keys and explicitly writes CLASSIC_TUNING=4/FEATURES=. No password/key arguments or output. Legacy .env.production remains supported; existing deployments must add a separate backup key securely rather than regenerate their DB pepper. The beginner guide is `DEPLOY_ORACLE_UZ.md`.

Storefront settings add optional validated `sellerTelegram`; existing `sellerPhone` is reused. Blank values retain the supplied placeholders in owner-contact.ts. Customer/footer/preview-purchase links resolve current Admin settings through the public versioned storefront cache. Old saved settings/order snapshots remain compatible; no rebuild is required for contact edits.

## Verification and limits

- Final targeted22/22 across6files: feature allowlists/route mapping/contact persistence, encrypted online restore/retention/corruption/S3 mock, business/protected-deployment, all physical standard-kit cases and actual production HTTP (including disabled nested bundle components).
- Four accepted desktop/mobile browser cases:2 core photo→real protected preview→kit unlock→player/contact editing;2 explicit expert/diamond/gallery re-enabling with mosaic absent. Screens inspected at ordinary size. These are new isolated5080–5085 services, not frozen owner previews.
- Buildx API and Caddy images build/load for linux/arm64; target-native runtime dependencies keep tsx/esbuild correct while portable TS/web compile on the build CPU. QEMU executes Node ARM64, node:sqlite/tsx production startup, /4 configuration, encrypted backup/restore/signer verification and Caddy/proxied core-only configuration. Actual A1/Ubuntu VM performance, public TLS/DNS/firewall, physical assembly and Android remain unverified. All disposable test containers/network were removed.
- Interactive setup executed on ARM64 Linux private tmpfs: hidden synthetic password hash independently verified, .env0600, independent keys, explicit tuning/core-only flags. Compose config and bash syntax pass. Mock-Docker deploy drill verifies backup-before-up, abort on backup failure and the guarded initial-import exception; it does not deploy a real service.
- Diagnostics retained: early contact literal typing, incorrect KitStore method/test request key and a new bundle fixture's extra revision field were corrected; one initial enabled-browser test used `Gallery` instead of the actual `Customer gallery` localized label. The first fully emulated build was deliberately interrupted after its TypeScript step proved slow; native build/target runtime separation then passed actual ARM64 execution. Two unit attempts hit the unchanged5s timeout in an old PDF-label test. Its ~177,840 matcher allocations were replaced with identical all-pairs/bounds collection (including NaN rejection and exact172,080 comparison count). A third full attempt hit the old combined sheet/tiles/stickers5s export timeout; those independent exports are now three tests (+2 total tests), retaining every page/nail/calibration assertion and all original assertions. A subsequent whole-tree AST audit took5606ms and tutorial multi-PDF export5101ms, exceeding the incidental5s runner default. The functional runner default is now bounded30s, with15s for the AST coverage scan; explicit product performance/security/cancellation limits remain unchanged. No assertion, geometry or solver value was removed/relaxed. Initial mock deploy fixture attempted an executable on noexec tmpfs; an exported mock function preserved that protection.

Final full unit suite:791/791 tests in173 files,857.30s, zero failed/skipped; includes unchanged classic-least-squares5, classic-reference6 and protected-deployment3 golden/security cases. Final tsc -b and2157module protected production build53.50s pass. All124 final files compared with the browser-tested build:123byte-identical; only sw.js precache array order differs, with identical cache version, file set and executable code after sorting that array. No source alteration to force equality. Exact build and publication evidence is recorded in AGENT/PROGRESS.md and docs/validation/p1-20261116.json; ignored output/p1/publication.json records final local/remote HEAD. Earlier failed/partial attempts remain diagnostics, not passing runs. Passing software/emulation checks does not activate Oracle or prove universal/physical portrait quality.
