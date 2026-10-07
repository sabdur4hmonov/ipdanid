# Public Qbrix inspection and local shape framing — 2026-10-06

User request: inspect publicly observable Qbrix face/shape fitting and available GitHub tools, then implement working local behavior. The supplied heart screenshot is diagnostic evidence, not a generation source. Original photo stays local; all personal experiment files remain ignored. No existing board/project/progress/sequence is migrated.

## What was actually observed

Public GET inspection of [String Art](https://qbrix.me/en/stringart), its linked [code entry](https://qbrix.me/en/stringart/code), [Bricks photo upload](https://qbrix.me/en/bricks/upload) and their public JavaScript returned200. Local evidence: tmp/qbrix-audit/inventory.json, downloaded public pages/scripts. Bricks inline cropper.js supports moving, zooming, rotating, aspect conversion, viewMode3 and autoCropArea.85. Its public transport uses POST /upload with multipart data and session CSRF protection.

**/upload is a photo-upload endpoint, not a demonstrated public String Art generation API.** The public String Art entry requires a product code. No accessible solver API or documented integration contract was established. No activation code, credentials, bypass, private endpoint probing or photo POST was used. Bricks editor behavior cannot establish how the private String Art optimizer works. The product is not claimed identical to Qbrix internally or in portrait quality.

Primary open-source references inspected via public GitHub API/tree/readme/source:

| Repository | Verified capability | License / adoption decision |
|---|---|---|
| [Quoteme/img2string](https://github.com/Quoteme/img2string) | main.js circular uniform-angle nails, canvas/luminance line optimization | MIT verified (Luca Leon Happel2020). General reference; physical mm coverage, our strict continuity/32repeat/160incident safeguards and immutable export contract are not supplied as a drop-in replacement. |
| [usedhondacivic/string-art-gen](https://github.com/usedhondacivic/string-art-gen) | arbitrary-shape frame and multicolor source | No LICENSE verified; not vendored or executed as product code. Public tree98749c1ec69acb9f30531886d94bc61c32f3aa4f retained locally. |
| [atomAltera/string-art-studio](https://github.com/atomAltera/string-art-studio) | Rust/WASM circular solver and interactive crop | No LICENSE verified; no product adoption or execution. |

New implementation is independently written against our existing geometry/image/sequence engines. No Qbrix or third-party source was copied or rebranded. A runnable algorithm elsewhere is not evidence that it preserves this person's nose/lips better; adoption requires controlled testing and verified licensing.

## Demonstrated product fix

The old crop editor displayed a rectangle even when the actual board was concave. There was no visible heart boundary during framing, nor a way to zoom below1 to fit a larger portion of the photo. This is a demonstrated UI/geometry mismatch, not proof of the screenshot's optimizer cause.

ShapeCropEditor now displays the actual board contour on the **input photo**: existing720point heart polygon, circle or rectangle, at the sample-center convention. Mouse/touch drag, anchored wheel/two-finger zoom, existing rotation and dimensions use the same affine crop as prepare(). Zoom.25–6 permits fitting without stretching a face. Independent feature windows follow source pixels through crop changes. Manually changing the outer head box preserves separately corrected feature windows. Fit/undo restores edits and region/mask state together; explicit crop change invalidates background masks and guidance asks for correction.

The user can move/resize the marked head rectangle and invoke marked-face-shape-fit/1. This is a **manual estimate**, not detected anatomy. A bounded33×33center/17scale search fits that rectangle with4mm margin in the sampled exact shape mask, respecting aspect/rotation/pan/zoom bounds. Nothing guarantees that hair outside the marked rectangle is retained; users must include the intended head/hair/ears/jaw and inspect the result. Full rectangular clearance is conservative and may unnecessarily shrink the face. This demonstrated tradeoff is the next targeted hypothesis, not a claim that all quality failures originate in crop.

UZ/RU/EN guidance and reversible controls are integrated into the normal website. New generated records retain real crop/profile/regions; old projects and exported guides remain immutable. Result previews/player/PDF contain only executable strands, never the input-photo overlay. No automatic default or physical material substitution occurs.

## Separate real-heart experiment

Read SHAPE_FIT_CHECKPOINT.md for exact settings/hashes/testing/resume. Same local original192px direct preprocessing,400mm board/.1mm thread/.85opacity and32/160 safeguards. The proposed240pin heart legitimately fails physical pin spacing1.09546mm <1.6mm;192pin heart also fails1.53458mm. A **separate160pin heart** at2.02156mm minimum spacing is explicitly labeled; existing240pin circular boards stay unchanged. Physical capacity/tension/wrapping remains unverified.

Before/after v6 isolate framing and remapped regions. A separate v8 experiment keeps the fitted target fixed and changes only the optimizer to physical-distance contrast weight2/eight sweeps, including39routing connections in all measurements. Ordinary/enlarged images demonstrate that the face fits but feature quality is still weak. Fewer after strands are not accepted quality-preserving simplification. No new default promotion or claim of a quality breakthrough.

Status separation: framing **implemented + software tested**; current-photo portrait acceptance **OPEN**; varied-photo, physical assembly, real-device and production-active acceptance **OPEN/no**. Exact verified APK/PDF/browser evidence is maintained in the checkpoint. No push, publication or external photo upload.
