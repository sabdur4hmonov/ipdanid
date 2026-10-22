# Background removal candidates — 2026-10-22

Owner requested a GitHub search during the portrait repair. These are primary-source findings, not local benchmark winners. No replacement dependency/model has been installed or shipped.

| Candidate | Verified source and suitability | Decision for this repair |
| --- | --- | --- |
| MODNet | [Official repository](https://github.com/ZHKKKe/MODNet) explicitly licenses code, models and demos (except its GIF examples) under Apache-2.0. Portrait matting, with an official linked ONNX conversion path. The advertised 7 MB web-demo model is **unpublished** and must not be confused with the downloadable research model. | First lightweight portrait-matting candidate to benchmark locally if the isolated original-scale mask loses hair. Do not claim mobile speed before testing the actual downloadable weights. |
| BiRefNet portrait / lite | [Official repository](https://github.com/ZhengPeng7/BiRefNet) supplies high-resolution segmentation/matting and ONNX guidance. [Author's portrait model card](https://huggingface.co/ZhengPeng7/BiRefNet-portrait) is marked MIT. Official full-model GPU memory figures are multiple GB; those figures do not establish CPU/browser performance. | Strong quality comparison candidate, with exact selected weight provenance/license/hash and memory checks before downloading/running. Lite is a separate artifact requiring its own verification. No claim that it is the best on this photo. |
| rembg | [Official repository](https://github.com/danielgatis/rembg) is an MIT Python inference wrapper supporting multiple models. Its documentation explicitly separates model-weight licenses; its current default BRIA model requires a commercial agreement. | Useful local test harness if already available, not itself a segmentation model or a browser replacement. Never run the default and assume all weights inherit MIT. |
| IMG.LY background-removal-js | [Official repository](https://github.com/imgly/background-removal-js) supports browser/Node removal under AGPL-3.0 with other licensing options. | Not selected under this repo's current MIT/Apache/BSD reuse rule. No claim that AGPL software cannot be commercial. |
| Existing MediaPipe SelfieMulticlass + DeepLab | [Official model guide](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter) documents hair/face/skin/clothes categories and the 256-square multiclass model. Our existing self-hosted CPU Worker uses this model plus uncertain-background cleanup, with SHA checks. | Preserve as measured control. Inspect full source-space mask separately from downstream shape/chin crops; replacing this model cannot repair a later heart-notch cut. |

## Bounded decision

1. Save source-space person mask and white-background image before any head crop or heart mask, for the exact same synthetic JPG.
2. Compare crown/ears/cheeks retained in that image with the prepared target. A notch appearing only after framing is a geometry defect; a lost hair edge already in the source-space mask is a matting defect.
3. Only if a matting defect is observed, compare MODNet against the existing baseline on the same input. Record actual model hash/license, load/inference time, peak memory, hair retention and background leakage. Then consider BiRefNet if the lighter option fails.
4. Do not upload owner photos to demos/APIs. Do not run a large sweep, declare a GitHub popularity winner, or equate model SSIM with final physical string-art likeness.
