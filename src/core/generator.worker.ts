import { generateClassicLeastSquares } from "./classic-least-squares";
import { physicalPreviewRgba } from "./physical-preview";
import { refineHairCycles } from "./hair-cycles";
import { generateClassic } from "./classic";
import { generateClassicReference } from "./classic-reference";
import { addHeartAccent } from "./heart-accent";
import { DEFAULT_FEATURE_CONTRAST } from "./feature-contrast";
import { DEFAULT_LOCAL_TEXTURE } from "./local-texture";
import {
  DEFAULT_SUBJECT_OBJECTIVE,
  reviewSubjectCandidate,
} from "./subject-objective";
import { capabilityProblem } from "./capabilities";
import { assertContinuation } from "./continuation";
import { hash } from "./engine";
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
import { validSubjectPlan } from "./subject-plan";
self.onmessage = async ({ data }) => {
  try {
    const started = performance.now();
    if (data.strategy === "classic3" && data.redAccentColor)
      throw Error("classic3/red-accent-unsupported");
    if (data.strategy === "outline") throw Error("lettering/rebuild");
    if (data.strategy === "subjects") {
      const problem = capabilityProblem("density-subject/18", {
        subject: data.subject,
        mode: data.mode,
        resolution: data.resolution,
        shape: data.profile?.shape,
      });
      if (problem) throw Error(`subject-fit/${problem}`);
    }
    // Subject plans are checked before any strategy runs; general subjects can
    // never reach a person-anatomy objective or reuse a person-only mask.
    if (data.subject !== undefined)
      validSubjectPlan(data.subject, data.portrait);
    if (
      data.portrait?.enabled &&
      data.portrait.people &&
      !["continuous", "guarded", "simplify", "subjects", "classic"].includes(
        data.strategy,
      )
    )
      throw Error(
        "Multiple portraits currently require the guarded continuous solver; experimental objectives are separate",
      );
    if (data.head && (data.strategy !== "basis" || data.resolution !== 320))
      throw Error("Head importance requires a separate resolved basis");
    const options = {
      ...data,
      onProgress: (fraction: number) =>
        self.postMessage({
          type: "progress",
          jobId: data.jobId,
          fraction: data.headRefine ? 0.8 * fraction : fraction,
        }),
      onDiagnostic: (diagnostic: Record<string, unknown>) =>
        self.postMessage({ type: "stage", jobId: data.jobId, diagnostic }),
    };
    if (data.strategy === "subjects" && !options.portrait?.enabled)
      delete options.portrait;
    if (data.strategy === "anatomy")
      anatomicalImportance(
        options.portrait,
        data.anatomy ?? DEFAULT_ANATOMICAL_IMPORTANCE,
      );
    if (data.strategy === "basis") validatePinBasis(options.profile);
    options.guarded =
      data.strategy === "guarded" ||
      data.strategy === "multiscale" ||
      [
        "physical",
        "anatomy",
        "basis",
        "features",
        "texture",
        "subjects",
      ].includes(data.strategy);
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
    const cycleSeed =
      data.hairSeed ??
      (data.seed?.algorithm === "hair-cycles/14" ||
      (data.headRefine && data.seed?.algorithm === "density-resolved/12")
        ? data.seed
        : undefined);
    if (cycleSeed)
      assertContinuation(
        { ...options, seed: cycleSeed },
        await hash(options.pixels),
      );
    const classicGenerator =
      data.strategy === "classic3"
        ? generateClassicLeastSquares
        : generateClassicReference;
    const instruction =
      data.strategy === "classic2" || data.strategy === "classic3"
        ? await classicGenerator({
            ...options,
            onCheckpoint: (instruction) =>
              self.postMessage({
                type: "checkpoint",
                jobId: data.jobId,
                instruction,
              }),
          })
        : data.strategy === "classic"
          ? await generateClassic({
              ...options,
              onCheckpoint: (instruction) =>
                self.postMessage({
                  type: "checkpoint",
                  jobId: data.jobId,
                  instruction,
                }),
            })
          : cycleSeed
            ? cycleSeed
            : data.strategy === "simplify"
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
              : [
                    "global",
                    "multiscale",
                    "physical",
                    "anatomy",
                    "basis",
                    "features",
                    "texture",
                    "subjects",
                  ].includes(data.strategy)
                ? await generateDensity(options, {
                    resolved:
                      ["basis", "features", "texture"].includes(
                        data.strategy,
                      ) && data.resolution === 320,
                    ...(data.strategy === "features"
                      ? {
                          features:
                            data.seed?.params.optimization?.features ??
                            data.features ??
                            DEFAULT_FEATURE_CONTRAST,
                        }
                      : {}),
                    head: data.headRefine ? undefined : data.head,
                    ...(data.strategy === "subjects"
                      ? {
                          subjectObjective:
                            data.seed?.params.optimization?.subjectObjective ??
                            data.subjectObjective ??
                            DEFAULT_SUBJECT_OBJECTIVE,
                        }
                      : {}),
                    ...(data.strategy === "texture"
                      ? {
                          texture:
                            data.seed?.params.optimization?.texture ??
                            data.texture ??
                            DEFAULT_LOCAL_TEXTURE,
                        }
                      : {}),
                    edgeWeight:
                      data.seed?.params.optimization?.edgeWeight ??
                      ([
                        "multiscale",
                        "physical",
                        "anatomy",
                        "basis",
                        "features",
                        "texture",
                        "subjects",
                      ].includes(data.strategy)
                        ? 2
                        : 1),
                    sweeps: ["features", "texture", "subjects"].includes(
                      data.strategy,
                    )
                      ? (data.totalSweeps ?? 8)
                      : data.strategy === "basis"
                        ? (data.totalSweeps ??
                          data.seed?.params.optimization?.sweeps ??
                          8)
                        : (data.seed?.params.optimization?.sweeps ?? 8),
                    multiscale: data.strategy === "multiscale",
                    ...(data.strategy === "anatomy"
                      ? {
                          anatomy:
                            data.anatomy ?? DEFAULT_ANATOMICAL_IMPORTANCE,
                        }
                      : {}),
                    ...(data.extension
                      ? { extension: data.extension, sweeps: data.totalSweeps }
                      : {}),
                    ...(data.exchange
                      ? { exchange: data.exchange, sweeps: 1 }
                      : {}),
                    ...(data.materializeOnly ? { materializeOnly: true } : {}),
                    ...([
                      "physical",
                      "anatomy",
                      "basis",
                      "features",
                      "texture",
                      "subjects",
                    ].includes(data.strategy)
                      ? {
                          physical:
                            data.seed?.params.optimization?.contrastPhysical ??
                            defaultPhysicalContrast(),
                        }
                      : {}),
                    ...([
                      "physical",
                      "anatomy",
                      "basis",
                      "features",
                      "texture",
                      "subjects",
                    ].includes(data.strategy)
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
                              product: options.product,
                              accessPolicy: options.accessPolicy,
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
                              head: data.head,
                              headRefine: data.headRefine,
                              anatomy:
                                data.strategy === "anatomy"
                                  ? (data.anatomy ??
                                    DEFAULT_ANATOMICAL_IMPORTANCE)
                                  : undefined,
                              features:
                                data.strategy === "features"
                                  ? (data.seed?.params.optimization?.features ??
                                    data.features ??
                                    DEFAULT_FEATURE_CONTRAST)
                                  : undefined,
                              texture:
                                data.strategy === "texture"
                                  ? (data.seed?.params.optimization?.texture ??
                                    data.texture ??
                                    DEFAULT_LOCAL_TEXTURE)
                                  : undefined,
                              subjectObjective:
                                data.strategy === "subjects"
                                  ? (data.seed?.params.optimization
                                      ?.subjectObjective ??
                                    data.subjectObjective ??
                                    DEFAULT_SUBJECT_OBJECTIVE)
                                  : undefined,
                            }),
                        }
                      : {}),
                  })
                : await generate(options);
    const finalInstruction =
      (data.headRefine || cycleSeed) && data.strategy !== "simplify"
        ? await refineHairCycles(instruction, options.pixels, data.head, {
            resume: data.hairResume,
            onProgress: (diagnostic) =>
              self.postMessage({
                type: "stage",
                jobId: data.jobId,
                diagnostic,
              }),
            onCheckpoint: (checkpoint) =>
              self.postMessage({
                type: "hair-checkpoint",
                jobId: data.jobId,
                root: instruction,
                checkpoint,
                head: data.head,
              }),
          })
        : instruction;
    const preview = data.physicalPreview === true && data.strategy === "classic3" ? physicalPreviewRgba(finalInstruction) : undefined;
    self.postMessage({
      type: "done",
      jobId: data.jobId,
      instruction:
        ["classic", "classic2"].includes(data.strategy) && data.redAccentColor
          ? await addHeartAccent(
              finalInstruction,
              options.pixels,
              data.redAccentColor,
            )
          : finalInstruction,
      ...(["classic", "classic2"].includes(data.strategy) && data.redAccentColor
        ? { classicBody: finalInstruction }
        : {}),
      ...(data.strategy === "subjects" && data.seed
        ? {
            subjectScreen: await reviewSubjectCandidate(
              data.seed,
              finalInstruction,
              data.pixels,
            ),
          }
        : {}),
      baseline,
      durationMs: performance.now() - started,
      ...(preview ? { physicalPreview: {sequenceHash: finalInstruction.sequenceHash, width:1000,height:1000,pixels:preview} } : {}),
    }, {transfer: preview ? [preview.buffer] : []});
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
