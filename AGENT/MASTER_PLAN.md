# Ip Rasm — Master plan for the autonomous coding agent

Owner: Humoyun. He speaks Uzbek. Every progress note, question and final summary for him: short Uzbek (Latin). Code, docs and commit messages: English.

Project root: `D:\Coding projects\ipdan face yasaydigan app`
Product: "Ip Rasm" — photo → physical string art (nails on a board + one continuous thread), plus related craft products.
Stack: React 19 / TypeScript / Vite, Capacitor 8 Android (iOS later), Node + SQLite server, Vitest, Playwright, pdf-lib.

---

## 1. Working protocol (read every session)

1. Start of EVERY session (including after "continue"):
   - Read `AGENT/PROGRESS.md` → find the current phase and the exact next step.
   - Read the last entries of `AGENT/LOG.md`.
   - Run `git status` and `git log --oneline -5`. Never lose uncommitted work.
2. Work fully autonomously through the phases below **in order**. Do not wait for a new prompt between steps or phases.
3. After every meaningful milestone (at least every ~1 hour of work):
   - run the relevant tests and the build;
   - `git commit` (local only);
   - update `AGENT/PROGRESS.md` (status of every phase + **exact next step**);
   - append a dated entry to `AGENT/LOG.md` (what was done, test results, decisions, problems).
   Write this BEFORE starting the next big step, so a usage-limit stop never loses the state.
4. If the owner must test something, append it to `AGENT/OWNER_TESTS.md` in Uzbek (what to open, what to click, what should happen) and **continue working**. Do not stop to wait.
5. Ask the owner (in Uzbek) ONLY for: competitor sample images, real photos for acceptance, voice recordings, production credentials/money decisions. If missing → record in `PROGRESS.md` under "Waiting for owner", skip that sub-step, continue.
6. When the owner writes only "continue" / "davom et": do step 1, then continue from the exact next step.
7. When ALL phases are done or blocked only by owner inputs: write the final Uzbek summary into `AGENT/FINAL_REPORT.md` and in chat.

## PHASE 10 — reference classic generation and ordinary-photo repair (2026-10-16)

The owner's urgent request authorizes a new `classic-greedy/2` default, independently of the rejected Phase8/9 96px trials. Preserve `/1`, old material contracts, hashes and guides. First reproduce the real JPG gallery flow on isolated desktop/mobile servers. Port provided reference DDA/residual arithmetic, fixed2500 budget and defaults, exact kit pins/sectors, Worker progress/cancel/recovery. Port people-mask/grayscale/CLAHE2(8x8)/masked1–99 stretch/unsharp2/.6 and reviewed70% head framing to TS/canvas; show target before generation. Use versioned physical1000px/.12mm/.9 coverage consistently for preview/player/PDF, one immutable legal sequence for all exports. Verify three original synthetic portraits and existing private owner crop against the reference, actual UI timings and visual comparison in ignored output/phase10/report.html. Acceptance requires recognizable results and <15s generation; never report unexecuted checks as passed. Run tests, isolated build, preserved/signer-verified APK and fresh isolated preview with URL/code in ignored manual-testing.txt. Commit progress/log at each milestone. Never commit photos/output/secrets or touch tmp/data/4194/live assets.

## PHASE 11 — larger heads and portrait composition (2026-10-16)

Owner review supersedes the agent's Phase10 subjective acceptance: Circle head too small, shirt wastes connections and Heart pairs small/bottom-centred. Keep classic-greedy/2, preparation2, old guides and physical rendering unchanged. Add preparation3: Circle/Square hair-to-chin87%, centred slightly high, default18px smooth below-chin white fade and keep-shoulders toggle; independent pan/zoom. Place two Heart heads in upper lobes (~42% width, chins near horizontal middle); single Heart upper2/3. Expose2000/2500default/3000 and8seconds/connection estimates. Capture actual desktop/mobile owner-local/three-synthetic/Square/Heart-pair comparisons against frozen Phase10 at equal size in output/phase11/report.html. Require visibly larger/clearer faces and<15s generation; record limitations honestly. Test, build output/phase11-dist, preserve/signature-verify APK, launch fresh preview/code. Never contact/change4194/4195/4196 or their served directories; never tmp/data. Update PROGRESS/LOG and commit each milestone, Uzbek owner tests and summary.

## 2. Hard rules

