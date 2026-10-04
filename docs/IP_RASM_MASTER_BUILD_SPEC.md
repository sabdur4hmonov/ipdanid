# Ip Rasm — Master Build Specification and Autonomous Delivery Contract

## 1. Project identity and handoff

Temporary product name: **Ip Rasm**. Build the product before doing final naming, branding, logo work, or brand campaigns. Use an original, restrained visual identity and keep name, colors, logos, and domains configurable.

Target Windows workspace: `D:\Coding projects\ipdan face yasaydigan app\`

Intended GitHub repository: `https://github.com/sabdur4hmonov/ipdanid.git`

This specification is intended for a different Codex account. It must work without access to the originating conversation, browser session, credentials, account history, or files outside the attached handoff. The companion `IP_RASM_RESEARCH_FINDINGS.md` contains the research and sources. Neither the target checkout nor the GitHub repository was inspected during preparation of this document. Discover their actual state before changing them.

The owner wants a functioning website **and** mobile application, including the researched functions, rather than a static mockup or landing page. The owner does not want to issue a separate prompt for every feature. Create and maintain your own roadmap, implement it in dependency order, and ask only about genuinely blocking or consequential decisions.

## 2. Mission and positioning

Help people turn a photograph into artwork they can physically build, with accurate previews, understandable instructions, and an easy purchasing and support experience. Start with photo-to-string-art portraits; complete the other researched feature families through the roadmap below.

Initial market: Uzbekistan. Initial customer languages: Uzbek Latin, Russian, and English. Prepare the architecture for additional countries, languages, currencies, and payment/shipping providers. Do not treat Asia as one homogeneous market.

The core differentiators are reliable physical results, easier first-time assembly, local language guidance, recoverable progress, and local service. Voice guidance, PDF exports, multicolor threads, and saving progress already exist in competitors. Do not claim them as unique inventions. Becoming a category leader is a business ambition, not a guaranteed outcome or a claim to publish without evidence.

## 3. Autonomous working rules

1. Read the repository's applicable `AGENTS.md` and project instructions. Inspect files, Git status, remote, existing architecture, and available runtimes before choosing a stack or creating a project.
2. Work in the supplied directory. If it does not exist, create it if permitted. If it is empty, clone the intended repository after checking access. If it contains work, preserve it; do not overwrite it with a clone. If its remote differs, explain the mismatch without silently changing it.
3. Make routine implementation decisions yourself and record assumptions. Do not ask about every button, library, screen, color, or implementation detail. Prefer compatible existing technology and a small maintainable stack.
4. Maintain `docs/ROADMAP.md`, `docs/FEATURE_MATRIX.md`, `docs/DECISIONS.md`, `docs/STATUS.md`, and `docs/BLOCKERS.md`. Assign every requirement an ID, milestone, status, acceptance criteria, and verification evidence. Record source provenance when relevant.
5. A feature must be marked separately as implemented, automatically verified, device verified, physically validated, and production activated where these distinctions apply. A button or screenshot does not establish completion.
6. Continue from one completed milestone to the next during active execution. Do not stop after a plan, scaffold, polished UI, or MVP when independent authorized work remains.
7. When a session or execution limit is reached, leave a precise checkpoint: completed work, checks, current task, next commands, blockers, and remaining scope. On a subsequent resume, read these documents and continue without requiring the owner to reconstruct context. Do not promise execution after the session ends; scheduled work requires available tools and separate authorization.
8. If one integration is blocked, complete its adapter, contract, sandbox tests, configuration instructions, and all independent work. A simulator must be labeled; never present simulated payment, email, shipping, or AI outputs as a live integration.
9. Ask only for missing provider credentials, incompatible business decisions, real spending, final production publication, or physical actions only the owner can perform. Batch questions and explain exactly what each answer unlocks. Respect applicable tool safety and approval rules.
10. Do not request final branding now. Use provisional kit profiles and demo catalog prices visibly marked as development data until real material and pricing inputs are available.
11. Implement original code and design. Learn from public workflows; do not copy competitor assets, paid content, private code, customer photographs, logos, or datasets without permission.
12. Never commit secrets, customer images, access tokens, production credentials, or local environment files. Use environment examples and setup documentation.
13. Use normal Git history. Do not force-push, delete unrelated files, overwrite user changes, or rewrite history. Prepare reviewable commits and CI; verify the destination before pushing. Do not assume the GitHub URL means production deployment is approved.

