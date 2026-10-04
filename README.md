# Ip Rasm

Real on-device photo-to-continuous-thread instructions. Development build; physical material profiles are provisional. Full scope is tracked in [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md). Read [docs/STATUS.md](docs/STATUS.md) to resume.

## Run locally

Node 22.12+ (this host uses 24.18.0):

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Upload a JPEG/PNG or try the original illustration, edit/crop, select shape and thread mode, and calculate a real path in a Worker. Save, assemble and explicitly confirm progress. Local files do not upload to a server. Export JSON project backups (including progress/edits), TXT sequences, PNG previews and actual-size tiled PDFs. Unlimited local exploration; no payments/credits currently connected.

Compare up to four working photos and six real generated variants. Each photo keeps its own edits during this open page. Save reusable edit/material settings or reuse a library project's parameters. Originals are never persisted; reload requires another upload. Board width/height, pin count, thread thickness and available stock drive the actual computation. PDFs carry a snapshot of confirmed progress.

```powershell
npm run build
npm test
npx playwright install chromium
npm run test:e2e
npm run preview
```

`preview` serves the production build with the offline service worker. The dev server deliberately does not install it. First online visit downloads app/engine/export/font assets. Thereafter saved instructions and PDF work offline. TTS depends on installed voices; text always works. Audio pauses when the page/app backgrounds until native background service support is verified.

## Native mobile

Android and iOS source projects are genuine Capacitor packages. Run `npm run mobile:sync` after web changes. Android requires JDK 21 and Android SDK 36/build tools 36 plus Gradle downloads. Configure `android/local.properties` with your SDK path (ignored by Git). Then:

```powershell
npm run mobile:sync
cd android
.\gradlew.bat assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. This is a development artifact, not store-signed. Native project uses Preferences for progress, Filesystem + native Share for exports, and App lifecycle/back events. Runtime camera/microphone/background audio features remain roadmap work. iOS needs macOS/Xcode; open `ios/App/App.xcodeproj` after sync and configure owner signing. No iOS test or store publication is claimed.

This Windows host successfully compiled the debug APK with JDK 21/SDK 36. A copy is at `output/mobile/ip-rasm-debug.apk`; SHA-256 and exact bundled-web-asset checks are at `output/mobile/build-evidence.json`. No Android device/emulator interaction has yet been tested. Rebuild after source changes; build success does not establish runtime behavior.

## Data and integrity

- Files: 15 MB, decoded dimensions 24 MP and 12,000 px maximum. Only JPEG/PNG headers are admitted before decode. Browsers normalize EXIF via `createImageBitmap`.
- RGB image is reduced to 96×96 for bounded local computation. Profiles limit pin counts and maximum 3,000 lines. Optical greedy gain is measured against target pixels, including color-specific paths and masks.
- Preview/player/PDF/TXT/JSON use the same SHA-256 versioned instruction. Imports are bounded and validated; illegal pins, tampering and unsupported schemas fail explicitly. Updated engines do not mutate saved instructions.
- Progress moves only when confirmed. Playback and jumps announce/display a step independently. Repeated-pin recovery lists all matching steps and their neighboring pins.
- Browser data uses local storage; native data uses Preferences. Clearing app/browser storage removes it. Archive is reversible. JSON backup is the recovery route; authenticated sync is not connected yet.
- Concurrent browser tabs use Web Locks and a stored-snapshot check. A stale tab stops saving and offers backup/reload rather than overwriting newer progress.
- Estimated thread includes wraps/knots/waste. Numeric image error measures simulation only. Kit fit, thread behavior, image likeness and printing still need [human physical trials](docs/PHYSICAL_TRIAL.md).

## Evidence and scope

Unit tests check real error reduction, determinism, legal continuity, all shapes/modes, material limits/cancellation, import integrity and progress conflicts. Browser tests exercise actual upload→Worker→preview→assembly→reload→offline→PDF/JSON. Phone viewport tests are browser tests, not device tests. Generated verification artifacts are in `output/` and excluded from Git to prevent personal images/exports being committed.

No live commerce, emails, support delivery, provider credentials, production hosting or store release exists. Commerce/admin, remaining engines, advanced features and owner dependencies remain explicitly tracked, not permanently omitted. Original source documents are preserved in docs. Research citations describe competitor offers, not independent performance proof.

Fonts: Noto Sans Regular, SIL Open Font License; license and source note in `public/fonts/`. No competitor photos/assets are bundled.

## Local transactional service

Node 24 is required for `node:sqlite`. Run `npm run server` separately for the loopback development API on port 4310; see [docs/SANDBOX_API.md](docs/SANDBOX_API.md) for secret configuration, routes and scope. `npm run test:sandbox` starts an isolated in-memory API and verifies HTTP outcomes with synthetic events. Codes, stock/order ownership, credit reservations/refunds, gift transfers, progress conflicts and local support tickets are real local transactions. The customer UI is not yet wired to this API. No payment provider or email is active.
