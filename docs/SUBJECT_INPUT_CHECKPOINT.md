# R1 + R2 subject input checkpoint — 2026-10-13

Branch `feat/r1-r2-subjects`, created from `wip/2026-10-13` (`fd591cc`). Local commits only; nothing pushed. Implements R1 (subject-safe input + immutable SubjectPlan) and R2 (1–3 people with independent review) from `MULTI_SUBJECT_QUALITY_PLAN.md`, plus the R5-related photo advisories requested by the owner. **No likeness/quality claim**: these are input-safety and workflow mechanics, verified with synthetic fixtures only. No sealed experiment was rerun, no default material/pin/resolution changed, no APK rebuilt, no tmp/output/owner data touched or committed.

## What changed

### Subject choice (R1)

- `src/SubjectChooser.tsx` replaces the `<select data-testid="subject-kind">` with five large touch cards (People / Animal / Vehicle / Object / Whole image) in a `role="radiogroup"`; the test id stays on the group (`data-value` = current kind). Arrow keys move between cards. Text in UZ Latin, UZ Cyrillic (derived by `scriptText`), RU, EN (`src/subject-i18n.ts`).
- Cards appear **after a photo is loaded**, so the photo-first start keeps exactly two source actions (`simple-flow.spec`). Default kind for a new photo is `whole-image` (original pixels). Person analysis runs only after the user taps People.
- Choosing People starts local analysis only; it no longer silently enables portrait weighting. The existing D9 guard (`portrait-choice/off`) therefore still stops an unreviewed face photo from being generated as a general image unless the user explicitly confirms that.
- Animal / vehicle / object: no person segmentation, no label-15 semantic cleanup, no face panel, no portrait setup, no people buttons, no human anatomy weights. Original pixels are kept; only the manual keep/erase mask is offered. Verified by request logging (no `selfie_multiclass`, `face_landmarker`, `deeplab` fetches) and byte-exact comparison of the pixels posted to the generator Worker.
- Kind switching keeps per-kind state in `subjectBackgrounds` / `subjectPortraits` (verified): returning to a kind restores its corrections; a person mask is never reused for another kind; a pending analysis is aborted and its late result ignored.

### Immutable SubjectPlan (R1)

- `subject-plan/1` is stored in the local recipe (`generation-inputs.ts`, now re-validated on read) and in new guides' `params.subject`, so it is covered by the sequence hash.
- Validated in the generator Worker before any strategy (`generator.worker.ts`), as well as in engine/density/validation.
- `explicit-person-mask` is rejected for animal/vehicle/object. `whole-image` may carry it only when People was chosen and then generated without portrait weighting (the mask was explicitly requested); previously this combination threw inside `generate()` and left the button busy — `generate()` now reports plan errors and releases the job.
- `subjectPlanOf(params)` is a read-only adapter for legacy guides (no `params.subject`): derives `people` (from `PortraitSettings`) or `whole-image`, `sourceRevision: "legacy-unrecorded"`, `legacy: true`. It never writes back; legacy params and hashes are unchanged (pinned v4 hash test and a new no-mutation test pass). The result card shows the plan (`data-testid="result-subject"`).
- The preserved-result notice now also compares subject kind (object vs whole image can have identical pixels).

### 1–3 people (R2)

- `src/core/people-edit.ts`: `unreviewedPeople`, `setPersonReviewed`, `removePerson`, `unconfirmedPeople` beside existing `addPerson`/`movePerson`. Stable ids (UUIDs) are kept through add/remove/reorder-free edits.
- Detector suggestions (`apply-people-faces`) now start **unconfirmed per person**; previously one action marked every face reviewed.
- `PeopleRegionEditor`: per-person status chips (`data-testid="person-status"`, `data-reviewed`), review button per selected person, add (max 3 in new compositions) and remove. Moving/resizing a person (face box inputs or feature boxes in a group) invalidates only that person. Crop/rotation still invalidates all (positions change for everyone).
- Generation is blocked for groups until every person is reviewed: button disabled + localized notice `people-review-blocked` (“Not yet checked: person 2, 3”), and `generate()` refuses with `people-review/<list>`. The Worker's existing `group-optical/15` rule (“Review every person's facial regions”) is unchanged. A single person keeps the existing D9 flow (review or explicitly confirm general image).
- Legacy 4–8 person imports still validate, load, can be reduced, and show a localized “quality beyond three is not tested” note; adding beyond three is refused.

