# Phase15 exhaustive remaining-work audit — 2026-10-17

Written before Phase15 implementation. Sources: AGENT/MASTER_PLAN.md; all current and historical open/remaining rows in AGENT/FINAL_REPORT.md; docs/ROADMAP.md, FEATURE_MATRIX.md and BLOCKERS.md; Phase14 source and acceptance records. Historical checkpoint next-task paragraphs are not new instructions. A partial device/physical/production column does not itself mean missing code. Conversely, a schema, disabled card or mock is not a completed customer feature.

Status: **IMPLEMENTING. C01 DONE; C02 DONE (23unit/16latest UI/build1990); C03 next. Actual milestone commits/results are in PROGRESS/LOG.** Every CODE row below stays open until linked implementation and actual tests exist. Minimal releases must perform their advertised operation, preserve old guides, and be reachable. Experimental features remain clearly labelled in Expert mode. OWNER rows never block independent CODE work.

## CODE — ordered implementation ledger

| ID | Remaining deliverable / source IDs | Acceptance and intended milestone | Status |
| --- | --- | --- | --- |
| C01 | Optional name/date under a portrait, all three shapes and Latin/Cyrillic/Arabic; MASTER Phase4, historical FINAL Phase4 | Versioned reviewed composition; actual text pixels in the same prepared target and immutable sequence; preview/player/exports agree; blank text preserves old preparation. | DONE:16unit/6UI/1987module build; docs/CAPTION_UZ.md, local output/phase15/caption. Thin physical lettering remains O06; mixed/number ordering C02. |
| C02 | Mixed Arabic+Latin/Cyrillic in one line; I18N-01, historical FINAL Phase4 | Unicode bidirectional runs, Arabic contextual shaping and per-run licensed fonts; punctuation/numbers; exact raster/provenance and old single-script guides preserved. | DONE:23unit/16latestUI/1990build; docs/BIDI_CHECKPOINT.md. Initial14/2 run and2/2repair preserved. |
| C03 | Push delivery/configuration and token lifecycle; MSG-01, WEB-02 | FCM HTTP v1 adapter, placeholder-only configuration, authenticated registration/rotation/revocation, permission opt-in, Admin announcement queue/retry/idempotency, invalid-token cleanup, mock sends only. In-app fallback remains. | OPEN |
| C04 | Mosaic polish; BRICK-01/02 | Existing real inventory engine retained; baseplate partition/stock/spares, richer finite-palette options, progress and actual exports reachable from Menu. No physical calibration claim. | OPEN |
| C05 | Diamond/paint polish; DIAM-01, PAINT-01 | Explicit grid/pitch/style/magnetic material parameters, counts/spares; connected paint boundaries/print labels/coverage/progress; offline exported plans; physical palettes remain configurable. | OPEN |
| C06 | QR string/sculptor pattern; QR-01 | Valid bounded error-corrected payload with quiet zone, physical module/pin template and actual continuous sequence where advertised; render/decoder test, not a decorative fake QR; reject infeasible settings. | OPEN |
| C07 | Book folding; BOOK-01 | Text/date/symbol → feasible per-leaf millimetre marks, actual plan/preview/progress/PDF/JSON and entitlement contract; reject infeasible folds rather than fabricate geometry. | OPEN |
| C08 | Sequence time-lapse/video; EXP-03 | Incremental actual ordered strands, bounded frames/cancel, real downloadable video with truthful codec capability/fallback. Never source-photo overlay. | OPEN |
| C09 | Procedural 3D frame/model-layer/letter exports; EXP-03, MODEL-01 | Original millimetre geometry, valid mesh/layer coordinates, downloadable STL/SVG/template and rotatable original preview; physical fit owner-tested later. | OPEN |
| C10 | Original guided kids/cardboard/Ebru catalog/player; GUIDE-01, B-CONTENT | Original code-drawn diagrams and actionable sequential tutorials, save progress, free access and original interactive rotation where relevant. Licensed professional media can be added later; no competitor assets. | OPEN |
| C11 | Customer gallery/reviews/moderation; SOCIAL-01, SEC-01 | Explicit publication consent, bounded finished-result uploads only, pending/approved/rejected states, owner/delete authorization, no private original-photo exposure, moderation UI and retention. | OPEN |
| C12 | Promo/referral codes and contribution accounting; SHOP-02, ANALYTICS-01 | Server-priced validated discounts, expiry/limits/self-referral/duplicate guards, settled-order referral attribution, actual admin/customer UI and net contribution calculation excluding private photos. | OPEN |
| C13 | B2B batch codes/partner workflows; B2B-01 | Isolated partner scope, batch quota/profile, volume quote/recipient claim links/campaign stock, printable actual codes; cross-partner denial tests. | OPEN |
| C14 | Catalog variants/refills/bundles and region configuration; SHOP-01/02 | Existing cart/order flow extended with explicit SKU/material/currency/country/shipping rules and server totals; editable development defaults, no invented fulfillment policy. | OPEN |
| C15 | Gift/commission/app-only journeys; JOUR-03, CODE-02 | Connect existing gifts/credits/orders to gift purchase/claim and ready-made approval/tracking UI; server ownership/idempotency, delivery mock/outbox only. | OPEN |
| C16 | Transactional messages/reconciliation; MSG-01, PAY-02 | Four-language templates, bounded retry/backoff and durable delivery states; provider interfaces/mock tests; auditable payment status reconciliation. No unapproved real messages or charges. | OPEN |
| C17 | Consent-based funnel/support/repeat metrics; ANALYTICS-01 | Explicit opt-in events without photo/text contents, deletion/export, confirmed assembly events, owner aggregate dashboard and accurate contribution inputs. | OPEN |
| C18 | Background/lock-screen assembly audio; PLAY-04 | Opt-in native foreground/media controls with default pause behavior preserved, lifecycle/cancellation/session guards, mock/compile verification; actual noisy-room/native behavior remains OWNER. | OPEN |
| C19 | Experimental local-only speech commands; PLAY-08 | Explicit permission, exact bounded command vocabulary, local recognition capability detection, ambiguous/noisy/stale utterances never confirm work automatically; manual fallback and mocked permission/denial tests. | OPEN |
| C20 | Experimental camera checkpoints; PLAY-09 | Opt-in local frame capture, original/source privacy, explicit manual checkpoint comparison and saved step binding; no automatic correctness claim; denial/cleanup tests. | OPEN |
| C21 | Last-sync/recovery and storage completeness; PLAY-06/07, LIB-01, SEC-01 | Reconcile existing sync UI; expose last successful sync and failures, exact conflict-safe restore; account/media/token deletion/TTL and backup contracts tested. | OPEN |
| C22 | Four-locale completeness + CI fail script; I18N-01 | UZ Latin/Cyrillic/RU/EN key parity, actual Cyrillic path, missing-key negative test, customer literals/error/template coverage and offline font support. | OPEN |
| C23 | 4× throttled mobile performance; ENG-03, QA-02 | Real500px/240pin/3000line generation <20s with responsive main thread/progress/cancel; recorded timings/limits. Preserve old engine/profile contracts; lazy expert/legacy UI and measure entry bundle. | OPEN |
| C24 | Security closure; SEC-01, DATA-01, ADMIN-01 | npm audit high/critical remediation, full tracked-history secret/path scan without printing values, strict new endpoint validation/authorization/rate/body limits, CSP/Caddy tests, moderation/media privacy/TTL. | OPEN |
| C25 | Customer-path cleanup/build warnings; WEB-01, ENG-04 | Remove dead experiments from initial customer imports while retaining all engines needed by old guides; accessible localized errors, no suppressed legitimate warnings. | OPEN |
| C26 | Owner runbook/release/CI/PR; GOV-01/02, DELIVERY-01 | README_UZ.md; scripts/build-release.ps1 owner-key wrapper; setup/config/migrations/assets checks; full unit+desktop/mobile; preserved signed debug APK; fresh4201/API4483 preview/codes; PR feature→main, never merge. | OPEN |
| C27 | Phase15 isolation/provenance harness; GOV-02, QA-01 | Reserve4194–4200 and their APIs; freeze phase14-dist and historical reports; fresh evidence roots, real full suite outcomes, no tmp/data; milestone commit/normal exact-origin feature push. | SAFETY TESTED:4200/API4482 startup refused beforeIO; phase14 outputs moved to current-product; frozen-root unit passed. Ongoing per milestone. |