## 4. Website and mobile deliverables

Deliver a responsive public website, customer creation/assembly workspace, commerce flows, and protected admin portal. Deliver an installable mobile app sharing the generation engine, domain schemas, and feature contracts with the website.

Recommended default when starting fresh: a TypeScript workspace with React-based web UI, a shared computational/domain package, a relational database, object storage behind an abstraction, and a job system only where justified. Choose either React Native/Expo or a genuine Capacitor mobile package after a short architecture assessment. A mobile package must include mobile navigation, persistence, permissions, platform behavior, build configuration, and device verification; calling a responsive site an app is insufficient.

Android is the first mobile delivery target. Include an Android build artifact or a reproducible build path and record what actually ran. Support iOS in architecture and configuration; an iOS binary, simulator test, signing, and store release may require macOS and the owner's accounts. Mark these dependencies accurately. PWA installation is useful in addition to the mobile app.

Local development must be reproducible without paid providers. Provide seeded development data, setup commands, migrations, and clearly separated sandbox services. Assess dependencies using current official documentation when implementation begins.

## 5. UX and main journeys

Two prominent entry points: **Try my photo** and **I already have a kit**. Preview must not require buying a kit or creating an account.

Journeys to implement:
- Visitor: choose format → select photo → adjust crop → compare previews → view required kit/materials → purchase or save.
- Kit owner: scan QR or enter code → confirm kit profile → select photo or design → generate instructions → assemble → pause/resume → finish.
- Returning maker: open saved project/instruction → resume confirmed step → export or rebuild.
- Gift buyer: buy kit or digital gift → recipient chooses their own photo → redeem safely without exposing the buyer's payment details.
- App-only maker: specify compatible board and materials → preview → purchase generation entitlement when configured → export and assemble.
- Ready-made artwork buyer: submit customization request → approve design through the configured process → track order.
- Support: locate order/code/instruction → report a specific issue → see ticket state and recovery instructions.
- Administrator: configure products/material profiles, codes, orders, inventory, support, content, promotions, and fulfillment.

Use progressive disclosure. Basic users get simple choices; experts can inspect material and algorithm settings. Support keyboard navigation, readable contrast, large craft-mode controls, screen readers, and mobile touch targets. UI must handle loading, empty, offline, error, cancellation, retry, and recovery states.

## 6. Photo input and preparation

Implement validated image loading, decoded pixel/dimension limits, orientation normalization, supported-format messaging, zoom, pan, crop, rotation, brightness, contrast, and reset. A configurable 15 MB limit is a reasonable initial product default; do not confuse file size with safe decoded image size.

Provide photo suitability guidance for small faces, blur, low contrast, extreme shadows, multiple distant faces, and busy backgrounds. Use measurable image analysis first; do not label a heuristic as sophisticated AI. Optional face-aware crop/background simplification must preserve the person's identity, show changes, and allow undo. No remote personal-image upload without a clear user-visible purpose and appropriate privacy flow.

Support multiple candidate photos and saved edit parameters. Never consume a purchased generation credit for editing, a failed job, or retrying the same request. Provide licensed original sample photos/designs for people who want to explore without uploading.

## 7. Real string-art generation engine

This is a computational and physical-art product. Implement a real photo-to-continuous-thread path algorithm. A grayscale filter, simulated line animation, generated portrait image, or hardcoded nail sequence is not an acceptable substitute.

Define a versioned `MaterialProfile`: shape, dimensions in millimeters, pin positions and identifiers, pin shaft/head dimensions where needed, thread thickness and color/optical assumptions, permitted line count, winding rules, and stock constraints. Distinguish provisional development profiles from physically calibrated profiles. Competitor numbers must not silently become our manufactured kit dimensions.

Start with a deterministic monochrome circular algorithm that minimizes reconstruction error against the prepared image. Compare baseline greedy residual scoring with improved methods only when measurements justify them. Record algorithm version, seed where used, parameters, processed-image hash, and profile version. Run computation outside the UI thread; expose progress, cancellation, failure recovery, and bounded memory usage.

Required invariants:
- Every connection starts from the previous connection's endpoint within a thread/color segment.
- All pin IDs exist in the selected profile; prevent zero-length and prohibited connections.
- Different shapes have correct geometry, interior masks, and consistent numbering/orientation.
- Preview, player, export, and manufacturing instructions are derived from the **same immutable sequence**.
- Render real thread thickness relative to board scale; account for winding/shaft behavior where supported and disclose approximation limits.
- Respect configured material limits. Reject or recommend adjustments when the design exceeds available thread or feasible pin spacing.
- Estimate thread length with documented allowances for pin wraps, knots, and waste. Show an estimate, not an unsupported exact value.
- Estimate assembly time from step count and adjustable observed pace, not a hardcoded universal promise.

