# Resume checkpoint

2026-10-04, Asia/Tashkent. First implementation session; complete master brief still governs the full product. This is a verified development increment, not a completed product or permanent MVP. Read ROADMAP.md, FEATURE_MATRIX.md, DECISIONS.md and BLOCKERS.md. Original handoff documents in docs are unchanged. Do not repeat clone/setup or assume any account credentials.

## Working now

- M0: empty workspace and remote inspected; no applicable AGENTS.md or pre-existing work; intended origin cloned. Requirements mapped across M0–M7. CI configured, not remotely run. No GitHub push or publication.
- M1: genuine deterministic RGB optical thread minimization in a Worker; JPEG/PNG validation/editing; immutable SHA-256 instructions shared by preview, player, saved progress and every export. Local library/confirmed-versus-announced progress, recovery, JSON/TXT/PNG and font-embedded tiled PDF work.
- M2: circle/rectangle/heart and light/dark/three-color real paths, actual dimensions/pin count/thread/stock controls, legal concave heart connections and minimum pin spacing, color knots and length/time estimates, original sample, four in-memory photo candidates, six immutable variants, reusable settings, library parameter reuse/archive/restore. UZ/RU/EN working UI/PDF, language-specific system TTS with text fallback, original synthesized sound, explicit pin occurrence recovery, offline reload/export and two-tab overwrite protection.
- M3: genuine Capacitor Android/iOS projects, native Preferences/Filesystem/Share/lifecycle code. Latest Android debug APK built successfully and all sixteen bundled web assets checked byte-for-byte against dist. Native runtime/device/audio/permission testing and iOS compilation remain unverified.
- M4 foundation: SQLite migrations 001–003, opaque guest sessions, server prices/stock/order ownership, HMAC code issuance/redemption, credit job reservation/validation failure refund/deduplication/expiry/free downloads, server progress revision conflicts, gift credit transfers/one-recipient claims/cancellation/expiry refunds, synthetic signed payment callbacks and local support/message records. These are tested loopback sandbox transactions. Customer/admin UI, durable identity and real providers are not connected.

## Latest verification

- `npm run build`: passed strict TypeScript and production bundle. PDF renderer is lazy loaded; its ~1.15 MB chunk produces a size warning, not a failed build.
- `npm test -- --maxWorkers=1`: 21 passing engine/PDF/commerce outcome tests across three files.
- `npm run test:sandbox`: passed isolated HTTP authorization, code ownership, server-price tampering, synthetic callback idempotency, gift transfer/one-recipient retry, local support and no-sent-message assertions.
- `npm run test:e2e`: six passing checks across desktop and Pixel 7 browser viewport. Real PNG upload/Worker/hash consistency, explicit confirmation/reload/jump, repeated-pin recovery, offline PDF/JSON/re-import, two-tab stale progress protection, rectangular multicolor/material dimensions, photo candidate edits, persisted settings and aspect-correct PNG/library parameter reuse.
- PDF visual review plus digital extraction: nine pages; all eighty steps ordered; confirmed 2/80 snapshot; embedded Cyrillic/no replacement glyphs; six exact 50 mm rulers; repeated matching overlap marks. No actual printer or assembly trial.
- Latest browser benchmark: named Intel i7-1065G7/16 GiB Windows host, Chromium 153, 96×96 input/120 pins/requested 700 lines. Exact durations are in output/evidence/*-benchmark.json. A phone viewport uses this same host; it is not a modest physical phone measurement.
- Android `:app:assembleDebug`: successful, SDK 36/JDK 21, min SDK 24/target 36/package uz.iprasm.app. No connected Android device, emulator run, iOS build, store signing or production deployment.

## Files and run commands

`npm run dev` → http://127.0.0.1:5173. Production preview on http://127.0.0.1:4173 enables service-worker offline tests. `npm run server` separately starts the loopback sandbox; configure independent private secrets as documented in SANDBOX_API.md. Web UI currently works fully locally and does not connect to commerce API.

Evidence is generated under ignored output/: browser screenshots/benchmarks/exported guides, PDF verification, sandbox-http.json; `output/mobile/ip-rasm-debug.apk` and build-evidence.json. Personal photos, generated outputs, native build caches and secret environments are excluded from Git.

This host's native build uses portable JDK in ignored tmp/toolchains, SDK at C:/Users/user/AppData/Local/Android/Sdk and ignored tmp/gradle-cache. Run web build, `npx cap sync`, then gradlew with JAVA_HOME pointing to JDK 21. Use low-memory sequential settings already in android/gradle.properties. Do not alter unrelated apps/system settings; initial parallel native/browser runs exhausted Windows virtual memory.

## Exact next task and remaining scope

Next independent task: finish M2 speech cancellation/playback outcome verification and broader image orientation/transparency/extreme-input fixtures; localize remaining exception states. Then connect the tested M4 session/code/entitlement/progress/support contracts to an explicitly labeled local sandbox customer flow, with offline errors and revision conflict choices. Never make purchases or sends appear live.

Continue M3 native runtime and background audio on an available device; no device evidence is currently available. M4 still requires cart/shipping/discount/returns/fulfillment, durable auth/account recovery, full admin/RBAC/audit workflows, real provider-specific merchant adapters, transactional delivery retries, gift purchase/delivery UI, backup/retention/security work.

M5 remains implementation work: independent brick inventory/grid engine, diamond spacing/grid engine, connected-region paint engine, text/model/QR generation and real-size scan evidence, original guided catalog/media, feasible book-folding engine. M6 remains animation/video and 3D geometry exports, consented community/moderation/reviews, referrals/B2B/regions/contribution analytics and experimental hands-free/camera workflows. M7 needs broader CI/security/device/performance and human physical trials. Every item stays in FEATURE_MATRIX; no table or disabled card counts as a working engine.

External dependencies are detailed in BLOCKERS.md. No physical validation or production-active integration exists. Owner publication, merchant/signing/store credentials and real spending need consequential approval when actionable. Background continuation is not scheduled.
