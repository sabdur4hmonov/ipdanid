# Portrait quality repair — 2026-10-22

The owner rejected the single-person Heart result on the frozen 4210 photo trial. This overrides the previous agent's subjective visual acceptance. Mechanical tests and fast generation did not establish acceptable likeness. C19b and unrelated feature work are deferred until this repair is reviewed against actual images.

## Evidence and diagnosis

- Reuse the exact original synthetic JPG from the frozen trial; do not ask for another photo or overwrite evidence.
- The displayed target itself has a cut-out at the crown. The current single-Heart framing starts at y=0.08, while the physical heart's central notch is approximately y=0.266. The final shape mask removes source hair before fitting. This is a preparation defect, independent of the engine.
- The result also has grey thread haze around the face. Its cause is not yet established. Fixed 3000 lines, target/physical-render mismatch and legal Heart chords must be measured separately; do not describe a crop-only fix as a sharpness fix.

## Ordered work and stopping rules

1. Reproduce the crown loss with a failing geometric regression and the actual JPG. Preserve source, old target and old physical result. Test face/chin retention, not merely successful upload.
2. Add a separately versioned, shape-aware single-Heart composition. Keep the crown below the notch, preserve source proportions and the complete detected face, and fade below the chin. Keep old framing contracts and saved guides unchanged. Verify pan/zoom/reset and exact sequence rendering in the actual desktop/mobile flow.
3. Run one bounded comparison on that same picture: old framing/3000 versus corrected framing/3000. Inspect equal-size images and enlarged eyes/nose/mouth. Measure per-face viewing SSIM and outside-head darkness. If haze remains, compare 2000/2500/3000 on the same corrected target once, before considering another engine. No large parameter sweep or unrelated feature work.
4. Check any selected change on the other two existing synthetic portraits and the local owner crop, plus Heart pair and Circle/Square compatibility. A numeric score alone cannot accept visible loss. No cosmetic overlay or preview-only contrast adjustment; the exported continuous sequence must render exactly like the app.
5. Relevant tests and isolated build; record actual results and limitations, commit and feature-only push. Publish a fresh comparison URL without changing 4210 or other protected previews. Do not call the whole product finished. APK/release work only after visual repair acceptance.

## Acceptance

- No automatic notch cut through the crown or forehead; eyes, nose, mouth and chin remain in the prepared target.
- Same-size old/new physical render shows improved likeness without masking thread defects. Preserve 240 actual kit pins, legal continuous routing and authentic thread physics.
- No worsening hidden by aggregate SSIM; record both per-face score and surrounding haze. A change failing visual inspection remains experimental.
- Desktop/mobile upload → adjustment → generation → readjust works, under 15 seconds generation on this machine (not a phone hardware claim).
- Report remains explicitly IN PROGRESS until all relevant images have been inspected. Owner's current rejection is not superseded by passing mechanics tests.
# 2026-10-22 owner override

Historical diagnosis below is retained. New customer flow must preserve the entire foreground and let the customer position it freely. Forced head/lobe/chin composition is superseded; /7 and /8 remain only as saved-guide compatibility. No further solver sweep.