Implementation order: C01 → C02 → C03 → C04–C21 (product/business/experimental milestones) → C22 → C23 → C24 → C25 → C26. C27 safety applies before all tests. Every milestone records exact executed checks, not only intended checks.

## OWNER — external activation/acceptance, never a reason to stop CODE

| ID | Required real input | Existing slot/doc, or Phase15 work that must supply it |
| --- | --- | --- |
| O01 | Domain/VPS/DNS/HTTPS/admin password/public publication | Docker/API+SQLite+Caddy+backup already tested; docs/DEPLOY_VPS_UZ.md; no real DNS/VPS changes. |
| O02 | Owner keystore/store accounts/release signing | scripts/Release-Android.ps1 and docs/APK_SERVER_AND_SIGNING_UZ.md; C26 adds requested lowercase build-release.ps1 entry point. No key generation/upload. |
| O03 | Click/Payme merchant test/live keys, fiscal/currency/fulfillment/returns policies | Existing sandbox adapters/docs/PAYMENTS_UZ.md; C14/C16 add configurable policies/reconciliation. Live certification/charges are not simulated as real. |
| O04 | Consented two-instructor UZ/RU/EN recordings and human pronunciation/noisy-room trial |746 slots, docs/VOICE_RECORDING_LIST.csv and docs/VOICE_RECORDING_UZ.md, manifest/indexer/TTS fallback already exist. |
| O05 | Same permitted original/crop/QBRIX outputs; genuine group/animal/object photographs | docs/QBRIX_COMPARE_HOWTO_UZ.md, ignored comparison/qbrix input contract, existing local reports. No gate bypass or competitor superiority claim. |
| O06 | Physical board/thread/shaft/winding/tension/stock, print/QR scans, human assembly/material/3D/fold trials | docs/PHYSICAL_BOARD_UZ.md and PHYSICAL_TRIAL.md; C04–C10 add exact new templates/material parameters/docs. Software raster decoding is separate from a physical scan. |
| O07 | Real Android phone/emulator hardware access and current-device permission/offline/audio/performance checks | Existing native project and tests/APK docs; C18–C20/C23 supply mocked/throttled proof. No install or fabricated real-device performance. |
| O08 | macOS/Xcode/iOS device/signing | ios/ project already exists; C26 verifies shared config and writes exact Uzbek Mac procedure. No iOS build claim on Windows. |
| O09 | Firebase project/service account/app config and consented production device tokens | C03 supplies env/config slots, adapter/token lifecycle/admin UI/mock tests and Uzbek setup instructions; real external sends disabled by default. |
| O10 | Optional owned professional tutorial/product catalog media and real messaging-provider credentials | C10/C16 supply original procedural tutorials, replaceable slots and mocked delivery interfaces/docs. Lack of footage/credentials does not excuse missing player/retry code. |

