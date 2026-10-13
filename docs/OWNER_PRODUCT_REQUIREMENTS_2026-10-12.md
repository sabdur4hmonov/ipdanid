You are taking over the existing “Ip Rasm” product. Complete and improve the real application, not a mockup or a proposal.

OWNER’S PRIORITIES
1. The highest possible fidelity when a real photograph becomes physical string art.
2. A very simple experience for ordinary customers.
3. Reliable Android and browser operation, including offline creation and assembly.
4. Reduce unnecessary customer assembly work without sacrificing portrait quality.
5. Easy owner administration, ordering, delivery and announcements.

Keep the temporary name “Ip Rasm”. Final branding will be decided later.

PROJECT LOCATIONS
Original repository:
D:\Coding projects\ipdan face yasaydigan app

Existing implementation worktree:
C:\Users\user\Documents\Codex\2026-10-04\qbrix-world-degan-instgaramda-project-bro\work\iprasm-product

GitHub:
https://github.com/sabdur4hmonov/ipdanid.git

Inspect git worktrees, branches, status, repository instructions and checkpoints before editing. Determine which checkout contains the latest work. Do not overwrite either checkout or discard uncommitted changes. Avoid conflicting with another active agent.

Local website was served at:
http://127.0.0.1:4183/

Private development reports were served at:
http://127.0.0.1:5183/

Verify these services rather than assuming they are still running.

TAKEOVER STATE — VERIFY BEFORE RELYING ON IT
The previously verified simple-flow checkpoint was:
58ebe4ad3a3c4ab7b20afd855e70a9da94cbebd4

Checkpoint document:
docs/SIMPLE_FLOW_CHECKPOINT.md

Also inspect:
docs/STATUS.md
docs/ROADMAP.md
docs/FEATURE_MATRIX.md
docs/VERIFICATION.md
docs/BLOCKERS.md
docs/PRODUCT_COMPLETION_PLAN.md
README.md

At that checkpoint, real photo processing, immutable nail sequences, preview, assembly guidance, saved progress and PDF exports existed. Android builds and focused browser checks had passed.

Later work began on Uzbek Cyrillic, business settings, announcements and delivery. Some of that work may still be uncommitted, unwired or untested. Inspect it carefully; do not call it finished merely because files exist.

Potential partially implemented files include:
src/uzbek-script.ts
src/business-types.ts
src/business-i18n.ts
src/BusinessContext.tsx
src/Announcements.tsx
src/BusinessAdmin.tsx
server/business-store.ts

Related server/order/locale files may already contain partial modifications.

Previous APK compilation does not establish acceptance of the current version on a real phone. Portrait and physical assembly acceptance remain open.

WORKING STYLE
Do the implementation yourself. Do not return only prompts, plans or suggestions.

Create and maintain a practical roadmap with acceptance criteria. Execute it in priority order without requiring me to provide a separate prompt for every step.

Make reasonable reversible decisions yourself. Ask only when genuinely necessary: external credentials, a material business decision that cannot be inferred, a phone connection, physical equipment, or authorization for publication.

Do not ask repeated questions already answered in the project history.

Preserve existing photographs, projects, settings, assembly progress, sequences, exports and historical comparison reports. Use compatible migrations and backups.

Do not push, publish, upload customer images externally, charge real customers or send external campaigns without explicit authorization.

When a session must end, save an exact checkpoint describing:
- what changed;
- what actually passed;
- what remains uncertain;
- the next concrete task and command.

Do not imply background execution is happening unless it really is configured.

1. PORTRAIT QUALITY — HIGHEST PRIORITY

Improve the actual string sequence, not just the appearance of the preview.

Known remaining issues:
- weak nose definition;
- poor upper/lower lip separation;
- muddy facial shading;
- distracting strands crossing facial features;
- background and dark clothing consuming too much visual emphasis.

Do not assume more connections, higher resolution, a rotated pin layout or lower global pixel error automatically produces a better portrait. Several earlier experiments were inconclusive.