Generate understandable candidate variants such as balanced, lighter, and detailed. Support user changes to density/line count and save reusable presets. Never silently replace an approved sequence when the engine updates.

Complete circular, square/rectangular, and heart profiles. Add light-thread/dark-base mode and real multicolor generation with explicit thread/color changes and continuous paths per segment. Include material palette constraints and explain knot/color-change operations. Compare multicolor quality against a monochrome baseline using meaningful images.

Validate simulated quality and physically test a representative kit before calling outputs physically validated. The agent cannot perform physical assembly by itself; produce printable trial instructions, a test protocol, and request owner feedback only when this stage is actionable.

## 8. Interactive assembly player

Display current confirmed step, source pin, destination pin, visual segment, completed percentage, next actions, and remaining estimated time. Implement manual next/previous, jump to exact step, play/pause, adjustable pace, replay instruction, zoom/pan, and clear pin highlighting. Include startup knots, thread tension, interrupted-thread repair, color changes, and finishing/hanging guidance.

Implement voice guidance for Uzbek, Russian, and English, selectable voices when available, adjustable speech speed and step interval, optional owned/licensed background music or nature sounds, volume controls, and speech/music coordination. Verify Uzbek number pronunciation and pin identifiers. Browser TTS language availability varies; show accurate availability and provide a working fallback rather than silently speaking the wrong language. Do not require paid TTS to use the text player.

Separate “instruction announced” from “step confirmed as completed.” Autoplay must not lose this distinction. Prevent queued speech continuing after pause/jump; handle interruption and app backgrounding. Mobile lock-screen/background audio is a platform-specific requirement to implement and verify where supported, with clear fallback behavior on web.

Recovery: enter exact step; search a pin and show matching occurrences with neighboring pins. A recurring pin number does not identify one unique step. Confirm ambiguous selections rather than guessing. Undo a mistaken progress confirmation. Use local persistence and optional authenticated sync with explicit conflict handling. Never overwrite more recent progress with stale device data.

Downloaded instruction packages must work offline, including sequence, geometry, and available voice assets. Show last sync and offline status. A lost connection must not prevent manual assembly or erase confirmed progress.

Advanced hands-free mode: opt-in voice commands for start, stop, next, repeat, and save, with visible microphone state and permission-denial fallback. Test noisy-room behavior and accidental command handling. Add optional completion-quality checkpoints for reducing unnecessary final lines when the generator can substantiate them; never imply a quality guarantee from a slider alone. Camera-assisted physical progress recovery is a separate experimental feature: document feasibility and privacy, implement only with validated accuracy, and retain manual recovery until it is proven.

## 9. Export, storage, and sharing

PDFs: cover/setup, material list, actual-size tiled nail template, numbering/orientation, alignment marks, calibration ruler, full ordered sequence, knots/color changes, and printable progress markers. Support A4 and configurable paper sizes/text sizes. Verify scaling at 100%; do not rely on “fit to page.”

Provide versioned JSON project export/import and TXT sequence export/import with schema validation and clear incompatibility errors. Include generated previews and optional animation/video/GIF export with accurate render sequence. Add custom frame 3D-model export as an advanced milestone; verify units, dimensions, connections, and printable geometry before labeling it print-ready.

Personal library: name projects, duplicate parameters, reopen instructions, organize saved designs, remove projects through a recoverable flow, and download existing paid instructions without charging again. Public galleries, community sharing, reviews, and finished-work uploads require explicit user choices and moderation. Originals stay private by default. Do not add social posting or messaging merely because an integration exists.

## 10. Commerce and entitlement system

Catalog: kit formats, sizes, material profiles, variants, included parts, refill thread, extra bases, color add-ons, frames, bundles, gift cards/codes, app-only credits, ready-made commissions, and corporate gifts. Support accurate stock, shipping availability, currencies, and country configuration.

Checkout: cart, UZS display, shipping cost and expected delivery, address validation, order summary, discount/referral codes, configured payment options, confirmation, tracking, cancellation/return requests, and customer support. Payment methods for Uzbekistan should use verified provider documentation and owner-provided merchant accounts; adapters for Click/Payme or other selected services must not be treated as active without credentials and sandbox evidence. COD must be a genuine configured fulfillment policy, not a fake card payment.

