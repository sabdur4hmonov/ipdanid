# Customer-controlled photo composition (2026-10-22)

The owner's latest request replaces mandatory head/lobe fitting in the ordinary flow. New guides use `standard-preparation/9` and `reviewed-free-photo/9`; engines and preparation versions 1–8 remain importable and unchanged.

1. Start with gallery/camera. Shape choices appear below the photograph after upload.
2. Remove the background locally. Display the **colour** cutout on white inside the physical shape. Preserve the whole source rectangle, shoulders, hair and relative positions of people. Face detections affect solver importance only. A missing face does not prevent creation.
3. The customer moves the whole photograph, zooms 0.2–4× with slider/wheel/pinch, rotates or resets. Initial containment is based on the whole photograph, not face bounds. The shape clips the composition visibly; the customer controls what fits.
4. Retry segmentation without losing position, or use the full-source erase/restore editor with bounded undo. The editor includes parts outside the chosen shape. It changes the real mask, not a preview overlay.
5. Create the tonal target using that same transform and mask, then compute the existing classic-greedy/3 continuous sequence. The physical thread preview, unlock, player and exports retain the exact sequence. Optional captions do not silently shrink/reposition the photo in version 9.
6. Rest stops audio/playback and durably saves the exact displayed step. It does not confirm physical work. Reload restores that cursor paused; the saved status is shown only after storage succeeds. Wake lock releases while resting. Existing UZ/RU/EN device speech and complete recorded-clip preference remain.

Portrait cutout uses the existing pinned local segmentation. For unavailable segmentation or non-person modes, a conservative border-colour mask is disclosed and manually editable; this is not a claim of universal phone-quality object segmentation. No photo is sent to third-party services. Background model candidates/license findings are in `BACKGROUND_REMOVAL_REVIEW.md`.

The former 4211 automatic Heart repair preview stays frozen. New preview must use a separate snapshot/port, with credentials only in ignored output. Reports contain synthetic cases only. No new physical-board, real-phone, new-APK or improved-likeness acceptance is implied by UI tests. Remaining C19b–C26 release work is still tracked in `AGENT/PROGRESS.md`.
