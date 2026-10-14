# Generalized solver checkpoint

## Core implementation

`density-subject/18` is a separate **opt-in, not visually accepted** algorithm. It reuses the actual integer optical fitter, physical forward contrast, bounded footprint cache, reversible strand counts, component/parity routing, winding guards, objective accounting and checkpoint machinery. Existing algorithm branches have no new options and retain their calculations/hashes.

`subject-objective.ts` adapts exact reviewed SubjectPlan regions without human preparation for animals/vehicles/objects. Each subject has equal integrated weight mass before overlap merging; smaller subjects receive a larger per-pixel weight. Source-gradient emphasis uses actual target differences. Manual details have one multiplier even if boxes overlap. Across subjects the field takes the maximum, never a multiplied/summed overlap. Background retains unit weight. A fully clipped subject is refused. New compositions require 1–3 reviewed subjects; old 4–8 people remain readable under their original engine.

`measureSubjects` evaluates every stable subject id, its complete bounds and every marked detail. `screenSubjects` applies the fixed regional screen to all keys and exposes per-subject and worst-subject pass/fail. No average can accept a lost small subject. This is an engineering rejection screen; it does not establish likeness. Regional evaluations and their masks stay outside guide metadata; only compact measured region counts/MSE/physical residuals are stored like existing guide metrics.

`capabilities.ts` is the typed source for algorithm render model, generation/continuation strategy, accepted kinds/modes/shapes/resolution and subject count. Legacy conditional adapters preserve existing group/general-subject continuation behavior. New unsupported combinations report a specific localized reason, and have no fallback. All old render mappings are explicit, including optical `/3` and legacy line `/1`–`/2`.

New generic fitting supports dark/light mode, circle/rectangle/heart, 32–320 native samples, 24–240 ordinary pins (existing explicit pin-basis geometry remains separately validated), and exact reviewed subjects. It cannot mix old feature/head/texture/exchange/convergence objectives or import an old guide as a new-version seed. It accepts continuation only from `/18` with identical target/profile/plan/objective. State binding/checksum includes the exact SubjectPlan, grid and new settings; altered weights/regions cannot resume another fit. Simplification explicitly refuses until a worst-subject quality checker is integrated.

Mechanics tests use procedural images only: 1/2/3 people, unequal subject area/overlaps, all generic kinds in dark/light, full routing/guards, exact checkpoint replay, JSON/TXT roundtrip, incompatible objective rejection, explicit 320/cancel and unsupported combinations. This does **not** prove portrait/animal likeness. Real multi-person, animal and object photographs remain necessary for owner acceptance before any default promotion.

## Remaining integration

Expose an explicit experimental choice with manual generic subject/detail marking and individual review, preserving marks per photo/category/crop. Allow the same new path for singles and groups without a 192-sample downgrade. Reuse exact target/player/export pipeline. Test real Worker + UI + recovery/export on desktop/mobile and localized errors, then add owner instructions and commit acceptance status. Keep original default solver unchanged pending visual acceptance.
