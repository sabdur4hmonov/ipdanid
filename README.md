# Ip Rasm

Real on-device photo-to-continuous-thread instructions. Development build; physical material profiles are provisional. Full scope is tracked in [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md). Read [docs/STATUS.md](docs/STATUS.md) to resume.

Portrait mode shows the exact local grayscale target and lets you place the face region. Stock is a supply estimate; shortages are shown rather than reducing quality. The 20,000-line ceiling and bounded continuation stages control compute, not material consumption. Every stage creates a new sequence and keeps confirmed progress attached to its original hash. Exact-photo comparisons are local under ignored `output/portrait/report.html`; they do not establish physical likeness or production readiness.

Upload/camera and advice are available in UZ/RU/EN. Local photo preparation automatically composites a white background using packaged models in a Worker, with manual correction, restore/undo, original/prepared review and all-person fitting. Reviewed face/eye/nose/mouth proposals must be inspected before use; missed faces and mask edges can require correction. No photo uploads or CDN inference occur. Background processing does not guarantee likeness. See [docs/PEOPLE_FEATURES_CHECKPOINT.md](docs/PEOPLE_FEATURES_CHECKPOINT.md). The earlier manual-only experiment in BACKGROUND_CHECKPOINT.md is historical, not the current preprocessing implementation.

For optional string-art detail preparation, enable **Prioritize portrait → Separate facial contours**. **Retain more original shading** uses bounded local contrast; disabling it selects a much lighter contour style. Review the exact target first. Both create different immutable sequences; savings against different tonal targets are not quality-equivalent. Native facial detail improved on one owner photo but common physical-scale errors remain mixed, so default tonal processing and quality/physical acceptance remain unchanged. See [docs/PORTRAIT_DETAIL_CHECKPOINT.md](docs/PORTRAIT_DETAIL_CHECKPOINT.md).

## Run locally

Experimental global portrait fitting can remove misplaced strands and reroute a new immutable variant. It preserves its continuous comparison basis and never transfers old confirmed steps. Local same-source comparisons, enlarged facial regions, rejected trials and winding guards are documented in [docs/PORTRAIT_FIDELITY_CHECKPOINT.md](docs/PORTRAIT_FIDELITY_CHECKPOINT.md); report: ignored `output/fidelity/report.html`. Nose/mouth definition and physical winding validation remain open.

Node 22.12+ (this host uses 24.18.0):

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:5173. Upload a JPEG/PNG or try the original illustration, edit/crop, select shape and thread mode, and calculate a real path in a Worker. Save, assemble and explicitly confirm progress. Original photos never upload. Export JSON project backups (including progress/edits), TXT sequences, PNG previews and actual-size tiled PDFs. Local generation is free. Account & shop connects the optional local sandbox; uploading an instruction there is explicit and uses sandbox credits, with free repeat downloads.

For the complete local customer interface, run `npm run build` then `npm run local`. It starts the API on 4311 and production website on **http://127.0.0.1:4183**. Use these ports for this increment; existing 4173/5173 pages can show an older build. Node 24 is required. The sandbox catalog and payment/order/support actions do not charge money, ship goods or send messages. See [docs/PRODUCT_COMPLETION_CHECKPOINT.md](docs/PRODUCT_COMPLETION_CHECKPOINT.md).

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

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. This is a development artifact, not store-signed. Native project uses Preferences for progress, Filesystem + native Share for exports, and App lifecycle/back events. Upload/camera controls and picker cancellation have earlier device evidence; current packaged model/paint inference and successful personal capture still require owner device trials. Background audio and microphone features remain roadmap work. iOS needs macOS/Xcode; open `ios/App/App.xcodeproj` after sync and configure owner signing. No iOS test or store publication is claimed.

This Windows host successfully compiled the debug APK with JDK 21/SDK 36. The latest built copy is `output/mobile/ip-rasm-paint-debug.apk`; all31 packaged assets and its signature are audited in `output/paint/build-evidence.json`. Earlier builds were installed/tested on the owner's Android phone; this latest model/paint build has not been installed. Device execution results and exact continuation are tracked in [docs/PAINT_RENDER_CHECKPOINT.md](docs/PAINT_RENDER_CHECKPOINT.md).

