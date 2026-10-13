import {
  SUBJECT_KINDS,
  makeSubjectPlan,
  type SubjectKind,
} from "./core/subject-plan";
import { subjectText } from "./subject-i18n";
import { businessText } from "./business-i18n";
import { Announcements } from "./Announcements";
import { useBusiness } from "./BusinessContext";
import { baseLocale } from "./uzbek-script";
import { PeopleRegionEditor } from "./PeopleRegionEditor";
import { PhotoQualityAdvice } from "./PhotoQualityAdvice";
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
import { spokenPin, translate } from "./i18n";
import { readProjects, writeProjects, StorageConflictError } from "./storage";
import { download } from "./download";
import { PRODUCT_NAME } from "./config";
import { CustomerHub } from "./CustomerHub";
import { customerText } from "./customer-i18n";
import { guideText } from "./guide-i18n";
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

type PhotoCandidate = {
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

type View =
  "create" | "assemble" | "library" | "materials" | "customer" | "crafts";
function Supply({
  instruction: i,
  locale,
}: {
  instruction: Instruction;
  locale: Locale;
}) {
  const t = translate(locale),
    shortfall = Math.max(0, i.metrics.estimatedMeters - i.profile.stockMeters);
  return (
    <div className="supply" data-testid="supply">
      {i.profile.pinLayout && (
        <p>
          {t("layoutNotice")} {i.profile.pinLayout.phaseDegreesClockwise}° ·{" "}
          {i.profile.pinLayout.version}
        </p>
      )}
      <p>
        {t("stockMeters")}: {i.profile.stockMeters.toFixed(1)} m ·{" "}
        {t("stockShortfall")}:{" "}
        <strong>{(Math.ceil(shortfall * 10) / 10).toFixed(1)} m</strong>
      </p>
      <p className="fineprint">{t("stockHint")}</p>
      <p className="fineprint">
        {t("stopReason")}:{" "}
        {t(
          i.metrics.stoppedReason === "requested"
            ? "requestedStop"
            : i.metrics.stoppedReason === "compute-limit"
              ? "computeLimit"
              : ["quality-plateau", "no-improvement"].includes(
                    i.metrics.stoppedReason,
                  )
                ? "qualityPlateau"
                : "legacyStop",
        )}
      </p>
      {i.metrics.refinement?.reason === "compute-limit" && (
        <p className="fineprint">{t("refineLimit")}</p>
      )}
      {Object.entries(i.metrics.perColorMeters).map(([color, m]) => (
        <span key={color} className="color-length">
          <i style={{ background: color }} />
          {color}: {(Math.ceil(m * 10) / 10).toFixed(1)} m{" "}
        </span>
      ))}
    </div>
  );
}
function Preview({
  instruction,
  step = 0,
  completed,
  pins = true,
}: {
  instruction: Instruction;
  step?: number;
  completed?: number;
  pins?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current)
      renderInstruction(canvas.current.getContext("2d")!, instruction, {
        highlight: step,
        completed,
        pins,
      });
  }, [instruction, step, completed, pins]);
  return (
    <canvas
      ref={canvas}
      width={720}
      height={Math.round(
        (720 * instruction.profile.heightMm) / instruction.profile.widthMm,
      )}
      aria-label={`Thread preview ${instruction.sequenceHash}`}
      data-sequence-hash={instruction.sequenceHash}
    />
  );
}
export default function App() {
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
  const [view, setView] = useState<View>("create"),
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
  const localSaveState = saveFailed
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
  const result = variants.find(
      (v) => v.instruction.id === variantState.selectedId,
    )?.instruction,
    project = projects.find((p) => p.id === selected && !p.deletedAt),
    instruction = project?.instruction,
    steps = instruction ? flatten(instruction) : [],
    active = steps[current - 1];
  const matchingVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(guideLocale),
  );
  const chosenVoice = matchingVoices[voiceIndex] ?? matchingVoices[0];
  const [analysis, setAnalysis] = useState<ReturnType<
    typeof suitability
  > | null>(null);
  const [qualityAdvice, setQualityAdvice] = useState<QualityAdvice | null>(
    null,
  );
  const [sampling, setSampling] = useState<PortraitSampling | null>(null);
  const stopSpeech = cancelGuideSpeech;
  const pause = () => {
    setPlaying(false);
    stopSpeech();
    setSound(false);
  };
  const speak = () => {
    stopSpeech();
    if (view !== "assemble" || !active || !chosenVoice || !voiceEnabled) return;
    const guideT = translate(guideLocale);
    const text = `${guideT("pdfStep")} ${spokenPin(guideLocale, current)}. ${spokenPin(guideLocale, active.from)} ${guideT("from")}, ${spokenPin(guideLocale, active.to)} ${guideT("to")}.${active.segmentStart ? " " + guideT(active.segment === 0 ? "startKnot" : "colorChange") : ""}`;
    if (chosenVoice.native) {
      void nativeGuideSpeech(text, chosenVoice, guideLocale, speechRate).catch(
        () => {
          setVoiceEnabled(false);
          setError(t("noVoice"));
        },
      );
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.voice = chosenVoice.browser!;
    u.lang = chosenVoice.lang;
    u.rate = speechRate;
    u.volume = 1;
    if (gain.current) gain.current.gain.value = volume * 0.15;
    u.onend = () => {
      if (gain.current) gain.current.gain.value = volume;
    };
    window.speechSynthesis.speak(u);
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
    speak();
    return stopSpeech;
  }, [
    current,
    voiceEnabled,
    chosenVoice,
    guideLocale,
    speechRate,
    selected,
    view,
  ]);
  useEffect(() => {
    if (!playing) return;
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
  }, [playing, pace, steps.length]);
  useEffect(() => {
    const fn = () => {
      if (document.hidden) pause();
    };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const lifecycle = NativeApp.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (!isActive) pause();
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
      enabled: kind === "people",
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
        (!portrait.enabled || generationStrategy(i) === portraitSolver) &&
        (!(portraitSolver === "anatomy") ||
          JSON.stringify(i.params.optimization?.anatomy) ===
            JSON.stringify(anatomy)) &&
        (i.params.optimization?.sweeps ?? 8) === 8
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
    const generationPortrait = resume?.portrait
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
    const generationSubject = resume
      ? resume.subject
      : seed
        ? seed.params.subject
        : makeSubjectPlan(
            generationPortrait.enabled
              ? "people"
              : subjectKind === "people"
                ? "whole-image"
                : subjectKind,
            generationPhoto?.sourceRevision ?? generationPhoto?.id ?? "sample",
            generationEdits,
            generationPortrait,
            generationPhoto?.background?.enabled &&
              generationPhoto.background.mask
              ? generationPhoto.background.status === "manual"
                ? "manual-subject-mask"
                : "explicit-person-mask"
              : "original",
          );
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
          resolution: data.resolution,
          mode: data.mode,
          pixels,
          lines: data.lines,
          strategy: data.strategy ?? "physical",
          anatomy: data.anatomy,
          features: data.features,
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
        try {
          const input = await sealGenerationInput(
            {
              targetHash: i.imageHash,
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
      strategy: requestedStrategy,
    });
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
    if (!project || !loaded) return;
    setConfirmedUndo(project.progress.confirmed);
    setProjects((ps) =>
      ps.map((p) =>
        p.id === project.id
          ? { ...p, progress: confirm(p.progress, current, p.instruction) }
          : p,
      ),
    );
    if (current < steps.length) setCurrent(current + 1);
  }
  const jump = (v: number) => {
    pause();
    if (Number.isInteger(v) && v >= 1 && v <= steps.length) setCurrent(v);
  };
  async function pdf() {
    if (!instruction) return;
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
  return (
    <div className="app">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            nav("create");
          }}
        >
          <img src="/icon.svg" alt="" />
          <span>
            {storefront.brandName || PRODUCT_NAME}
            <span className="brand-sub">{t("tagline")}</span>
          </span>
        </a>
        <nav aria-label="Main">
          {(
            [
              { id: "create", icon: Sparkles },
              { id: "assemble", icon: Layers },
              { id: "library", icon: FolderOpen },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              aria-label={t(id)}
              className={view === id ? "nav active" : "nav"}
              onClick={() => nav(id)}
            >
              <Icon size={20} />
              <span>{t(id)}</span>
              {id === "library" && (
                <small aria-hidden="true">
                  {projects.filter((p) => !p.deletedAt).length}
                </small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <ShieldCheck size={18} />
            {t("private")}
          </div>
          <button className="text-button" onClick={() => setShowPrivacy(true)}>
            {t("privacy")}
          </button>
          <span className="version">Ip Rasm · development 0.1</span>
        </div>
      </aside>
      <div className="body">
        <header>
          <div className="breadcrumbs">
            {view === "customer" ? customerText(locale, "customer") : t(view)}{" "}
            <span>/</span> <span>{storefront.brandName || PRODUCT_NAME}</span>
          </div>
          <div className="header-right">
            <details
              className="more-menu"
              open={moreOpen}
              onToggle={(e) => setMoreOpen(e.currentTarget.open)}
            >
              <summary>{simple("more")}</summary>
              <div className="more-menu-items">
                <button onClick={() => nav("materials")}>
                  {t("materials")}
                </button>
                <button onClick={() => nav("customer")}>
                  {customerText(locale, "customer")}
                </button>
                <button onClick={() => nav("crafts")}>{t("crafts")}</button>
                <button
                  onClick={() => {
                    setShowPrivacy(true);
                    setMoreOpen(false);
                  }}
                >
                  {t("privacy")}
                </button>
                <button
                  onClick={() => {
                    addPhoto(sampleCanvas(), t("sample"), true);
                    nav("create");
                  }}
                >
                  {t("sample")}
                </button>
              </div>
            </details>
            {!online && (
              <span className="offline">
                <WifiOff size={15} />
                {t("offline")}
              </span>
            )}
            <select
              aria-label="Language"
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="uz">O‘zbekcha</option>
              <option value="uz-Cyrl">Ўзбекча</option>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
        </header>
        <main>
          <Announcements locale={locale} />
          {projects.length > 0 && (
            <p
              className="fineprint library-save-status"
              role="status"
              data-testid="library-save-state"
              data-state={localSaveState}
            >
              {guideText(
                locale,
                localSaveState === "failed" ? "saveFailed" : localSaveState,
              )}
            </p>
          )}
          {storageConflict && (
            <div className="alert error" role="alert">
              <span>{t("conflict")}</span>
              <button
                className="outline"
                onClick={() =>
                  readProjects()
                    .then((ps) => {
                      setProjects(ps);
                      setLoaded(true);
                      setStorageConflict(false);
                      setSelected(null);
                      setError("");
                      setView("library");
                    })
                    .catch((e) => setError(String(e)))
                }
              >
                {t("reloadLibrary")}
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="alert error">
              {customerError(error, locale)}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              <Check size={17} />
              {notice}
            </div>
          )}
          {view === "customer" && (
            <CustomerHub
              locale={locale}
              projects={projects}
              onImport={(i, p) => {
                const next: Project = {
                  id: crypto.randomUUID(),
                  name: "Server · " + i.sequenceHash.slice(0, 8),
                  instruction: deepFreeze(i),
                  progress: p,
                  edits: { ...DEFAULT_EDITS },
                };
                setProjects((ps) => [next, ...ps]);
                open(next);
              }}
              onProgress={(id, p) => {
                const local = projects.find((item) => item.id === id);
                if (!local || local.instruction.sequenceHash !== p.sequenceHash)
                  throw new Error("Different sequences");
                const progress = confirm(
                  local.progress,
                  p.confirmed,
                  local.instruction,
                );
                setProjects((ps) =>
                  ps.map((item) =>
                    item.id === id ? { ...item, progress } : item,
                  ),
                );
              }}
              onApplyProfile={(id) => {
                const match = id.match(
                  /^dev-(circle|rectangle|heart)-(\d+)-(dark|light|color)$/,
                );
                if (!match || Number(match[2]) < 24 || Number(match[2]) > 240) {
                  setError(customerText(locale, "failure"));
                  return;
                }
                setShape(match[1] as Shape);
                setPinCount(Number(match[2]));
                setMode(match[3] as "dark" | "light" | "color");
                setWidthMm(400);
                setHeightMm(400);
                setThreadMm(0.3);
                nav("create");
              }}
            />
          )}
          {view === "create" && (
            <>
              <section className="intro simple-intro">
                <div>
                  <h1>
                    {(!image && storefront.homeTitle[locale]) ||
                      simple(image ? "adjustTitle" : "startTitle")}
                  </h1>
                  <p>{simple(image ? "adjustHint" : "startHint")}</p>
                </div>
              </section>
              <div
                className={
                  image
                    ? "workspace simple-workspace"
                    : "workspace simple-start"
                }
              >
                <div className="editor-column">
                  <section
                    className="card photo-card"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!busy && e.dataTransfer.files[0])
                        void selectPhoto(e.dataTransfer.files[0]);
                    }}
                  >
                    <div className="section-label">
                      {t("step1")}
                      <ImagePlus size={17} />
                    </div>
                    <label className="range-label">
                      {subjectText(locale, "title")}
                      <select
                        data-testid="subject-kind"
                        aria-label={subjectText(locale, "title")}
                        value={subjectKind}
                        disabled={busy}
                        onChange={(e) =>
                          chooseSubject(e.target.value as SubjectKind)
                        }
                      >
                        {SUBJECT_KINDS.map((kind) => (
                          <option key={kind} value={kind}>
                            {subjectText(locale, kind)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="fineprint">{subjectText(locale, "hint")}</p>
                    <PhotoActions
                      locale={locale}
                      onPhoto={selectPhoto}
                      uploadRef={upload}
                      hint={false}
                      disabled={busy}
                    />
                    <p className="photo-guidance" data-testid="photo-guidance">
                      {t("photoGuidance")}
                    </p>
                    {busy && !image && !recovery && (
                      <div data-testid="saved-calculation-running">
                        <p>
                          {t("generating")} {Math.round(fraction * 100)}%
                        </p>
                        <progress max="1" value={fraction} />
                        <button
                          className="text-button"
                          onClick={cancelGeneration}
                        >
                          {t("cancel")}
                        </button>
                      </div>
                    )}
                    {recovery && (
                      <div
                        className="fineprint"
                        data-testid="optimizer-recovery"
                      >
                        <p>{t("recoveryNotice")}</p>
                        {recovery.hairSeed && !recovery.hairCheckpoint ? (
                          <>
                            <p>{t("legacyHairRecovery")}</p>
                            <button
                              className="outline full"
                              disabled={busy || !loaded}
                              onClick={() => void save(recovery.hairSeed)}
                            >
                              {t("keepRecoveredGuide")}
                            </button>
                          </>
                        ) : (
                          <button
                            disabled={busy}
                            className="outline full"
                            onClick={() =>
                              generate(
                                recovery.seed,
                                recovery.strategy,
                                recovery,
                              )
                            }
                          >
                            {t("resumeOptimization")}
                          </button>
                        )}
                        <button
                          disabled={busy}
                          className="text-button"
                          onClick={() =>
                            clearOptimizerRecovery()
                              .then(() => setRecovery(undefined))
                              .catch(() => setNotice(t("recoveryFailed")))
                          }
                        >
                          {t("discardOptimization")}
                        </button>
                        {busy && !image && (
                          <>
                            <p role="status">{t("generating")}</p>
                            <button
                              className="text-button"
                              onClick={cancelGeneration}
                            >
                              {t("cancel")}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {image && (
                      <>
                        {shape === "heart" && (
                          <p
                            className="workflow-notice"
                            data-testid="heart-people-guidance"
                          >
                            {portraitHelp(locale, "heart")}
                          </p>
                        )}
                        <div className="preset-row">
                          <button
                            className="outline"
                            onClick={() =>
                              applyCrop({
                                ...edits,
                                rotation:
                                  edits.rotation <= -180
                                    ? 90
                                    : edits.rotation - 90,
                              })
                            }
                          >
                            {portraitHelp(locale, "rotateLeft")}
                          </button>
                          <button
                            className="outline"
                            onClick={() =>
                              applyCrop({
                                ...edits,
                                rotation:
                                  edits.rotation >= 180
                                    ? -90
                                    : edits.rotation + 90,
                              })
                            }
                          >
                            {portraitHelp(locale, "rotateRight")}
                          </button>
                          {(activeBackground?.faces?.length ?? 0) > 1 && (
                            <button
                              className="outline"
                              data-testid="apply-people-faces"
                              onClick={() => {
                                if (
                                  resolution > 192 ||
                                  pinCount > 240 ||
                                  pinBasis
                                ) {
                                  setError("portrait-config/group");
                                  return;
                                }
                                try {
                                  setPortrait(
                                    reviewedPeoplePortrait(
                                      activeBackground!.faces!,
                                      portrait,
                                      edits,
                                      image.width,
                                      image.height,
                                      aspect,
                                      resolution,
                                      shape,
                                    ),
                                  );
                                  setGroup(true);
                                  setPortraitSolver("guarded");
                                } catch (e) {
                                  setError(String(e));
                                }
                              }}
                            >
                              {portraitHelp(locale, "usePeople")}
                            </button>
                          )}
                          <button
                            className="outline"
                            data-testid="mark-two-faces"
                            onClick={() => {
                              if (
                                resolution > 192 ||
                                pinCount > 240 ||
                                pinBasis
                              ) {
                                setError("portrait-config/group");
                                return;
                              }
                              setGroup(true);
                              setPortraitSolver("guarded");
                              setPortrait(estimatedPairPortrait(portrait));
                              const panel =
                                document.querySelector<HTMLDetailsElement>(
                                  '[data-testid="advanced-photo"]',
                                );
                              if (panel) panel.open = true;
                            }}
                          >
                            {portraitHelp(locale, "manualPeople")}
                          </button>
                        </div>
                        <PhotoQualityAdvice
                          advice={qualityAdvice}
                          locale={locale}
                        />
                        <details
                          className="edits"
                          data-testid="background-options"
                          open={
                            photoCandidates.find((p) => p.id === photoId)
                              ?.background?.status === "failed"
                          }
                        >
                          <summary>
                            {simple("background")}
                            {backgroundBusy ? ` · ${simple("preparing")}` : ""}
                          </summary>
                          {!sample &&
                            photoCandidates.find((p) => p.id === photoId) && (
                              <PersonBackground
                                key={`${photoId}:${subjectKind}`}
                                kind={subjectKind}
                                source={
                                  photoCandidates.find((p) => p.id === photoId)!
                                    .original
                                }
                                initial={
                                  photoCandidates.find((p) => p.id === photoId)!
                                    .background
                                }
                                locale={locale}
                                group={group}
                                onUseFace={(face) => {
                                  setPortrait(
                                    reviewedFacePortrait(
                                      face,
                                      portrait,
                                      edits,
                                      image.width,
                                      image.height,
                                      aspect,
                                      resolution,
                                      shape,
                                    ),
                                  );
                                  setLines(MAX_LINES);
                                }}
                                onBusy={setBackgroundBusy}
                                onChange={(background, prepared) => {
                                  if (
                                    background.status === "ready" &&
                                    (background.faces?.length ?? 0) > 1 &&
                                    background.faces !== activeBackground?.faces
                                  ) {
                                    setGroup(true);
                                    setHeadOutline([]);
                                    setPortrait((v) => ({
                                      ...v,
                                      enabled: false,
                                    }));
                                  }
                                  jobs.current.cancel();
                                  worker.current?.terminate();
                                  worker.current = null;
                                  setBusy(false);
                                  setImage(prepared);
                                  setPhotoCandidates((v) =>
                                    v.map((p) =>
                                      p.id === photoId
                                        ? {
                                            ...p,
                                            image: prepared,
                                            background,
                                            sourceRevision: crypto.randomUUID(),
                                          }
                                        : p,
                                    ),
                                  );
                                  // Source segmentation replaces the old single-face oval softening.
                                  if (background.enabled && background.mask)
                                    setPortrait((v) => ({
                                      ...v,
                                      background: 0,
                                    }));
                                }}
                              />
                            )}
                        </details>
                        <details className="edits" open={group}>
                          <summary>{simple("people")}</summary>
                          <label className="toggle">
                            <input
                              type="checkbox"
                              checked={group}
                              onChange={(e) => {
                                setGroup(e.target.checked);
                                setHeadOutline([]);
                                if (e.target.checked)
                                  setPortrait((v) => ({
                                    ...v,
                                    people: undefined,
                                    enabled: false,
                                  }));
                              }}
                            />
                            {backgroundText(locale, "group")}
                          </label>
                          {group && (
                            <>
                              <p className="workflow-notice">
                                {backgroundText(locale, "groupHint")}
                              </p>
                              <div className="preset-row">
                                <button
                                  className="outline"
                                  data-testid="fit-all-people"
                                  disabled={backgroundBusy}
                                  onClick={() => {
                                    try {
                                      const fit = fitAllPeople(
                                        shape,
                                        activePeopleMask,
                                        edits,
                                        aspect,
                                        widthMm,
                                        boardHeight,
                                        image.width,
                                        image.height,
                                        resolution,
                                      );
                                      setPeopleFitUndo({
                                        edits: { ...edits },
                                        portrait: structuredClone(portrait),
                                      });
                                      applyCrop(fit.edits);
                                    } catch (e) {
                                      setError(String(e));
                                    }
                                  }}
                                >
                                  {backgroundText(locale, "fitPeople")}
                                </button>
                                <button
                                  className="outline"
                                  data-testid="undo-people-fit"
                                  disabled={!peopleFitUndo}
                                  onClick={() => {
                                    if (peopleFitUndo) {
                                      setEdits(peopleFitUndo.edits);
                                      setPortrait(peopleFitUndo.portrait);
                                      setPeopleFitUndo(undefined);
                                    }
                                  }}
                                >
                                  {backgroundText(locale, "undoPeople")}
                                </button>
                              </div>
                              <p className="fineprint">
                                {backgroundText(locale, "peopleFitHint")}
                              </p>
                              {croppedPeople !== undefined &&
                                croppedPeople > 0.005 && (
                                  <p
                                    className="workflow-notice"
                                    role="status"
                                    data-testid="people-cropped"
                                  >
                                    {backgroundText(locale, "peopleCropped")}{" "}
                                    {Math.round(croppedPeople * 100)}%
                                  </p>
                                )}
                            </>
                          )}
                        </details>
                        <ShapeCropEditor
                          key={`${photoId ?? "sample"}-${shape}`}
                          shape={shape}
                          group={group}
                          edits={edits}
                          portrait={portrait}
                          aspect={aspect}
                          widthMm={widthMm}
                          heightMm={boardHeight}
                          resolution={resolution}
                          imageWidth={image.width}
                          imageHeight={image.height}
                          headOutline={headOutline}
                          onOutline={setHeadOutline}
                          t={t}
                          onCrop={applyCrop}
                          onFace={setPortrait}
                          onRestore={(e, s) => {
                            setEdits(e);
                            setPortrait(s);
                          }}
                        >
                          <canvas
                            ref={photo}
                            width={384}
                            height={384}
                            aria-label="Edited photo"
                          />
                          <button
                            className="floating"
                            aria-label={t("upload")}
                            onClick={() => upload.current?.click()}
                          >
                            <Upload size={17} />
                          </button>
                        </ShapeCropEditor>
                        {sample && (
                          <p className="fineprint">{t("sampleNotice")}</p>
                        )}
                        <section
                          className="notice"
                          data-testid="portrait-quality-setup"
                          aria-label={portraitChoiceText(locale, "title")}
                        >
                          <h3>{portraitChoiceText(locale, "title")}</h3>
                          <p className="fineprint">
                            {portraitChoiceText(locale, "localInput")}
                          </p>
                          <p>{portraitChoiceText(locale, "hint")}</p>
                          <button
                            disabled={busy || backgroundBusy}
                            onClick={() => {
                              const face =
                                activeBackground?.faces?.length === 1
                                  ? activeBackground.faces[0]
                                  : undefined;
                              if (face && !group) {
                                try {
                                  setPortrait(
                                    reviewedFacePortrait(
                                      face,
                                      portrait,
                                      edits,
                                      image.width,
                                      image.height,
                                      aspect,
                                      resolution,
                                      shape,
                                    ),
                                  );
                                  setLines(MAX_LINES);
                                } catch (e) {
                                  setError(String(e));
                                }
                              }
                              const panel =
                                document.querySelector<HTMLDetailsElement>(
                                  '[data-testid="advanced-photo"]',
                                );
                              if (panel) {
                                panel.open = true;
                                panel.scrollIntoView({ block: "start" });
                              }
                            }}
                          >
                            {portraitChoiceText(locale, "review")}
                          </button>
                          {portrait.regions?.placement !== "manual" && (
                            <p>{portraitChoiceText(locale, "pending")}</p>
                          )}
                          <button
                            data-testid="portrait-current-materials"
                            disabled={
                              busy ||
                              !portrait.enabled ||
                              portrait.regions?.placement !== "manual" ||
                              resolution > 192 ||
                              pinCount > 240 ||
                              Boolean(pinBasis) ||
                              mode === "color"
                            }
                            onClick={() => {
                              setPortraitSolver(
                                portrait.people ? "guarded" : "physical",
                              );
                              setLines(MAX_LINES);
                              setHeadPriority(false);
                              setError("");
                            }}
                          >
                            {portraitChoiceText(locale, "keep")}
                          </button>
                          <p>{portraitChoiceText(locale, "detailHint")}</p>
                          <button
                            data-testid="portrait-detail-profile"
                            disabled={
                              busy ||
                              !portrait.enabled ||
                              Boolean(portrait.people) ||
                              portrait.regions?.placement !== "manual" ||
                              aspect !== 1
                            }
                            onClick={() => {
                              changeComputationResolution(320);
                              setShape("circle");
                              setMode("dark");
                              setWidthMm(400);
                              setHeightMm(400);
                              setPinCount(240);
                              setThreadMm(0.1);
                              setPinBasis({
                                version: "circle-chords/1",
                                count: 240,
                                minimumAngularGapDegrees: 7.5,
                                experimental: true,
                              });
                              setPinLayout(undefined);
                              setPinCoordinates(undefined);
                              setPortraitSolver("basis");
                              setLines(MAX_LINES);
                              setHeadPriority(false);
                              setError("");
                            }}
                          >
                            {portraitChoiceText(locale, "detail")}
                          </button>
                          <label className="toggle">
                            <input
                              type="checkbox"
                              checked={generalImageConfirmed}
                              onChange={(e) =>
                                setGeneralImageConfirmed(e.target.checked)
                              }
                            />
                            {portraitChoiceText(locale, "general")}
                          </label>
                        </section>
                        <details className="edits" data-testid="advanced-photo">
                          <summary>{simple("advancedPhoto")}</summary>
                          <label className="toggle">
                            <input
                              type="checkbox"
                              checked={portrait.enabled}
                              onChange={(e) => {
                                setPortrait((v) => ({
                                  ...v,
                                  enabled: e.target.checked,
                                }));
                                if (e.target.checked) setLines(MAX_LINES);
                              }}
                            />
                            {t("portraitMode")}
                          </label>
                          <p className="fineprint">{t("portraitHint")}</p>
                          {!portrait.enabled && (
                            <p role="status" className="workflow-notice">
                              {t("portraitOffNotice")}
                            </p>
                          )}
                          <p
                            className="workflow-notice"
                            data-testid="actual-settings"
                          >
                            {t("actualSettings")}: {shape} · {widthMm} ×{" "}
                            {boardHeight} mm · {pinCount} {t("pinCount")} ·{" "}
                            {threadMm} mm ·{" "}
                            {portrait.enabled && portrait.people
                              ? portraitHelp(locale, "groupSolver")
                              : portrait.enabled && mode !== "color"
                                ? t(
                                    `${portraitSolver === "global" ? "global" : portraitSolver}Solver` as import("./i18n").Key,
                                  )
                                : t("continuousSolver")}
                          </p>
                          {portrait.enabled && mode !== "color" && (
                            <label className="check">
                              <input
                                type="checkbox"
                                aria-label={t("portraitDetail")}
                                checked={Boolean(portrait.detailStyle)}
                                disabled={busy}
                                onChange={(e) =>
                                  setPortrait((p) => {
                                    const { detailStyle: _old, ...rest } = p;
                                    return e.target.checked
                                      ? {
                                          ...rest,
                                          detailStyle: "contour-preparation/2",
                                        }
                                      : rest;
                                  })
                                }
                              />
                              <span>
                                {t("portraitDetail")}
                                <small className="fineprint">
                                  {t("portraitDetailHint")}
                                </small>
                              </span>
                            </label>
                          )}
                          {portrait.enabled &&
                            mode !== "color" &&
                            portrait.detailStyle && (
                              <label className="check">
                                <input
                                  type="checkbox"
                                  aria-label={t("preservePortraitTone")}
                                  checked={
                                    portrait.detailStyle ===
                                    "contour-preparation/2"
                                  }
                                  disabled={busy}
                                  onChange={(e) =>
                                    setPortrait((p) => ({
                                      ...p,
                                      detailStyle: e.target.checked
                                        ? "contour-preparation/2"
                                        : "contour-preparation/1",
                                    }))
                                  }
                                />
                                <span>{t("preservePortraitTone")}</span>
                              </label>
                            )}
                          {portrait.enabled && mode !== "color" && (
                            <label>
                              {t("portraitSolver")}
                              <select
                                aria-label={t("portraitSolver")}
                                value={portraitSolver}
                                onChange={(e) => {
                                  if (e.target.value === "basis") {
                                    setPinCount((v) => (v === 240 ? 240 : 320));
                                    setPinBasis(undefined);
                                    setPinLayout(undefined);
                                    setPinCoordinates(undefined);
                                  } else if (pinCount > 240) {
                                    setPinCount(240);
                                    setPinBasis(undefined);
                                    setPinLayout(undefined);
                                    setPinCoordinates(undefined);
                                  }
                                  if (
                                    e.target.value !== "basis" &&
                                    resolution === 320
                                  )
                                    changeComputationResolution(160);
                                  setPortraitSolver(
                                    e.target.value as
                                      | "continuous"
                                      | "global"
                                      | "guarded"
                                      | "multiscale"
                                      | "physical"
                                      | "anatomy"
                                      | "basis",
                                  );
                                }}
                              >
                                <option value="continuous">
                                  {t("continuousSolver")}
                                </option>
                                <option value="guarded">
                                  {portrait.people
                                    ? portraitHelp(locale, "groupSolver")
                                    : t("guardedSolver")}
                                </option>
                                <option
                                  value="anatomy"
                                  disabled={
                                    Boolean(portrait.people) ||
                                    portrait.regions?.placement !== "manual"
                                  }
                                >
                                  {t("anatomySolver")}
                                </option>
                                <option
                                  value="basis"
                                  disabled={
                                    Boolean(portrait.people) ||
                                    shape !== "circle"
                                  }
                                >
                                  {t("basisSolver")}
                                </option>
                                <option
                                  value="physical"
                                  disabled={Boolean(portrait.people)}
                                >
                                  {t("physicalSolver")}
                                </option>
                                <option
                                  value="multiscale"
                                  disabled={Boolean(portrait.people)}
                                >
                                  {t("multiscaleSolver")}
                                </option>
                                <option
                                  value="global"
                                  disabled={Boolean(portrait.people)}
                                >
                                  {t("globalSolver")}
                                </option>
                              </select>
                              <span className="fineprint">
                                {t("globalHint")} {t("guardHint")}
                                {portraitSolver === "basis" && (
                                  <> {t("basisHint")}</>
                                )}
                              </span>
                            </label>
                          )}
                          <label>
                            <span>{t("computationResolution")}</span>
                            <select
                              aria-label={t("computationResolution")}
                              value={resolution}
                              disabled={busy}
                              onChange={(e) =>
                                changeComputationResolution(
                                  Number(e.target.value),
                                )
                              }
                            >
                              {![160, 192, 320].includes(resolution) && (
                                <option value={resolution}>
                                  {resolution} × {resolution}
                                </option>
                              )}
                              <option value={160}>160 × 160</option>
                              <option value={192}>
                                192 × 192 · {t("experimental")}
                              </option>
                              <option
                                value={320}
                                disabled={portraitSolver !== "basis"}
                              >
                                320 × 320 · {t("experimental")}
                              </option>
                            </select>
                            <span className="fineprint">
                              {t("resolutionHint")} {t("resolvedHint")}
                            </span>
                          </label>
                          {portraitSolver === "basis" && resolution === 320 && (
                            <label className="fineprint">
                              <input
                                type="checkbox"
                                data-testid="head-priority"
                                checked={headPriority}
                                onChange={(e) =>
                                  setHeadPriority(e.target.checked)
                                }
                              />{" "}
                              {t("headPriority")}
                              <span>{t("headPriorityHint")}</span>
                            </label>
                          )}
                          <PeopleRegionEditor
                            canAddPeople={!pinBasis && pinCount <= 240}
                            locale={locale}
                            resolution={resolution}
                            portrait={portrait}
                            setPortrait={setPortrait}
                            image={
                              photoCandidates.find((p) => p.id === photoId)
                                ?.original ?? image
                            }
                            edits={edits}
                            aspect={aspect}
                            t={t}
                          >
                            <canvas
                              ref={targetCanvas}
                              width={resolution}
                              height={resolution}
                              aria-label={t("processedTarget")}
                            />
                          </PeopleRegionEditor>
                          {portrait.enabled && sampling && (
                            <PortraitSamplingPanel sampling={sampling} t={t} />
                          )}
                          <p className="fineprint">
                            {t("processedTarget")} · {resolution} × {resolution}{" "}
                            · {t("originalCrop")}
                          </p>
                          <div hidden={!portrait.enabled}>
                            <BackgroundEditor
                              image={image}
                              edits={edits}
                              aspect={aspect}
                              portrait={portrait}
                              setPortrait={setPortrait}
                              t={t}
                            />
                          </div>
                          {portrait.enabled && (
                            <>
                              <details
                                className="edits"
                                hidden={Boolean(portrait.people)}
                              >
                                <summary>{t("faceRegion")}</summary>
                                <p className="fineprint">{t("regionHint")}</p>
                                {(
                                  ["left", "top", "width", "height"] as const
                                ).map((key) => (
                                  <label className="range-label" key={key}>
                                    <span>{t(key)}</span>
                                    <input
                                      aria-label={`${t("faceRegion")} ${t(key)}`}
                                      type="range"
                                      min={
                                        key === "width" || key === "height"
                                          ? 0.1
                                          : 0
                                      }
                                      max={
                                        key === "left"
                                          ? 1 - portrait.face.width
                                          : key === "top"
                                            ? 1 - portrait.face.height
                                            : key === "width"
                                              ? 1 - portrait.face.left
                                              : 1 - portrait.face.top
                                      }
                                      step=".01"
                                      value={portrait.face[key]}
                                      onChange={(e) =>
                                        setPortrait((v) => ({
                                          ...v,
                                          face: {
                                            ...v.face,
                                            [key]: +e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                    <output>
                                      {Math.round(portrait.face[key] * 100)}%
                                    </output>
                                  </label>
                                ))}
                                {(["background", "localContrast"] as const).map(
                                  (key) => (
                                    <label className="range-label" key={key}>
                                      <span>{t(key)}</span>
                                      <input
                                        aria-label={t(key)}
                                        type="range"
                                        min="0"
                                        max="1"
                                        step=".05"
                                        value={portrait[key]}
                                        onChange={(e) =>
                                          setPortrait((v) => ({
                                            ...v,
                                            [key]: +e.target.value,
                                          }))
                                        }
                                      />
                                      <output>{portrait[key]}</output>
                                    </label>
                                  ),
                                )}
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    setPortrait({
                                      ...structuredClone(DEFAULT_PORTRAIT),
                                      enabled: true,
                                    })
                                  }
                                >
                                  {t("resetPortrait")}
                                </button>
                              </details>
                            </>
                          )}
                          <div
                            className="photo-candidates"
                            aria-label={t("photoCandidates")}
                          >
                            {photoCandidates.map((p) => (
                              <button
                                key={p.id}
                                className={
                                  p.id === photoId ? "chip selected" : "chip"
                                }
                                onClick={() => switchPhoto(p)}
                                title={p.name}
                              >
                                {p.name}
                              </button>
                            ))}
                            <button
                              className="text-button"
                              onClick={() => upload.current?.click()}
                            >
                              {t("addPhoto")}
                            </button>
                          </div>
                          <p className="fineprint">{t("candidatePrivacy")}</p>
                          <details className="edits">
                            <summary>
                              {t("zoom")} · {t("contrast")}
                            </summary>
                            {ranges.map((r) => (
                              <label key={r.key} className="range-label">
                                <span>{t(r.key)}</span>
                                <input
                                  aria-label={t(r.key)}
                                  type="range"
                                  {...{ min: r.min, max: r.max, step: r.step }}
                                  value={edits[r.key]}
                                  onChange={(e) => {
                                    applyCrop({
                                      ...edits,
                                      [r.key]: +e.target.value,
                                    });
                                  }}
                                />
                                <output>{edits[r.key]}</output>
                              </label>
                            ))}
                            <button
                              className="text-button"
                              onClick={() => {
                                applyCrop(DEFAULT_EDITS);
                              }}
                            >
                              <RotateCcw size={14} />
                              {t("reset")}
                            </button>
                          </details>
                        </details>
                      </>
                    )}
                    <div className="photo-note">
                      <ShieldCheck size={16} />
                      <span>
                        {image && analysis
                          ? t(
                              analysis.contrast < 30
                                ? "lowContrast"
                                : analysis.edgeVariation < 3
                                  ? "blur"
                                  : analysis.shadowFraction > 0.4
                                    ? "shadow"
                                    : "goodPhoto",
                            )
                          : t("private")}
                      </span>
                    </div>
                  </section>
                  {image && (
                    <section className="card settings-card">
                      <p className="fineprint" data-testid="material-summary">
                        {t("materialSettings")}: {widthMm} × {boardHeight} mm ·{" "}
                        {pinCount} {t("pinCount")} · {threadMm} mm
                      </p>
                      <details
                        className="edits"
                        data-testid="advanced-generation"
                      >
                        <summary>{simple("advancedGeneration")}</summary>
                        <div className="section-label">
                          {t("step2")}
                          <Layers size={17} />
                        </div>
                        <details className="edits">
                          <summary>{t("settingsPresets")}</summary>
                          <label className="field-label" htmlFor="maker-preset">
                            {t("settingsPresets")}
                          </label>
                          <select
                            id="maker-preset"
                            value={selectedPreset}
                            onChange={(e) => {
                              setSelectedPreset(e.target.value);
                              const p = makerPresets.find(
                                (p) => p.id === e.target.value,
                              );
                              if (p) applySettings(p.settings);
                            }}
                          >
                            <option value="">{t("choosePreset")}</option>
                            {makerPresets.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <label className="field-label" htmlFor="preset-name">
                            {t("presetName")}
                          </label>
                          <input
                            id="preset-name"
                            maxLength={60}
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                          />
                          <div className="preset-row">
                            <button
                              className="outline"
                              disabled={!presetName.trim()}
                              onClick={() => void savePreset()}
                            >
                              {t("savePreset")}
                            </button>
                            <button
                              className="text-button"
                              disabled={!selectedPreset}
                              onClick={() =>
                                void changePreset(null, selectedPreset)
                                  .then((p) => {
                                    setMakerPresets(p);
                                    setSelectedPreset("");
                                  })
                                  .catch((e) => setError(String(e)))
                              }
                            >
                              {t("deletePreset")}
                            </button>
                          </div>
                          <p className="fineprint">{t("presetPrivacy")}</p>
                        </details>
                        {pinLayout && (
                          <div className="notice" data-testid="layout-settings">
                            <p>
                              {t("layoutNotice")}{" "}
                              {pinLayout.phaseDegreesClockwise}° ·{" "}
                              {pinLayout.version}
                            </p>
                            <button
                              className="outline"
                              onClick={() => {
                                setPinLayout(undefined);
                                setPinCoordinates(undefined);
                              }}
                            >
                              {t("defaultLayout")}
                            </button>
                          </div>
                        )}
                        <label className="field-label">{t("shape")}</label>
                        <div className="shape-buttons">
                          {(
                            [
                              { id: "circle", icon: Circle },
                              { id: "rectangle", icon: Square },
                              { id: "heart", icon: Heart },
                            ] as const
                          ).map(({ id, icon: Icon }) => (
                            <button
                              key={id}
                              className={
                                shape === id ? "shape selected" : "shape"
                              }
                              onClick={() => {
                                setShape(id);
                                if (
                                  id !== "circle" &&
                                  portraitSolver === "basis"
                                ) {
                                  setPortraitSolver("guarded");
                                  setPinCount(240);
                                  setPinBasis(undefined);
                                  setPinLayout(undefined);
                                  setPinCoordinates(undefined);
                                }
                              }}
                            >
                              <Icon size={23} />
                              {t(id)}
                            </button>
                          ))}
                        </div>
                        <label className="field-label" htmlFor="mode">
                          {t("mode")}
                        </label>
                        <select
                          id="mode"
                          value={mode}
                          onChange={(e) =>
                            setMode(e.target.value as typeof mode)
                          }
                        >
                          <option value="dark">{t("dark")}</option>
                          <option value="light">{t("light")}</option>
                          <option value="color">{t("color")}</option>
                        </select>
                        <label className="field-label">
                          {t("density")} <strong>{lines}</strong>
                        </label>
                        <input
                          aria-label={t("density")}
                          type="range"
                          min="200"
                          max={MAX_LINES}
                          step="100"
                          value={lines}
                          onChange={(e) => setLines(+e.target.value)}
                        />
                        <p className="fineprint">{t("computationHint")}</p>
                        <div className="preset-row">
                          {(["lighter", "balanced", "detailed"] as const).map(
                            (v, j) => (
                              <button
                                key={v}
                                className={
                                  preset === v ? "chip selected" : "chip"
                                }
                                onClick={() => {
                                  setPreset(v);
                                  setLines([700, 1400, 2500][j]);
                                }}
                              >
                                {t(v)}
                              </button>
                            ),
                          )}
                        </div>
                      </details>
                      <details className="edits">
                        <summary>{t("materialSettings")}</summary>
                        {[
                          {
                            key: "widthMm" as const,
                            value: widthMm,
                            set: setWidthMm,
                            min: 50,
                            max: 2000,
                            step: 10,
                          },
                          {
                            key: "heightMm" as const,
                            value: boardHeight,
                            set: setHeightMm,
                            min: 50,
                            max: 2000,
                            step: 10,
                          },
                          {
                            key: "pinCount" as const,
                            value: pinCount,
                            set: (value: number) => {
                              setPinCount(value);
                              if (portraitSolver === "basis") {
                                setPinBasis(undefined);
                                setPinLayout(undefined);
                                setPinCoordinates(undefined);
                              }
                            },
                            min: portraitSolver === "basis" ? 240 : 24,
                            max: portraitSolver === "basis" ? 320 : 240,
                            step: portraitSolver === "basis" ? 80 : 1,
                          },
                          {
                            key: "threadMm" as const,
                            value: threadMm,
                            set: setThreadMm,
                            min: 0.05,
                            max: 2,
                            step: 0.05,
                          },
                          {
                            key: "stockMeters" as const,
                            value: stockMeters,
                            set: setStockMeters,
                            min: 0,
                            max: 100000,
                            step: 1,
                          },
                        ].map((r) => (
                          <label className="range-label" key={r.key}>
                            <span>{t(r.key)}</span>
                            <input
                              aria-label={t(r.key)}
                              type="number"
                              value={r.value}
                              min={r.min}
                              max={r.max}
                              step={r.step}
                              disabled={
                                r.key === "heightMm" && shape === "circle"
                              }
                              onChange={(e) =>
                                r.set(
                                  Math.max(
                                    r.min,
                                    Math.min(r.max, +e.target.value),
                                  ),
                                )
                              }
                            />
                            {r.key === "threadMm" && (
                              <small className="fineprint">
                                {t("threadDetailHint")}
                              </small>
                            )}
                          </label>
                        ))}
                      </details>
                      <p className="provisional">
                        <span /> {t("provisional")}
                      </p>
                      <button
                        className="primary full"
                        disabled={!image || busy || backgroundBusy}
                        onClick={() => generate()}
                      >
                        {busy
                          ? `${t("generating")} ${Math.round(fraction * 100)}%`
                          : t("generate")}
                        <ArrowRight size={18} />
                      </button>
                      {busy && (
                        <>
                          <progress max="1" value={fraction} />
                          <button
                            className="text-button"
                            onClick={cancelGeneration}
                          >
                            {t("cancel")}
                          </button>
                        </>
                      )}
                    </section>
                  )}
                </div>
                {(result || busy) && (
                  <section className="card result-card">
                    {result &&
                      currentTargetHash &&
                      (result!.imageHash !== currentTargetHash ||
                        !currentSettingsMatch(result!)) && (
                        <p
                          role="status"
                          data-testid="preserved-result-notice"
                          className="workflow-notice"
                        >
                          {portraitChoiceText(locale, "stale")}
                        </p>
                      )}
                    <div className="section-label">
                      {t("step3")}
                      <span className="live-dot" />
                    </div>
                    <div className="result-stage">
                      {result ? (
                        <Preview instruction={result} />
                      ) : (
                        <div className="empty-art">
                          <div className="thread-ring">
                            <span />
                            <span />
                            <span />
                            <span />
                          </div>
                          <p>{t("emptyResult")}</p>
                        </div>
                      )}
                    </div>
                    {result ? (
                      <>
                        <div className="stats">
                          <div>
                            <strong>
                              {result.metrics.lines.toLocaleString(locale)}
                            </strong>
                            <span>{t("lines")}</span>
                          </div>
                          <div>
                            <strong>
                              {Math.ceil(result.metrics.estimatedMeters)}
                            </strong>
                            <span>{t("meters")}</span>
                          </div>
                          <div>
                            <strong>
                              {Math.ceil(
                                assemblyEffort(result, pace).estimatedMinutes,
                              )}
                            </strong>
                            <span>{t("minutes")}</span>
                          </div>
                        </div>
                        <div className="variant-tabs">
                          {variants.map((v, j) => (
                            <button
                              key={v.instruction.id}
                              className={
                                variantState.selectedId === v.instruction.id
                                  ? "chip selected"
                                  : "chip"
                              }
                              onClick={() =>
                                setVariantState((s) => ({
                                  ...s,
                                  selectedId: v.instruction.id,
                                }))
                              }
                            >
                              {simple("variant")} {j + 1}
                            </button>
                          ))}
                        </div>
                        <details
                          className="edits"
                          data-testid="variant-audit"
                          data-sequence-hash={result.sequenceHash}
                        >
                          <summary>{t("variantDetails")}</summary>
                          <code className="hash">
                            SHA-256 {result.sequenceHash.slice(0, 20)}…
                          </code>
                          <p
                            className="fineprint"
                            data-testid="assembly-effort"
                          >
                            {t("assemblyEstimateHint")} {pace} s ·{" "}
                            {assemblyEffort(result).actions}{" "}
                            {t("assemblyActions")} ·{" "}
                            {assemblyEffort(result).starts}{" "}
                            {t("assemblyStarts")} ·{" "}
                            {assemblyEffort(result).knots} {t("assemblyKnots")}{" "}
                            · {assemblyEffort(result).colorChanges}{" "}
                            {t("assemblyColors")}
                          </p>
                          <p className="fineprint">
                            {t("quality")}:{" "}
                            {result.metrics.baselineMse.toFixed(3)} →{" "}
                            {result.metrics.reconstructionMse.toFixed(3)}.{" "}
                            {t("qualityHint")}
                          </p>
                          <p>
                            {t("requestedConnections")}:{" "}
                            {result.params.requestedLines.toLocaleString(
                              locale,
                            )}{" "}
                            · {result.metrics.lines.toLocaleString(locale)}{" "}
                            {t("lines")}
                          </p>
                          <p>
                            {result.algorithm} · {result.profile.pins.length}{" "}
                            pins · {result.profile.threadMm} mm ·{" "}
                            {result.profile.widthMm} × {result.profile.heightMm}{" "}
                            mm
                          </p>
                          <p className="fineprint">{t("plateauHint")}</p>
                          <p
                            className="fineprint"
                            style={{ overflowWrap: "anywhere" }}
                          >
                            Target: {result.imageHash}
                            <br />
                            Sequence: {result.sequenceHash}
                          </p>
                        </details>
                        <Supply instruction={result} locale={locale} />
                        {result.params.resolution === 320 &&
                          [
                            "density-resolved/12",
                            "density-feature/16",
                          ].includes(result.algorithm) &&
                          !result.params.optimization?.head &&
                          !result.params.portrait?.people &&
                          result.params.portrait?.regions?.placement ===
                            "manual" && (
                            <>
                              <button
                                className="outline full"
                                disabled={busy}
                                data-testid="fine-feature-experiment"
                                onClick={() => generate(result, "features")}
                              >
                                {portraitChoiceText(locale, "fineFeature")}
                              </button>
                              <p className="fineprint">
                                {portraitChoiceText(locale, "fineFeatureHint")}
                              </p>
                            </>
                          )}
                        {image &&
                          [
                            "continuous-guarded/6",
                            "density-multiscale/7",
                            "density-physical/8",
                            "density-anatomy/10",
                            "density-pin-basis/11",
                            "density-resolved/12",
                            "density-head/13",
                            "hair-cycles/14",
                          ].includes(result.algorithm) && (
                            <button
                              className="outline full"
                              disabled={busy}
                              onClick={() => generate(result, "simplify")}
                            >
                              {t("simplificationSolver")}
                            </button>
                          )}
                        {image &&
                          ["density-physical/8", "density-anatomy/10"].includes(
                            result.algorithm,
                          ) &&
                          result.params.portrait?.regions?.placement ===
                            "manual" && (
                            <>
                              <button
                                className="outline full"
                                disabled={busy}
                                onClick={() => generate(result, "anatomy")}
                              >
                                {t("anatomySolver")}
                              </button>
                              <p className="fineprint">{t("anatomyHint")}</p>
                            </>
                          )}
                        {result.params.simplification && (
                          <p className="fineprint">
                            {t("simplificationCaution")} ·{" "}
                            {result.params.simplification.connectionsSaved}{" "}
                            {t("connectionsSaved")}
                          </p>
                        )}
                        {image &&
                          result.algorithm !== "assembly-prune/9" &&
                          result.params.portrait?.enabled &&
                          result.params.mode !== "color" &&
                          (![
                            "density-optical/5",
                            "density-multiscale/7",
                            "density-physical/8",
                            "density-anatomy/10",
                            "density-pin-basis/11",
                            "density-resolved/12",
                            "density-head/13",
                            "hair-cycles/14",
                          ].includes(result.algorithm) ||
                            result.metrics.stoppedReason ===
                              "compute-limit") && (
                            <button
                              className="outline full"
                              disabled={busy}
                              onClick={() =>
                                generate(result, continuationStrategy(result))
                              }
                            >
                              {t(
                                [
                                  "density-optical/5",
                                  "density-multiscale/7",
                                  "density-physical/8",
                                  "density-anatomy/10",
                                  "density-pin-basis/11",
                                  "density-resolved/12",
                                  "density-head/13",
                                  "hair-cycles/14",
                                ].includes(result.algorithm)
                                  ? "continueGlobal"
                                  : "rerouteGlobal",
                              )}
                            </button>
                          )}
                        {result.metrics.densityFit && (
                          <p className="fineprint">
                            {t("globalResult")} ·{" "}
                            {result.metrics.densityFit.routingConnections}{" "}
                            {t("routingConnections")} ·{" "}
                            {result.metrics.densityFit.removedConnections ?? 0}{" "}
                            {t("removedConnections")}. {t("refinementNotice")}
                          </p>
                        )}
                        {result.metrics.refinement?.reason ===
                          "compute-limit" &&
                          image && (
                            <button
                              className="outline full"
                              disabled={busy}
                              onClick={() => generate(result)}
                            >
                              {t("continueRefinement")}
                            </button>
                          )}
                        {result.metrics.refinement && (
                          <p className="fineprint">{t("refinementNotice")}</p>
                        )}
                        {result.metrics.regions && (
                          <details className="edits">
                            <summary>{t("regionMetrics")}</summary>
                            <p className="fineprint">{t("regionHint")}</p>
                            <table>
                              <thead>
                                <tr>
                                  <th>{t("faceRegion")}</th>
                                  <th>MSE</th>
                                  <th>{t("edgeError")}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(
                                  result.metrics.regions.final,
                                ).map(([key, m]) => (
                                  <tr key={key}>
                                    <th>
                                      {key.startsWith("person") &&
                                        `${portraitHelp(locale, "person")} ${key.split(".")[0].slice(6)} · `}
                                      {t(
                                        key.split(".").at(-1) as
                                          | "face"
                                          | "eyes"
                                          | "nose"
                                          | "mouth"
                                          | "outline",
                                      )}
                                    </th>
                                    <td>{m.mse.toFixed(4)}</td>
                                    <td>{m.edgeMse.toFixed(4)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </details>
                        )}
                        <details className="edits">
                          <summary>{t("projectName")}</summary>
                          <label className="field-label" htmlFor="project-name">
                            {t("projectName")}
                          </label>
                          <input
                            id="project-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t("defaultName")}
                            maxLength={100}
                          />
                        </details>
                        <button
                          className="primary full"
                          onClick={() => void save()}
                        >
                          {t("save")}
                          <ArrowRight size={18} />
                        </button>
                      </>
                    ) : (
                      <div className="result-footer">
                        <Leaf size={18} />
                        <p>{t("photoTips")}</p>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </>
          )}
          {view === "assemble" &&
            (!instruction || !project ? (
              <div className="empty-page">
                <Layers size={36} />
                <h1>{t("assemble")}</h1>
                <p>{t("noProject")}</p>
                <button className="primary" onClick={() => nav("create")}>
                  {t("create")}
                </button>
              </div>
            ) : (
              <>
                <section className="intro">
                  <div className="truncate">
                    <div className="eyebrow">{t("assemble")}</div>
                    <h1>{project.name}</h1>
                    <p>
                      {t("local")} · {t("lastSaved")}{" "}
                      {new Date(project.progress.updatedAt).toLocaleTimeString(
                        locale,
                      )}
                    </p>
                  </div>
                  <button
                    className="outline"
                    disabled={pdfBusy}
                    onClick={() => void pdf()}
                  >
                    <Download size={16} />
                    {pdfBusy ? "…" : t("exportPdf")}
                  </button>
                </section>
                <div className="craft-grid">
                  <section className="card craft-preview">
                    <Supply instruction={instruction} locale={locale} />
                    <div
                      className="craft-canvas"
                      style={{
                        aspectRatio:
                          instruction.profile.widthMm /
                          instruction.profile.heightMm,
                      }}
                      onPointerDown={(e) => {
                        drag.current = {
                          x: e.clientX - pan.x,
                          y: e.clientY - pan.y,
                        };
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (drag.current)
                          setPan({
                            x: e.clientX - drag.current.x,
                            y: e.clientY - drag.current.y,
                          });
                      }}
                      onPointerUp={() => (drag.current = null)}
                    >
                      <div
                        style={{
                          transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                        }}
                      >
                        <Preview
                          instruction={instruction}
                          step={current}
                          completed={project.progress.confirmed}
                          pins={pins}
                        />
                      </div>
                    </div>
                    <div className="preview-tools">
                      <label>
                        {t("zoom")}
                        <input
                          aria-label={t("zoom")}
                          type="range"
                          min="1"
                          max="3"
                          step=".1"
                          value={zoom}
                          onChange={(e) => setZoom(+e.target.value)}
                        />
                      </label>
                      <button
                        className="text-button"
                        onClick={() => {
                          setZoom(1);
                          setPan({ x: 0, y: 0 });
                        }}
                      >
                        <RotateCcw size={15} />
                      </button>
                      <label className="check-label">
                        <input
                          type="checkbox"
                          checked={pins}
                          onChange={(e) => setPins(e.target.checked)}
                        />
                        {t("pinLabels")}
                      </label>
                    </div>
                    <p className="fineprint">{t("provisional")}</p>
                    {instruction.profile.pinLayout && (
                      <p data-testid="board-layout">
                        {t("layoutNotice")}{" "}
                        {instruction.profile.pinLayout.phaseDegreesClockwise}° ·{" "}
                        {instruction.profile.pinLayout.version}
                      </p>
                    )}
                    <code className="hash" data-testid="player-hash">
                      {instruction.sequenceHash}
                    </code>
                  </section>
                  <section className="card craft-controls">
                    <div className="section-label">
                      {t("announced")}{" "}
                      <span>
                        {current}/{steps.length}
                      </span>
                    </div>
                    <div className="pin-route">
                      <span>
                        <small>{t("from")}</small>
                        {active?.from}
                      </span>
                      <ArrowRight size={27} />
                      <span>
                        <small>{t("to")}</small>
                        {active?.to}
                      </span>
                    </div>
                    <div className="thread-color">
                      <i style={{ background: active?.color }} />
                      {active?.color}
                    </div>
                    {active?.segmentStart && (
                      <p className="instruction-note">
                        {t(active.segment === 0 ? "startKnot" : "colorChange")}
                      </p>
                    )}
                    <div className="player-buttons">
                      <button
                        className="outline"
                        disabled={current <= 1}
                        onClick={() => jump(current - 1)}
                      >
                        {t("previous")}
                      </button>
                      <button
                        className="primary icon-only"
                        aria-label={playing ? t("pause") : t("play")}
                        onClick={() => {
                          if (playing) pause();
                          else {
                            setPlaying(true);
                            speak();
                          }
                        }}
                      >
                        {playing ? <Pause /> : <Play />}
                      </button>
                      <button
                        className="outline"
                        disabled={current >= steps.length}
                        onClick={() => jump(current + 1)}
                      >
                        {t("next")}
                      </button>
                    </div>
                    <button
                      className="primary full"
                      disabled={!loaded}
                      onClick={confirmCurrent}
                    >
                      <Check size={18} />
                      {t("confirm")}
                    </button>
                    <div className="confirmed">
                      <span>{t("confirmed")}</span>
                      <strong data-testid="confirmed-step">
                        {project.progress.confirmed}/{steps.length}
                      </strong>
                      <progress
                        max={steps.length}
                        value={project.progress.confirmed}
                      />
                    </div>
                    <button
                      className="text-button"
                      disabled={confirmedUndo === null}
                      onClick={() => {
                        if (confirmedUndo !== null) {
                          setProjects((ps) =>
                            ps.map((p) =>
                              p.id === project.id
                                ? {
                                    ...p,
                                    progress: confirm(
                                      p.progress,
                                      confirmedUndo,
                                      p.instruction,
                                    ),
                                  }
                                : p,
                            ),
                          );
                          setConfirmedUndo(null);
                        }
                      }}
                    >
                      {t("undo")}
                    </button>
                    <p className="fineprint">
                      {Math.ceil(
                        assemblyEffort(instruction, pace).estimatedMinutes -
                          (project.progress.confirmed * pace) / 60,
                      )}{" "}
                      {t("minutes")} {t("remaining")}
                    </p>
                    <p className="fineprint">
                      {t("assemblyEstimateHint")} {pace} s.{" "}
                      {t("remainingKnotsHint")}
                    </p>
                    <label className="field-label" htmlFor="jump">
                      {t("jump")}
                    </label>
                    <input
                      id="jump"
                      type="number"
                      min="1"
                      max={steps.length}
                      value={current}
                      onChange={(e) => jump(+e.target.value)}
                    />
                    <label className="field-label" htmlFor="pace">
                      {t("pace")}
                    </label>
                    <input
                      id="pace"
                      type="number"
                      min="2"
                      max="120"
                      value={pace}
                      onChange={(e) =>
                        setPace(Math.max(2, Math.min(120, +e.target.value)))
                      }
                    />
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={voiceEnabled}
                        disabled={!chosenVoice}
                        onChange={(e) => setVoiceEnabled(e.target.checked)}
                      />
                      {t("voice")}
                    </label>
                    <label>
                      {businessText(locale, "guideLanguage")}
                      <select
                        aria-label={businessText(locale, "guideLanguage")}
                        value={guideLocale}
                        onChange={(e) =>
                          setGuideLocale(e.target.value as "uz" | "ru" | "en")
                        }
                      >
                        <option value="uz">O‘zbekcha</option>
                        <option value="ru">Русский</option>
                        <option value="en">English</option>
                      </select>
                    </label>
                    {!chosenVoice ? (
                      <p className="fineprint">{t("noVoice")}</p>
                    ) : (
                      <>
                        <select
                          aria-label={t("voice")}
                          value={voiceIndex}
                          onChange={(e) => setVoiceIndex(+e.target.value)}
                        >
                          {matchingVoices.map((v, j) => (
                            <option key={`${v.name}-${j}`} value={j}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                        </select>
                        <label className="range-label">
                          <span>{t("speechSpeed")}</span>
                          <input
                            type="range"
                            min=".5"
                            max="1.5"
                            step=".1"
                            value={speechRate}
                            onChange={(e) => setSpeechRate(+e.target.value)}
                          />
                        </label>
                        <button className="text-button" onClick={speak}>
                          {t("repeat")}
                        </button>
                      </>
                    )}
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={sound}
                        onChange={(e) => setSound(e.target.checked)}
                      />
                      {t("sound")}
                    </label>
                    {sound && (
                      <label className="range-label">
                        <span>{t("volume")}</span>
                        <input
                          type="range"
                          min="0"
                          max=".2"
                          step=".01"
                          value={volume}
                          onChange={(e) => setVolume(+e.target.value)}
                        />
                      </label>
                    )}
                  </section>
                </div>
                <AssemblyNavigator
                  project={project}
                  current={current}
                  locale={locale}
                  disabled={!loaded}
                  onJump={jump}
                  onChange={(bookmarks) =>
                    setProjects((ps) =>
                      ps.map((p) =>
                        p.id === project.id ? { ...p, bookmarks } : p,
                      ),
                    )
                  }
                />
                <div className="card recovery">
                  <h2>{t("pinSearch")}</h2>
                  <input
                    aria-label={t("pinSearch")}
                    type="number"
                    min="0"
                    max={instruction.profile.pins.length - 1}
                    value={pinQuery}
                    onChange={(e) => setPinQuery(e.target.value)}
                  />
                  <p>{t("occurrences")}</p>
                  <div className="occurrences">
                    {pinQuery !== "" &&
                      steps
                        .filter(
                          (s) => s.from === +pinQuery || s.to === +pinQuery,
                        )
                        .map((s) => (
                          <button
                            className="chip"
                            key={s.index}
                            onClick={() => jump(s.index)}
                          >
                            {s.index}: {s.from} → {s.to}
                          </button>
                        ))}
                  </div>
                  <details>
                    <summary>{t("repair")}</summary>
                    <p>{t("startKnot")}</p>
                    <p>{t("finish")}</p>
                  </details>
                </div>
                <div className="card exports">
                  <div>
                    <label>
                      {t("paper")}
                      <select
                        value={paper}
                        onChange={(e) =>
                          setPaper(e.target.value as typeof paper)
                        }
                      >
                        <option>A4</option>
                        <option>Letter</option>
                      </select>
                    </label>
                    <label>
                      {t("textSize")}
                      <input
                        type="number"
                        min="9"
                        max="14"
                        value={textSize}
                        onChange={(e) => setTextSize(+e.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    className="outline"
                    disabled={pdfBusy}
                    onClick={() => void pdf()}
                  >
                    {t("exportPdf")}
                  </button>
                  <button
                    className="outline"
                    onClick={() =>
                      void download(
                        "ip-rasm.json",
                        JSON.stringify(projectFile(project), null, 2),
                      ).catch((e) => setError(String(e)))
                    }
                  >
                    {t("exportJson")}
                  </button>
                  <button
                    className="outline"
                    onClick={() =>
                      void download(
                        "ip-rasm.txt",
                        toTxt(instruction),
                        "text/plain",
                      ).catch((e) => setError(String(e)))
                    }
                  >
                    {t("exportTxt")}
                  </button>
                  <button
                    className="outline"
                    onClick={() => {
                      const c = document.createElement("canvas");
                      c.width = 1024;
                      c.height = Math.round(
                        (1024 * instruction.profile.heightMm) /
                          instruction.profile.widthMm,
                      );
                      renderInstruction(c.getContext("2d")!, instruction);
                      c.toBlob((b) => {
                        if (b)
                          void download("ip-rasm.png", b).catch((e) =>
                            setError(String(e)),
                          );
                      });
                    }}
                  >
                    {t("exportPreview")}
                  </button>
                </div>
                {project.progress.confirmed === steps.length && (
                  <div className="alert success">{t("finish")}</div>
                )}
              </>
            ))}
          {view === "library" && (
            <>
              <section className="intro">
                <div>
                  <div className="eyebrow">{t("local")}</div>
                  <h1>{t("library")}</h1>
                  <p>{t("deleteNotice")}</p>
                </div>
                <button
                  className="outline"
                  onClick={() => importInput.current?.click()}
                >
                  <Upload size={17} />
                  {t("import")}
                </button>
              </section>
              <section className="card library-filters">
                <label>
                  {guideText(locale, "search")}
                  <input
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                  />
                </label>
                <label>
                  {guideText(locale, "folder")}
                  <select
                    value={libraryFolder}
                    onChange={(e) => setLibraryFolder(e.target.value)}
                  >
                    <option value="*">{guideText(locale, "all")}</option>
                    {Array.from(new Set(projects.map((p) => p.folder ?? "")))
                      .sort()
                      .map((folder) => (
                        <option key={folder} value={folder}>
                          {folder || "—"}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={includeArchive}
                    onChange={(e) => setIncludeArchive(e.target.checked)}
                  />
                  {guideText(locale, "archive")}
                </label>
              </section>
              {!projects.length ? (
                <div className="empty-page">
                  <FolderOpen size={40} />
                  <p>{t("emptyLibrary")}</p>
                  <button className="primary" onClick={() => nav("create")}>
                    {t("create")}
                  </button>
                </div>
              ) : (
                <div className="project-grid">
                  {projects
                    .filter(
                      (p) =>
                        (includeArchive || !p.deletedAt) &&
                        (libraryFolder === "*" ||
                          (p.folder ?? "") === libraryFolder) &&
                        (p.name
                          .toLowerCase()
                          .includes(libraryQuery.toLowerCase()) ||
                          p.instruction.sequenceHash.includes(
                            libraryQuery.toLowerCase(),
                          )),
                    )
                    .map((p) => (
                      <article
                        className={`card project-card ${p.deletedAt ? "archived" : ""}`}
                        key={p.id}
                      >
                        <Preview instruction={p.instruction} />
                        <h2>{p.name}</h2>
                        <label>
                          {guideText(locale, "rename")}
                          <input
                            key={`${p.id}-name`}
                            defaultValue={p.name}
                            maxLength={100}
                            disabled={!loaded}
                            onBlur={(e) => {
                              const name = e.target.value.trim();
                              if (name && name !== p.name)
                                setProjects((ps) =>
                                  ps.map((item) =>
                                    item.id === p.id ? { ...item, name } : item,
                                  ),
                                );
                              else e.target.value = p.name;
                            }}
                          />
                        </label>
                        <label>
                          {guideText(locale, "folder")}
                          <input
                            defaultValue={p.folder ?? ""}
                            maxLength={50}
                            disabled={!loaded}
                            onBlur={(e) => {
                              const folder = e.target.value.trim();
                              if (folder !== (p.folder ?? ""))
                                setProjects((ps) =>
                                  ps.map((item) =>
                                    item.id === p.id
                                      ? { ...item, folder }
                                      : item,
                                  ),
                                );
                            }}
                          />
                        </label>
                        <p>
                          {p.progress.confirmed}/{p.instruction.metrics.lines} ·{" "}
                          {p.deletedAt ? t("archived") : t("confirmed")}
                        </p>
                        <div>
                          {!p.deletedAt && (
                            <button
                              className="outline"
                              disabled={busy}
                              data-testid="continue-saved-calculation"
                              onClick={() => {
                                setView("create");
                                void generate(
                                  p.instruction,
                                  continuationStrategy(p.instruction),
                                );
                              }}
                            >
                              {portraitChoiceText(locale, "continueSaved")}
                            </button>
                          )}
                          {!p.deletedAt &&
                            p.instruction.algorithm === "density-resolved/12" &&
                            p.instruction.metrics.densityFit?.sweeps === 8 &&
                            !p.instruction.params.optimization?.convergence &&
                            !p.instruction.params.optimization?.head && (
                              <>
                                <button
                                  className="outline"
                                  disabled={busy}
                                  data-testid="extend-saved-portrait"
                                  onClick={() => void extendSavedPortrait(p)}
                                >
                                  {portraitChoiceText(locale, "extendedSearch")}
                                </button>
                                <p className="fineprint">
                                  {portraitChoiceText(locale, "extendedHint")}
                                </p>
                              </>
                            )}
                          <button
                            className="text-button"
                            data-testid="delete-local-calculation"
                            onClick={() => {
                              void deleteGenerationInput(
                                p.instruction.sequenceHash,
                              ).catch((e) => setError(String(e)));
                            }}
                          >
                            {portraitChoiceText(locale, "deleteInput")}
                          </button>
                          {!p.deletedAt && (
                            <button className="primary" onClick={() => open(p)}>
                              {t("open")}
                              <ArrowRight size={16} />
                            </button>
                          )}
                          {!p.deletedAt && (
                            <button
                              className="outline"
                              onClick={() => {
                                const profile = p.instruction.profile;
                                applySettings({
                                  resolution: p.instruction.params.resolution,
                                  shape: profile.shape,
                                  mode: p.instruction.params.mode,
                                  lines: p.instruction.params.requestedLines,
                                  widthMm: profile.widthMm,
                                  heightMm: profile.heightMm,
                                  pinCount: profile.pins.length,
                                  threadMm: profile.threadMm,
                                  stockMeters: profile.stockMeters,
                                  pinLayout: profile.pinLayout,
                                  pinCoordinates: profile.pinLayout
                                    ? profile.pins
                                    : undefined,
                                  edits: p.edits,
                                  portrait: p.instruction.params.portrait,
                                  anatomy:
                                    p.instruction.params.optimization?.anatomy,
                                  pinBasis: p.instruction.profile.pinBasis,
                                  portraitSolver: p.instruction.profile.pinBasis
                                    ? "basis"
                                    : p.instruction.algorithm ===
                                          "density-anatomy/10" ||
                                        p.instruction.params.simplification
                                          ?.sourceAlgorithm ===
                                          "density-anatomy/10"
                                      ? "anatomy"
                                      : p.instruction.algorithm ===
                                            "density-physical/8" ||
                                          p.instruction.params.simplification
                                            ?.sourceAlgorithm ===
                                            "density-physical/8"
                                        ? "physical"
                                        : p.instruction.algorithm ===
                                            "density-multiscale/7"
                                          ? "multiscale"
                                          : p.instruction.algorithm ===
                                              "continuous-guarded/6"
                                            ? "guarded"
                                            : p.instruction.algorithm ===
                                                "density-optical/5"
                                              ? "global"
                                              : "continuous",
                                });
                                nav("create");
                                setNotice(t("reuseNotice"));
                              }}
                            >
                              {t("reuseSettings")}
                            </button>
                          )}
                          <button
                            className="text-button"
                            onClick={() =>
                              setProjects((ps) =>
                                ps.map((v) =>
                                  v.id === p.id
                                    ? {
                                        ...v,
                                        deletedAt: v.deletedAt
                                          ? undefined
                                          : new Date().toISOString(),
                                      }
                                    : v,
                                ),
                              )
                            }
                          >
                            {t(p.deletedAt ? "restore" : "remove")}
                          </button>
                        </div>
                      </article>
                    ))}
                </div>
              )}
            </>
          )}
          {view === "materials" && (
            <section className="card material-page">
              <Leaf size={36} />
              <h1>{t("materialTitle")}</h1>
              <p>{t("materialText")}</p>
              <div className="material-specs">
                <span>400 × 400 mm</span>
                <span>120 {t("pdfPin")}</span>
                <span>0.3 mm</span>
              </div>
              <p className="provisional">{t("provisional")}</p>
              <label className="field-label">{t("code")}</label>
              <button className="outline" onClick={() => nav("customer")}>
                {customerText(locale, "redeem")}
              </button>
              <p className="fineprint">{t("codeInfo")}</p>
              <button className="primary" onClick={() => nav("create")}>
                {t("try")}
                <ArrowRight size={16} />
              </button>
            </section>
          )}
          {view === "crafts" && <CraftStudio locale={locale} />}
        </main>
        <footer>
          <span>{storefront.brandName || PRODUCT_NAME}</span>
          <span>
            <ShieldCheck size={14} />
            {t("private")}
          </span>
        </footer>
      </div>
      <input
        type="file"
        ref={importInput}
        accept=".json,.txt"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) void doImport(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {showPrivacy && (
        <div className="modal-backdrop" onClick={() => setShowPrivacy(false)}>
          <section
            className="card modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("privacy")}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t("privacy")}</h2>
            <p>{t("privacyText")}</p>
            <button
              className="primary"
              autoFocus
              onClick={() => setShowPrivacy(false)}
            >
              {t("clear")}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