Use controlled comparisons with the same source, crop, board geometry, thread properties and rendering assumptions. Change one important variable at a time.

Evaluate:
- eyes and eyebrows;
- nostrils, nose contours and shading;
- mouth contour and lip separation;
- jaw, cheeks and overall resemblance;
- background interference;
- crossing texture;
- continuity and physical feasibility.

Use multiple suitable photographs, not only the owner’s original photograph. Include different lighting, backgrounds and face positions, plus two-person photographs. Use authorized or appropriately licensed test images.

Preserve a baseline and generate separate experimental variants. Promote a default only when evidence supports it.

Preview, assembly player, saved sequence and PDF must refer to exactly the same immutable sequence and matching nail coordinates. Never substitute an attractive image that cannot be assembled.

Do not promise perfect or 100% photographic reproduction. Clearly document the achievable result and remaining limitations.

2. AUTOMATIC WHITE BACKGROUND AND MULTIPLE PEOPLE

For portrait photographs, automatically remove the background and replace it with white before string generation.

Preserve the people’s faces, hair, ears and relevant silhouette. Do not erase dark hair or clothing just because they resemble the background.

Support one person and at least two people. Do not force every picture into a single-face crop.

Provide sensible automatic framing:
- one person: preserve the complete head and useful facial scale;
- two people: include both people without cutting either face;
- respect the chosen board shape.

Keep a simple correction path when automatic masking fails. Make correction optional and easy rather than exposing technical controls by default.

Show the processed photograph before generation so the customer can notice a bad crop or missing person.

Keep the original photograph intact and allow undo.

Automatic background processing and core generation must work locally in the packaged Android app. For the browser, explain and test what must be cached before offline use.

Do not silently require uploading private photos to an external AI service.

3. QUALITY FIRST, THEN FEWER ASSEMBLY STEPS

Thread stock is a supply estimate, not a hard generation limit.

If the best accepted portrait requires more thread than entered stock:
- keep the quality result;
- calculate total estimated thread;
- show how much additional thread is needed.

Do not damage the portrait just to fit the available spool.

However, remove genuinely unnecessary connections when this preserves accepted quality. Minimize customer assembly effort after meeting the quality target.

Compare complete and simplified sequences fairly. Preserve facial detail, sequence validity and physical safeguards. Include wraps, knots, color changes and other relevant work in assembly-time estimates.

Do not claim measured time savings without a human assembly trial. Label calculated estimates.

Material limits remain meaningful even when stock is unlimited:
- nail capacity;
- repeated chord traversals;
- board dimensions;
- thread thickness;
- winding clearance;
- tension and structural feasibility.

Do not remove safeguards just to produce a denser image.

4. SIMPLE, IPHONE-LIKE DESIGN

Redesign the interface with:
- a brighter, clean background;
- dark navy or similarly readable dark accents;
- restrained color;
- rounded cards and controls;
- clear typography;
- generous spacing;
- large touch targets;
- clear loading, cancellation and error states.

Make it elegant and extremely easy to use on a phone.

The initial creation screen should prominently offer only:
1. Take a photo.
2. Upload from gallery.

After choosing a photo, reveal only the controls needed for the next step.

Preferred flow:
Photo → automatic white background and framing → check photo →
generate → choose result → assemble or export.

Keep essential navigation small:
Create, Assemble, My Projects.

Put secondary functions in a compact More menu or appropriate later screens. Hide expert settings, experiments, technical diagnostics and simulation metrics from the ordinary customer flow.

Preserve access to useful existing features without turning the home screen into a dashboard of unrelated tools.

Do not hide necessary material information, save/recovery actions, progress controls or exports.

Use friendly customer language. Technical information belongs in optional details or private reports.

Fix inconsistent translations, mixed-language labels, overlapping status bars, keyboard problems, safe-area spacing and small-screen layouts.

5. WEB, ANDROID AND OFFLINE RELIABILITY

Fully verify the browser and Android experiences.

Core offline functions should include:
- taking or importing a photo where supported;
- background processing;
- generating string sequences;
- preview;
- assembly guidance;
- saving and restoring progress;
- opening existing projects;
- local exports.

