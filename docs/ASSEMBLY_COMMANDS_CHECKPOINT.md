# Experimental local voice commands — C19 ACTIVE

## C19a native/parser/driver core — 2026-10-21

Native and pure policy/ownership core implemented and tested. **No customer microphone controls or actual bridge UI acceptance yet. C19b remains required; C19 is not complete.** No microphone was activated in these tests.

The policy permits only next/previous/repeat/pause/play, with bounded exact phrases in Uzbek Latin/Cyrillic, Russian and English. It has no confirm, purchase, credit or unlock action. Confidence must be finite0..1, with first result at least0.88; alternatives at least0.5 must agree on the same canonical command. Unknown, conflicting, low-confidence, hidden-control, overlong and cross-language input falls back to manual control. These thresholds are conservative rules, not a measured recognition accuracy claim.

The driver binds an explicit attempt to project/hash/current/total/language. It fences cancelled permission/results/ready events, expires delayed permission and capture, refuses invalid first/last-step navigation and closes the native attempt before dispatching one bounded action. No private project/hash is sent to the recognizer: only controller/session/language metadata. Transcripts are not persisted by this core.

`IpRasmCommandsPlugin` requires explicit runtime microphone permission, an active Activity, Android13/API33+ on-device recognition availability and a language returned by `getInstalledOnDeviceLanguages()`. Older Android and missing/unsupported model inventories fail closed to manual controls. API33 is deliberate: the installed-model inventory is needed to refuse pending/online/download-only models. It never calls a cloud recognizer or model-download API. A single attempt lasts at most8seconds; partial results and audio buffers are ignored, and pause/destroy/cancel closes the recognizer. Native controller request/epoch guards reuse the actual tested AudioRequestFence. Declaring RECORD_AUDIO does not request it at startup; there is no background microphone service.

Actual validation:

- **40/40 unit passed**, `test-results/phase15-assembly-commands-core-unit.json`:20language/phrase cases,12unknown/noise/forbidden cases and8confidence/ownership/permission/deadline/boundary cases.
- TypeScript passed; isolated phase15 web build passed, `test-results/phase15-c19-core-build.log`. Vite reported **100m26s elapsed**; the cause of that unusually long elapsed interval was not established. It is not a portrait-generation benchmark. The new core is not yet imported by the customer UI; existing chunk warning remains C23/C25.
- Native main/JVM guards/instrumentation-source compilation **offline BUILD SUCCESSFUL38s**,131tasks(9executed), `test-results/phase15-c19-core-native.log`. The existing three actual Java fence tests remain the JVM suite. No emulator/phone/real recognition/real permission prompt/APK installation occurred.
- C18 complete implementation remains accepted in its separate checkpoint. C19 UI, lazy Expert entry, explicit opt-in, truthful native-ready indicator, manual fallback and mocked desktop/mobile permission/denial/noise/stale/navigation tests are NEXT.

## C19b exact next step

After this core is committed/scanned/pushed, add a lazy assembly voice-command panel visible only in Menu→Expert mode, default off. Keep the current assembly guide when entering Expert mode from assembly. Add the real native client plus `ready` listener to `driver.ready(session)`. Only a button begins one attempt; pause ordinary/native guide audio before listening. Show canonical recognized action, not arbitrary raw transcript. No physical confirmation callback is passed to the panel.

Add a small cancellation registry called synchronously by controller pause/navigation and manual confirmation; unregister and cancel on panel/view/project/current/language/unlock change, visibility loss and native Activity pause. Late permission must never start a microphone on a new screen. No always-on microphone or browser/cloud SpeechRecognition fallback. Integrate explicit allow/deny/unavailable-model/noisy/ambiguous/stale-ready/result tests with the real isolated kit gate on desktop/mobile; compile native again and run old assembly regressions. Owner device/models remain O07 and do not block mocks/code.

References: [SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer), [RecognitionSupport](https://developer.android.com/reference/android/speech/RecognitionSupport). No model or speech service was invoked on the owner's computer.
