import { validatePinBasis } from "./pin-basis";
import {
  DEFAULT_ANATOMICAL_IMPORTANCE,
  anatomicalImportance,
} from "./anatomical-importance";
import { generate } from "./engine";
import { generateDensity } from "./density";
import { ContinuationError } from "./continuation";
import { defaultPhysicalContrast } from "./physical-contrast";
import { simplifySequence } from "./simplify";
self.onmessage = async ({ data }) => {
  try {
    const started = performance.now();
    const options = {
      ...data,
      onProgress: (fraction: number) =>
        self.postMessage({ type: "progress", jobId: data.jobId, fraction }),
      onDiagnostic: (diagnostic: Record<string, unknown>) =>
        self.postMessage({ type: "stage", jobId: data.jobId, diagnostic }),
    };
    if (data.strategy === "anatomy")
      anatomicalImportance(
        options.portrait,
        data.anatomy ?? DEFAULT_ANATOMICAL_IMPORTANCE,
      );
    if (data.strategy === "basis") validatePinBasis(options.profile);
    options.guarded =
      data.strategy === "guarded" ||
      data.strategy === "multiscale" ||
      ["physical", "anatomy", "basis"].includes(data.strategy);
    let baseline;
    if (
      ["global", "multiscale", "physical", "anatomy"].includes(data.strategy) &&
      !data.seed
    ) {
      baseline = await generate({
        ...options,
        lines: Math.max(
          1,
          data.lines -
            Math.min(
              data.profile.pins.length * 2,
              Math.floor(data.lines * 0.25),
            ),
        ),
        onProgress: (fraction: number) => options.onProgress(fraction * 0.5),
      });
      options.seed = baseline;
      options.onProgress = (fraction: number) =>
        self.postMessage({
          type: "progress",
          jobId: data.jobId,
          fraction: 0.5 + fraction * 0.5,
        });
    }
    const instruction =
      data.strategy === "simplify"
        ? await simplifySequence(data.seed, data.pixels, {
            maxProposals: 512,
            onProgress: (d) =>
              self.postMessage({
                type: "stage",
                jobId: data.jobId,
                diagnostic: { stage: "simplify", ...d },
              }),
            onAccepted: (i) =>
              self.postMessage({
                type: "checkpoint",
                jobId: data.jobId,
                instruction: i,
              }),
          })
        : ["global", "multiscale", "physical", "anatomy", "basis"].includes(
              data.strategy,
            )
          ? await generateDensity(options, {
              edgeWeight:
                data.seed?.params.optimization?.edgeWeight ??
                (["multiscale", "physical", "anatomy", "basis"].includes(
                  data.strategy,
                )
                  ? 2
                  : 1),
              sweeps:
                data.strategy === "basis"
                  ? (data.totalSweeps ??
                    data.seed?.params.optimization?.sweeps ??
                    8)
                  : (data.seed?.params.optimization?.sweeps ?? 8),
              multiscale: data.strategy === "multiscale",
              ...(data.strategy === "anatomy"
                ? { anatomy: data.anatomy ?? DEFAULT_ANATOMICAL_IMPORTANCE }
                : {}),
              ...(data.extension
                ? { extension: data.extension, sweeps: data.totalSweeps }
                : {}),
              ...(data.exchange ? { exchange: data.exchange, sweeps: 1 } : {}),
              ...(data.materializeOnly ? { materializeOnly: true } : {}),
              ...(["physical", "anatomy", "basis"].includes(data.strategy)
                ? {
                    physical:
                      data.seed?.params.optimization?.contrastPhysical ??
                      defaultPhysicalContrast(),
                  }
                : {}),
              ...(["physical", "anatomy", "basis"].includes(data.strategy)
                ? {
                    resume: data.resume,
                    onCheckpoint: (checkpoint: unknown) =>
                      self.postMessage({
                        type: "fit-checkpoint",
                        jobId: data.jobId,
                        checkpoint,
                        seed: options.seed,
                        profile: options.profile,
                        portrait: options.portrait,
                        resolution: options.resolution,
                        mode: options.mode,
                        lines: data.lines,
                        extension: data.extension,
                        totalSweeps:
                          data.strategy === "basis"
                            ? (data.totalSweeps ??
                              data.seed?.params.optimization?.sweeps ??
                              8)
                            : data.totalSweeps,
                        exchange: data.exchange,
                        strategy: data.strategy,
                        anatomy:
                          data.strategy === "anatomy"
                            ? (data.anatomy ?? DEFAULT_ANATOMICAL_IMPORTANCE)
                            : undefined,
                      }),
                  }
                : {}),
            })
          : await generate(options);
    self.postMessage({
      type: "done",
      jobId: data.jobId,
      instruction,
      baseline,
      durationMs: performance.now() - started,
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      jobId: data.jobId,
      message: error instanceof Error ? error.message : "Generation failed",
      ...(error instanceof ContinuationError
        ? { mismatches: error.mismatches }
        : {}),
    });
  }
};
