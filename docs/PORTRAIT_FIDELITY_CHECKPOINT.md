# Portrait fidelity checkpoint — 2026-10-04

Latest selected variant is `distributed-contours`, hash `98e1b615c19fc1f6742c60864b79b80beeb15f772214de18d26bc3578181ffa6`: 4,153 connections, 1,042.581 m, shortage 442.581 m. Eight-sweep stage measured 33.6 s on this host; final production Worker timing is recorded separately. Identical target/profile/baseline; 55 routing strands, after 2,681 removal events. Removal events can include removing newly added strands; they are not counts of unique old strands.

The earlier balanced prototype repeats one chord 256 times and visits its busiest nail 247 times. It remains a preserved experiment, not the recommended guide. New provisional diversity guards limit a chord to 32 traversals and a nail's incident degree to 160. The selected route's busiest nail has 80 visits. These computational distribution safeguards are not measured nail-head/thread capacities. Physical winding capacity remains unverified. They do not constrain stock or change materials.

Selected band RGB MSE / edge MSE: face 0.005773 / 0.005145, eyes 0.001373 / 0.001551, nose 0.001672 / 0.001476, mouth 0.002450 / 0.002149, outline 0.009830 / 0.008586. All improve over baseline; global RGB MSE is slightly worse at 0.021349. Tight mouth gradient correlation rises from 0.307 to 0.514; contrast remains about 62% of target and nose/lips remain visually weak. Quality acceptance is OPEN.

Mean chord length increases from 201.9 to 216.0 mm; chords over 300 mm stay essentially unchanged (1,579 → 1,581). Cleaner shading is not evidence that shortening chords alone solves the problem. Optimizer uses mean RGB optical tone; tight-window diagnostics use weighted luminance. V4/v5 objective-loss numbers are not directly comparable.

Current reproduction: `node scripts/portrait-fidelity.mjs 1 8 distributed-replay --reroute`, compare hash to `98e1…ffa6`. Export: `node scripts/portrait-export.mjs distributed-contours fidelity`. Diagnostics/report take `distributed-contours`. Commands and balanced measurements below preserve earlier evidence and are superseded by this selected variant.

Final production Worker reproduces the selected exact hash offline, 35.6 s reported stage / 36.2 s wall time, excluding earlier baseline creation. Both v4 stages also reproduced exact hashes; stage-2 replay took 125.6 s this run. Selected guide has 102 pages and all 4,153 steps in order; rendering and extraction evidence are local. The differing-order prototype also changed edge weight and sweep count: it suggests ordering bias, but does not isolate ordering as a proven cause.

Final build + 28 unit/domain/PDF tests + 14 browser checks pass. Android debug and instrumentation APKs compile; all sixteen APK assets byte-match dist. Latest APK SHA-256 `2ca645fb81d45d3b7a4b7b9c04717d81386ec009c8ba60886159f6cb3543d03d`. Native device execution/physical validation/production activation remain false. Previous APK is retained as output/mobile/ip-rasm-v4-debug.apk. Exact resume: read this checkpoint, preserve selected/old artifacts, implement the separately versioned 2/4 px local-contrast experiment below; do not repeat setup or silently change materials.

Quality acceptance remains open. This increment improves contour agreement on the supplied photograph; it does not establish sufficient nose/mouth definition or physical likeness. The full master roadmap is unchanged. Existing local commit `3ce5b0b` and every old portrait output remain preserved. No push, publication or personal-photo upload is authorized or performed.

## Fixed comparison

Original: `C:/Users/user/OneDrive/Pictures/rasm for ip.jpg`, ignored local copy `output/portrait/source.jpg`. Source crop uses zoom 1.3, zero pan/rotation/brightness, contrast 1. Board: circle 400×400 mm, 240 pins, shaft 1.5 mm, thread 0.1 mm, opacity 0.85, minimum gap 5, wrap 8 mm, waste 12%, start/end allowance 0.5 m per segment, stock estimate 600 m. No material is supplied or physically calibrated by this run.

Exact processed target: 160×160, face box (0.21,0.18,0.64,0.73), background 0.85, local contrast 0.5. Pixel SHA-256 `5e111789abe042d37ae79e9c9f172ebce2a3f17c87ffd33161580a14f6e6ddf9`. The runner reconstructs these pixels from the original and refuses mismatches. Source crop, processed target and sequence reconstructions are shown at identical scales.

Baseline: v4 stage 2, `d6cb870dbaf4c210c5e2beac2cda6e6c04094a2fb817b6765cbe7890673113f1`; 4,364 connections / 1,026.573 m / 426.573 m shortage. Stage-2 refinement originally measured 71.2 s after a 101.5 s first generation. Those historical timings are not this run's speed claim. Current replay of stage 1 reproduced `17d18c7f1f5b79b032b2159c5ee62ea2d82902f880c4a246ac684e5649a5f9b7` in 225.9 s on this host. Timing varies significantly with host load.

New balanced contour variant: `defef6cdcc6b4f4914bfba9b44f04a31f8f25813323d684e154934e736e5dea1`; 4,472 connections / 1,058.620 m / 458.620 m shortage. Global stage measured 98.7 s, excluding creation of the reused baseline. It removes 2,786 strands during optimization; final fitted set has 4,410 strands plus 62 actual routing strands. Progress resets to zero and the parent hash records the old baseline. A physical assembly already started cannot adopt this route halfway through.

## Investigation and implementation