Use the scoped tasks `./gradlew.bat :app:assembleDebug :app:assembleDebugAndroidTest`. Tests cover packaged assets and actual WebView/Worker/Preferences/native exports, plus native sandbox session/support. To reach the computer's local sandbox while USB-connected, run `adb reverse tcp:4311 tcp:4311`. Only the debug manifest permits cleartext loopback; production mobile networking/provider configuration remains open. No personal photo or external message is used by the device tests.

## Paint by numbers

Open **Mozaika / Grid crafts → Raqamlar bo‘yicha bo‘yash / Paint by numbers**. Upload or capture a photo, inspect local background correction and choose a palette, rectangular canvas and minimum region size. The Worker generates actual connected colour territories and cell-edge contours. Physical labels print only when their measured clearance fits; narrow regions have a warning and selectable reference coordinates. Colour matching and paint consumption are not calibrated; geometric area is shown.

Confirm/unconfirm regions in any order, undo progress, save/reopen and export validated JSON backups, region CSV, actual-size SVG and UZ/RU/EN tiled A4 PDFs. Use printer scale100% and inspect the50mm ruler before any assembly. Paint has its own20-project/8MB library and revision-conflict protection. Archive/delete/folders and cloud sync for paint remain open. Physical printing/painting and current native share/progress are not yet accepted.

The shared thread renderer also corrects optical previews of unchanged v10/v11 guides. This display repair does not establish improved facial likeness. Current evidence and remaining work: [docs/PAINT_RENDER_CHECKPOINT.md](docs/PAINT_RENDER_CHECKPOINT.md).

## Data and integrity

- Files: 15 MB, decoded dimensions 24 MP and 12,000 px maximum. Only JPEG/PNG headers are admitted before decode. Browsers normalize EXIF via `createImageBitmap`.
- Computation resolution is selectable (160 default, 192 experimental). Limits depend on the selected materials/engine; current controls allow up to 20,000 lines. Optical gain is measured against target pixels, including color-specific paths and masks. A higher limit does not prove higher likeness.
- Preview/player/PDF/TXT/JSON use the same SHA-256 versioned instruction. Imports are bounded and validated; illegal pins, tampering and unsupported schemas fail explicitly. Updated engines do not mutate saved instructions.
- Progress moves only when confirmed. Playback and jumps announce/display a step independently. Repeated-pin recovery lists all matching steps and their neighboring pins.
- Browser data uses local storage; native data uses Preferences. Clearing app/browser storage removes it. Archive is reversible. Projects support folders, name/hash search and exact-step bookmarks. JSON backup remains available. Optional account upload/download and explicit progress push/pull use server ownership and revision checks; conflicts do not silently overwrite a guide.
- Concurrent browser tabs use Web Locks and a stored-snapshot check. A stale tab stops saving and offers backup/reload rather than overwriting newer progress.
- Estimated thread includes wraps/knots/waste. Numeric image error measures simulation only. Kit fit, thread behavior, image likeness and printing still need [human physical trials](docs/PHYSICAL_TRIAL.md).

## Evidence and scope

Unit tests check real error reduction, determinism, legal continuity, all shapes/modes, material limits/cancellation, import integrity and progress conflicts. Browser tests exercise actual upload→Worker→preview→assembly→reload→offline→PDF/JSON. Phone viewport tests are browser tests, not device tests. Generated verification artifacts are in `output/` and excluded from Git to prevent personal images/exports being committed.

No live commerce, emails, support delivery, provider credentials, production hosting or store release exists. Commerce/admin, remaining engines, advanced features and owner dependencies remain explicitly tracked, not permanently omitted. Original source documents are preserved in docs. Research citations describe competitor offers, not independent performance proof.

Fonts: Noto Sans Regular, SIL Open Font License; license and source note in `public/fonts/`. No competitor photos/assets are bundled.

## Local transactional service

Node 24 is required for `node:sqlite`. `npm run local` starts both services, or use `npm run server` separately on loopback port 4311. See [docs/SANDBOX_API.md](docs/SANDBOX_API.md) for private stable configuration, routes and scope. `npm run test:sandbox` and `npm run test:customer:http` use isolated test databases. The connected UI includes guest/account login and recovery, codes/gifts, cart/orders/returns, support replies, explicit instruction/progress sync and protected local administration. No payment provider or email is active; full production RBAC and deployment remain pending.