Verify browser offline behavior after a successful first load/cache installation. Android must contain its required local assets.

Test:
- fresh launch;
- relaunch without internet;
- interrupted generation;
- cancellation and late worker responses;
- variant-selection races;
- background/resume;
- app restart;
- project restoration;
- camera cancellation and permission denial;
- gallery import;
- export cancellation and failures;
- storage errors;
- upgrade preserving existing projects and progress.

Keep network-dependent ordering and synchronization separate from offline core functions. Network errors must not block local creation or assembly.

Build a current Android APK and verify packaged assets and signing compatibility.

Do not clear app data or uninstall the existing app as a shortcut.

Ask me to connect the phone only when the current software increment is ready for meaningful testing. Then install the update while preserving data and complete real-device checks.

Document iOS separately. Implement portable code and available web testing, but do not claim an iOS build or device test without the necessary Apple environment.

6. TWO INSTRUCTOR VOICES AND LANGUAGES

Provide two genuinely distinct instructor voices.

Support spoken guidance in:
- Uzbek;
- Russian;
- English.

Let the customer select guide language independently of interface language.

Prefer a reliable offline solution. Investigate bundled, properly licensed speech assets or an appropriate local speech engine rather than relying entirely on whatever voices happen to be installed on the phone.

If using recorded number fragments, assemble spoken nail numbers and instructions correctly. Test pronunciation, number order, pauses, repeat, speed changes and cancellation.

Do not call two labels “two voices” if they produce identical audio.

Keep device voices as an optional alternative where useful. Never promise Uzbek support if the selected implementation does not actually provide it.

Speech failure must not stop assembly progress or corrupt state. Stop stale speech when changing projects, steps or leaving the player.

Verify audible output on the real phone. Be honest about synthetic voice quality and languages that still need listening acceptance.

7. UZBEK CYRILLIC

Provide four interface choices:
- O‘zbekcha;
- Ўзбекча;
- Русский;
- English.

Persist the selection.

Cover the ordinary customer flow, assembly instructions, errors, orders, admin labels and relevant exports.

Use correct Uzbek Cyrillic spelling. Preserve filenames, identifiers, phone numbers, URLs and technical abbreviations where appropriate.

Do not blindly transliterate customer names or user-entered text.

Ensure fonts support Cyrillic in the app and exported documents.

8. ORDERING AND DELIVERY

Provide a simple shop/order flow connected to owner-managed products and prices.

Support:
- product selection and quantity;
- clear subtotal;
- pickup and delivery where enabled;
- recipient name and phone;
- delivery city/address;
- owner-configured delivery fee;
- final total before confirmation;
- order confirmation;
- order status and delivery/tracking information.

Pickup should not require a fake delivery address.

Validate pricing, stock, delivery availability and totals on the server.

Protect against duplicate orders using proper idempotency. A retry must not create a second order or silently change the accepted total.

Keep an immutable snapshot of the seller details, delivery terms and fees on the order so later admin edits do not rewrite historical receipts.

Payments and courier integrations must reflect their actual state. Do not simulate success and present it as a live payment or delivery.

Make offline ordering limitations clear and preserve a recoverable draft where appropriate.

9. OWNER NAME, PHONE AND PAYMENT DETAILS

The owner will provide these later. Do not invent them.

Allow the owner to configure:
- display/brand name;
- seller name;
- contact phone;
- payment instructions or relevant account/card details;
- pickup address;
- delivery availability and fee.

Show the appropriate configured details in checkout and order confirmation.

Use safe empty states before the owner fills them in.

Do not store payment card security codes or implement raw card processing.

10. EASY ADMIN ACCESS

Give the owner an understandable admin interface for:
- products;
- prices;
- stock and availability;
- descriptions and customer-facing content;
- seller/contact/payment details;
- delivery settings;
- orders and fulfillment;
- customer support;
- announcements and promotions.

Make normal edits easy without source-code changes.

