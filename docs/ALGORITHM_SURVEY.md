# Public string-art algorithm survey

Checked 2026-10-14. Public papers, author documentation and repository/license pages only. No third-party code, examples or images were incorporated. No public implementation has been benchmarked on our frozen owner target in this research phase; therefore **no external engine is established as better than Ip Rasm**.

## Methods and reuse decisions

| Reference | Method / demonstrated distinction | License / decision |
| --- | --- | --- |
| Birsak, Rist, Wonka, Musialski (2018), [author-hosted paper](https://www.peterwonka.net/Publications/pdfs/2018.EG.Birsak.StringArt.pdf), [project](https://www.cg.tuwien.ac.at/research/publications/2018/Birsak2018-SA/), [official repository](https://github.com/birsakm/StringArt) | Binary nonlinear optimization; supersampled opaque strands composited/clamped before downsampling; manual importance map; alternating addition/removal. Tangent connection types and balanced pin entry/exit support continuous fabrication, with auxiliary arcs outside the image. The paper includes fabricated results, unlike a preview-only demo. | Paper ideas may be independently implemented with citation. No MIT/Apache/BSD license verified in inspected repository root/README; code is not reused. MATLAB dependency and robot/pin geometry do not fit our browser kit directly. |
| [bdring/StringArt](https://github.com/bdring/StringArt) | Fork of the paper implementation, adds machine-oriented Python/G-code tooling; not an independently demonstrated portrait-quality improvement. | No compatible license verified in root; do not vendor or execute its code. |
| [Quoteme/img2string](https://github.com/Quoteme/img2string), [license](https://github.com/Quoteme/img2string/blob/master/LICENSE) | Small browser/circular nail implementation; useful accessible baseline/reference. No matching-target evidence of superior nose/lip reconstruction or guarded physical routing. | **MIT verified**, copyright 2020 Luca Leon Happel. Reuse would require retaining its notice; none reused here. |
| [Roy Hachnochi author derivation](https://roy-hachnochi.github.io/string-art/), [repository](https://github.com/roy-hachnochi/string-art) | Derives incremental image-error/line scoring and weighted objectives; discusses why rounded relaxed least-squares paths lose quality. Mathematical reference, not our physical validation. | Repository identifies **AGPL-3.0**. Excluded from code reuse under owner's MIT/Apache/BSD rule; independently derive ideas only. |
| [danielvarga/string-art](https://github.com/danielvarga/string-art) | Relaxed/unquantized and black+white intermediate images are explicitly different from the final physical path. Published example uses about 12,000 arcs /10 km on a 1 m circle. | No compatible license verified in root. No code/asset adoption; do not treat a relaxed intermediate as executable artwork. |
| [usedhondacivic/string-art-gen](https://github.com/usedhondacivic/string-art-gen) | Advertises arbitrary frame shapes and multiple colors; a subject-independent geometry interface is useful. No controlled superiority established. | No license found in inspected page/root. Excluded from reuse. |
| [sp595/string-art-generator](https://github.com/sp595/string-art-generator), [bledxs/string-art-generator](https://github.com/bledxs/string-art-generator) | Browser UI/Worker/export implementations and weighted/edge/lookahead claims. Their advertised time/quality tables are not reproducible owner-photo benchmarks. | README/sidebar MIT claims exist, but license-file fetches were unavailable in this inspection. Do not rely on those claims for reuse without the actual notice. No code adopted. |
| [ThreadEngine author documentation](https://thread-engine.com/documentation) | Describes line removal/replacement, saliency weighting, anti-aliasing and pin-use penalties; relevant hypotheses rather than evidence on our target. | Public documentation is not a verified source-code license. No copy/adoption. |

The [2022 greedy paper](https://zabador.fr/Publications/2022/DLD22/StringArt.CR.june30.pdf) surfaced in public search but author-hosted PDF retrieval timed out here. It remains a follow-up reference, not a claim that its full method/license was reviewed.

## Comparison with the actual local engine

Local `engine.ts` already has mean-RGB optical compositing, physical strand-area footprints, importance weighting, multiscale loss, overshoot penalties, bounded lookahead/refinement, continuation and distribution guards. `density.ts` already removes/adds integer chord counts, computes sparse physical contrast gain, connects/routes the graph and validates checkpoints. Adding those names again would not be a new algorithm.

The potentially useful paper distinction is **where physical coverage is composited before image averaging**, plus tangent/outer routing semantics. That is not equivalent to merely increasing the input grid from 160 to 320. Our existing finite-width/material/resolution audits must be read before any new raster-kernel trial. Changing a renderer requires a new immutable algorithm identity and matching PDF/player; old guides cannot be repainted with a new model.

Completed local convergence, source-feature weighting, head weighting, pin phase/resolution/material sweeps, integer-count probes and old pruning/exchange experiments remain preserved. They do not justify another identical sweep with a new label.

## Ranked controlled hypotheses

1. **R4 diagnosis first:** freeze root24/target/fit/routed sequence/materials/regions; separate tone vs physical contrast vs skin crossing energy; quantify v16 taper-edge coverage and objective shares. Decide whether texture, weighting or routing dominates before fitting.
2. **New local excess-texture objective:** use actual source gradients to penalize unsupported high-frequency contrast in fixed light skin, retaining existing objective and frozen per-eye/nose/mouth/jaw/hair gates. One new version, independent sparse/full gain checks, equal actual evaluations vs unchanged control, full routing and checkpoints. This is our diagnostic-driven hypothesis, not an imported external implementation or promised likeness fix.
3. **Compositing-before-averaging raster probe:** only if diagnostic evidence implicates the optical kernel. Keep physical thickness/pins/crop fixed, label a new renderer and test known-feasible synthetic paths before a bounded owner trial. Do not repeat completed finite-strand/material searches.
4. **Degree-preserving exchange under regional gates:** only if routing reverses a fitting benefit. Record actual candidate budget and every final route; do not repeat completed v8 pair-removal probes.
5. **Generic normalized importance contract:** adapt reviewed regions for each person/pet/object in one fitter; equal per-subject contribution, overlap handling and worst-subject checks. This is Phase 3 infrastructure, not a likeness acceptance claim.

Conditional material/framing experiments remain separate identities. Black+white on grey changes supply/compositing; face-fill changes target geometry. Neither may be silently compared with the frozen same-material target or promoted by marketing examples.

All acceptance uses complete executable paths, provisional 32-chord/160-incident guards, fixed nonaccumulating regional thresholds, light-tone excess ≤1/255 increase and ordinary/enlarged visual review. Thread-efficiency curves and simplification follow selection of an accepted complete reference; no curve can manufacture an acceptance decision.
