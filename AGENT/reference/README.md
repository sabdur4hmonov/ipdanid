# Reference: classic greedy string art that WORKS (owner's assistant, 2026-10-16)

Proof image (local only, not in git): `output/reference-classic/comparison.png`
- left: prepared target, middle: current app `classic-greedy/1` from phase9 (96 px grid → unrecognizable),
- right: this reference, 240 pins, 2500 lines, 1.5 s in Node → recognizable face.

## Why the app fails today
1. Phase 9 A/B ran on a **96 px grid** (`protocol.grid = 96`). Far too coarse: a nose is ~5 px.
2. `classic-greedy/1` stops at ~750 lines ("no-improvement"). Real string art needs 2000–3000 lines; the classic method runs a fixed line budget.
3. Ordinary flow defaults were weak (120 pins, 0.3 mm, 160 px, no white background).

## Exact reference algorithm (`classic-string-art.ts`)
- Grid **500×500** for a 460 mm circle (≈0.92 mm per pixel). Pins: 240 on the circle, pin 0 at top, clockwise.
- Error map `err = (1 - target)^darknessGamma * importance`.
- Each step from current pin: test every pin with index gap ≥ `minGap`, not the previous pin, chord used < `maxChordRepeat`. Score = mean over the chord's pixels of `err` (negative values multiplied by `overdrawPenalty`). Take the best; subtract `lineDarkness * importance` along its pixels (err may go negative). Repeat for a FIXED line budget.
- Parameters that produced the proof image:
  - lines **2500**, lineDarkness **0.15**, darknessGamma **1.6**, overdrawPenalty **3**, minGap **25**, maxChordRepeat **1**
  - importance = 1 + 0.5·Gaussian centred on the face (no extra per-feature bumps — they made the face lighter).
- Preview: render at 1000 px with physical thread width 0.12 mm, opacity 0.9, multiplicative coverage.

## Target preparation (`prepare-reference.py`, port to TS/canvas)
1. Background → white (the app's local person segmentation; GrabCut was only used for this test).
2. Grayscale, CLAHE (clip 2.0, 8×8 tiles).
3. Contrast stretch to the 1st–99th percentile **inside the subject mask**.
4. Unsharp mask: sigma 2 px, amount 0.6.
5. Crop so the head fills ~70% of the circle diameter; resample to 500×500 (area).

## Acceptance
Running the app's normal flow on the owner photo must look at least as recognizable as `output/reference-classic/reference-2500.png` and finish in < 15 s on the laptop.

---

# v3 update (2026-10-17) — sharper face, same speed

Tested on the owner photo with a viewing-distance SSIM metric (`score-viewing-ssim.py`: Gaussian blur + 160 px, SSIM in the face oval):

| Variant | lines | face SSIM |
| --- | ---: | ---: |
| v2 (current app: mean score, lineDarkness 0.15, penalty 3) | 2500 | 0.539 |
| v2 with 3000 lines | 3000 | 0.545 |
| edge-enhanced target (rejected, worse) | 2500 | 0.533 |
| **v3: least-squares score, lineDarkness 0.08, gamma 1.6, face importance 1.0** | **3000** | **0.622** |

v3 change = ONE function: score each candidate chord by least-squares error reduction
`score = mean over chord pixels of dd·(2·err − dd)`, where `dd = lineDarkness·importance` (err may be negative; this automatically avoids over-darkening, so overdrawPenalty is not used).
Parameters: lines 3000, lineDarkness **0.08**, darknessGamma 1.6, importance = 1 + **1.0**·Gaussian(face), minGap 25, maxChordRepeat 1. Runtime ~2.7 s in Node for 3000 lines.
Run: `SCORE=ls IMP=1.0 GAM=1.6 node --experimental-strip-types run-reference.ts 500 3000 0.08 out 25`.
Proof: `output/reference-classic/v3-comparison.png`, `reference-v3-3000.png` (local only).
Edge-darkening the target was tested and rejected (lower SSIM, harsher look).