The processed target retains both eyes, nostrils and lip separation. In manually fixed tight windows, source-to-target adjacent-gradient correlation is 0.993–0.995 for eyes/nose/mouth. Processing slightly increases local contrast. Weak detail is primarily demonstrated in reconstruction, not erased by crop/preprocessing. These bands/windows are manually placed measurements, not automatic detection.

`density-optical/5` uses reversible integer counts of legal pin pairs and the existing physical-area optical operator. Actual luminance residuals plus neighboring contrast drive additions/removals. A target-dependent overshoot penalty protects light skin more strongly than darker feature pixels; no artificial feature outline or geometry change is introduced. Candidate order is deterministically dispersed; alternate sweep direction reduces ordering bias. Counts are connected and made Eulerian with explicitly included physical routing strands. Every delivered preview, player seek, PNG and PDF uses that routed sequence exclusively.

The 32 MiB typed footprint cache, bounded image/pin/line/sweep limits, yielding loops and Worker termination bound work and permit cancellation. An eight-sweep stage is not a global optimum. Stock never appears in the optimization objective or stopping decision. Dimensions, colors, target hash and solver parameters are immutable hash inputs. Existing v1–v4 imports and v4 refinement remain available.

The website exposes experimental global fitting and separate rerouting/continuation variants in UZ/RU/EN. A fresh global request first computes a continuous basis, retains it as a separate comparison variant, then optimizes/reroutes it. This avoids shipping the weaker from-blank fit as the preferred result. Original v4 generation remains the default until broader portrait evidence exists. Presets/reused project parameters retain solver selection.

Rejected trials are preserved locally: log-density fitting (8/24 sweeps), lexicographic optical fitting and shuffled from-blank fitting. They wash out facial details or create long-strand fans. The shuffled trial has 8,331 connections and worse facial errors: more thread is not sufficient. Reversible fitting starting from the strong v4 basis does better than these from-scratch trials. It can lighten earlier dark regions by removing strands, rather than appending them. A new sequence is always generated and legally rerouted.

## Measurements and limits

Existing proportional face-band RGB MSE/central-edge MSE, baseline → balanced:

| Band | RGB MSE | Edge MSE |
|---|---|---|
| Face | 0.006352 → 0.005764 | 0.006453 → 0.005171 |
| Eyes | 0.001669 → 0.001325 | 0.002455 → 0.001495 |
| Nose | 0.002184 → 0.001687 | 0.002440 → 0.001548 |
| Mouth | 0.002600 → 0.002469 | 0.003146 → 0.002150 |
| Outline | 0.010537 → 0.009790 | 0.010229 → 0.008619 |

Global RGB MSE worsens slightly, 0.020895 → 0.021307. Selection is supported by facial contour measurements and visual inspection, not global MSE. Separate tight luminance windows measure both eyes, nose, mouth, jaw and light cheek. Their raw values, signed gradient agreement, mean bias, dark-excess fractions and contrast are in `output/fidelity/measurements.json`. The face residual decreases at 1/2/4/8-pixel scales, but no new multiscale objective is claimed: this solver uses adjacent contrast; v4 already has a coarse/fine objective.

Ordinary-size and enlarged views show cleaner eyes/shading but still faint nose and lips. Mouth contrast remains around 61% of the processed target's tight-window standard deviation. This is not a calibrated likeness score. Long chords remain inherent with perimeter-only nails; no demonstrated claim attributes all artifacts to chord length. Additional pins/resolution/materials were not silently changed or presented as supplies. Thread tension, optical color/opacity, repeated nail loading, actual wrapping/knots and physical portrait appearance remain unvalidated. No mobile device test occurred.

## Reproduction and exact next experiment

All evidence is ignored/local under `output/fidelity/`; old `output/portrait/` is untouched. Development server 5173 is required for module-based scripts. Run browser experiments, Node regressions and Gradle sequentially on this host. Never use the screenshot as the source.

1. Reproduce baseline stage 1: `node scripts/portrait-replay.mjs --out=../fidelity/v4-stage1`.
2. Reproduce stage 2: `node scripts/portrait-replay.mjs --continue --seed=../fidelity/v4-stage1 --out=../fidelity/v4-stage2`; assert its hash matches `d6cb…13f1`.
3. Reproduce the chosen global fit: `node scripts/portrait-fidelity.mjs 1 8 balanced-replay --reroute`. Compare hash with `defef6…dea1`; do not overwrite the delivered variant.
4. Diagnostics: bundled Python `scripts/portrait-fidelity-report.py balanced-contours`, then `node scripts/portrait-fidelity-report.mjs`. Exports: `node scripts/portrait-export.mjs balanced-contours fidelity`.

Next quality experiment: add a separately versioned multiscale local-contrast residual (2/4 px neighborhoods) to reversible fitting. Start from the same original pixels/profile and parent baseline. Evaluate lip separation/nostril contrast, both-eye gradient agreement, light-cheek noise and multiscale residuals; retain every candidate. Do not select lower MSE with weaker visible features. After that controlled comparison, separately test 192 px computation using the unchanged physical thread and pin count. Additional pins/material experiments require separate labeling and physical confirmation before kit claims.

After this priority checkpoint, the independent M4 sandbox customer integration remains the next product-roadmap task. Full M3–M7 scope and external prerequisites remain in FEATURE_MATRIX/ROADMAP/BLOCKERS. Quality acceptance is not complete merely because tests/builds pass.
