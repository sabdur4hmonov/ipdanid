# Android offline workflow and native voice — 2026-10-09

Continues preserved d2baf8c on codex/product-completion. Owner authorized update installation and actual-phone testing, and requested prompt completion so phone connectivity could resume. The owner was told to restore internet immediately after the offline test; no further disconnected-phone requirement. Existing photos, guides, progress, templates and checkpoints remain preserved. No reset, uninstall, push, publication or photo upload.

## Result and scope

The actual Android WebView has no speechSynthesis API or browser voices. Added IpRasmSpeechPlugin and a shared browser/native adapter. Android uses installed, non-network TTS voices only; UZ/RU/EN text remains available, while spoken guidance requires an installed matching-language voice. No automatic language substitution or remote speech synthesis. Browser speech remains unchanged.

Native voice requests bind a JavaScript session and monotonically increasing request ID. Cancellation, navigation, Activity pause, destruction and audio-focus loss stop speech. Stale requests and retired sessions cannot restart it. Initialization is bounded; unavailable voices fail visibly. Spoken playback never confirms physical progress. API24/25 audio-focus fallback compiles; actual device coverage is Android16, not every Android version. Manifest adds TTS service visibility, no new dangerous permission.

## Actual-device evidence

Redmi Note13Pro / 23117RA68G / Android16, authorized USB update installation with unchanged debug signer.

- Final application build's five instrumentation checks initially PASS in 48.129 s: real Worker/progress/bookmark/Activity recreation/native JSON+PDF; local session/support restoration; source outline fit/undo and actual native picker cancellation; native voice/start/cancellation/wrong-language/stale-request rejection; exact packaged engine/font assets.
- Final corrected-harness complete suite PASS: all5 tests in 40.607 s after owner unlocked the phone, with bounded voice completion, ready voice control, current rejection-test request ID and temporary test-window keep-awake. No application change after the browser/build tests; failures above remain archived and are not additional passing coverage.
- Core generation on the final voice APK: 3866 ms in the accepted run (4890 ms in the earlier five-test run) for the bundled synthetic sample. This is not a portrait benchmark or general speed claim.
- Android exposes nine installed offline English voices; native engine reported an actual utterance start and zero speech errors. The owner subsequently confirmed hearing the full repeated English pin guidance. This verifies audibility for that device/language; Uzbek/Russian spoken audio remains dependent on installed voices and separate listening checks.
- Actual disconnected test on the immediately preceding outline APK: airplane_mode_on=1, Wi-Fi disabled, local API USB reverse removed; core generation, saved progress/recreation and native PDF/JSON PASS in 14.931 s. Latest voice APK uses an offline-only voice inventory, but a new complete airplane-mode voice run was not requested after the owner needed internet back.
- Real Android photo picker opened with a native touch and was cancelled. Source pixels, source outline and crop remained exact. No private gallery media was read or granted. Successful camera/photo import and denial scenarios are separate, still open.
- Native JSON/PDF: 19 pages, all501 ordered steps, confirmed10, matching sequence hash 7bf0a3b6496a54964831ef019c3b54b94604e4cd6c6f7c30baf008e66a7db783. Every page rendered and the contact sheet inspected. Screenshots capture only the app window.

Harness corrections are retained, not concealed: initial picker JavaScript click did not constitute native input; native touch fixed it. The first speech test cancelled immediately after start, so engine start alone did not establish audibility. A standalone listening attempt did not observe a start; its exact cause is unproven, and readiness/focus checks and diagnostics were added. The longer audible attempt then used a request ID sampled before repetitions and timed out expecting wrong-language rejection of an already-stale request. Resampling the current request state fixes that test assumption without relaxing application validation. Final updated-harness results are recorded below and in the accepted-device-test log.

One later full-suite attempt ran while the phone automatically locked: power reported Dozing and keyguard showing=true; Activity recreation stayed STOPPED and focus prerequisites failed (1/5 passed). This is retained as a failed run, not counted as passing evidence. Added a temporary keep-screen-on flag only to the synthetic instrumentation Activity window. No global screen timeout changed and no device lock bypassed.

## Browser, build and archive

Ten unique desktop/touch browser outcomes PASS in 77.285 s, zero unexpected/flaky/skipped: input validation and voice fallback/cancellation, source-outline correction and customer flows. Production build PASS in 27.65 s. Earlier full77 domain/PDF tests remain applicable to the unchanged generator; they were not represented as rerun after this voice-only change. Worker remains generator.worker-BZJU0Rfi.js; physical guards, default160/unrotated board and existing immutable sequences are unchanged.

APK output/mobile/ip-rasm-native-speech-debug.apk, 5,863,282 bytes, SHA256 c453bbc51f4aca0e71de71e6f12cb709a597936ace536d165a973706de903a85. All16 dist assets match, native plugin exists in DEX, bundled adapter and outline controls verified. Certificate remains 8e43cfb55a120f18a62cf955d19a5ed40816f34a96c1416b27644b08de500c90. Build/signing scripts deliberately report only compilation/package evidence; separate device/human records establish runtime evidence. Older outline APK is retained.

## Exact continuation

Website http://127.0.0.1:4183/; local API4311, private comparison http://127.0.0.1:5183/output/outline/report.html. Native local account/support requires the local server and adb reverse tcp:4311 tcp:4311; core project generation/assembly/export is independent of that sandbox service. Existing device preferences and project data must stay intact.

Next quality work: inspect the preserved outline report and address the lost facial area using a separately disclosed board/framing comparison. Heart containment shrank the face, so its fewer strands are not accepted quality-equivalent customer-time savings. Nose volume, nostril/lip separation and crossing texture remain open. Prior convergence/contrast/resolution/containment experiments are completed; do not rerun them as new improvements. Quality/buildability precede equivalent route simplification and compute speed.

Full product remains unfinished: diverse consented portrait validation, physical assembly/material/print validation, successful native photo import/camera/denial, background interruptions and additional-device languages, iOS, production providers/roles/payments/fulfillment, other real photo engines and remaining master M0–M7 functions. Local commerce/support/admin are sandbox implementations. No scheduled background execution.