- Git: work on branch `feat/full-roadmap` (create it from `feat/r1-r2-subjects` if it does not exist). Commit per milestone. NO push, reset, rebase, `git clean`, force, or history rewrite. Never commit `tmp/`, `output/`, photos, secrets, DB files.
- Never touch `tmp/data` or the owner database (`tmp/data/iprasm.sqlite`, `tmp/data/local-secrets.json`). Tests always use an isolated temp DB, isolated ports and a separate `IP_RASM_TEST_ARTIFACTS` folder.
- Never stop the owner's server on port 4194. Stop only processes you started yourself.
- Owner preview4195 serves `output/phase9-dist` (additive asset union). New reference preview4196/API4478 serves `output/phase10-dist`; that directory is now FROZEN/live and matches the verified APK. Never build/empty either live directory or dist/4194. Future work must build a new clean directory such as `output/phase10-next-dist`; preserve customer/test sessions and all old hashed assets.
  Phase11 preview4197/API4479 now serves FROZEN `output/phase11-dist` (43files exactly verified APK46bc061bd5c2). Preserve it too; future work uses a new directory/port, e.g.output/phase12-dist. Do not contact/restart/change4194/4195/4196 or their APIs/assets. New4197 launcher13968/child9128 uses isolated test-results/owner-framing-RR6GiM/database.sqlite; code file output/phase11/manual-testing.txt. Phase11 completed253unit/38latest browser cases/14exact PDFs/verified debugAPK; phone/physical acceptance separate.
- Old guides, sequence hashes and saved progress stay valid. New algorithms get new version ids; old engines untouched.
- No fake previews, no source-photo overlay, no invented facial details. The exact same ordered sequence drives preview, player, PDF, JSON and TXT.
- No default promotion without visual + metric acceptance (Phase 2 rules).
- Do NOT repeat experiments marked completed/rejected in `docs/` (v12/v16 fits, 24-sweep, head weighting, resolution/pin-phase/material sweeps, old pruning probes).
- Competitors: public information only. Never bypass kit-code gates, never upload photos to third-party sites automatically, never scrape private APIs, never copy their images, logos, guides or code.
- Open-source code: reuse only with a compatible license (MIT/Apache/BSD) and attribution; otherwise reimplement the idea from the paper.

## 3. Read first (once, then as needed)

`docs/SUBJECT_INPUT_CHECKPOINT.md`, `docs/FEATURE_CONTRAST_CHECKPOINT.md`, `docs/MULTI_SUBJECT_QUALITY_PLAN.md`, `docs/PRODUCT_DIAGNOSIS_AND_EXECUTION_PLAN.md`, `docs/DECISIONS.md`, latest sections of `docs/STATUS.md`, `docs/OWNER_PRODUCT_REQUIREMENTS_2026-10-12.md`.

## 4. Owner requirements (summary)

1. Highest priority: recognizable likeness and a physically buildable thread sequence. Nose, lips, hair and cross-face strands must improve in the REAL sequence, not just the preview.
2. Thread count must be the most efficient: best quality for the fewest connections.
3. Works for 1, 2, 3 people, animals (dogs etc.), vehicles, objects, and text (Latin, Cyrillic, Arabic).
4. Very simple, bright, iPhone-like UI; camera/gallery first; advanced settings hidden.
5. Kit business model: one login per delivered kit; free unlimited previews; steps locked until a kit credit is used; 3 full builds per new kit by Phase9 default (admin may set4; existing grants stay unchanged).
6. Compare our quality with QBRIX (qbrix.me) honestly.
7. Two distinct offline instructor voices (UZ/RU/EN), Android APK, later physical and phone tests, then real shop services.

---

## 5. Phases

### PHASE 0 — test safety
- `playwright.config.ts` and every test server/script default to a fresh temp DB under the test artifacts folder; fail loudly if `DATABASE_PATH` points into `tmp/data`.
- Fix the full-suite e2e failures caused by navigation buttons now behind "More" (update tests, not the UI).
- Playwright browsers are not installed: use the installed Chrome via an env option (e.g. `IP_RASM_CHROME_CHANNEL=chrome`), no download.
- Run the FULL desktop + mobile e2e suite isolated; record exact pass/fail. Commit.

