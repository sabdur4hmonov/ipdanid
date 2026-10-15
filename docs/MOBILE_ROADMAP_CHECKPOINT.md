# Full-roadmap Android checkpoint — 2026-10-15

The final web build was synchronized into Android and the offline Gradle app and instrumentation assembly tasks passed. This is a debug artifact verification, not a phone execution, release, deployment, or production commerce acceptance.

## Verified artifacts

- App: `output/mobile/ip-rasm-full-roadmap-20261014-87d130777145-debug.apk` (35,976,072 bytes).
- App SHA-256: `87d13077714591e342ad63e371936934a1266c0caa7f960c4baefc1c5c6cf2f5`.
- Instrumentation archive: `output/mobile/ip-rasm-full-roadmap-20261014-87d130777145-debug-androidTest.apk` (578,165 bytes).
- Instrumentation SHA-256: `d52eaffc3d9cd161326c736b9a44eef93f47273ca5e0f51748ebc5e287e49fe9`.
- Evidence: `output/mobile/ip-rasm-full-roadmap-20261014-87d130777145-evidence.json`.
- App, instrumentation, and the historical reference app have the same certificate SHA-256: `8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90`.

The artifact series started October14; the final app was built and verified October15. The unchanged native instrumentation task was up-to-date and its exact output was archived and verified; it was not run on a device. Both prior Gradle outputs had been copied before assembly. All67 historical APK archives in `output/mobile/roadmap-20261014-old-apks.json` remain byte-identical. No historical alias was replaced. Build outputs are replaceable; historical archives remain preserved.

## Verification and reproducibility

`npm run build` passed TypeScript and Vite (1955 modules; existing chunk/dynamic-import warnings). `npx cap sync android` succeeded. Existing local JDK21.0.12.1, SDK36 and offline Gradle cache were used sequentially after browser runs finished:

```powershell
$env:JAVA_HOME=(Resolve-Path 'tmp/toolchains/jdk-21.0.12.1+1').Path
$env:GRADLE_USER_HOME=(Resolve-Path 'tmp/gradle-cache').Path
$env:ANDROID_USER_HOME='C:/Users/user/.android'
& .\android\gradlew.bat -p android --offline --no-daemon :app:assembleDebug :app:assembleDebugAndroidTest
```

Gradle succeeded in2m8s:176 actionable tasks,21 executed,155 up-to-date. Existing flatDir warnings remain. No dependency download, phone install, connected instrumentation, release signing change or private-key inspection was performed.

`scripts/verify-roadmap-apk.py --prepare` preserved old files before assembly. Its final run with local Java, build-tools36 apksigner.jar and aapt.exe passed: all40 dist assets byte-identical inside the APK, exact compiled asset set without stale files, required17/18/19/access/voice/checkpoint markers, pinned Arabic font hash and OFL/MIT notices, offline manifest inclusion, empty real recording inventory, no test WAVs or protected photo/output/tmp/comparison/database/key files. aapt confirms `uz.iprasm.app`, minSDK24/targetSDK36. Detailed asset hashes are in the ignored local evidence JSON; APKs/evidence/private inputs are not committed.

Final complete browser regression passed176/176 (88 desktop+88 mobile), zero skips/flaky/unexpected, before the final outline-only ineffective-control removal. Full unit regression232/232 and isolated HTTP customer37/staff67/kit38 passed. The final corrected production build separately passed4/4 desktop/mobile Arabic outline/target exact-export tests in39.2s; report `test-results/final-lettering-controls/report.json`. The mobile outline screenshot was inspected: the ineffective budget is absent, prepared target and actual thin sequence remain distinct, and the full layout fits. No algorithm/sequence/hash change in that last presentation correction.

## Remaining acceptance

There are zero recorded instructors; all590 consented WAV clips are still missing. Device TTS/text fallback remains. WebAudio synthetic test tones verify mechanisms only and are not shipped. Real speaker pronunciation, offline installed-phone playback, physical text readability, 1:1 printed nails/QR, real group/animal/object likeness, and QBRIX comparison require owner inputs/tests.

The native production API endpoint is unconfigured. New paid kit unlocks require a reachable configured HTTPS backend (`VITE_NATIVE_API_BASE`), persistent signing-key operations and pinned deployment trust. The local browser kit flow is tested; this APK does not demonstrate live commercial unlock or payments. Free local generation/preview and legacy local guides remain available. Production provisioning/release and any phone installation are outside this checkpoint.
