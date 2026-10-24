# Bounded physical route research — 2026-10-24

**Not promoted. Maximum portrait clarity remains unresolved.** The fixed seven-case experiment improves face SSIM slightly, but visible crossing haze remains and optimization is too expensive for the current generation budget. No engine, default, target preparation, user placement, guide or preview rendering changed.

## Hypothesis and evidence

Relocate one interior route vertex `(a,b,c)` to `(a,d,c)`. Both changed chords are real physical strands. Preserve endpoints, 3000 connections, exact 240 kit pins, 0.12 mm thread, 0.9 opacity, legal shape chords, minGap25, unique chords, degree160 and the existing Square policy. Deterministic seed and eight alternatives per vertex; no unbounded search. Source image hashes must match the frozen 500 px targets. Independent retained renderer generates before/after at 1000 px; no source overlay or cosmetic adjustment.

Three preceding single-Heart variants were rejected:

| Objective | Face SSIM before | After | Decision |
| --- | --- | --- | --- |
| Raw physical pixel loss | 0.662474 | 0.372548 | Face washed out despite less background darkness |
| Area-averaged tones + per-face SSE | 0.662474 | 0.627326 | Lower tone error did not preserve likeness |
| Exact viewing tones + per-face SSE | 0.662474 | 0.652035 | Still loses likeness |

The final variant evaluates the actual 1000 px physical image through the existing Gaussian/160 px viewing transform. Each accepted move must reduce tone loss without worsening any face, improve whole-board SSIM and preserve every face's SSIM. Only the best of eight candidates is considered; 4000 proposals, one bounded partial pass. Small floating-point tolerances are explicit. No further sweep is justified by these results.

| Frozen case | Face SSIM before → after | Board SSIM before → after | Refinement seconds | Changed vertices |
| --- | --- | --- | --- | --- |
| Single Heart | .662474 → .674535 | .429815 → .432946 | 7.007 | 18 |
| Owner Circle | .612201 → .617994 | .540175 → .543779 | 15.726 | 27 |
| Owner Square | .574480 → .580862 | .510036 → .521934 | 12.596 | 41 |
| Synthetic 1 | .586636 → .596250 | .527184 → .533353 | 12.450 | 38 |
| Synthetic 2 | .586680 → .597733 | .544832 → .548364 | 13.162 | 34 |
| Synthetic 3 | .611609 → .615829 | .534933 → .537616 | 12.238 | 24 |
| Heart pair (union) | .630376 → .633879 | .483283 → .484777 | 5.607 | 9 |

Pair individual scores: .630623→.631874 and .630116→.635986. No person is hidden by a better average. Runtime is **refinement only**, excluding objective construction, original generation and final rendering; it is not an end-to-end under15s claim. Host performance varied between serial runs.

Actual image review: eyes/nose remain crossed by conspicuous strands; Heart upper lobes retain grey haze; old profile13 Square artifacts remain visible. The changes do not constitute the requested large improvement. The fixtures use historical prepared compositions, not the current free-placement /9 customer UI. Nothing here authorizes reverting to forced cropping or erasing shoulders. Physical board quality and current UI likeness are not accepted by this test.

## Reproducibility and limits

- `scripts/physical-route-refinement.ts`: research only, bounded 32 MiB footprint cache, cancellation, no app import.
- `scripts/evaluate-physical-route.ts`: frozen target hash check, independent render and metrics. Refuses to overwrite a completed metrics file. Saved path uses `iprasm.research-route/1`, deliberately not an importable guide with forged old-engine provenance.
- `scripts/report-physical-route.ts`: audits all seven saved paths and regenerates the combined report **without another fit**.
- Ignored local report: `output/physical-route-ssim-v4/report.html`; per-case metrics, parent hashes, target/before/after and path. Owner source/results stay local and are not committed or uploaded.
- Earlier rejected evidence: `output/physical-route-v1`, `physical-route-view-v2`, `physical-route-exact-v3`. Do not rerun them.
- SSIM helper extraction retains the OpenCV golden arithmetic. Tests independently compare sparse updates with full physical rendering, viewing loss, per-face tone preservation and reject aggregate gains hiding an individual regression.

This is a research checkpoint, not a release. Finish remaining product CODE without representing this trial as a quality fix. A later quality hypothesis needs a distinct mechanism and fixed acceptance gates; repeating these losses/parameter sweeps is not justified.
