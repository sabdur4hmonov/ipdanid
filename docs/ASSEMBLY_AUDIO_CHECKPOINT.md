# Opt-in background assembly audio — C18 DONE (code/mocks/compile)

## C18b customer integration accepted — 2026-10-21

The actual four-locale assembly control is wired to the registered Android bridge and native driver. It defaults off, requires an installed matching voice/complete recorded voice and explicit Play, cancels foreground speech/sound, and suppresses duplicate foreground speech/JS autoplay while native owns playback. Browser/iOS show a plain unsupported explanation and retain default background pause. Voice/language/pace/project/view/unlock changes retire the native session; native pause alone preserves the opt-in for explicit resume.

The exact announced index/playing state reconciles on foreground return. Native private checkpoints bind project ID+sequence hash+current+timestamp, expire at read after7days and expose an erasure hook for C21. Additive optional `updatedAt` preserves version1 assembly sessions; only a newer, valid same-project/hash native cursor may override the foreground cursor. App restart restores position with voice/background mode off. Neither path writes confirmed progress. Global account erasure remains C21.

Actual delayed-foreground-speech red test found an old TTS initialization failure disabling an already-started native session. A controller speech epoch now drops old native failures, recorded fallback/completion and browser completion; hidden foreground fallback is refused. The red run is retained at `test-results/phase15-assembly-audio-stale-foreground-red/report.json`. The earlier generic-error UI failure also exposed global error sanitization swallowing the new recovery text; a fixed `assembly-audio/unavailable` code now maps through the safe four-locale error mapper, with unknown bodies still hidden.

Final acceptance:

- **23/23 focused JS unit +1 frozen-evidence guard**, `phase15-assembly-audio-final-unit.json` and `phase15-assembly-audio-evidence-guard.json` beneath test-results. Program/ownership, version1 compatibility, newer cursor/expiry/wrong guide/invalid position, four locales and safe error mapping are covered.
- **Desktop3/3 passed23.312s**, fresh4471/API4614; **mobile3/3 passed25.971s**, fresh4472/API4615. `test-results/phase15-assembly-audio-{desktop,mobile}-final/report.json`. Real isolated kit sign-in/unlock plus injected native bridge, offline native cursor/resume, default hidden pause, manual confirmation only, app restart/no autoplay, four locales/overflow, retired late start, config changes, delayed old TTS error and current engine failure/no automatic restart.
- Old offline assembly/native API regression **4/4 passed47.1s**, fresh4473/API4616, `test-results/phase15-assembly-audio-legacy-final/report.json`. Earlier4/4 pre-speech-epoch run is separate.
- Final TypeScript and isolated build: **2108modules/38.61s**, `test-results/phase15-c18-client-final-build.log`; phase15-dist only/native4483/debug1. Earlier client builds and desktop2/2/6prefinal UI cases are not the latest claim. Main chunk warning remains C23/C25.
- Latest native source/3actual JVM guards/instrumentation-source compilation: **offline BUILD SUCCESSFUL,73s,131tasks**, `test-results/phase15-c18-client-native-final.log`. The final cleanup releases the old Activity/WebView observer and native authority. No phone/emulator test or new APK assembly was performed.
- Frozen `output/phase15/assembly-audio/report.html`:10safe PNGs+2fixed mock-result JSONs+HTML and SHA manifest. EN/Cyrillic mobile control captures reviewed/readable; actual overwrite refusal tested. Future runs use `output/current-assembly-audio`, never replace this accepted report. No owner photo/audio/credential is included.

Owner guide: [ASSEMBLY_AUDIO_UZ.md](ASSEMBLY_AUDIO_UZ.md). Real device/lock-screen/headset/voice/noisy-room/six-hour acceptance remains O04/O07. Existing owner previews/APIs/live assets/91archived APKs remain preserved; final Phase15 APK remains C26. C19–C26 remain open.

## C18a native/core milestone — 2026-10-21

Historical C18a checkpoint: the native/core existed before customer controls and bridge integration were accepted. C18b above supersedes that incomplete state. No old preview or guide changed.

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

No real device/lock-screen/TTS/noisy-room/six-hour acceptance claim is made. Owner recordings/phone remain O04/O07; code acceptance uses the actual native bridge mocks and compilation above.

## Platform references

[Android foreground service types](https://developer.android.com/develop/background-work/services/fgs/service-types), [audio focus](https://developer.android.com/media/optimize/audio-focus), [platform MediaSession](https://developer.android.com/reference/android/media/session/MediaSession). The implementation uses available platform APIs without adding a media library dependency.

## Exact next implementation step

Commit/scan/normal feature push C18b, then implement C19 experimental local-only exact speech commands per the ledger. C21 must wire the existing `clearCheckpoint` hook into global private account/storage erasure; C26 must package/verify the final APK and PR. Do not wait for owner phone/recordings.
