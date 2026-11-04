# O07 real Android USB handoff — 2026-11-04

The owner's explicit O07 request temporarily authorizes restarting the frozen handoff if it is down. It does not authorize rebuilding or modifying that release, replacing its DB, using its private test codes, or running acceptance suites against it.

## Result

- Initial authorized GET `/` on4217 and `/api/health` on4657 both failed ECONNREFUSED. Sandbox EACCES diagnostics were repeated with authorization before deciding the services were down.
- Existing SDK: `C:/Users/user/AppData/Local/Android/Sdk/platform-tools/adb.exe`; exactly one authorized USB phone. No installation/download of developer tools.
- `adb install -r output/mobile/ip-rasm-phase16-20261029-be6e489bff81-debug.apk`: **Success**. SHA256 `be6e489bff8103daa5ff2222625e98c174682df3a789fee8f015df1bda63233e`. No signature conflict, uninstall or data reset. Started `uz.iprasm.app/.MainActivity`; Android reports version1.0/code1.
- Existing frozen website4217 and API4657 restored. Host readiness after restart: HTTP200 each. Phone's actual WebView at `https://localhost` fetched API4657 health over USB: HTTP200, sandbox=true, livePayments=false. No kit/login/payment calls performed.
- Temporary4895 WebView inspection forward removed. API4657 reverse remains. The app and frozen servers are left running for the owner.

## Restart design

Double-click `scripts/phone-usb.cmd`. It calls `scripts/phone-usb.mjs` with the repository as its working directory; Node and Android platform-tools must already exist. Exactly one authorized phone is required. For `unauthorized`, unlock the phone and accept the USB debugging prompt, then repeat. For signature mismatch during a future APK installation, ask the owner before any uninstall; this helper never installs or uninstalls.

The helper uses TCP-only readiness checks, starts only absent services and runs `adb reverse tcp:4657 tcp:4657` every time. It never kills an existing server. Local-only restart details are fixed and cross-checked against `output/phase16/preview-launch.json`:

- Website: `output/phase16-owner-20261028-bab0cfaa-dist`, served read-only with the existing Vite preview library, no project config/build plugins or rebuild.
- API code/dependencies/tsx: `output/phase16-private/final-runtime-20261028/runtime`.
- Existing DB: `output/phase16-private/owner-review-20261028-bab0cfaa/database.sqlite`; existing erasure ledger in the same directory. Missing files fail closed; there is no fallback DB, copy, reset or issuance path.
- Existing pepper/payment key read only from that owner-review directory; existing Admin credential extracted in memory from the private manual file. No credentials in command arguments or console output. Mock-only Click/Payme callback credentials remain ephemeral, as in the original launcher; no real payment configuration or live calls.
- API flags match the historical owner launcher: localhost4657, server generation enabled, sandbox payments, push/email disabled, original website origin. Normal frozen API initialization/housekeeping is unchanged. No manual SQL/data edits were made; restarting SQLite is not a promise of identical DB/WAL bytes.

The original `scripts/start-phase16-preview.mjs` is a **one-shot issuer**, not a restart launcher: it copies the master inventory into a fresh DB and issues new codes. Do not invoke it for O07. The new helper is the documented restart-only alternative and never opens the master inventory. Do not change the saved paths to another release or run automated suites here.

Ignored diagnostic log: `output/phone-usb/launcher.log`. Keep it private. Temporary Android netcat probes yielded empty replies, so they were not accepted as evidence. The successful API check used the actual app WebView with its native Origin/CORS; it did not require credentials or a kit code.

## Validation and remaining owner test

Four focused Node tests cover authorized selection, unauthorized/offline devices, zero/multiple devices, and TCP probes sending no HTTP data. They pass outside the sandbox's loopback restriction; initial restricted TCP test failure is retained in the log. `node --check scripts/phone-usb.mjs` passes. No shared app/API source changed; no product/APK rebuild or full suites repeated.

The owner now performs the full photo → adjust → generate → kit unlock → assemble → pause/reopen/offline flow using the private codes in `output/phase16/manual-testing.txt`. The implementer has not spent any of those codes. Full real-phone acceptance, audio quality, physical board likeness and production activation remain unclaimed. P16.1-C votes are still pending; nothing was promoted.
