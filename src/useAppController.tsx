import {recoveredProject} from './recovery-client';
import type {RecoverySnapshot} from './recovery-types';
import {
  readAssemblySession,
  writeAssemblySession,
  validAssemblySession,
} from "./assembly-session";
import { useAssemblyAudio } from "./useAssemblyAudio";
import {
  assemblyAudioAvailable,
  assemblyAudioNative,
} from "./assembly-audio-client";
import { newerAudioPosition } from "./assembly-audio-resume";
import { assemblyStepText } from "./assembly-audio-program";
import { SubjectChooser } from "./SubjectChooser";
import { recordedClipPlayer } from "./recorded-player";
import { recordedStepEntries } from "./core/recorded-voices";
import { recordedVoiceText } from "./recorded-voice-i18n";
import { BuildGate } from "./BuildGate";
import { useBuildAccess } from "./useBuildAccess";
import { SubjectMarksEditor } from "./SubjectMarksEditor";
import { subjectFitText, subjectMetricLabel } from "./subject-fit-i18n";
import { defaultSubjectMarks, subjectRecipeKey } from "./core/subject-edit";
import { capabilityProblem, CAPABILITIES } from "./core/capabilities";
import type { SubjectPlan } from "./core/subject-plan";
import {
  makeSubjectPlan,
  subjectPlanOf,
  type SubjectKind,
} from "./core/subject-plan";
import { subjectText } from "./subject-i18n";
import { businessText } from "./business-i18n";
import { Announcements } from "./Announcements";
import { useBusiness } from "./BusinessContext";
import { baseLocale } from "./uzbek-script";
import { PeopleRegionEditor } from "./PeopleRegionEditor";
import { unconfirmedPeople, unreviewedPeople } from "./core/people-edit";
import { PhotoQualityAdvice } from "./PhotoQualityAdvice";
import { SubjectAdvice } from "./SubjectAdvice";
import {
  adviceCrop,
  subjectAdvice,
  type SubjectAdviceResult,
} from "./core/subject-advice";
import {
  photoQualityAdvice,
  type PhotoQualityAdvice as QualityAdvice,
} from "./core/photo-quality";
import { portraitHelp } from "./portrait-help-i18n";
import {
  mappedHeadImportance,
  type HeadImportance,
} from "./core/head-importance";
import { simpleText } from "./simple-flow-i18n";
import { portraitChoiceText } from "./portrait-choice-i18n";
import { CraftStudio } from "./CraftStudio";
import { PhotoActions } from "./PhotoActions";
import { PersonBackground, type BackgroundState } from "./PersonBackground";
import { backgroundText } from "./person-background-i18n";
import { fitAllPeople, croppedPeopleFraction } from "./core/people-fit";
import {
  reviewedFacePortrait,
  reviewedPeoplePortrait,
  estimatedPairPortrait,
} from "./core/face-features";
import { withPinBasis, type PinBasis } from "./core/pin-basis";
import {
  DEFAULT_ANATOMICAL_IMPORTANCE,
  type AnatomicalImportance,
} from "./core/anatomical-importance";
import { useEffect, useMemo, useRef, useState } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  ArrowRight,
  Check,
  Circle,
  Download,
  FolderOpen,
  Heart,
  ImagePlus,
  Layers,
  Leaf,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import { createProfile } from "./core/geometry";
import { withCircleLayout } from "./core/pin-layout";
import {
  DEFAULT_PORTRAIT,
  processPortrait,
  putRgb,
  snapshotPortrait,
} from "./core/portrait";
import { RegionEditor } from "./RegionEditor";
import {
  portraitSampling,
  type PortraitSampling,
} from "./core/portrait-sampling";
import { PortraitSamplingPanel } from "./PortraitSamplingPanel";
import { appendVariants, GenerationJobs, type Variants } from "./core/variants";
import {
  continuationStrategy,
  generationStrategy,
  type GenerationStrategy,
} from "./core/generation-strategy";
import {
  readGenerationInput,
  saveGenerationInput,
  sealGenerationInput,
  deleteGenerationInput,
} from "./generation-inputs";
import { BackgroundEditor } from "./BackgroundEditor";
import { MAX_LINES } from "./core/limits";
import { deepFreeze, flatten, hash } from "./core/engine";
import { renderInstruction } from "./core/render";
import { assemblyEffort } from "./core/simplify";
import { loadPhoto, prepare, sampleCanvas, suitability } from "./core/image";
import { ShapeCropEditor } from "./ShapeCropEditor";
import type { OutlinePoint } from "./core/head-outline";
import {
  androidSpeech,
  guideVoices,
  cancelGuideSpeech,
  nativeGuideSpeech,
  type GuideVoice,
} from "./guide-speech";
import { remapPortrait, CROP_ZOOM_MIN, CROP_ZOOM_MAX } from "./core/shape-crop";
import {
  confirm,
  parseProjectFile,
  projectFile,
  progressFor,
  toTxt,
  validateInstruction,
} from "./core/validation";
import {
  DEFAULT_EDITS,
  type EditParams,
  type Instruction,
  type Locale,
  type Project,
  type Shape,
  type CircleLayout,
  type Pin,
  type PortraitSettings,
} from "./core/types";
import { translate } from "./i18n";
import { readProjects, writeProjects, StorageConflictError } from "./storage";
import { download } from "./download";
import { PRODUCT_NAME } from "./config";
import { CustomerHub } from "./CustomerHub";
import { customerText } from "./customer-i18n";
import { guideText } from "./guide-i18n";
import { recordManualMilestone } from "./analytics-client";
import { AssemblyNavigator } from "./AssemblyNavigator";
import {
  readOptimizerRecovery,
  saveOptimizerRecovery,
  clearOptimizerRecovery,
  type OptimizerRecovery,
} from "./optimizer-storage";
import { customerError } from "./errors";
import {
  readPresets,
  changePreset,
  type MakerSettings,
  type MakerPreset,
} from "./presets";

export type PhotoCandidate = {
  subjectKind: SubjectKind;
  subjectBackgrounds?: Partial<Record<SubjectKind, BackgroundState>>;
  subjectPortraits?: Partial<Record<SubjectKind, PortraitSettings>>;
  id: string;
  sourceRevision?: string;
  name: string;
  image: HTMLCanvasElement;
  original: HTMLCanvasElement;
  background?: BackgroundState;
  group: boolean;
  sample: boolean;
  edits: EditParams;
  portrait: PortraitSettings;
  headOutline: OutlinePoint[];
  aspect: number;
  resolution: number;
};

export type View =
  "create" | "assemble" | "library" | "materials" | "customer" | "crafts";