### Unsuitable-photo advice

`src/core/subject-advice.ts` + `src/SubjectAdvice.tsx` (`data-testid="subject-advice"`). Computed on the exact processed target that would be sent to the Worker; **advice only**, never blocks; no score wording.

| Advice | Rule (heuristic) | One-tap fix |
| --- | --- | --- |
| Small face/subject | People: any eye/nose/mouth window spans < 8 samples (per person). General subject with manual mask: ¼ of the masked subject span < 8 samples. Unmasked general subjects: bounds unknown, no guess. | Zoom in (centres and enlarges the subject, keeps it on the board) + choose another photo |
| More than 3 people | max(portrait people, detector faces) > 3, people kind only | Choose another photo |
| Low contrast | luminance std inside the board shape < 30/255 (same scale as existing suitability) | Crop to subject (if bounds known) or another photo |
| Blur | variance of 4-neighbour Laplacian over textured samples (gradient ≥ 6) < 60. Synthetic sharp > 3000; 3× box blur r=1: 38–200; r=2: < 30 | Choose another photo |

### Face model performance

`src/face-detection.ts` caches the fetched bytes' SHA-256 check and the `FaceLandmarker` instance once per photo-worker session (retry allowed after a failed load) instead of per call; `closeFaceDetector()` is invoked by a new `dispose` message, sent on `pagehide` (`disposePhotoAnalysis`). A superseded job still terminates an idle worker (existing behaviour, frees WASM memory immediately); the cache helps every sequential analysis. Browser test: two sequential People analyses fetch `face_landmarker.task` once.

## Tests

Commands (Windows, this host). Playwright's bundled browsers are not installed on this machine, so browser runs used the installed Chrome through an untracked local config `playwright.system-chrome.local.ts` that only sets `channel: "chrome"` on the two standard projects; ports 4283/4411, artifacts in `%TEMP%\iprasm-r1\…`.

Local override used (untracked, deleted after the run; recreate if needed):

```ts
import base from "./playwright.config";
import { devices, defineConfig } from "@playwright/test";
export default defineConfig({ ...base, projects: [
  { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  { name: "mobile-browser", use: { ...devices["Pixel 7"], channel: "chrome" } } ] });
```

| Check | Result |
| --- | --- |
| Baseline before this work (`fd591cc`): `npm test -- --maxWorkers=2 --testTimeout=30000` | 163/163, 53 files |
| Final unit suite, same command | **183/183, 55 files** (20 new: 14 in `tests/subject-input.test.ts`, 6 in `tests/subject-advice.test.ts`; pinned legacy v4 hash test still passes) |
| Final targeted browser set, desktop: `subject-input, background, people-features, person-background, photo-actions, portrait-dispatch, simple-flow, photo-quality, saved-calculation` with `DATABASE_PATH=%TEMP%/iprasm-r1/test-api.sqlite`, ports 4285/4421 | **24/24 passed** (3.5 min) |
| Same set, `mobile-browser` (Pixel 7 emulation) | **24/24 passed** (3.6 min) |
| Same 8 legacy specs on the untouched `fd591cc` snapshot (baseline, desktop) | 5 passed / 14 failed — the R1 default (`whole-image`) stopped person analysis, the group review button was gone, and several steps targeted controls inside collapsed simple-flow sections |
| `npm run build` | passes, 1875 modules; existing chunk-size warnings only |

New browser spec `tests/e2e/subject-input.spec.ts` (synthetic fixtures from `tests/fixtures/synthetic-subjects.ts`; the photo-analysis Worker is replaced by a deterministic stand-in for the detector scenarios):

