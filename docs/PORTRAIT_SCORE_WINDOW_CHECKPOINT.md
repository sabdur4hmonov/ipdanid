# Exact portrait-score and black-raster acceleration — 2026-10-27

The owner's new request reopened a bounded review of the optional face placement on his actual original image. Default whole-photo placement, classic-greedy/3, the physical kit, quality gates and all guide identities remain unchanged.

## Diagnosis and changes

The optional enlarged face exposed a real latency regression: the first isolated desktop Circle took 16.808 s and the artifact-preserving repeat 17.097 s, both FAIL against the unchanged 15 s gate. These failures are retained locally. Two fixed candidate solves, geometry construction and full-frame physical quality scoring dominate the work; there is no invented early exit or weaker quality threshold.

Portrait selection reads only face/nose/eyes/mouth SSIM and independently measures white-background ink on the complete physical raster. Its viewing-image Gaussian now evaluates the union of the reviewed face rectangles plus a four-pixel viewing-grid halo. Horizontal rows include the vertical kernel's reflected support. Every multiply/add and Float32 boundary retains its previous order. The full viewingImage and global SSIM remain available and unchanged; a partial portrait view must never be used as a global quality measurement. Reflected integer addresses have a bounded four-entry cache independent of photo data.

Fresh all-black physical renders evaluate one identical Float32 channel and replicate it into RGB. Colored guides and incremental rendering retain the original three-channel path. A frozen pre-change renderer is a test-only independent oracle. No original-image overlay, feature painting, thread-opacity adjustment, altered line budget, guide hash change or default crop is introduced.

## Evidence and honest scope

- First region-only prototype: 14.685 s vs 16.882 s in Node; exact selected sequence and every reported quality float.
- Production region-only pass with bounded horizontal support: 14.034 s; same path and quality floats.
- Region-only actual UI: 3/6 passed the unchanged 15 s gate; desktop Circle/Square and mobile Square still failed. All retained artifacts remain separate. This intermediate build is not called accepted.
- Regional halo/full-image comparisons cover 500/1000 px, clipped edges, multiple faces and whole-frame faces; full OpenCV golden tests remain in the suite.
- Final combined arithmetic and actual-UI results are recorded below only after execution.

The existing 346-case/80-file C26 matrix describes the earlier f563bb9f build. It is baseline evidence, not a claim that every file was rerun on this changed Worker bundle. Source photos and private timing reports are never committed or uploaded. Photographic/physical likeness, actual phone performance and public production activation remain separate acceptance questions.
