# Opt-in background assembly audio — C18 ACTIVE

## C18a native/core milestone — 2026-10-21

The native/core implementation exists. **Customer controls, real bridge integration, lifecycle/browser acceptance and durable native announced-position reconciliation are still C18b. C18 is not complete.** The customer application continues to use its existing foreground voice/default background pause until that integration is accepted. No old preview or guide has changed.

`assembly-audio/1` is an ephemeral, bounded program derived from the exact validated instruction: all ordered sector routes and localized step text, current announced index, pace/rate, installed offline voice ID, or a deduplicated manifest of exact local recorded clips. It carries no photo/target, caption, customer/account credential, confirmation progress or write capability. The sequence hash and per-start random session bind native state. Speech language is separate from four-locale notification text.

`AssemblyAudioDriver` accepts only the current session/hash/step range/total and increasing native revision. Stop retires ownership synchronously and sends a higher request barrier; delayed start/status/command responses cannot revive an old project. An unavailable engine or vanished service stops ownership and reports fallback; no blind automatic retry/resume. Duplicate response revisions are ignored. There is no confirmation/credit/analytics writer in this module.

`IpRasmAssemblyAudioPlugin` grants a fresh native authority to each WebView plugin instance, stops the old authority, and fences monotonic requests and retired JS controllers. Start requires an active Activity. Destroy stops its own authority; ordinary Activity pause leaves an already explicitly started native session running. Pending engine initialization expires after15seconds. No large program travels in a Binder Intent: it remains in process memory, with only the random session carried to the service.

`AssemblyAudioService` uses the installed platform MediaSession/Notification.MediaStyle and a declared, non-exported `mediaPlayback` foreground service. It owns native TTS or ordered local WAV MediaPlayer playback and its pacing, independent of suspended WebView timers. Next/previous/play/pause/stop from notification/lock screen change announced position only. A phrase finishes before the next line; the configured pace is a minimum interval. Replaying the last line never confirms it.

Guards and cleanup:

- Explicit foreground user start only; START_NOT_STICKY, no boot receiver, no unattended restart, task removal/destroy/stop retire audio.
- Only exact installed offline language voices, no network synthesis or language substitution. Recorded paths are language-scoped local assets with exact SHA256/byte counts and mono-phrase duration bounds;32clips/step,512deduplicated clips,32MiB combined encoded audio,12M-character program,20ksteps. The existing voice manifest must still be complete before any recorded voice becomes selectable. No actual recordings were added.
- WAV assets are packaged uncompressed for native file descriptors. Asset checks run on a bounded single I/O executor and cancelled epochs cannot start playback. Ordered clips retain35ms phrase gaps and duration verification.
- Audio-focus loss (including duck request), unplugged headphones and user pause stop speech, release focus/wake locks and never automatically resume. A paused media session expires after2minutes. Partial wake locks are bounded and released on stop; global screen settings are never changed.
- Stale utterance completion, asset verification, timer, controller, program, request and notification Intent cannot act on a replacement session. Explicit immutable session-bound PendingIntents, private service, no confirmation command.
- Notification removal stops playback. Notification text contains the current sector route, not a project/photo/customer name. It is intentionally visible on the lock screen only for the explicit background feature.

## Actual validation

- Final JS unit: **18/18 passed**, `test-results/phase15-assembly-audio-core-sealed-unit.json`:12new program/ownership cases plus6existing assembly-session cases. Includes actual generated standard-kit sequence routes, three speech languages, recorded dedup/invalid remote path, invalid position/rate/voice, stop-before-start acknowledgement, old project/hash/revision/range, manual-only DTO, delayed status/command, vanished engine and start failure.
- Actual native Java `AudioRequestFenceTest`: **3/3 passed**, Gradle XML `android/app/build/test-results/testDebugUnitTest/TEST-uz.iprasm.app.AudioRequestFenceTest.xml`. Also compiled/run directly against cached JUnit by `scripts/test-assembly-audio-native.ps1`, local run `test-results/audio-native-38d06778f9bd4c17a57f6482de5c1c3d/junit.log`.
- Full native main source and existing Android instrumentation source compile; final offline Gradle unit+instrumentation compilation **BUILD SUCCESSFUL,34seconds**,131tasks. `test-results/phase15-c18-native-offline-final.log`. Instrumentation was compiled, not run on a phone/emulator.
- Initial full offline Gradle unit and instrumentation attempts failed on missing existing transitive Maven cache artifacts, without a code compile error. Existing declared Google/Maven Central dependencies were fetched into this checkout's Gradle cache; the normal run passed2m8s (`phase15-c18-native-cache-repair.log`), then the exact tasks passed offline. No new declared library/version, Android SDK/tool installation, phone installation or system configuration change.
- Historical APK preservation snapshot:91archives still bound to SHA256, `output/mobile/phase15-c18-old-apks.json`. These compile tasks did not assemble/publish a new APK. Final Phase15 assets/APK/signature/PR remain C26.
- Final TypeScript and isolated web build passed:2102modules/19.75seconds, `test-results/phase15-c18-core-build.log`, only output/phase15-dist with native4483/debug1. The new core is intentionally not yet imported by customer playback; default behavior stays unchanged until C18b acceptance. The main-chunk warning remains C23/C25.

No real device/lock-screen/TTS/noisy-room/six-hour acceptance claim is made. Owner recordings/phone remain O04/O07; they do not block implementing C18b with native bridge mocks.

## Platform references

[Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types), [audio focus](https://developer.android.com/media/optimize/audio-focus), [platform MediaSession](https://developer.android.com/reference/android/media/session/MediaSession). The implementation uses available platform APIs without adding a media library dependency.

## Exact next implementation step

Commit/scan/normal feature push this core after the isolated web build. Then wire the actual opt-in control in four locales, cancel ordinary speech when native owns playback, suppress foreground timer/duplicate speech during native playback, preserve default pause, resume/reconcile the latest native state, bind all navigation/voice/profile/unlock changes and manual-only confirmation. Add durable local announced-position checkpoints with project/hash/time guards; app restart defaults background mode to off. Test actual desktop/mobile native bridge mocks and legacy offline assembly, seal evidence, run fresh build and preserved Android compile/APK checks before C18 DONE. Continue C19–C26 autonomously afterward.
