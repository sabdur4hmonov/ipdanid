> Active checkpoint: REGION_ALIGNMENT_CHECKPOINT.md. Earlier proportional-band facial percentages below are historical, superseded as anatomical improvement claims. Use the corrected remeasurement and active next task there. Historical sequences remain unchanged.

# Local photo guidance and controlled background checkpoint

2026-10-04–05. Preserve `3ce5b0b`, `e6d7b49`, all output/portrait and output/fidelity evidence. No push, publication, external photograph upload or photo synthesis. Full roadmap remains in force; the acceptance order is in ROADMAP.md.

## Implemented behavior

UZ/RU/EN advice beside upload: one sharp visible face, optional plain white/light neutral background, even lighting, visible eyes/front-facing view, existing photos welcome and inspect before proceeding. Patterned photos are accepted. Existing suitability hints remain advisory.

The existing grayscale/local-contrast/oval processing is unchanged for old settings. Optional manual light-background correction stores separate fixed 64×64 one-bit background/foreground selections, each 1,024 hexadecimal characters, in portrait settings. Restore subject recovers the original grayscale/contrast pixels, including areas lightened by the old oval; it does not synthesize features. The controlled light-protected experiment has no foreground-restoration mask, so its exact processed pixels and old hashes remain unchanged. Painting background clears foreground restoration under that stroke and vice versa. Only painted background is lightened toward white, at the configurable background strength. A one-cell feather plus bilinear sampling softens selection edges. Foreground is not inferred from brightness: light skin and dark hair are equally retained when unpainted. All pixels are processed locally. No automatic segmentation is claimed.

Photo editor provides paint background, restore subject, brush size, twenty-stroke undo for both masks, clear, strength, existing-method toggle and before/after inspection. Before is the existing processed target before the additional manual operation; the exact generation target always stays visible separately. Inspection does not switch the generation source. Photo/crop/aspect edits clear selections, including board-proportion changes while portrait mode is off; matching saved parameters carry the mask. Crop values are compared numerically rather than by JSON key order. The preset library remains capped at twenty entries and 80,000 serialized characters (checked on read and write) to hold both bounded masks. The original is never overwritten, and masks contain selections rather than source pixels. Preview/player/exports use only the immutable sequence.

## Controlled comparison

Source: ignored output/portrait/source.jpg, copied from the user's original `C:/Users/user/OneDrive/Pictures/rasm for ip.jpg`. Source SHA-256 `b8e97843fbc8dbd1adbb48878a5f88741b337696aa9813c3a221cbf09c5895f4`.

Both targets: zoom 1.3, pan/rotation/brightness 0, contrast 1; 400×400 mm circle, 240 pins, 0.1 mm thread, opacity .85, stock 600 m, base #faf8ef / thread #18201d, 8 mm wrapping per connection, 12% waste, .5 m starting allowance, resolution 160. Portrait face box (.21,.18,.64,.73), background .85, local contrast .5. Requested computation ceiling 20,000 connections; stock never stops generation.

Both start a new continuous v4 sequence, run one v4 continuation and the unchanged guarded v5 fit (edgeWeight 1, eight sweeps, target-luminance overshoot protection, same order/guards). Control reproduces all three old hashes: `17d18…f9b7` → `d6cb…13f1` → `98e1…ffa6`. Preprocessing and optimizer changes are separate; this increment makes no optimizer improvement claim.

Manual silhouette includes hair, ears, jaw, neck and shirt. First 5 px margin trial is preserved as `output/background/light*`; it failed the zero-change foreground-window check and worsened eye/nose residuals. Corrected `light-protected` uses an 8 px margin and explicitly protects the same evaluation windows. It changes 6,967 background pixels; every pixel in all six eye/nose/mouth/jaw/cheek windows remains identical to control. The conservative mask leaves some wallpaper near the silhouette. Selection is manual, not automatic foreground validation.

| Variant | Target SHA-256 | Final sequence SHA-256 | Connections | Estimated thread | Additional beyond 600 m | All three stages / final fit |
|---|---|---|---:|---:|---:|---:|
| Control, current contour guide | 5e111789abe042d37ae79e9c9f172ebce2a3f17c87ffd33161580a14f6e6ddf9 | 98e1b615c19fc1f6742c60864b79b80beeb15f772214de18d26bc3578181ffa6 | 4153 | 1042.581 m | 442.581 m | 191.8 / 35.5 s |
| Protected light background, comparison only | d026a4c93223a3785658e158adf5cb22386492388afa1c40886958a6cc4da7f2 | f89cad2a457f03ed345250894ce49d3085697c1442cd7e430e1d65988ad7d038 | 3337 | 945.421 m | 345.421 m | 179.8 / 33.5 s |