1. car / dog / object: cards selected after upload, status stays `manual`, no person-model request, no person UI, advice panel shown, pixels posted to the generator Worker equal the fixture bytes, `params.subject.kind` and `preparation: "original"`; after reload the saved guide keeps the same plan and hash.
2. kind change while analysis is pending: the slow stale mask (would whiten everything) and two faces are ignored after switching to Animal; switching back to People re-analyses; switching away again restores original pixels (person mask not reused).
3. detector finds 2 → apply → add a third → gate “person 1, 2, 3”; review per person; moving person 2 re-blocks only person 2; gate text and cards in UZ / UZ-Cyrillic / RU / EN; kind round trip keeps the reviewed composition; `group-optical/15` guide with 3 ids equal to the editor ids, subject plan with 3 reviewed subjects, zero progress, persists across reload.
4. two sequential People analyses fetch `face_landmarker.task` once.
5. real generator Worker: valid vehicle plan done; vehicle + enabled portrait → error; vehicle + `explicit-person-mask` → error.

Legacy spec updates (behaviour changes, not weakened checks): explicit People choice after upload; per-person review instead of one group click (and re-review after rotation, which remaps every face); open collapsed simple-flow sections before using their controls; two state assertions on collapsed controls use `includeHidden`; photo guidance fragments follow the current copy.

Two product fixes found by those legacy specs: the background section closed itself when a failed preparation became a manual correction (now it only auto-opens), and the WIP had dropped the group guard on the single-portrait toggle (restored as `disabled={group && !portrait.people}`).

**Full desktop suite was started and deliberately stopped at 19/77**: 9 failures so far were all navigation steps to controls now behind “More” (`Try an original sample`, `Grid crafts`, `Account & shop`) in anatomy, continuation, customer, global-fit and grid-craft specs — the same pre-existing simple-flow drift, unrelated to subject code. It was stopped because `playwright.config.ts` starts `npm run server` without `DATABASE_PATH`, i.e. on the owner DB `tmp/data/iprasm.sqlite`, and customer/business specs would write to it. Verified afterwards: `iprasm.sqlite` and its WAL still show their 2026-10-12 22:45 timestamps (no writes). All later runs used an isolated `DATABASE_PATH`.

## Open items

- **Leftover test processes**: the stopped full run left its preview (port 4283) and API server (port 4411, opened `tmp/data/iprasm.sqlite`, no writes observed) running; stopping them was not permitted from this session. The owner's own preview on 4194 was not touched. Close 4283/4411 manually when convenient.
- `playwright.config.ts` should give its API server an isolated `DATABASE_PATH` by default so a full run can never reach the owner DB. Not changed here (shared config; owner decision).
- Remaining legacy specs (anatomy, continuation, customer, global-fit, grid-craft, and others after test 19) still navigate as before the photo-first flow; they need “More”-menu navigation updates. Full suite not re-run.
- A single person keeps the existing D9 rule (review the face or explicitly confirm a general image); only 2+ people use the per-person gate.
- Detector boxes for groups are stored with the legacy placement label `proportional-estimate` until confirmed; the label means “not yet confirmed”, not that the boxes were estimated.
- Photo advice thresholds are heuristics on synthetic data (blur 60, contrast 30, ¼-span rule for masked general subjects); calibrate on the R5 representative set.
- A superseded analysis still terminates an idle worker, which also drops the cached face model; posting `cancel` instead would keep it, at the cost of finishing one inference step. Left unchanged.
- General subjects still generate with `continuous-guarded/6` and no importance regions; generic marked regions and the shared optimizer belong to R3. No likeness acceptance for any subject kind.
- Playwright's bundled browsers are not installed on this host (`npx playwright install chromium` would download them); runs used system Chrome.
- APK not rebuilt (shared code changed, so the next Android delivery needs a rebuild).

## Exact next step

**R4 first diagnostic** from `MULTI_SUBJECT_QUALITY_PLAN.md`: freeze a baseline manifest (original/target hashes, crop, materials, regions, exact guide, renderer, full objective) for the current owner photo and the preserved stronger reference `eeb26cf…c944` under its own crop; then compare fit graph vs routed sequence, region-wise coarse tone and physical contrast at the same reference, and quantify how much real nostril/lip gradient energy lies near the cosine taper edges and each term's share of loss/gain. Do not run a new photo sweep before that diagnostic explains what it tests. R3 (generalized solver for groups/objects) remains after R4's diagnosis; generation for general subjects currently uses the existing `continuous-guarded/6` path with no anatomy weights.