Implement server-authoritative prices and entitlement grants, payment signature verification, idempotent callbacks, replay protection, reconciliation, and order state transitions. Never trust a frontend “success” redirect. Support email/transactional message adapters with delivery states and retries. Do not send real messages during development without authorization and a configured destination.

Kit codes: secure unique issuance, QR + readable code, profile binding, redemption, configurable quota/expiry, history, revocation, lost-code recovery through validated order ownership, and admin audit. Code-to-project activation should be transactional. Free preview unlimited within fair-use limits; final generation quotas must be transparent and configurable. Do not copy a competitor's three-credit policy as an immutable business requirement.

For a duplicate retry, failed generation, or re-download, do not deduct another credit. Link instruction access securely; avoid guessable public URLs. Gift redemption must not allow double spending.

## 11. Other researched product families — included in final roadmap

These are distinct engines and catalog families. Complete string art first; do not mark the entire requested product complete while these remain merely decorative cards.

### Photo brick mosaics / pixel art
Photo preparation, quantization to a real kit palette, inventory-aware color counts, size/orientation/resolution selection, editing tools, numbered grids, baseplate segmentation, PDF/interactive assembly, parts list, reusable designs, combining multiple kits, and color upgrades. Support constrained seven-tone kits and richer palettes through material profiles rather than pretending every kit contains fifty colors. Preserve required piece inventory feasibility when users edit pixels.

### Diamond photo mosaics
Kit sizes/orientation, defined crystal palette, style presets (Original, Vintage, Pop Art), numbered/color-coded grid, count and spare-material recommendations, printable/interactive instructions, progress by region, and magnetic-base variants. Do not assume the brick engine's grid dimension equals the crystal engine's physical spacing.

### Paint-by-numbers
Image palette reduction, cleaned regions, numbered regions, legend, style presets including full color when supported, configurable canvas dimensions, print-safe labels, material counts/coverage estimates, and progress. Distinguish region-based painting from a stamped pixel-grid kit and name the instruction type accurately.

### Sculptor, letters, and physical QR patterns
Licensed original 3D model catalog with layer/assembly instructions, letter/text generation, valid QR generation under supported error-correction and kit dimensions, and a physical assembly grid. Validate QR scanning at the intended printed/assembled size; reject overlong/complex payloads for the selected resolution. Do not claim a QR is physically readable because a browser-generated QR scans on screen.

### Guided kits and book folding
Video/instruction catalog for original kids' construction models, cardboard 3D puzzles, and Ebru; accessible playback, 360-degree model views where assets exist, and model selection without unnecessary code gates. Videos must be original/licensed; never fake a finished instructional catalog with broken assets.

Book folding is an additional researched digital service: book height/page count, text/date/symbol input, feasibility checks, page marking/folding sequence, ruler measurements, voice/text guide, PDF, and digital access entitlement. Keep it a separate engine; implement under Ip Rasm only after the primary engines are working. Use suitable non-protected source books and original patterns.

## 12. Admin, support, localization, and business tools

Protected admin roles with least privilege and server-side authorization. Manage material profiles, products, stock, codes/credits, orders, fulfillment, gift campaigns, refunds/return requests, content, locale strings, support tickets, promotions, referral attribution, and consented reviews. Audit important changes and expose failed integrations for recovery.

B2B functions: quote request, volume pricing configuration, recipient redemption links, partner/corporate portal, order batches, branded campaign configuration, and inventory-aware fulfillment. These must be role-protected, not public access to other customers' records.

Analytics: preview start/completion, design selected, checkout/order, code redemption, first assembly step, resumed work, confirmed completion, support reason, and repeat purchase. Attribute creator/referral links to orders with an explicit privacy policy. Do not collect unnecessary photo contents in analytics. Track net contribution after materials, fulfillment, payment fees, support, and acquisition cost; likes/views are not revenue.

Localize real customer screens, validation messages, email templates, exports, and number/unit formatting. Support Latin Uzbek characters and font embedding in PDFs. Keep engineering terms out of shopping flows. Prepare RTL support when a later locale needs it; do not add an unusable language selector.

## 13. Data model and security requirements