Protect administration with real server-side authentication and authorization. Keep owner credentials out of the APK, frontend bundle, Git history, screenshots and logs.

For local testing, provide owner access privately and clearly explain how to open it. Use existing secure local configuration where possible.

Distinguish development access from production account authentication. Do not ship a permanent shared admin secret in a public app.

Use appropriate permissions and audit records. Protect against stale simultaneous edits using revisions or equivalent conflict handling.

11. ANNOUNCEMENTS AND ADVERTISING

Allow the owner to create, edit or retire customer announcements and promotions.

Support:
- title and message;
- general news versus promotion;
- publication/expiry dates;
- active/inactive state;
- customer dismissal;
- sensible promotion preferences.

When apps reconnect or open online, fetch current messages and relevant storefront settings. Cache useful content for offline display and respect expiry/revocation.

Clearly distinguish:
- in-app messages fetched while the app is active;
- operating-system push notifications delivered while the app is closed.

Do not claim closed-app push works unless a real push provider, permissions, device-token lifecycle and delivery have been implemented and tested.

Production-wide messages require a publicly reachable backend. A phone cannot reach the computer’s localhost address by itself.

Make the backend URL configurable. Do not hardcode a development loopback address into the release configuration.

Avoid duplicate campaigns, unsafe HTML injection and messages intended for one customer appearing for another.

12. COMPLETE THE EXISTING PRODUCT ROADMAP

Inspect the actual roadmap and feature matrix. Finish relevant unfinished flows, including existing customer sessions/codes, support, project recovery, materials, exports and any already-promised craft engines.

Keep secondary craft engines away from the main portrait workflow.

Do not invent competitor features or claim Instagram research was completed without evidence. If competitor research documents exist, extract their concrete requirements and mark verified versus assumed findings.

13. SECURITY, PRIVACY AND PRODUCTION HONESTY

Keep photos local by default.

Provide clear deletion and retention behavior for local and server data. Keep customer secrets and personal information out of diagnostic reports.

Verify authorization, input validation, order ownership and admin restrictions.

Do not merely disable the sandbox server’s production guard and call that production readiness. Address the actual authentication, deployment, TLS, backup, monitoring and integration requirements.

Complete everything possible locally. Track external-service configuration and physical tests precisely rather than silently replacing them with mocks.

14. VERIFICATION AND ACCEPTANCE

Use meaningful tests for changed behavior.

Verify:
- existing domain/PDF invariants;
- exact sequence replay;
- preview/player/export consistency;
- coordinate alignment;
- project and progress preservation;
- single-person and two-person processing;
- the four interface languages;
- two instructor voices and three speech languages;
- desktop and touch layouts;
- core offline behavior;
- delivery totals and immutable order details;
- duplicate-order prevention;
- admin authorization and edit conflicts;
- announcement expiry, dismissal and reconnect refresh;
- builds and packaged assets.

Use isolated test data. Do not send real campaigns or alter unrelated customer orders while testing.

Produce visual evidence of the new interface and controlled portrait comparisons.

A lower simulation error, passing build or passing test count is not sufficient evidence of physical portrait quality.

Physical acceptance still requires a real board, nails and thread. Prepare the exact matching template and guide for that test. Record actual assembly problems, thread usage, winding capacity and portrait appearance when the kit becomes available.

FINAL DELIVERABLES

Deliver:
1. A working, simple browser application.
2. The latest Android APK.
3. Private owner/admin access instructions.
4. A concise guide for changing prices, contact details, delivery and messages.
5. Quality comparison evidence and exact sequence exports.
6. Updated roadmap, verification records and resume checkpoint.
7. A clear distinction between completed, locally verified, device verified, physically verified and externally blocked work.

In the final response, explain in plain Uzbek:
- what works now;
- what works without internet;
- how I open admin;
- where the APK is;
- what still needs my phone, physical kit or external credentials.

Do not describe the app as perfect or fully production-ready unless the evidence supports that claim.

Start by inspecting the current repository and incomplete changes, then continue implementation in the order that best protects portrait quality and makes the product useful.