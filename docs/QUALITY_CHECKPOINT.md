# Quality checkpoint — Phase 2

## R4 frozen diagnosis (2026-10-14)

Status: **DIAGNOSED, no accepted improvement**. Reproduction script: `scripts/quality-r4-diagnostic.ts`. It refuses to replace a sealed manifest. Outputs are local, ignored and include the owner's photograph: `output/quality-r4/manifest.json`, `diagnosis.json`, `report.html` and true reconstructions. Do not commit or upload those files.

Verified root24 sequence `8d1f2dd8f3424a0d23c7bb09240228e447ebab8fb9b520310e636ac9873c8323` on exact target `1d06c780d790a1554daf646c888824d2ae7f2ad97140c7b707239b16a9c727fa`. Validated instructions, all three checkpoint checksums, byte hashes of inputs, and exact complete ordered segments replayed from the 24-sweep checkpoint. **Zero new fitting sweeps**. Snapshot metadata legitimately has a different hash; the saved guide was not rewritten. Old best `eeb26cf…c944` is recorded with its different crop and excluded from measurements.

Evaluation uses native 320 sample centers and arithmetic mean RGB; the existing common-512 results remain a separate evaluation, not interchangeable numbers. Fixed masks cover each eye separately, nose, mouth, lower-face jaw, and explicitly labelled light-tone skin/dark upper-head hair **proxies**, not semantic segmentation. Mask positions, grid and board dimensions are checked by the evaluation screen, not just pixel count. Target/crop identities live in the sealed manifest. Region metrics are outside immutable guide data.

| Diagnostic | Fit graph | Full routed sequence |
| --- | ---: | ---: |
| Root24 weighted objective | .0511389930 | .0513262926 |
| Root24 skin fine energy / target | 3.9427 | 3.9248 |
| Root24 nose fine energy / target | 6.1119 | 6.0361 |
| Root24 skin mean dark excess | .0387745 | .0393798 |

Root fit objective independently recomputes to 18109.28906498 vs checkpoint 18109.28906495. Tone accounts for 47.91%, physical contrast 52.09%; routing adds 66.3263 (0.366%) raw objective. Root has 1852 complete connections, including 54 routing connections, 643.1466 m and an **unmeasured** 247.6-minute estimate at 8 seconds per connection plus knots. Maximum repeated chord is 6; maximum pin incidence is 78. The artifact stores full pace assumptions.

Sealed v16 was only read, never refitted: its fit objective has 8658.5266 tone, 9383.3969 physical contrast and **56.5034 fine-feature** contribution (0.312% of total). 69.282% of genuine forward nose/lip source-gradient energy falls at cosine taper <.25. Only 0.860% is outside the fine operator's support; attenuation, rather than simple missing support, is the larger diagnostic. Fixed existing-chord ±1 perturbations show physical loss can overrule tone gain; these ten measurements are diagnostic, not a candidate search or a rerun of the rejected exchange experiments.

Native full reconstructions show both root24 and v16 still have weak nose/lips and dense crossing texture. Their fit graphs already contain this problem; routing is not its main cause. Native v16 skin excess texture improves only .54%. The earlier v16 verdict remains **INCONCLUSIVE / not promoted**. No visual likeness approval is inferred from these numbers.

## Next isolated hypothesis

Test independently implemented **fixed-source local excess-gradient texture penalty** in the light-tone skin proxy, as a new opt-in algorithm. Penalize rendered local gradient energy above genuine source energy, rather than raising v16 nose/lip importance. Freeze target, masks, strength, budget and regional screen before fitting. Use full root24 sequence as the explicit seed, identical actual evaluations for unmodified control, exact sparse/full objective checks, 32-chord/160-incidence guards and recovery checkpoints. Full routed output determines the verdict. Do not combine another objective or material/layout change in this experiment.

Acceptance requires every frozen region's tone/coarse tone/physical residual rise ≤ max(2%, .0001), skin light-tone dark excess rise ≤ 1/255, same-size and enlarged visual likeness review, and subsequent synthetic/licensed-set acceptance. Metrics can reject but cannot grant visual approval. If no method passes, there is no newly accepted method on which to recommend a connections knee or simplify; existing guides/defaults remain unchanged.

## v17 frozen prototype protocol (before fitting)

`density-texture/17` is independently implemented and opt-in through the experiment script/Worker; no creation/default button is added. It requires a complete compatible dark resolved seed and reviewed single-person regions. Its new settings bind target-derived skin mask, 1.25 mm distance, hinge excess-gradient energy, strength **1**, and fixed ±1 search. Control has strength **0** and the identical new search, with the old tone/physical objective unmodified. Both consume exactly two sparse objective evaluations for every permitted chord in **one full sweep**; unavailable moves are calculated but never applied. Reused accepted gain avoids hidden extra fitting evaluations. Routing objective evaluations are separately recorded because each graph can need different physical repair; no equal total CPU-cost claim.

`scripts/local-texture-experiment.ts` freezes `output/local-texture-v17/protocol.json` before fitting, refuses changed protocol, resumes only checksum/binding validated checkpoints and tests that changing strength is refused. Completed guides are never replaced; all guards apply throughout fit and routing. Recovery captures completed sweeps before routing, so a routing interruption does not repeat fitting. No old v16/v12/convergence/pruning fit is repeated. Numerical screen and common panels compare both candidate-vs-root and candidate-vs-control. Strength/budget are not tuned after seeing results. A failed screen ends this hypothesis without default promotion or unnecessary count sweeps.
