# P16.1-C — framing-only blind review

2026-10-29 manager decision: solver/target/route research CLOSED. No optimizer, kernel, XDoG, feature finishing, swaps or route experiment is authorized. Keep production classic3 and the accepted per-case preparation9/10 tone recipe unchanged. This one milestone changes only placement/background/chin-fade controls; promote nothing before the owner's vote, then STOP.

## Frozen scope and controls

The owner explicitly confirmed the four source files in P16_1B_BENCHMARK.md, including the three photo files historically named synthetic-1/2/3. Do not misrepresent them as newly supplied real-person photos. Exclude analytical fixtures, synthetic pair/composites and captions. Six cases: original owner source in Circle/Square/Heart, other three source photos in their accepted Circle. Original photos/options/guides/targets retain the P16.1-B SHA256 manifest; verify before running. No new upload or substitute.

F0 reuses the archived accepted physical render, guide and generation timing from P16.1-B. No baseline regeneration. F1/F2 use exactly the existing frameFreePhoto zoom/pan, local person segmentation/cleanup, referenceToneCanvas, freePhotoCanvas, chinOpacity and unchanged sourceMidcontrast only if that case's archived F0 selected preparation10. No SSIM-based tone re-selection or candidate disqualification. Original source canvas is reused across levels, with genuine hair retained until the existing board outline naturally clips it.

Review-only option: `p16-1c/reviewed-framing/1`, outside the production import graph. Its small wrapper translates desired face size/nose position into existing controls and applies the existing18px chin fade. No old guide/default/preparation/solver module is edited. Experimental composition provenance is stored separately rather than presented as an existing exported guide contract.

Coordinates refer to the solver's normalized **inner-pattern** frame, not the surrounding500mm board. F1 requests unpadded upper-face-oval-to-chin height0.50; F2 requests0.65. Existing reviewed detector face boxes include0.02source-edge padding: hairline proxy=face.top+0.02, chin=face.bottom−0.02. This is the upper facial oval, not the top of the hair mass; exact scalp/hairline anatomy is not inferred. Nose anchor is point1(the actual tip) of the existing pinned local FaceLandmarker, measured once per source. It maps to(0.50,0.42), exactly0.08inner-pattern units above centre. The nose-region bounding-box centre is NOT the tip; the initial preparation-only anchor diagnostic was corrected before any fit. No synthetic facial pixel/feature layer.

For source vertical scale H and aspect a: zoom=H/defaultFitHeight, panX=(0.5−noseX)*H*a, panY=0.42−defaultCentreY+(0.5−noseY)*H; H=requestedFaceHeight/(chin−hairline). defaultCentreY=0.55forHeart,0.50otherwise. Preserve the existing zoom cap4; report actual attained height when capped rather than widening controls. Chin fade begins at the mapped chin and ends18/500below it; all pixels below are white. Exact per-case source anchors, zoom/pan, output bounds, attained heights and physical-board conversions are frozen after local analysis and before the first fit in the addendum below and private preparation.json.

## Fixed constraints and measurement

Unchanged profile coordinates/sectors/material:240pins,3000connections,black0.12mm/opacity0.9,classic-coverage/2at1000px,one legal continuous route/no repeated undirected chord/Square guards. Call unchanged generateClassicLeastSquares; retain the archived per-case prep9/10 recipe, with no new tone candidate or optimizer. Determinism is checked on a representative new full500px fit and parameter tests. All source/model work stays local.

Eligibility depends ONLY on hard constraints or compute>1.5x archived current runtime. SSIM face/nose/eyes/mouth numbers are recorded in private key.json and never select, reject or rank a framing. Timing includes framing, existing prep10 filter if applicable, fit and physical1000px render; excludes PNG/report encoding and external scoring. Shared upload-time source analysis/tones are recorded separately, as archived F0 timing also starts after source preparation. Historical F0 timing is reused as requested, not falsely claimed to be a simultaneous same-host rerun. One heavy job at a time,RAM>=1.5GiB.

Local ignored output/p16-1c-review/index.html: original plus surviving F0/F1/F2 randomly lettered/shuffled independently per case, equal-size1000px physical renders, plus equal250px viewing-distance row. The small row is an angular-size proxy, not a calibrated human2metre experiment. Mapping/metrics go only to unserved key.json; no algorithm/level/metrics in visible labels or filenames. No automatic regional or aggregate SSIM veto. All failures remain recorded.

Eligibility is per case/level, not a global exclusion because of another photo. For clarity, heights above use the nominal inner-pattern coordinate frame used by the existing renderer/controls; Heart's actual polygon vertical extent is0.903851474of that nominal frame. The existing notch naturally clips the enlarged upper forehead/hair. Do not silently lower the face, retune the crop, or exclude it on a visual/SSIM judgment; show that tradeoff for the owner's vote.

## Exact frozen values (before fitting)

Full-precision source anchors, target bounds, profile/target hashes and physical conversions: P16_1C_PARAMETERS.json. Below are display-rounded values; all nose tips map to(0.5,0.42).

| Case | Shape | Level | Face height / inner height | Zoom | Pan x | Pan y | Face mm | Zoom capped |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| photo-01 | circle | F1 | 0.500000 | 1.521550031 | -0.031248662 | -0.137954227 | 230.000 | no |
| photo-01 | circle | F2 | 0.650000 | 1.978015040 | -0.040623261 | -0.155340496 | 299.000 | no |
| photo-02 | rectangle | F1 | 0.500000 | 1.294936210 | -0.031248662 | -0.137954227 | 235.000 | no |
| photo-02 | rectangle | F2 | 0.650000 | 1.683417073 | -0.040623261 | -0.155340496 | 305.500 | no |
| photo-03 | heart | F1 | 0.500000 | 3.156965206 | -0.031248662 | -0.187954227 | 195.000 | no |
| photo-03 | heart | F2 | 0.633520 | 4.000000000 | -0.039593293 | -0.203430302 | 247.073 | yes |
| photo-04 | circle | F1 | 0.500000 | 1.498162070 | -0.002165293 | -0.104096306 | 230.000 | no |
| photo-04 | circle | F2 | 0.650000 | 1.947610691 | -0.002814881 | -0.111325198 | 299.000 | no |
| photo-05 | circle | F1 | 0.500000 | 1.663356169 | -0.012917448 | -0.103090066 | 230.000 | no |
| photo-05 | circle | F2 | 0.650000 | 2.162363020 | -0.016792682 | -0.110017085 | 299.000 | no |
| photo-06 | circle | F1 | 0.500000 | 1.489202566 | -0.003469911 | -0.095950958 | 230.000 | no |
| photo-06 | circle | F2 | 0.650000 | 1.935963336 | -0.004510884 | -0.100736246 | 299.000 | no |

## Executed outcome

All12new framings eligible,0hard/time exclusions; all6F0renders reused exactly. F1 range2.312–4.523s/max0.721x archivedF0; F2range4.132–6.186s/max0.986x. Representative actual500px/3000line replay identical. No SSIM gate or winner chosen. Focused16unit/project+explicit research tsc/isolated2145modulebuild26.77s PASS; desktop/mobile6sections/threeletters/equalphysicalsize/250pxviews/private-file denial PASS. All12prepared targets also pass actual white-below-chin and nose-tip placement assertions. Full accepted suites/APK not repeated. See P16_1C_MANAGER_REPORT.md; STOP for owner vote after feature publication.