import { Supply, Preview, ResultSubject } from "./screens/GuidePreview";
export function useAppController(initialView: View = "create") {
  const { settings: storefront } = useBusiness();
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem("iprasm.locale");
    return stored && ["uz", "uz-Cyrl", "ru", "en"].includes(stored)
      ? (stored as Locale)
      : "uz";
  });
  const t = translate(
    ["uz", "uz-Cyrl", "ru", "en"].includes(locale) ? locale : "uz",
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const simple = (key: Parameters<typeof simpleText>[1]) =>
    simpleText(locale, key);
  const [view, setView] = useState<View>(initialView),
    [image, setImage] = useState<
      (CanvasImageSource & { width: number; height: number }) | null
    >(null),
    [sample, setSample] = useState(false),
    [edits, setEdits] = useState<EditParams>(DEFAULT_EDITS);
  const [shape, setShape] = useState<Shape>("circle"),
    [mode, setMode] = useState<"dark" | "light" | "color">("dark"),
    [lines, setLines] = useState(1400),
    [preset, setPreset] = useState("balanced");
  const [resolution, setResolution] = useState(160);
  const [currentTargetHash, setCurrentTargetHash] = useState<string>();
  const [subjectKind, setSubjectKind] = useState<SubjectKind>("whole-image");
  const [strongSubjectFit, setStrongSubjectFit] = useState(false);
  const [subjectScreens, setSubjectScreens] = useState<
    Record<
      string,
      {
        worstSubjectPass: boolean;
        subjects: { id: string; metricsPass: boolean }[];
      }
    >
  >({});
  const [subjectMarks, setSubjectMarks] = useState<
    Record<string, SubjectPlan["subjects"]>
  >({});
  // Animal/vehicle/object never show human anatomy controls or person masks.
  const generalSubject = ["animal", "vehicle", "object"].includes(subjectKind);
  const [generalImageConfirmed, setGeneralImageConfirmed] = useState(false);
  useEffect(() => setGeneralImageConfirmed(false), [image]);
  const [portrait, setPortrait] = useState(structuredClone(DEFAULT_PORTRAIT));
  const cropRef = useRef(edits);
  cropRef.current = edits;
  const [pinLayout, setPinLayout] = useState<CircleLayout>();
  const [pinBasis, setPinBasis] = useState<PinBasis>();
  const [pinCoordinates, setPinCoordinates] = useState<Pin[]>();
  const [portraitSolver, setPortraitSolver] = useState<
    | "continuous"
    | "global"
    | "guarded"
    | "multiscale"
    | "physical"
    | "anatomy"
    | "basis"
  >("guarded");
  const [anatomy, setAnatomy] = useState<AnatomicalImportance>(
    structuredClone(DEFAULT_ANATOMICAL_IMPORTANCE),
  );
  const [headPriority, setHeadPriority] = useState(false);
  const [recovery, setRecovery] = useState<OptimizerRecovery>();
  useEffect(() => {
    if (
      portraitSolver === "basis" &&
      (!portrait.enabled || shape !== "circle" || mode === "color")
    ) {
      setError("portrait-config/basis");
    }
  }, [portraitSolver, portrait.enabled, shape, mode]);
  useEffect(() => {
    readOptimizerRecovery()
      .then(setRecovery)
      .catch(() => {});
  }, []);
  const targetCanvas = useRef<HTMLCanvasElement>(null);
  const [variantState, setVariantState] = useState<Variants>({ items: [] });
  const variants = variantState.items;
  const jobs = useRef(new GenerationJobs());
  const [busy, setBusy] = useState(false),
    [fraction, setFraction] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]),
    [loaded, setLoaded] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [name, setName] = useState("");
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [online, setOnline] = useState(navigator.onLine),
    [showPrivacy, setShowPrivacy] = useState(false);
  const [storageConflict, setStorageConflict] = useState(false);
  const [savedProjects, setSavedProjects] = useState<Project[] | null>(null),
    [saveFailed, setSaveFailed] = useState(false);
  const saveSerial = useRef(0);
  const localSaveState: "failed" | "saving" | "saved" = saveFailed
    ? "failed"
    : savedProjects === projects
      ? "saved"
      : "saving";
  const [photoCandidates, setPhotoCandidates] = useState<PhotoCandidate[]>([]),
    [backgroundBusy, setBackgroundBusy] = useState(false),
    [group, setGroup] = useState(false),
    [peopleFitUndo, setPeopleFitUndo] = useState<{
      edits: EditParams;
      portrait: PortraitSettings;
    }>(),
    [photoId, setPhotoId] = useState<string | null>(null),
    [headOutline, setHeadOutline] = useState<OutlinePoint[]>([]),
    [makerPresets, setMakerPresets] = useState<MakerPreset[]>([]),
    [presetName, setPresetName] = useState(""),
    [selectedPreset, setSelectedPreset] = useState("");
  useEffect(() => setHeadPriority(false), [photoId]);

  const [widthMm, setWidthMm] = useState(400),
    [heightMm, setHeightMm] = useState(400),
    [pinCount, setPinCount] = useState(120),
    [threadMm, setThreadMm] = useState(0.3),
    [stockMeters, setStockMeters] = useState(1200);
  const boardHeight = shape === "circle" ? widthMm : heightMm,
    aspect = widthMm / boardHeight;
  const activeBackground = photoCandidates.find(
    (p) => p.id === photoId,
  )?.background;
  const marksKey = subjectRecipeKey(
    photoCandidates.find((p) => p.id === photoId)?.sourceRevision ??
      photoId ??
      "sample",
    subjectKind,
    edits,
    aspect,
    resolution,
    shape,
    currentTargetHash ?? "preparing",
  );
  const currentMarks = subjectMarks[marksKey] ?? defaultSubjectMarks();
  // A failed preparation opens the correction section. It is never closed
  // automatically, so a manual brush stroke (failed -> manual) keeps it open.
  const backgroundOptions = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (activeBackground?.status === "failed" && backgroundOptions.current)
      backgroundOptions.current.open = true;
  }, [activeBackground?.status]);
  const activePeopleMask = activeBackground?.enabled
    ? activeBackground.mask
    : undefined;
  const croppedPeople = useMemo(
    () =>
      group && image
        ? croppedPeopleFraction(
            activePeopleMask,
            shape,
            edits,
            aspect,
            image.width,
            image.height,
            resolution,
          )
        : undefined,
    [group, image, activePeopleMask, shape, edits, aspect, resolution],
  );
  useEffect(() => {
    setPeopleFitUndo(undefined);
  }, [
    photoId,
    shape,
    aspect,
    widthMm,
    boardHeight,
    resolution,
    activePeopleMask,
    group,
  ]);
  const [guideLocale, setGuideLocale] = useState<"uz" | "ru" | "en">(() => {
    try {
      const saved = localStorage.getItem("iprasm.guide.locale");
      return saved && ["uz", "ru", "en"].includes(saved)
        ? (saved as "uz" | "ru" | "en")
        : baseLocale(locale);
    } catch {
      return baseLocale(locale);
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("iprasm.guide.locale", guideLocale);
    } catch {}
    setVoiceIndex(0);
  }, [guideLocale]);
  const [current, setCurrent] = useState(1),
    [playing, setPlaying] = useState(false),
    [pace, setPace] = useState(8),
    [speechRate, setSpeechRate] = useState(0.9),
    [voiceEnabled, setVoiceEnabled] = useState(false),
    [voices, setVoices] = useState<GuideVoice[]>([]),
    [voiceIndex, setVoiceIndex] = useState(0),
    [pinQuery, setPinQuery] = useState(""),
    [pins, setPins] = useState(true),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [sound, setSound] = useState(false),
    [volume, setVolume] = useState(0.06);
  const [paper, setPaper] = useState<"A4" | "Letter">("A4"),
    [textSize, setTextSize] = useState(10),
    [pdfBusy, setPdfBusy] = useState(false),
    [confirmedUndo, setConfirmedUndo] = useState<number | null>(null);
  const [libraryQuery, setLibraryQuery] = useState(""),
    [libraryFolder, setLibraryFolder] = useState("*"),
    [includeArchive, setIncludeArchive] = useState(true);
  const photo = useRef<HTMLCanvasElement>(null),
    upload = useRef<HTMLInputElement>(null),
    photoLoads = useRef(0),
    importInput = useRef<HTMLInputElement>(null),
    worker = useRef<Worker | null>(null),
    audio = useRef<AudioContext | null>(null),
    gain = useRef<GainNode | null>(null),
    drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(
    () => () => {
      photoLoads.current++;
    },
    [],
  );
  const canBuild = useBuildAccess([
    ...projects.map((p) => p.instruction),
    ...variants.map((v) => v.instruction),
  ]);
  const result = variants.find(
      (v) => v.instruction.id === variantState.selectedId,
    )?.instruction,
    project = projects.find((p) => p.id === selected && !p.deletedAt),
    instruction = project?.instruction,
    steps = instruction && canBuild(instruction) ? flatten(instruction) : [],
    active = steps[current - 1];
  const [restStatus, setRestStatus] = useState<{
    projectId: string;
    current: number;
    state: "saving" | "saved" | "failed";
  }>();
  const resting =
    restStatus?.projectId === project?.id && restStatus?.current === current;
  const assemblyRestored = useRef(false);
  const restorationScope = useRef({ view, projects });
  restorationScope.current = { view, projects };
  useEffect(() => {
    if (!loaded || assemblyRestored.current) return;
    assemblyRestored.current = true;
    let live = true;
    void readAssemblySession().then(async (raw) => {
      if (!live) return;
      const saved = validAssemblySession(raw, projects);
      if (saved && view === "create") {
        let restored = saved.current;
        if (assemblyAudioAvailable())
          try {
            const native = await assemblyAudioNative.checkpoint({
              projectId: saved.projectId,
              sequenceHash: saved.sequenceHash,
            });
            restored =
              newerAudioPosition(
                saved,
                native,
                projects.find((p) => p.id === saved.projectId)!.instruction
                  .metrics.lines,
              ) ?? restored;
          } catch {}
        if (
          !live ||
          restorationScope.current.view !== "create" ||
          !validAssemblySession(saved, restorationScope.current.projects)
        )
          return;
        setSelected(saved.projectId);
        setCurrent(restored);
        if (saved.resting)
          setRestStatus({
            projectId: saved.projectId,
            current: restored,
            state: "saved",
          });
        setPace(saved.pace);
        setView("assemble");
      }
    });
    return () => {
      live = false;
    };
  }, [loaded]);
  useEffect(() => {
    if (loaded && view === "assemble" && project)
      void writeAssemblySession({
        version: 1,
        projectId: project.id,
        sequenceHash: project.instruction.sequenceHash,
        current,
        pace,
        resting,
      }).catch(() => setError(guideText(locale, "saveFailed")));
  }, [
    loaded,
    view,
    project?.id,
    project?.instruction.sequenceHash,
    current,
    pace,
    resting,
  ]);
  const matchingVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(guideLocale),
  );
  const chosenVoice = matchingVoices[voiceIndex] ?? matchingVoices[0];
  const backgroundAudio = useAssemblyAudio({
    active:
      loaded && view === "assemble" && !!instruction && canBuild(instruction),
    projectId: project?.id,
    instruction,
    voice: chosenVoice,
    voiceEnabled,
    language: guideLocale,
    locale,
    rate: speechRate,
    pace,
    onState: (s) => {
      setCurrent(s.current);
      setPlaying(s.playing);
    },
    onPlaying: setPlaying,
    onError: setError,
  });
  const [analysis, setAnalysis] = useState<ReturnType<
    typeof suitability
  > | null>(null);
  const [qualityAdvice, setQualityAdvice] = useState<QualityAdvice | null>(
    null,
  );
  const [sampling, setSampling] = useState<PortraitSampling | null>(null);
  const [adviceResult, setAdviceResult] = useState<SubjectAdviceResult | null>(
    null,
  );
  const speechEpoch = useRef(0);
  const stopSpeech = () => {
    speechEpoch.current++;
    cancelGuideSpeech();
  };
  const pause = () => {
    setPlaying(false);
    backgroundAudio.stop();
    stopSpeech();
    setSound(false);
  };
  const restAssembly = async () => {
    if (!project || !loaded || !instruction || !canBuild(instruction)) return;
    pause();
    const saved = { projectId: project.id, current };
    setRestStatus({ ...saved, state: "saving" });
    try {
      await writeAssemblySession({
        version: 1,
        ...saved,
        sequenceHash: instruction.sequenceHash,
        pace,
        resting: true,
      });
      setRestStatus((old) =>
        old?.projectId === saved.projectId && old.current === saved.current
          ? { ...old, state: "saved" }
          : old,
      );
    } catch {
      setRestStatus((old) =>
        old?.projectId === saved.projectId && old.current === saved.current
          ? { ...old, state: "failed" }
          : old,
      );
    }
  };
  const speak = () => {
    stopSpeech();
    if (backgroundAudio.enabled) {
      void backgroundAudio.start(current, false);
      return;
    }
    const speechJob = speechEpoch.current;
    if (
      document.hidden ||
      view !== "assemble" ||
      !active ||
      !chosenVoice ||
      !voiceEnabled
    )
      return;
    const text = assemblyStepText(
      project!.instruction,
      current,
      guideLocale,
      active,
    );
    const fallback = (voice: GuideVoice) => {
      if (
        speechJob !== speechEpoch.current ||
        document.hidden ||
        backgroundAudio.owns()
      )
        return;
      if (voice.native) {
        void nativeGuideSpeech(text, voice, guideLocale, speechRate).catch(
          () => {
            if (speechJob !== speechEpoch.current) return;
            setVoiceEnabled(false);
            setError(t("noVoice"));
          },
        );
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice.browser!;
      u.lang = voice.lang;
      u.rate = speechRate;
      u.volume = 1;
      if (gain.current) gain.current.gain.value = volume * 0.15;
      u.onend = () => {
        if (speechJob === speechEpoch.current && gain.current)
          gain.current.gain.value = volume;
      };
      window.speechSynthesis.speak(u);
    };
    if (chosenVoice.recorded) {
      if (gain.current) gain.current.gain.value = volume * 0.15;
      void recordedClipPlayer
        .play(
          recordedStepEntries(
            chosenVoice.recorded,
            current,
            active.from,
            active.to,
            active.segmentStart
              ? active.segment === 0
                ? "first"
                : "color"
              : undefined,
            project!.instruction.profile,
          ),
          speechRate,
        )
        .then((played) => {
          if (speechJob === speechEpoch.current && played && gain.current)
            gain.current.gain.value = volume;
        })
        .catch(() => {
          if (speechJob !== speechEpoch.current) return;
          setNotice(recordedVoiceText(locale, "fallback"));
          const voice = matchingVoices.find((v) => !v.recorded);
          if (voice) fallback(voice);
          else {
            setVoiceEnabled(false);
            setError(t("noVoice"));
          }
        });
      return;
    }
    fallback(chosenVoice);
  };
  useEffect(() => {
    void readPresets()
      .then(setMakerPresets)
      .catch((e) => setError(String(e)));
    readProjects()
      .then((p) => {
        setProjects(p);
        setLoaded(true);
      })
      .catch((e) => setError(String(e)));
    return () => {
      jobs.current.cancel();
      worker.current?.terminate();
      stopSpeech();
    };
  }, []);
  useEffect(() => {
    if (loaded) {
      const serial = ++saveSerial.current;
      setSaveFailed(false);
      writeProjects(projects)
        .then(() => {
          if (serial === saveSerial.current) setSavedProjects(projects);
        })
        .catch((e) => {
          setSaveFailed(true);
          setError(String(e));
          setNotice("");
          if (e instanceof StorageConflictError) {
            setStorageConflict(true);
            setLoaded(false);
            pause();
          }
        });
    }
  }, [projects, loaded]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `${storefront.brandName || PRODUCT_NAME} · ${t("tagline")}`;
    localStorage.setItem("iprasm.locale", locale);
    setVoiceIndex(0);
    stopSpeech();
  }, [locale, storefront.brandName]);
  useEffect(() => {
    const update = () => {
      void guideVoices()
        .then(setVoices)
        .catch(() => setVoices([]));
    };
    update();
    if (androidSpeech() || !window.speechSynthesis) return;
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, []);
  useEffect(() => {
    if (view === "create" && image && photo.current) {
      const ctx = photo.current.getContext("2d")!;
      setAnalysis(
        suitability(prepare(ctx, image, edits, aspect), photo.current.width),
      );
      if (targetCanvas.current) {
        const ctxTarget = targetCanvas.current.getContext("2d")!;
        const pixels = processPortrait(
          prepare(ctxTarget, image, edits, aspect),
          resolution,
          portrait,
        );
        putRgb(ctxTarget, pixels, resolution);
        setQualityAdvice(
          photoQualityAdvice(pixels, resolution, shape, portrait),
        );
        try {
          setAdviceResult(
            subjectAdvice({
              pixels,
              n: resolution,
              shape,
              kind: portrait.enabled ? "people" : subjectKind,
              portrait,
              detectedPeople: activeBackground?.faces?.length,
              masked: Boolean(
                activeBackground?.enabled && activeBackground.mask,
              ),
            }),
          );
        } catch {
          setAdviceResult(null);
        }
        if (headPriority && portraitSolver === "basis" && resolution === 320) {
          try {
            const h = mappedHeadImportance(
              headOutline,
              edits,
              image.width,
              image.height,
              aspect,
              resolution,
            );
            ctxTarget.beginPath();
            h.points.forEach((p, k) => {
              const x = 0.5 + p.x * (resolution - 1),
                y = 0.5 + p.y * (resolution - 1);
              if (k) ctxTarget.lineTo(x, y);
              else ctxTarget.moveTo(x, y);
            });
            ctxTarget.closePath();
            ctxTarget.strokeStyle = "#d06020";
            ctxTarget.lineWidth = 1;
            ctxTarget.stroke();
          } catch {
            /* Correction guidance stays visible beside the control. */
          }
        }
        setSampling(
          portrait.enabled
            ? portraitSampling(pixels, resolution, shape, portrait)
            : null,
        );
      }
    }
  }, [
    image,
    edits,
    view,
    aspect,
    portrait,
    resolution,
    shape,
    headPriority,
    headOutline,
    portraitSolver,
    subjectKind,
    activeBackground,
    strongSubjectFit,
  ]);
  useEffect(() => {
    let active = true;
    setCurrentTargetHash(undefined);
    if (image && view === "create") {
      const c = document.createElement("canvas");
      c.width = c.height = resolution;
      const pixels = processPortrait(
        prepare(c.getContext("2d")!, image, edits, aspect),
        resolution,
        portrait,
      );
      void hash(pixels).then((h) => {
        if (active) setCurrentTargetHash(h);
      });
    }
    return () => {
      active = false;
    };
  }, [image, view, edits, aspect, resolution, portrait]);
  useEffect(() => {
    if (!backgroundAudio.enabled) speak();
    return stopSpeech;
  }, [
    current,
    voiceEnabled,
    chosenVoice,
    guideLocale,
    speechRate,
    selected,
    view,
    backgroundAudio.enabled,
  ]);
  useEffect(() => {
    if (!playing || backgroundAudio.enabled) return;
    const timer = setInterval(() => {
      setCurrent((c) => {
        if (c >= steps.length) {
          setPlaying(false);
          return c;
        }
        return c + 1;
      });
    }, pace * 1000);
    return () => clearInterval(timer);
  }, [playing, pace, steps.length, backgroundAudio.enabled]);
  useEffect(() => {
    const fn = () => {
      if (document.hidden) {
        if (!backgroundAudio.owns()) pause();
      } else void backgroundAudio.refresh();
    };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const lifecycle = NativeApp.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (!isActive) {
          if (!backgroundAudio.owns()) pause();
        } else void backgroundAudio.refresh();
      },
    );
    const back = NativeApp.addListener("backButton", () => {
      pause();
      setView("library");
    });
    return () => {
      void lifecycle.then((h) => h.remove());
      void back.then((h) => h.remove());
    };
  }, []);
  useEffect(() => {
    if (!sound) {
      void audio.current?.close();
      audio.current = null;
      return;
    }
    const a = new AudioContext();
    audio.current = a;
    const osc = a.createOscillator(),
      g = a.createGain();
    gain.current = g;
    osc.frequency.value = 130.81;
    osc.type = "sine";
    g.gain.value = volume;
    osc.connect(g);
    g.connect(a.destination);
    osc.start();
    return () => {
      osc.stop();
      void a.close();
      audio.current = null;
    };
  }, [sound]);
  useEffect(() => {
    if (gain.current) gain.current.gain.value = volume;
  }, [volume]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const nav = (v: View) => {
    pause();
    setView(v);
    setMoreOpen(false);
  };
  async function selectPhoto(file: File) {
    const token = ++photoLoads.current;
    setError("");
    let next: ImageBitmap | undefined;
    try {
      next = await loadPhoto(file);
      if (token !== photoLoads.current) return;
      addPhoto(next, file.name, false);
    } catch (e) {
      if (token === photoLoads.current) setError(String(e));
    } finally {
      next?.close();
    }
  }
  useEffect(() => {
    if (portrait.enabled && subjectKind !== "people")
      chooseSubject("people", true);
  }, [portrait.enabled]);
  function chooseSubject(kind: SubjectKind, keepPortrait = false) {
    if (kind === subjectKind) return;
    jobs.current.cancel();
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setError("");
    const current = photoCandidates.find((p) => p.id === photoId);
    const background = current?.subjectBackgrounds?.[kind];
    const nextPortrait = current?.subjectPortraits?.[kind] ?? {
      ...structuredClone(DEFAULT_PORTRAIT),
      // Choosing People starts local analysis only. Portrait weighting is
      // enabled by reviewing a face, so the D9 "portrait is off" guard applies.
      enabled: false,
      background: 0,
      localContrast: 0,
    };
    setPhotoCandidates(
      rememberEdits().map((p) =>
        p.id !== photoId
          ? p
          : {
              ...p,
              subjectKind: kind,
              subjectBackgrounds: {
                ...p.subjectBackgrounds,
                [subjectKind]: p.background,
              },
              subjectPortraits: {
                ...p.subjectPortraits,
                [subjectKind]: structuredClone(portrait),
              },
              background,
              image:
                background?.enabled && background.canvas
                  ? background.canvas
                  : p.original,
              sourceRevision: crypto.randomUUID(),
            },
      ),
    );
    setSubjectKind(kind);
    setGroup(kind === "people" && !!nextPortrait.people);
    setBackgroundBusy(
      kind === "people" &&
        !sample &&
        (!background || background.status === "processing"),
    );
    if (current)
      setImage(
        background?.enabled && background.canvas
          ? background.canvas
          : current.original,
      );
    if (!keepPortrait) setPortrait(nextPortrait);
    if (kind !== "people") {
      setHeadPriority(false);
      setPortraitSolver("guarded");
    }
    setGeneralImageConfirmed(kind !== "people");
  }
  function rememberEdits() {
    return photoCandidates.map((p) =>
      p.id === photoId
        ? {
            ...p,
            edits: { ...edits },
            portrait: structuredClone(portrait),
            headOutline: structuredClone(headOutline),
            aspect,
            resolution,
            group,
            subjectKind,
          }
        : p,
    );
  }
  function addPhoto(
    source: CanvasImageSource & { width: number; height: number },
    label: string,
    isSample: boolean,
  ) {
    photoLoads.current++;
    jobs.current.cancel();
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    // Keep only four bounded working images in memory, never original photos in storage.
    const c = document.createElement("canvas"),
      ratio = Math.min(1, 1536 / Math.max(source.width, source.height));
    c.width = Math.max(1, Math.round(source.width * ratio));
    c.height = Math.max(1, Math.round(source.height * ratio));
    c.getContext("2d")!.drawImage(source, 0, 0, c.width, c.height);
    const p: PhotoCandidate = {
      subjectKind,
      id: crypto.randomUUID(),
      sourceRevision: crypto.randomUUID(),
      name: label.slice(0, 100),
      image: c,
      original: c,
      group: false,
      sample: isSample,
      edits: { ...DEFAULT_EDITS },
      headOutline: [],
      portrait: {
        ...structuredClone(DEFAULT_PORTRAIT),
        enabled: portrait.enabled,
        background: portrait.background,
        localContrast: portrait.localContrast,
        ...(portrait.detailStyle ? { detailStyle: portrait.detailStyle } : {}),
      },
      aspect,
      resolution,
    };
    setPhotoCandidates([...rememberEdits(), p].slice(-4));
    setPhotoId(p.id);
    setImage(c);
    setGroup(false);
    setPeopleFitUndo(undefined);
    setBackgroundBusy(!isSample && subjectKind === "people");
    setHeadOutline([]);
    setPortrait(structuredClone(p.portrait));
    setSample(isSample);
    setEdits(p.edits);
  }
  function switchPhoto(p: PhotoCandidate) {
    if (p.id === photoId) return;
    photoLoads.current++;
    jobs.current.cancel();
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setError("");
    setPhotoCandidates(rememberEdits());
    setPhotoId(p.id);
    setSubjectKind(p.subjectKind ?? "people");
    setImage(p.image);
    setGroup(p.group);
    setPeopleFitUndo(undefined);
    setBackgroundBusy(
      !p.sample &&
        (p.subjectKind ?? "people") === "people" &&
        (!p.background || p.background.status === "processing"),
    );
    setHeadOutline(structuredClone(p.headOutline));
    setPortrait(
      p.aspect === aspect && p.resolution === resolution
        ? structuredClone(p.portrait)
        : remapPortrait(
            p.portrait,
            p.edits,
            p.edits,
            p.image.width,
            p.image.height,
            aspect,
            resolution,
            p.aspect,
            p.resolution,
          ),
    );
    setSample(p.sample);
    setEdits({ ...p.edits });
  }
  function applySettings(s: MakerSettings) {
    setHeadPriority(false);
    setResolution(s.resolution ?? 160);
    setShape(s.shape);
    setMode(s.mode);
    setLines(s.lines);
    setWidthMm(s.widthMm);
    setHeightMm(s.heightMm);
    setPinCount(s.pinCount);
    setThreadMm(s.threadMm);
    setStockMeters(s.stockMeters);
    setPinLayout(s.pinLayout ? structuredClone(s.pinLayout) : undefined);
    setPinCoordinates(
      s.pinCoordinates ? structuredClone(s.pinCoordinates) : undefined,
    );
    setEdits({ ...s.edits });
    setPortrait(structuredClone(s.portrait ?? DEFAULT_PORTRAIT));
    setPortraitSolver(s.portraitSolver ?? "continuous");
    setPinBasis(s.pinBasis);
    setAnatomy(structuredClone(s.anatomy ?? DEFAULT_ANATOMICAL_IMPORTANCE));
    setPreset("balanced");
  }
  async function savePreset() {
    try {
      const next = await changePreset({
        id: crypto.randomUUID(),
        name: presetName.trim(),
        settings: {
          resolution,
          shape,
          mode,
          lines,
          widthMm,
          heightMm: boardHeight,
          pinCount,
          threadMm,
          stockMeters,
          edits: { ...edits },
          portrait: structuredClone(portrait),
          portraitSolver,
          ...(portraitSolver === "basis"
            ? {
                pinBasis: pinBasis ?? {
                  version: "circle-chords/1" as const,
                  count: pinCount as 240 | 320,
                  minimumAngularGapDegrees: 7.5,
                  experimental: true as const,
                },
              }
            : {}),
          ...(portraitSolver === "anatomy"
            ? { anatomy: structuredClone(anatomy) }
            : {}),
          pinLayout,
          pinCoordinates:
            pinLayout && pinCoordinates?.length === pinCount
              ? pinCoordinates
              : undefined,
        },
      });
      setMakerPresets(next);
      setPresetName("");
      setNotice(t("presetSaved"));
    } catch (e) {
      setError(String(e));
    }
  }
  function cancelGeneration() {
    jobs.current.cancel();
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setNotice(t("cancel"));
  }
  function currentGenerationProfile() {
    let p = createProfile(
      shape,
      portraitSolver === "basis" ? 240 : pinCount,
      mode,
      { widthMm, heightMm: boardHeight },
    );
    p.threadMm = threadMm;
    p.stockMeters = stockMeters;
    if (portraitSolver === "basis")
      p = withPinBasis(
        p,
        pinCount as 240 | 320,
        pinBasis?.minimumAngularGapDegrees,
      );
    if (pinLayout)
      p = withCircleLayout(
        p,
        pinLayout,
        pinCoordinates?.length === pinCount ? pinCoordinates : undefined,
      );
    return p;
  }
  function currentSettingsMatch(i: Instruction) {
    try {
      return (
        JSON.stringify(i.profile) ===
          JSON.stringify(currentGenerationProfile()) &&
        i.params.resolution === resolution &&
        i.params.mode === mode &&
        i.params.requestedLines === lines &&
        JSON.stringify(i.params.portrait) ===
          JSON.stringify(
            portrait.enabled ? snapshotPortrait(portrait) : undefined,
          ) &&
        (i.algorithm === "density-subject/18") === strongSubjectFit &&
        (!portrait.enabled ||
          generationStrategy(i) ===
            (strongSubjectFit ? "subjects" : portraitSolver)) &&
        (!strongSubjectFit ||
          portrait.enabled ||
          JSON.stringify(i.params.subject?.subjects) ===
            JSON.stringify(currentMarks)) &&
        (!(portraitSolver === "anatomy") ||
          JSON.stringify(i.params.optimization?.anatomy) ===
            JSON.stringify(anatomy)) &&
        (i.params.optimization?.sweeps ?? 8) === 8 &&
        // A kind change can leave pixels identical (object vs whole image).
        (!i.params.subject ||
          i.params.subject.kind ===
            (portrait.enabled
              ? "people"
              : subjectKind === "people"
                ? "whole-image"
                : subjectKind))
      );
    } catch {
      return false;
    }
  }
  async function generate(
    seed?: Instruction,
    strategyOverride?: GenerationStrategy,
    resume?: OptimizerRecovery,
  ) {
    if ((!image && !resume && !seed) || (backgroundBusy && !resume && !seed))
      return;
    if (
      !seed &&
      !resume &&
      ((activeBackground?.faces?.length ?? 0) > 0 || !sample) &&
      !portrait.enabled &&
      !generalImageConfirmed &&
      subjectKind === "people"
    ) {
      setError("portrait-choice/off");
      return;
    }
    // New group compositions need every person confirmed individually.
    if (!seed && !resume && unreviewedPeople(portrait).length) {
      setError(`people-review/${unreviewedPeople(portrait).join(",")}`);
      return;
    }
    if (resume?.hairSeed && !resume.hairCheckpoint) {
      setError(t("legacyHairRecovery"));
      return;
    }
    let profile;
    try {
      profile = resume?.profile
        ? structuredClone(resume.profile)
        : seed
          ? structuredClone(seed.profile)
          : currentGenerationProfile();
    } catch (e) {
      setError(String(e));
      return;
    }
    setError("");
    setBusy(true);
    setFraction(0);
    const jobId = jobs.current.begin();
    const c = document.createElement("canvas");
    const generationResolution =
      resume?.resolution ?? seed?.params.resolution ?? resolution;
    const seedVariant = seed
      ? variants.find((v) => v.instruction.id === seed.id)
      : undefined;
    const generationPhoto = photoCandidates.find(
      (p) => p.id === (seedVariant?.photoId ?? photoId),
    );
    const generationImage = generationPhoto?.image ?? image;
    c.width = c.height = generationResolution;
    const continuationSubject = resume?.subject ?? seed?.params.subject;
    const generationPortrait =
      continuationSubject && continuationSubject.kind !== "people"
        ? { ...structuredClone(DEFAULT_PORTRAIT), enabled: false }
        : resume?.portrait
          ? structuredClone(resume.portrait)
          : seed
            ? structuredClone(seed.params.portrait ?? portrait)
            : snapshotPortrait(portrait);
    let generationEdits =
      resume?.edits ??
      (seed
        ? (variants.find((v) => v.instruction.id === seed.id)?.edits ?? edits)
        : edits);
    let archived;
    try {
      archived = seed ? await readGenerationInput(seed) : undefined;
    } catch (e) {
      if (jobs.current.accepts(jobId)) {
        setError(String(e));
        setBusy(false);
      }
      return;
    }
    if (!jobs.current.accepts(jobId)) return;
    if (archived && !resume)
      generationEdits = structuredClone(archived.input.recipe.edits);
    if (!generationImage && !resume && !archived) {
      setError("local-input/missing");
      setBusy(false);
      return;
    }
    const pixels =
      resume?.pixels ??
      archived?.input.pixels ??
      processPortrait(
        prepare(
          c.getContext("2d")!,
          generationImage!,
          generationEdits,
          seed ? profile.widthMm / profile.heightMm : aspect,
        ),
        generationResolution,
        generationPortrait,
      );
    let generationHead: HeadImportance | undefined;
    try {
      generationHead = resume?.head ?? seed?.params.optimization?.head;
      if (
        !resume &&
        headPriority &&
        portraitSolver === "basis" &&
        generationResolution === 320 &&
        (!seed ||
          ["density-resolved/12", "density-head/13", "hair-cycles/14"].includes(
            seed.algorithm,
          ))
      ) {
        if (generationPortrait.regions?.placement !== "manual")
          throw Error("Manual regions required");
        generationHead = mappedHeadImportance(
          headOutline,
          generationEdits,
          generationImage!.width,
          generationImage!.height,
          aspect,
          generationResolution,
        );
      }
    } catch {
      setError(t("headPriorityHint"));
      setBusy(false);
      return;
    }
    let generationSubject;
    try {
      generationSubject = resume
        ? resume.subject
        : seed
          ? seed.params.subject
          : makeSubjectPlan(
              generationPortrait.enabled
                ? "people"
                : subjectKind === "people"
                  ? "whole-image"
                  : subjectKind,
              generationPhoto?.sourceRevision ??
                generationPhoto?.id ??
                "sample",
              generationEdits,
              generationPortrait,
              generationPhoto?.background?.enabled &&
                generationPhoto.background.mask
                ? generationPhoto.background.status === "manual"
                  ? "manual-subject-mask"
                  : "explicit-person-mask"
                : "original",
            );
      if (
        !seed &&
        !resume &&
        strongSubjectFit &&
        generationSubject &&
        generationSubject.kind !== "people"
      )
        generationSubject = {
          ...generationSubject,
          subjects: structuredClone(currentMarks),
        };
      if (
        (!seed && !resume && strongSubjectFit) ||
        seed?.algorithm === "density-subject/18" ||
        resume?.strategy === "subjects"
      ) {
        const problem = capabilityProblem("density-subject/18", {
          subject: generationSubject,
          mode: resume?.mode ?? seed?.params.mode ?? mode,
          resolution: generationResolution,
          shape: profile.shape,
        });
        if (problem) throw Error(`subject-fit/${problem}`);
      }
    } catch (e) {
      // An inconsistent plan is reported, never dispatched; the job is released.
      if (jobs.current.accepts(jobId)) {
        setError(String(e));
        setBusy(false);
      }
      return;
    }
    const w = new Worker(
      new URL("./core/generator.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current?.terminate();
    worker.current = w;
    const label =
      resume?.name ??
      seedVariant?.name ??
      `${generationPhoto?.name ?? t("sample")} · ${t(preset as "balanced" | "lighter" | "detailed")}`;
    if (seed) setNotice(t("continuationSource"));
    const globalLabel = t("globalSolver"),
      baselineLabel = t("continuousSolver");
    const currentJob = () =>
      jobs.current.accepts(jobId) && worker.current === w;
    const finish = () => {
      if (!currentJob()) return;
      w.terminate();
      worker.current = null;
      setBusy(false);
    };
    let lastRecovery = resume;
    const requestedStrategy =
      strategyOverride ??
      (seed
        ? continuationStrategy(seed)
        : strongSubjectFit
          ? "subjects"
          : generationPortrait.enabled && mode !== "color"
            ? portraitSolver
            : generationSubject
              ? "guarded"
              : "continuous");
    const handleWorkerMessage = async (data: any) => {
      if (!currentJob() || data.jobId !== jobId) return;
      if (data.type === "progress") {
        setFraction(data.fraction);
        return;
      }
      if (data.type === "fit-checkpoint") {
        const value: OptimizerRecovery = {
          version: "iprasm.optimizer-recovery/1",
          checkpoint: data.checkpoint,
          seed: data.seed,
          profile: data.profile,
          portrait: data.portrait,
          subject: generationSubject,
          product: data.product,
          accessPolicy: data.accessPolicy,
          resolution: data.resolution,
          mode: data.mode,
          pixels,
          lines: data.lines,
          strategy: data.strategy ?? "physical",
          anatomy: data.anatomy,
          features: data.features,
          texture: data.texture,
          subjectObjective: data.subjectObjective,
          head: data.head,
          headRefine: data.headRefine,
          edits: generationEdits,
          name: label,
          extension: data.extension,
          totalSweeps: data.totalSweeps,
          exchange: data.exchange,
        };
        lastRecovery = value;
        try {
          await saveOptimizerRecovery(value);
          if (currentJob()) setRecovery(value);
        } catch {
          if (currentJob()) setNotice(t("recoveryFailed"));
        }
        return;
      }
      if (data.type === "hair-checkpoint") {
        try {
          const hairSeed = await validateInstruction(data.root);
          if (!currentJob()) return;
          lastRecovery = {
            ...lastRecovery,
            version: "iprasm.optimizer-recovery/1",
            seed: hairSeed,
            hairSeed,
            hairCheckpoint: data.checkpoint,
            profile: hairSeed.profile,
            portrait: hairSeed.params.portrait,
            subject: hairSeed.params.subject,
            resolution: hairSeed.params.resolution,
            mode: hairSeed.params.mode,
            pixels,
            lines: hairSeed.params.requestedLines,
            strategy: "basis",
            head: data.head,
            headRefine: true,
            edits: generationEdits,
            name: label,
          };
          await saveOptimizerRecovery(lastRecovery);
          if (currentJob()) setRecovery(lastRecovery);
        } catch {
          if (currentJob()) setNotice(t("recoveryFailed"));
        }
        return;
      }
      if (data.type === "stage") {
        if (data.diagnostic.stage === "hair-pool") {
          setNotice(
            `${t("hairScanStage")} · ${data.diagnostic.scanned}/${data.diagnostic.total}`,
          );
        } else if (data.diagnostic.stage === "hair-cycles") {
          setNotice(
            `${t("headPriority")} · ${data.diagnostic.cycles * 2} ${t("lines")} · ${data.diagnostic.evaluations}/100000`,
          );
        } else if (data.diagnostic.stage === "extension-validation")
          setNotice(t("extensionStage"));
        else if (data.diagnostic.stage === "exchange")
          setNotice(
            `${t("exchangeStage")} ${data.diagnostic.evaluations}/${data.diagnostic.evaluationLimit}`,
          );
        else if (data.diagnostic.stage === "fit")
          setNotice(
            `${t("physicalStage")} ${data.diagnostic.sweep}/${data.diagnostic.plannedSweeps} · ${data.diagnostic.evaluations}`,
          );
        else if (data.diagnostic.stage === "simplify") {
          setFraction(data.diagnostic.proposals / data.diagnostic.limit);
          setNotice(
            `${t("simplificationStage")} ${data.diagnostic.proposals}/${data.diagnostic.limit} · ${data.diagnostic.connectionsSaved}`,
          );
        } else setNotice(t("routingStage"));
        return;
      }
      if (data.type === "checkpoint") {
        try {
          const i = await validateInstruction(data.instruction);
          if (currentJob())
            setVariantState((v) =>
              appendVariants(v, [
                {
                  instruction: i,
                  name: `${label} · ${t("simplificationSolver")}`,
                  edits: { ...generationEdits },
                  photoId: generationPhoto?.id,
                },
              ]),
            );
        } catch (e) {
          if (currentJob()) setError(String(e));
        }
        return;
      }
      if (data.type !== "done") {
        setError(data.message);
        finish();
        return;
      }
      try {
        const i = await validateInstruction(data.instruction);
        const baseline = data.baseline
          ? await validateInstruction(data.baseline)
          : undefined;
        if (!currentJob()) return;
        let archivedSuccessfully = false;
        if (data.subjectScreen?.candidate === i.sequenceHash)
          setSubjectScreens((v) => ({
            ...v,
            [i.sequenceHash]: data.subjectScreen,
          }));
        try {
          const input = await sealGenerationInput(
            {
              targetHash: i.imageHash,
              accessPolicy: i.params.accessPolicy,
              preparedRevision:
                archived?.input.recipe.preparedRevision ??
                generationPhoto?.sourceRevision ??
                generationPhoto?.id ??
                "saved-target",
              edits: { ...generationEdits },
              resolution: generationResolution,
              profile: i.profile,
              portrait: i.params.portrait,
              subject: i.params.subject,
              product: i.params.product,
              mode: i.params.mode,
              lines: i.params.requestedLines,
              strategy: requestedStrategy,
              objective: i.params.optimization,
            },
            pixels,
          );
          await saveGenerationInput(
            i,
            input,
            lastRecovery?.checkpoint ? lastRecovery : undefined,
          );
          archivedSuccessfully = true;
          if (!currentJob()) return;
        } catch {
          if (currentJob()) setNotice(t("recoveryFailed"));
        }
        if (
          [
            "density-physical/8",
            "density-anatomy/10",
            "density-pin-basis/11",
            "density-resolved/12",
            "density-feature/16",
            "density-texture/17",
            "density-subject/18",
            "density-head/13",
            "hair-cycles/14",
          ].includes(i.algorithm) &&
          archivedSuccessfully
        ) {
          try {
            await clearOptimizerRecovery();
            if (!currentJob()) return;
            setRecovery(undefined);
          } catch {
            if (currentJob()) setNotice(t("recoveryFailed"));
          }
        }
        setVariantState((v) =>
          appendVariants(v, [
            ...(baseline
              ? [
                  {
                    instruction: baseline,
                    name:
                      baseline.algorithm === "continuous-guarded/6"
                        ? t("guardedSolver")
                        : baselineLabel,
                    edits: { ...generationEdits },
                    photoId: generationPhoto?.id,
                  },
                ]
              : []),
            {
              instruction: i,
              name:
                i.algorithm === "assembly-prune/9"
                  ? `${label} · ${t("simplificationSolver")}`
                  : i.algorithm === "density-feature/16"
                    ? `${label} · ${portraitChoiceText(locale, "fineFeature")}`
                    : i.algorithm === "hair-cycles/14"
                      ? `${label} · ${t("hairVariant")}`
                      : i.algorithm === "density-head/13"
                        ? `${label} · ${t("headPriority")}`
                        : [
                              "density-pin-basis/11",
                              "density-resolved/12",
                              "density-head/13",
                              "hair-cycles/14",
                            ].includes(i.algorithm ?? "")
                          ? `${label} · ${t("basisSolver")}`
                          : i.algorithm === "density-anatomy/10"
                            ? `${label} · ${t("anatomySolver")}`
                            : i.algorithm === "density-physical/8"
                              ? `${label} · ${t("physicalSolver")}`
                              : i.algorithm === "density-multiscale/7"
                                ? `${label} · ${t("multiscaleSolver")}`
                                : i.algorithm === "continuous-guarded/6"
                                  ? `${label} · ${t("guardedSolver")}`
                                  : i.algorithm === "density-optical/5"
                                    ? `${label} · ${globalLabel}`
                                    : label,
              edits: { ...generationEdits },
              photoId: generationPhoto?.id,
            },
          ]),
        );
      } catch (e) {
        if (currentJob()) setError(String(e));
      } finally {
        finish();
      }
    };
    let deliveries = Promise.resolve();
    w.onmessage = ({ data }) => {
      // Preserve checkpoint -> completion ordering, including asynchronous validation
      // and IndexedDB writes. A stale job is checked again inside each queued delivery.
      deliveries = deliveries
        .then(() => handleWorkerMessage(data))
        .catch((e) => {
          if (currentJob()) {
            setError(String(e));
            finish();
          }
        });
    };
    w.onerror = (e) => {
      if (currentJob()) {
        setError(e.message);
        finish();
      }
    };
    w.postMessage({
      jobId,
      pixels,
      resolution: generationResolution,
      profile,
      lines: resume?.lines ?? seed?.params.requestedLines ?? lines,
      mode: resume?.mode ?? seed?.params.mode ?? mode,
      portrait: generationPortrait,
      subject: generationSubject,
      product: resume?.product ?? seed?.params.product,
      accessPolicy: resume ? resume.accessPolicy : "kit-build/1",
      seed,
      resume: resume?.checkpoint,
      extension: resume?.extension,
      totalSweeps: resume?.totalSweeps,
      exchange: resume?.exchange,
      head: generationHead,
      headRefine:
        strategyOverride !== "simplify" &&
        (resume?.headRefine ?? (!!generationHead && (!seed || headPriority))),
      hairSeed: resume?.hairSeed,
      hairResume: resume?.hairCheckpoint,
      anatomy: resume?.anatomy ?? seed?.params.optimization?.anatomy ?? anatomy,
      features: resume?.features ?? seed?.params.optimization?.features,
      texture: resume?.texture ?? seed?.params.optimization?.texture,
      subjectObjective:
        resume?.subjectObjective ?? seed?.params.optimization?.subjectObjective,
      strategy: requestedStrategy,
    });
  }
  async function restoreAccountProject(guide: Instruction, snapshot: RecoverySnapshot, valid:()=>boolean) {
    if (!valid() || !loaded) return;
    const old=projects.find(p=>!p.deletedAt && p.instruction.sequenceHash===guide.sequenceHash);
    const restored=recoveredProject(deepFreeze(guide),snapshot,old);
    const next=old ? projects.map(p=>p.id===old.id?restored.project:p) : [restored.project,...projects];
    pause();
    await writeProjects(next);
    if (!valid()) return;
    await writeAssemblySession(restored.session);
    if (!valid()) return;
    setProjects(next);
    setSelected(restored.project.id);
    setCurrent(restored.session.current);
    setPace(restored.session.pace);
    setRestStatus({projectId:restored.project.id,current:restored.session.current,state:'saved'});
    setConfirmedUndo(null);
    setView('assemble');
    setZoom(1);setPan({x:0,y:0});
  }
  function open(p: Project) {
    pause();
    setSelected(p.id);
    setCurrent(Math.min(p.instruction.metrics.lines, p.progress.confirmed + 1));
    setConfirmedUndo(null);
    setView("assemble");
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }
  async function extendSavedPortrait(p: Project) {
    try {
      const archived = await readGenerationInput(p.instruction),
        fit = archived?.fit;
      if (
        !fit?.checkpoint ||
        p.instruction.algorithm !== "density-resolved/12" ||
        p.instruction.params.optimization?.convergence ||
        fit.checkpoint.sweeps !== 8
      )
        throw Error("local-input/missing");
      setView("create");
      await generate(fit.seed, "basis", {
        ...fit,
        totalSweeps: 24,
        checkpoint: undefined,
        extension: {
          version: "resolved-convergence/1",
          checkpoint: fit.checkpoint,
          priorSweepLimit: 8,
          reference: p.instruction,
        },
      });
    } catch (e) {
      setError(String(e));
    }
  }
  async function save(i: Instruction = result!) {
    if (!loaded) {
      setError("Library has not loaded. Existing data is preserved.");
      return;
    }
    const p: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || t("defaultName"),
      instruction: deepFreeze(i),
      progress: progressFor(i),
      edits: {
        ...(variants.find((v) => v.instruction.id === i.id)?.edits ??
          DEFAULT_EDITS),
      },
    };
    setProjects((ps) => [p, ...ps]);
    open(p);
  }
  function confirmCurrent() {
    setRestStatus(undefined);
    if (!project || !loaded || !canBuild(project.instruction)) return;
    setConfirmedUndo(project.progress.confirmed);
    setProjects((ps) =>
      ps.map((p) =>
        p.id === project.id
          ? { ...p, progress: confirm(p.progress, current, p.instruction) }
          : p,
      ),
    );
    recordManualMilestone(project.instruction, {
      ...project.progress,
      confirmed: current,
      revision: project.progress.revision + 1,
    });
    if (current < steps.length) {
      setCurrent(current + 1);
      if (backgroundAudio.enabled)
        void backgroundAudio.start(current + 1, playing);
    }
  }
  const jump = (v: number) => {
    setRestStatus(undefined);
    pause();
    if (Number.isInteger(v) && v >= 1 && v <= steps.length) {
      setCurrent(v);
      if (backgroundAudio.enabled) void backgroundAudio.start(v, false);
    }
  };
  async function pdf() {
    if (!instruction || !canBuild(instruction)) return;
    setPdfBusy(true);
    setError("");
    try {
      const { exportPdf } = await import("./core/pdf");
      const bytes = await exportPdf(instruction, locale, {
        paper,
        textSize,
        confirmed: project?.progress.confirmed ?? 0,
      });
      await download(
        "ip-rasm-guide.pdf",
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setPdfBusy(false);
    }
  }
  function changeComputationResolution(next: number) {
    if (image && next !== resolution)
      setPortrait((p) => ({
        ...remapPortrait(
          p,
          edits,
          edits,
          image.width,
          image.height,
          aspect,
          next,
          aspect,
          resolution,
        ),
        // Masks are normalized on the same crop; sampling alone does not move them.
        backgroundMask: p.backgroundMask,
        foregroundMask: p.foregroundMask,
      }));
    setResolution(next);
  }
  function applyCrop(next: EditParams) {
    const previous = cropRef.current;
    cropRef.current = next;
    if (image) {
      const moved = ["zoom", "panX", "panY", "rotation"].some(
        (k) => next[k as keyof EditParams] !== previous[k as keyof EditParams],
      );
      if (moved)
        setPortrait((currentPortrait) =>
          remapPortrait(
            currentPortrait,
            previous,
            next,
            image.width,
            image.height,
            aspect,
            resolution,
          ),
        );
    }
    setEdits(next);
  }
  const ranges: {
    key: keyof EditParams;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: "zoom", min: CROP_ZOOM_MIN, max: CROP_ZOOM_MAX, step: 0.05 },
    { key: "panX", min: -0.5, max: 0.5, step: 0.01 },
    { key: "panY", min: -0.5, max: 0.5, step: 0.01 },
    { key: "rotation", min: -180, max: 180, step: 1 },
    { key: "brightness", min: -100, max: 100, step: 1 },
    { key: "contrast", min: 0.5, max: 2, step: 0.05 },
  ];
  const doImport = async (f: File) => {
    try {
      if (f.size > 4_000_000) throw new Error("File too large");
      const imported = await parseProjectFile(await f.text());
      if ("instruction" in imported) {
        if (!loaded) throw new Error("Library not loaded");
        setProjects((ps) => [imported, ...ps]);
        open(imported);
      } else await save(imported);
    } catch (e) {
      setError(String(e));
    }
  };

  return {
    Announcements,
    ArrowRight,
    AssemblyNavigator,
    BackgroundEditor,
    BuildGate,
    CAPABILITIES,
    Check,
    Circle,
    CraftStudio,
    CustomerHub,
    DEFAULT_EDITS,
    DEFAULT_PORTRAIT,
    Download,
    FolderOpen,
    Heart,
    ImagePlus,
    Layers,
    Leaf,
    MAX_LINES,
    PRODUCT_NAME,
    Pause,
    PeopleRegionEditor,
    PersonBackground,
    PhotoActions,
    PhotoQualityAdvice,
    Play,
    PortraitSamplingPanel,
    Preview,
    ResultSubject,
    RotateCcw,
    ShapeCropEditor,
    ShieldCheck,
    Sparkles,
    Square,
    SubjectAdvice,
    SubjectChooser,
    SubjectMarksEditor,
    Supply,
    Upload,
    WifiOff,
    X,
    active,
    activeBackground,
    activePeopleMask,
    addPhoto,
    adviceCrop,
    adviceResult,
    analysis,
    applyCrop,
    applySettings,
    aspect,
    assemblyEffort,
    backgroundAudio,
    backgroundBusy,
    backgroundOptions,
    backgroundText,
    boardHeight,
    businessText,
    busy,
    canBuild,
    cancelGeneration,
    changeComputationResolution,
    changePreset,
    chooseSubject,
    chosenVoice,
    clearOptimizerRecovery,
    confirm,
    confirmCurrent,
    confirmedUndo,
    continuationStrategy,
    croppedPeople,
    current,
    currentMarks,
    currentSettingsMatch,
    currentTargetHash,
    customerError,
    customerText,
    deepFreeze,
    deleteGenerationInput,
    doImport,
    download,
    drag,
    edits,
    error,
    estimatedPairPortrait,
    extendSavedPortrait,
    fitAllPeople,
    fraction,
    generalImageConfirmed,
    generalSubject,
    generate,
    group,
    guideLocale,
    guideText,
    headOutline,
    headPriority,
    image,
    importInput,
    includeArchive,
    instruction,
    jobs,
    jump,
    libraryFolder,
    libraryQuery,
    lines,
    loaded,
    localSaveState,
    locale,
    makerPresets,
    marksKey,
    matchingVoices,
    mode,
    moreOpen,
    name,
    nav,
    notice,
    online,
    open,
    pace,
    pan,
    paper,
    pause,
    restAssembly,
    restoreAccountProject,
    resting,
    restSaveState: restStatus?.state ?? "saved",
    resumeAssembly: () => setRestStatus(undefined),
    pausePlayback: () => {
      if (backgroundAudio.enabled) backgroundAudio.pause();
      else pause();
    },
    startPlayback: () => {
      setRestStatus(undefined);
      if (backgroundAudio.enabled) {
        setSound(false);
        void backgroundAudio.start(current);
      } else {
        setPlaying(true);
        speak();
      }
    },
    pdf,
    pdfBusy,
    peopleFitUndo,
    photo,
    photoCandidates,
    photoId,
    pinBasis,
    pinCount,
    pinLayout,
    pinQuery,
    pins,
    playing,
    portrait,
    portraitChoiceText,
    portraitHelp,
    portraitSolver,
    preset,
    presetName,
    progressFor,
    project,
    projectFile,
    projects,
    qualityAdvice,
    ranges,
    readProjects,
    recovery,
    renderInstruction,
    resolution,
    result,
    reviewedFacePortrait,
    reviewedPeoplePortrait,
    sample,
    sampleCanvas,
    sampling,
    save,
    savePreset,
    selectPhoto,
    selectedPreset,
    setBackgroundBusy,
    setBusy,
    setConfirmedUndo,
    setEdits,
    setError,
    setGeneralImageConfirmed,
    setGroup,
    setGuideLocale,
    setHeadOutline,
    setHeadPriority,
    setHeightMm,
    setImage,
    setIncludeArchive,
    setLibraryFolder,
    setLibraryQuery,
    setLines,
    setLoaded,
    setLocale,
    setMakerPresets,
    setMode,
    setMoreOpen,
    setName,
    setNotice,
    setPace,
    setPan,
    setPaper,
    setPeopleFitUndo,
    setPhotoCandidates,
    setPinBasis,
    setPinCoordinates,
    setPinCount,
    setPinLayout,
    setPinQuery,
    setPins,
    setPlaying,
    setPortrait,
    setPortraitSolver,
    setPreset,
    setPresetName,
    setProjects,
    setRecovery,
    setSelected,
    setSelectedPreset,
    setShape,
    setShowPrivacy,
    setSound,
    setSpeechRate,
    setStockMeters,
    setStorageConflict,
    setStrongSubjectFit,
    setSubjectMarks,
    setTextSize,
    setThreadMm,
    setVariantState,
    setView,
    setVoiceEnabled,
    setVoiceIndex,
    setVolume,
    setWidthMm,
    setZoom,
    shape,
    showPrivacy,
    simple,
    sound,
    speak,
    speechRate,
    steps,
    stockMeters,
    storageConflict,
    storefront,
    strongSubjectFit,
    subjectFitText,
    subjectKind,
    subjectMetricLabel,
    subjectScreens,
    subjectText,
    switchPhoto,
    t,
    targetCanvas,
    textSize,
    threadMm,
    toTxt,
    unconfirmedPeople,
    unreviewedPeople,
    upload,
    variantState,
    variants,
    view,
    voiceEnabled,
    voiceIndex,
    volume,
    widthMm,
    worker,
    zoom,
  };
}
export type AppScreenContext = ReturnType<typeof useAppController>;