### PHASE 1 — legitimate research
- Public info only: qbrix.me product/generator pages, public product listings (Amazon/Walmart etc.), similar products (RingString, String Ring, Let's String, string-art apps). Document customer workflow (code in box → photo → preview → instructions), kit contents, pin counts, board sizes, thread length, step counts, product types (portraits, animals, text, other thread products).
- Survey open-source string-art algorithms on GitHub and papers (e.g. Birsak et al. 2018 "String Art: Towards Computational Fabrication of String Images"; greedy + importance maps; supersampling; line removal/exchange). Record license, method, measured strengths, and what is better than our engine.
- Output: `docs/COMPETITOR_WORKFLOW.md`, `docs/ALGORITHM_SURVEY.md` with ranked, concrete ideas to test.

### PHASE 2 — string quality (highest priority)
1. R4 diagnostic (see MULTI_SUBJECT_QUALITY_PLAN.md): frozen baseline manifest — root24 `8d1f2dd8f3424a0d23c7bb09240228e447ebab8fb9b520310e636ac9873c8323` on target `1d06c780d790a1554daf646c888824d2ae7f2ad97140c7b707239b16a9c727fa`; old best `eeb26cf5539462c9d0321579f2025307ea0d94735d08e0ca5497ef3ec8ebc944` as context only (different crop). Fit vs routed; per-region (each eye, nose, mouth, jaw, skin, hair) tone error, physical-contrast residual, dark excess; objective-term shares; cross-face texture energy in skin.
2. Using the diagnostic + Phase 1 survey, test the strongest ideas ONE AT A TIME as new versioned opt-in algorithms (examples: importance-map supersampled objective; local excess-texture penalty; line-removal/exchange pass; face-fill framing as a separately labelled experiment; black+white thread on grey board as a separately labelled material experiment). Equal evaluation budget vs an unmodified control; full routing included; 32-chord/160-incident guards; recovery checkpoints for long runs.
3. Acceptance: same-size and enlarged comparison of original crop, target and full sequence; no regional residual worse than max(2% of baseline, 0.0001); light-tone excess rise ≤ 1/255; any visible likeness loss rejects.
4. Thread efficiency: for the accepted method, build a quality-vs-connections curve (e.g. 1000–4000) and choose the knee as the recommended count. Then simplify only that reference (all routing counted). Report connections, thread metres, estimated minutes.
5. Promote to default ONLY if clearly better on the owner photo AND a synthetic/licensed set; otherwise keep opt-in. Write `docs/QUALITY_CHECKPOINT.md` (ACCEPTED / INCONCLUSIVE / REJECTED per idea, with report paths).

### PHASE 3 — R3 generalized solver
- Extract subject-independent fitter parts; one capability registry; SubjectPlan regions for 1–3 people (per-person normalized weights + worst-subject gate), animals (user-marked eyes/muzzle), vehicles/objects (silhouette + marked details). Groups use the same strong path as singles.
- Unsupported combinations show a clear localized message, never a silent fallback. Legacy engines and imports unchanged.

### PHASE 4 — more thread products
- Text/lettering string art: Latin, Cyrillic AND Arabic (correct RTL shaping and joining; bundle OFL fonts offline, e.g. Noto Naskh Arabic / Noto Kufi Arabic / Noto Sans). Mode (a): text rendered as target through the main solver. Mode (b): outline style with pins placed along glyph shapes (new physical template with exact coordinates). Name + portrait combination if feasible.
- Animal and object presets using Phase 3. Add other thread products found in Phase 1 if feasible (document what was skipped and why).
- Every new mode: exact PDF template, player, offline export, tests, UI in UZ Latin / UZ Cyrillic / RU / EN.

### PHASE 5 — kit login and build credits (server-authoritative)
- Admin generates kit codes in batches (printable list + QR for the box insert). A code redeems into ONE customer account (login by phone + password, or code-based login).
- Each kit grants N full builds (default 4). Admin settings: N per kit; optional validity window (default no expiry; can be set e.g. "4 per 30 days"); per-account limits.
- FREE and unlimited for everyone: photo → generation → preview image + thread length + time estimate.
- LOCKED until a credit is spent: step list, player, PDF/TXT/JSON export. Clear localized "Buy a kit / enter kit code" screen.
- Unlock: server issues a signed token bound to account + sequence hash; exactly one credit consumed; the guide then works offline on that device. Locked sequence data must not be shown or exported in the UI. Document honestly that this is a deterrent, not unbreakable DRM; prepare an optional server-side generation path for stronger protection later.
- Idempotent redemption/unlock (no double spend on retry), audit log, admin view of codes/credits/usage, rate limiting. Unit + e2e tests in an isolated DB.

### PHASE 6 — QBRIX comparison
- If `comparison/qbrix/` contains the owner's QBRIX outputs plus the same source photo: generate our result for the same photo, board shape and similar pin count; build `output/qbrix-compare/report.html` with same-size + enlarged eyes/nose/mouth/hair, connection counts, thread length and an honest per-region verdict. Summarize in `AGENT/FINAL_REPORT.md`.
- If the folder is empty: write `docs/QBRIX_COMPARE_HOWTO_UZ.md` (Uzbek: what to buy/upload, which files to put where), add it to OWNER_TESTS.md, mark "Waiting for owner", continue.

### PHASE 7 — design, voice, APK
- Split `App.tsx` (4000+ lines) into screens: Create / Assemble / My projects / More. Bright clean background, navy accents, large touch targets, iPhone-like simplicity; advanced settings in "Details". Accessibility, safe areas, keyboard, empty/loading/error states.
- Voice: two distinct offline instructors for UZ/RU/EN from recorded clips (numbers 0–19, tens, hundreds + ~60 phrases, concatenated, e.g. "ikki yuz o'ttiz besh"). Implement player + clip manifest + `docs/VOICE_RECORDING_UZ.md` (exact list of clips to record). Fallback to device TTS and text. Do not claim voices exist until real recordings are added.
- Rebuild the APK; verify assets and signer; preserve old APKs. No phone install.

### PHASE 8 — classic standard-kit prerequisites

Added 2026-10-15 because no Phase8 implementation/plan existed when the owner requested Phase9. Complete these prerequisites before Phase9 integration; do not describe the old Phase0–7 outcome as acceptance of this new work.

- Implement a separately versioned `classic-greedy/1` continuous legal-chord engine, actual physical optical reconstruction, deterministic recovery/limits and exact preview/player/export identity. Preserve every old engine/hash/import. A new explicitly selected standard kit may default to this engine without claiming visual superiority or promoting it over accepted legacy methods.
- Add a standard white-base kit profile and explicit automatic white-background preparation using existing local segmentation; failures must be visible and preserve the source. Add a reviewed face-fill crop for one/two faces; never invent face detail or silently clip a face.
- Freeze a reproducible A/B protocol: existing continuous engine versus classic on identical prepared targets/material/layout/line budgets; include actual owner target when locally available outside protected data and procedural synthetic faces. Report actual source/preparation differences separately. Keep old rejected probes untouched. No superiority claim without metric and visual acceptance.
- Unit/browser checks and isolated production build; update PROGRESS/LOG/OWNER_TESTS and commit before Phase9's next milestone.

### PHASE 9 — QBRIX-level standard kit

Owner request 2026-10-15. Competitor facts supplied by owner are reference requirements, not copied assets or a claim of reproduced competitor quality: QBRIX/RingString white500mm square wooden base,460mm circle,240 nails, monofilament, circle/square choice, Heart up to2 people/optional red thread, sector stickers, voice/PDF,4–6h advertised assembly,3 instructions per single-base code. Record primary public verification/contradictions separately; never bypass gates or upload private photos.

Kit inputs are owner-editable; provisional defaults:500×500mm white MDF base,460mm circle,240 nails, black0.12mm monofilament. Shaft/hole/edge clearances must be explicit and validated, not guessed into a collision-free claim.

1. Admin-editable default standard profiles: Circle46 (240 nails/460mm circle), Square (240 perimeter nails on same base), Heart (legal continuous layout/max2 people/optional separately modelled second colour). Derive one collision-checked combined drilling plan; shared identical holes may be explicitly shared, near-collisions refused or deterministically resolved within declared layout tolerances. Exact final positions must drive fitting and all outputs. Produce original1:1 500×500mm and tiledA4 PDF with50mm calibration, no competitor assets.
2. Versioned sector mapping default4×60 A1…D60, configurable e.g.8×30. Show B-17 in player/PDF/TXT and speak letter+number; preserve numeric indices in JSON/export. Exact matching sector ruler sticker PDFs; no scale approximation or hidden physical drift.
3. Evaluate quality versus connection counts using classic/Phase8 winner on240-nail kit. Recommend a measured knee aiming at2000–3000; never fabricate a knee or force a failed budget. Show assembly-hour estimate before unlock and distinguish estimates from competitor4–6h advertising.
4. New kit-code default3 full builds, admin-editable including4. Do not change existing granted credits/batches/receipts/old guides.
5. Re-run the frozen Phase8 A/B protocol for Circle46/Square/Heart (Heart with2 faces), owner photo and procedural faces; write output/phase9/report.html and reproducible manifests/metrics/counts/metres/hours. Missing owner inputs must be explicit; continue independent work. These are new kit/material/framing comparisons, not repeats of rejected v12/v16 sweeps.
6. Tests, isolated build, new verified APK preserving historical APKs/signer; no phone install. Uzbek OWNER_TESTS: print100%, measure50mm, mark/drill holes, apply exact sector rulers, generate, unlock, start first step. Physical drilling/adhesion/readability/likeness remain owner acceptance. Keep live4194 server and its served dist unchanged; build/test elsewhere.

### FINAL
`AGENT/FINAL_REPORT.md` + chat, in Uzbek: every phase done / tested / pending (with reason), branch, commit list, report paths, and exactly what the owner should test. For Phase8/9 use `Start-Standard-Kit.cmd` → http://127.0.0.1:4195 (fresh isolated test data/local code file); keep existing4194/API4331/live dist untouched. Historical Phase0–7 `npm run local` instructions are not authorization to restart4194.