Times measure this Windows host; they are not phone measurements. Counts are solver outcomes, not imposed stock/material budgets. Length includes every routed connection and all stated allowances; physical consumption is unverified.

## Findings and acceptance

Inspected ordinary 160 px portraits and 4× enlarged both-eye/nose/mouth/jaw/cheek crops. The simplified background is less distracting, but nose and lips still lack clear definition; long crossing strands and muddy shading remain. No facial geometry was altered. Original crop and processed targets retain the nose and lip contours, so erasing the background does not establish a reconstruction fix.

Tight-window measurements against identical foreground pixels: control → light nose gradient correlation .448 → .374; mouth .514 → .483; right eye .650 → .627. Mouth contrast rises from .620 to .693 of target, yet tone error and gradient agreement worsen. Nose tone/adjacent-edge MSE worsen 8.8% / 11.3%; mouth worsen 18.7% / 8.1%. Left eye improves slightly. The global RGB error falls .021349 → .019839 against different backgrounds; this cannot establish better facial likeness. Per-region measurements, dark overshoot and 1/2/4/8 px regional residuals are in measurements.json.

**Do not select the light variant as a demonstrated likeness improvement. Keep the control as the current experimental guide. Quality acceptance remains OPEN.** Varied real portraits, physical assembly and actual native device quality remain unverified. Provisional chord/nail degree guards are not measured wrapping capacity.

## Reproduction and resume

Local server: `npm run dev -- --port 5173`. Local site `/`; paired report `/output/background/report.html`; preserved optimizer report `/output/fidelity/report.html`.

`node scripts/portrait-background.mjs` reproduces control and light-protected through three stages, with exact control hashes asserted. It refuses to overwrite completed evidence. Preserve output/background and use a fresh archived output directory for full regeneration; do not delete old experiments. Each setup/stage is written immediately. `--variants=light-protected` runs only that named variant when its final evidence does not already exist. `node scripts/portrait-background-prepare.mjs` checks prepared-target hash and all six foreground windows. `python scripts/portrait-background-report.py` regenerates paired diagnostics without changing sequences.

New comparison export: `node scripts/portrait-export.mjs light-protected background`. It produces separate zero-progress JSON/TXT/sequence-derived PNG/PDF; it never overlays source pixels. Render every PDF page before `python scripts/verify-portrait-pdf.py light-protected background`. Production offline Worker replay: `node scripts/portrait-fidelity-worker.mjs light-protected background`, using its own stage-2 seed and exact target bytes. Existing worker evidence is preserved.

**Exact next independent quality task:** implement a separately versioned experimental 2/4 px local-contrast objective in the optical global fitter, keeping the control target `5e111…ddf9`, 240 pins and .1 mm materials fixed. Initialize from preserved v4 `d6cb…13f1`; count all new routing strands, retain old paths and reset progress. Compare both eyes, nostril/lip gradients, jaw and light-skin darkening with `98e1…ffa6`; reject global-MSE-only gains or artificial outlines. Keep a bounded cancellable stage and stop only for measured plateau or the disclosed compute ceiling. Then evaluate a varied consented portrait set. No new credentials or user input are needed for this experiment.

The remaining acceptance order is quality/diverse portraits → measured physical assembly → real Android and separate iOS requirements → full-step long-guide usability → customer session/code/progress/support then commerce/admin → other engines/full roadmap. Request external inputs only when those tasks become actionable; continue independent local work when blocked.

## Final verification checkpoint

Strict final production build succeeds; 31 unit/domain/PDF tests and all 16 desktop/Pixel-browser checks pass. No new timing relaxation. Unit workers are serialized after allocation failures. The oversized-upload fixture creates the same File inside the browser after CDP transfer stalls; the actual application rejection assertions remain. Production Worker replay offline matches the light-protected hash exactly in 50.0 s wall / 48.3 s stage time. The six-image report and every guide download load; browser errors are empty.

83 PDF pages rendered and reviewed; all 3,337 ordered steps, hash and zero confirmed progress verified. Final shared-code Android debug/instrumentation artifacts rebuilt after successful sync; all sixteen assets byte-match dist. Current APK and hash are in output/mobile/build-evidence.json and VERIFICATION.md. Previous contour and v4 APKs are preserved. No native-device/iOS/physical or production acceptance. Local app/report browser opening is queued for this chat; direct local links work while servers run.
