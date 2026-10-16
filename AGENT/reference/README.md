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
