# Verification evidence

2026-10-04. Latest green checkpoint: production TypeScript/Vite build; 21 Vitest outcome tests; isolated sandbox HTTP checks; six Playwright outcomes; native Android debug compilation. GitHub CI is defined, not yet executed remotely.

| Area | Reproduce | Evidence / scope |
|---|---|---|
| Engine, imports, geometry, material constraints, cancellation, progress | npm test -- --maxWorkers=1 | tests/engine.test.ts: real deterministic generation and reconstruction error reduction, continuous legal paths, shapes/modes/stock and tamper rejection |
| PDF | same unit command | tests/pdf.test.ts; output/pdf/verification-guide.pdf and digital-verification.json; embedded font, SHA-256, actual-size board/pin tiling, 80 ordered steps, 2 confirmed checkboxes, six extracted 50 mm rulers and shared overlap marks; visual review of all pages and final updated cover/steps/template |
| Commerce security/credits | same unit command | tests/commerce.test.ts: order/session ownership, authoritative prices/stock rollback, code/gift one-owner claims, synthetic callback signatures/amount/replay, credit reservation/failure refund/retry/expiry/free download and stale progress |
| Real HTTP contracts | npm run test:sandbox | isolated in-memory server/random temporary keys; output/evidence/sandbox-http.json. No real payments, messages or support delivery |
| Browser flow | npm run build then npm run test:e2e | tests/e2e/workspace.spec.ts: three tests on desktop + Pixel 7 viewport; output/evidence screenshots, downloaded PDF/JSON and benchmark JSON; actual Worker/photo upload, offline reload, confirmed progress, stale-tab guard, shapes/multicolor/aspect, photo candidates/presets |
| Native compilation | npm run mobile:sync then JDK 21 gradlew :app:assembleDebug | output/mobile/ip-rasm-debug.apk, build-evidence.json; 5,240,422 bytes; SHA-256 47a6873befa1aad41a32fe8b78691cfb7bc446ca4cdbf04e91ead5c98f2a976c; sixteen compiled web assets byte-identical to dist; uz.iprasm.app min24/target36 |

Final browser benchmark on this host: original illustration through real PNG upload, 96×96 working image, 120 pins, up to 700 lines; 337 ms desktop, 419 ms Pixel viewport. Named hardware: Intel Core i7-1065G7 CPU @ 1.30 GHz, 16 GiB, Windows x64, Node 24.18.0, Chromium 153.0.8010.12. This is not a physical modest-phone benchmark and not evidence of human portrait likeness.

Native device/emulator interaction, iOS compilation/device checks, physical printing/assembly/QR scans, real merchant sandbox/production callbacks, actual email delivery and hosted CI remain unverified. Each is separate from implemented and automated status in FEATURE_MATRIX.md. Development profiles and optical/thickness/winding estimates remain provisional.