Core entities: user/guest access, media/edit parameters, material profile/version, design/project, generation job, immutable instruction/version/sequence, local/synced progress, code batch/code/redemption, entitlement/credit ledger, product/variant/inventory, cart/order/line/payment/fulfillment, gift/redemption, support ticket, content asset/license, campaign/referral, review/moderation, audit record, and region/provider configuration.

Apply authorization to each project/order/asset. Protect uploads against malformed and oversized decoded images. Restrict signed asset links and avoid leaking images in logs. Publish actual retention behavior; implement deletion and TTL cleanup. Prefer local generation when practical; server computation is permitted when needed with a clear privacy flow.

Code redemption and payment processing must be race-safe. Protect expensive generation and public forms with appropriate rate limits and budgets. Version migrations and provide backup/restore documentation. Never expose administrator seed credentials as a production default.

## 14. Milestones and definition of done

Create a dependency graph, then execute these milestones. Refine task sizes after repository inspection while retaining full scope.

| Milestone | Required outcome |
|---|---|
| M0 — Inventory and delivery plan | Actual repo/remote state, runnable baseline, documented architecture decision, requirement IDs, test strategy, and blocker register. Start implementation in the same active session. |
| M1 — Real monochrome vertical slice | Photo → calibrated development-profile path → sequence-derived preview → functional player → progress → PDF. No fake results. |
| M2 — Complete string-art workspace | All shapes, presets, suitability analysis, material/time estimates, multicolor, recovery, project library, exports, offline behavior, localization. |
| M3 — Website and mobile | Responsive site/PWA plus actual Android packaging and mobile navigation/persistence/audio tests; iOS configuration and accurate remaining host/signing dependencies. |
| M4 — Commerce and operations | Products, orders, gifts, codes/entitlements, local provider adapters, admin, support, stock/fulfillment, audit, and sandbox verification. |
| M5 — Extended art engines | Real brick, diamond, paint, letters/QR, guided kit catalog, and book-folding implementations with their own acceptance criteria. |
| M6 — Advanced and growth tools | Animation/3D export, community/reviews, creator attribution, B2B, regional configuration, production observability. |
| M7 — Readiness | CI, meaningful end-to-end verification, performance/device evidence, physical-validation protocol/results, launch checklist, build artifacts and owner dependencies. |

Do not use milestones to permanently omit requested features. Each requirement must end as verified, blocked with a specific external dependency, or explicitly changed by the owner. Reassess risky physical/3D features honestly; do not call them ready without proof.

## 15. Verification requirements

Tests must exercise outcomes, not mirror implementation. Include:
- Determinism and sequence continuity, pin bounds, shape mask correctness, color transitions, finite outputs, material constraints, import validation, and cancellation.
- Preview/player/PDF consistency through shared sequence hashes; PDF dimensions and calibration marks.
- Crop/orientation, extreme images, multiple faces, transparency, unsupported formats, and safe resource limits.
- Resume after reload/crash/offline; ambiguous pin search; two-device sync conflict; speech cancellation on pause/jump.
- Server authorization, code races, quota rollback, gift double redemption, price tampering, forged/replayed payment callbacks, and duplicate delivery.
- Browser creation/assembly/checkout flows; mobile happy path and recovery; permission denial and unavailable voices.
- Performance measurements with named hardware/image sizes/profile sizes. Target a first usable preview within 60 seconds on a documented modest-device benchmark; do not report target as achieved until measured.
- Visual review of real web/mobile screens and sample PDFs; fix overflow, unreadable labels, and touch targets.
- Representative physical assembly trial; record material parameters, preview, final artwork, problems, and adjustments. This needs human execution.

Do not stop development on independent modules while awaiting physical feedback. However, release-facing claims about physical accuracy must stay unverified until it arrives.

## 16. Final handoff and completion reporting

Provide the working source, README, setup/configuration examples, migrations/seeds, test/CI scripts, mobile build instructions/artifacts, architecture notes, requirement matrix, and an accurate status report. List provider credentials, signing/store accounts, licensed content, material samples, and production approval still required.

Explain what works locally, what passed automation, what was device-tested, what was physically tested, and which integrations are live. Never summarize the entire product as complete because all screens render. The work should make the owner's next action concrete and minimal.

## 17. First action requested from the receiving Codex

Begin by inspecting the supplied workspace and intended repository. Import these handoff documents into `docs/`, create your durable roadmap and feature matrix, select the existing or appropriate stack, and immediately implement M1's real photo-to-sequence-to-player vertical slice. Continue through the roadmap autonomously during available execution, preserving checkpoints and asking only when necessary.