## Reconciliation of every matrix family and historical FINAL open row

| Source IDs / historical row | What remains after Phase14 and where it is tracked |
| --- | --- |
| GOV-01/02, WEB-01/02 | C25/C26/C27; branding/admin configuration exists. Device/iOS/store/public production acceptance O01/O02/O07/O08. |
| JOUR-01/02 | Ordinary free preview, adjustment, kit unlock and return/resume/export already implemented/tested Phase10–14; C23/C25 regress them, O06/O07 physical/native acceptance. |
| JOUR-03 | C15/C16; existing customer/support/order/code routes are foundations, not a reason to mark missing purchase/commission UI done. |
| IMG-01/02/03/04/05, SUBJECT-01/02/03 | Phase3/10–14 already add decoded limits, detector/segmentation, review/manual third person, original-preserving generic modes, advice/candidates/presets. C01/C02 extend composition; C23 regresses. Real diverse-photo/physical acceptance O05/O06/O07. |
| ENG-01/02/03/04/05/06/07/08 | All legacy fitters/geometry/multicolor/immutable sequence/accounting remain implemented; classic3 is current default with actual acceptance. C23 performance, C25 lazy imports. Real winding/opacity/metres/material calibration and varied likeness O05/O06/O07. Historical rejected v12/v16/v17/phase8/9 experiments are completed rejected evidence, not unfinished code to repeat. Conditional knee/simplification work on rejected candidates is inapplicable; no fake winner. |
| PLAY-01/02/03/05 | Phase14 durable focus UI, sectors/TTS/text/resume/confirmed state already tested; O04/O06/O07 real audio/phone/physical usability. |
| PLAY-04/06/07/08/09 | C18/C21/C19/C20 respectively; recorded file absence belongs O04, not missing implementation. |
| EXP-01/02/03, LIB-01 | Existing exact PDF/JSON/TXT/PNG/library/CAS implemented; C08/C09 add video/frame; C21 sync/recovery. Print/physical verification O06. |
| SOCIAL-01 | C11 (consent/moderation/reviews/deletion), not OWNER-blocked. |
| SHOP-01/02, PAY-01/02 | Phase14 Click/Payme sandbox supersedes stale generic-only matrix notes; C12/C14/C16 close remaining policies/referral/reconciliation. Live credentials/certification O03. |
| MSG-01, CODE-01/02 | Existing secure batch/PDF/QR/credits/ownership recovery mostly supersedes stale notes; C03/C13/C15/C16 extend real messaging lifecycle/B2B/gift purchase. Provider activation O03/O09/O10. |
| BRICK-01/02, DIAM-01, PAINT-01 | Real engines/progress/exports already exist; C04/C05 remaining planning/style/export polish. Physical calibration O06. |
| MODEL-01, QR-01, GUIDE-01, BOOK-01 | C09/C06/C10/C07, never solely labelled B-CONTENT/physical to avoid implementation. Real-size physical scans/folding/3D fit O06; optional owned footage O10. |
| ADMIN-01, B2B-01, ANALYTICS-01, DATA-01, SEC-01 | Existing scoped staff/password/CORS/rate/DB/backup from Phase14; C11–C17/C21/C24 provide remaining functional features, not just tables. |
| I18N-01, QA-01/02/03, DELIVERY-01 | C22–C27; real phone/physical/iOS/public deployment remain O01/O02/O06/O07/O08. |
| FINAL Phase4 mixed-script/name+portrait explicitly deferred | C01/C02, now mandatory; no owner input needed. |
| FINAL Phase2/8/9 likeness not accepted, Phase3 genuine photo acceptance | Preserve actual historical rejection. Current classic3/profile14 is an independent versioned implementation. O05/O06 genuine likeness/physical acceptance; C23 performance is CODE. No unbounded repeat of sealed rejected experiments. |
| FINAL Phase5 live commerce, Phase6 QBRIX, Phase7 recordings/phone, Phase14 five plug-ins | O01–O08; code/config/docs must exist and are checked through C03/C14/C16/C18–C26. |

## Protocol and protected state

One agent, serial heavy jobs. Work on feat/full-roadmap; user explicitly authorizes normal pushes to https://github.com/sabdur4hmonov/ipdanid.git and a PR to main, **not merge/force/main pushes**. Never commit tmp/output/photos/secrets/DB. Never access tmp/data or contact/restart4194–4200 and APIs4331/4465/4478–4482. Seven served builds are frozen; use output/phase15-dist and new ports. Earlier Phase10 historical report recovery limitations remain in docs/PHASE14_VALIDATION.md; do not erase history or claim unrecoverable screenshots unchanged. Tests use only isolated DBs and original synthetic fixtures; actual photos remain local ignored inputs.
