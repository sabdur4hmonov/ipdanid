# Website-first handoff — 2026-10-26

Current local website: http://127.0.0.1:4201/, isolated API4483. Source commit `f1901e25ac23bcdbe9309861aa3b4551571d7a8e`. The snapshot `output/phase15-release-candidate-dist` is immutable; keep its launcher and all earlier previews running. Credentials remain only in ignored `output/phase15/manual-testing.txt`. Never publish that file.

## Verified behavior

- Unlimited static previews; a distinct passwordless kit code per physical box, default three distinct full guide unlocks.
- Reopening the same paid guide does not spend another credit. A fourth new preview remains free, while its assembly instructions stay locked.
- Canonical signed access guards player and sequence exports, including ordered video/GIF. A failing-first browser assertion exposed enabled animation exports; `SequenceAnimation` now checks access both before start and when permission changes. Legacy guides retain their existing contract.
- Telegram and phone ordering contacts are explicitly later. None were invented, requested or messaged.

## Executed evidence

[GitHub verification run40289120510](https://github.com/sabdur4hmonov/ipdanid/actions/runs/40289120510) succeeded for both web and Android. Web ran TypeScript/Vite, dependency high-severity audit, locale and bundle checks, **662 unit tests in145files**, sandbox/customer HTTP checks and **16 public desktop/mobile cases**, with zero skipped/flaky/unexpected cases. These are remote checks, not a completed local private-photo matrix. The new contract test uploads an original procedural portrait through the real customer UI and uses real sandbox credits.

Artifact `ip-rasm-web-sandbox`12635480948:29,396,612bytes, SHA256 `424085104ac6683a4350a82e4343a57dd0ce3f61caa08e78bfbd47dbb6d2938e`. Downloaded only after successful run and matching source SHA; ZIP CRC, paths, file manifest and every file hash independently checked. All121files served by4201 match the verified artifact. API health confirms sandbox, no live payment or messages, and no owner database. Three unused three-build test codes were issued privately.

Local records (ignored): `output/phase15/web-ci-f1901e2/{github-verification,local-verification}.json`, `output/phase15/release-candidate/{snapshot,preview-launch,http-verification}.json`. The initial launch failed on sandbox loopback EACCES; both unlaunched directories were preserved under `-unpublished-network-denied`, then the authorized loopback launch succeeded. No existing owner process was stopped.

## Limits and next scope

This is a local sandbox website handoff, as requested before app completion. CI debug APK build succeeded, but its ephemeral runner signing key does not prove compatibility with the owner's earlier locally signed APKs. Full current private-photo matrix/local-signer APK verification remain open C26 acceptance. Portrait/nose likeness, full-device4x timing, physical board/phone acceptance and production/domain/merchant setup are not declared passed. Earlier interrupted matrices are diagnostic, not substituted for current acceptance.

Owner instructions: `README_UZ.md`, `docs/WEB_FIRST_UZ.md`, `AGENT/OWNER_TESTS.md`. Feature branch only; final review PR targets main and must not be merged automatically.
