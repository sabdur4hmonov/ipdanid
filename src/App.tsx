import { GridStudio } from "./GridStudio";
import { PhotoActions } from "./PhotoActions";
import { PersonBackground, type BackgroundState } from "./PersonBackground";
import { backgroundText } from "./person-background-i18n";
import { withPinBasis, type PinBasis } from "./core/pin-basis";
import {
  DEFAULT_ANATOMICAL_IMPORTANCE,
  type AnatomicalImportance,
} from "./core/anatomical-importance";
import { useEffect, useRef, useState } from "react";
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
  Grid3X3,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Upload,
  UserRound,
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
import { BackgroundEditor } from "./BackgroundEditor";
import { MAX_LINES } from "./core/limits";
import { deepFreeze, flatten } from "./core/engine";
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
  id: string;
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
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = localStorage.getItem("iprasm.locale");
    return stored && ["uz", "ru", "en"].includes(stored)
      ? (stored as Locale)
      : "uz";
  });
  const t = translate(["uz", "ru", "en"].includes(locale) ? locale : "uz");
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
  const [recovery, setRecovery] = useState<OptimizerRecovery>();
  useEffect(() => {
    if (
      portraitSolver === "basis" &&
      (!portrait.enabled || shape !== "circle" || mode === "color")
    ) {
      setPortraitSolver("guarded");
      setPinCount((v) => Math.min(v, 240));
      setPinBasis(undefined);
      setPinLayout(undefined);
      setPinCoordinates(undefined);
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
    [photoId, setPhotoId] = useState<string | null>(null),
    [headOutline, setHeadOutline] = useState<OutlinePoint[]>([]),
    [makerPresets, setMakerPresets] = useState<MakerPreset[]>([]),
    [presetName, setPresetName] = useState(""),
    [selectedPreset, setSelectedPreset] = useState("");
  useEffect(() => {
    if (group && portrait.enabled)
      setPortrait((v) => ({ ...v, enabled: false }));
  }, [group, portrait.enabled]);
  const [widthMm, setWidthMm] = useState(400),
    [heightMm, setHeightMm] = useState(400),
    [pinCount, setPinCount] = useState(120),
    [threadMm, setThreadMm] = useState(0.3),
    [stockMeters, setStockMeters] = useState(1200);
  const boardHeight = shape === "circle" ? widthMm : heightMm,
    aspect = widthMm / boardHeight;
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
    v.lang.toLowerCase().startsWith(locale === "uz" ? "uz" : locale),
  );
  const chosenVoice = matchingVoices[voiceIndex] ?? matchingVoices[0];
  const [analysis, setAnalysis] = useState<ReturnType<
    typeof suitability
  > | null>(null);
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
    const text = `${t("pdfStep")} ${spokenPin(locale, current)}. ${spokenPin(locale, active.from)} ${t("from")}, ${spokenPin(locale, active.to)} ${t("to")}.${active.segmentStart ? " " + t(active.segment === 0 ? "startKnot" : "colorChange") : ""}`;
    if (chosenVoice.native) {
      void nativeGuideSpeech(text, chosenVoice, locale, speechRate).catch(
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
    document.title = `${PRODUCT_NAME} · ${t("tagline")}`;
    localStorage.setItem("iprasm.locale", locale);
    setVoiceIndex(0);
    stopSpeech();
  }, [locale]);
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
        setSampling(
          portrait.enabled
            ? portraitSampling(pixels, resolution, shape, portrait)
            : null,
        );
      }
    }
  }, [image, edits, view, aspect, portrait, resolution, shape]);
  useEffect(() => {
    speak();
    return stopSpeech;
  }, [current, voiceEnabled, chosenVoice, locale, speechRate, selected, view]);
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
      id: crypto.randomUUID(),
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
      },
      aspect,
      resolution,
    };
    setPhotoCandidates([...rememberEdits(), p].slice(-4));
    setPhotoId(p.id);
    setImage(c);
    setGroup(false);
    setBackgroundBusy(!isSample);
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
    setImage(p.image);
    setGroup(p.group);
    setBackgroundBusy(
      !p.sample && (!p.background || p.background.status === "processing"),
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
  function generate(
    seed?: Instruction,
    strategyOverride?:
      "global" | "multiscale" | "physical" | "anatomy" | "basis" | "simplify",
    resume?: OptimizerRecovery,
  ) {
    if ((!image && !resume) || (backgroundBusy && !resume)) return;
    let profile;
    try {
      profile = resume?.profile
        ? structuredClone(resume.profile)
        : seed
          ? structuredClone(seed.profile)
          : createProfile(
              shape,
              portraitSolver === "basis" ? 240 : pinCount,
              mode,
              {
                widthMm,
                heightMm: boardHeight,
              },
            );
      if (!seed && !resume) {
        profile.threadMm = threadMm;
        profile.stockMeters = stockMeters;
        if (portraitSolver === "basis")
          profile = withPinBasis(
            profile,
            pinCount as 240 | 320,
            pinBasis?.minimumAngularGapDegrees,
          );
        if (pinLayout)
          profile = withCircleLayout(
            profile,
            pinLayout,
            pinCoordinates?.length === pinCount ? pinCoordinates : undefined,
          );
      }
    } catch (e) {
      setError(String(e));
      return;
    }
    setError("");
    setBusy(true);
    setFraction(0);
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
    const generationEdits =
      resume?.edits ??
      (seed
        ? (variants.find((v) => v.instruction.id === seed.id)?.edits ?? edits)
        : edits);
    const pixels =
      resume?.pixels ??
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
    const w = new Worker(
      new URL("./core/generator.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current?.terminate();
    worker.current = w;
    const jobId = jobs.current.begin();
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
    w.onmessage = async ({ data }) => {
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
          resolution: data.resolution,
          mode: data.mode,
          pixels,
          lines: data.lines,
          strategy: data.strategy ?? "physical",
          anatomy: data.anatomy,
          edits: generationEdits,
          name: label,
          extension: data.extension,
          totalSweeps: data.totalSweeps,
          exchange: data.exchange,
        };
        try {
          await saveOptimizerRecovery(value);
          if (currentJob()) setRecovery(value);
        } catch {
          if (currentJob()) setNotice(t("recoveryFailed"));
        }
        return;
      }
      if (data.type === "stage") {
        if (data.diagnostic.stage === "extension-validation")
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
        if (
          [
            "density-physical/8",
            "density-anatomy/10",
            "density-pin-basis/11",
          ].includes(i.algorithm)
        ) {
          await clearOptimizerRecovery();
          if (!currentJob()) return;
          setRecovery(undefined);
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
                  : i.algorithm === "density-pin-basis/11"
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
      seed,
      resume: resume?.checkpoint,
      extension: resume?.extension,
      totalSweeps: resume?.totalSweeps,
      exchange: resume?.exchange,
      anatomy: resume?.anatomy ?? seed?.params.optimization?.anatomy ?? anatomy,
      strategy:
        strategyOverride ??
        (seed?.algorithm === "density-pin-basis/11"
          ? "basis"
          : seed?.algorithm === "density-anatomy/10"
            ? "anatomy"
            : seed?.algorithm === "density-physical/8"
              ? "physical"
              : seed?.algorithm === "density-multiscale/7"
                ? "multiscale"
                : seed?.algorithm === "continuous-guarded/6"
                  ? "guarded"
                  : seed?.algorithm === "density-optical/5"
                    ? "global"
                    : !seed && generationPortrait.enabled && mode !== "color"
                      ? portraitSolver
                      : "continuous"),
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
            {PRODUCT_NAME}
            <span className="brand-sub">{t("tagline")}</span>
          </span>
        </a>
        <nav aria-label="Main">
          {(
            [
              { id: "create", icon: Sparkles },
              { id: "assemble", icon: Layers },
              { id: "library", icon: FolderOpen },
              { id: "materials", icon: Leaf },
              { id: "customer", icon: UserRound },
              { id: "crafts", icon: Grid3X3 },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              aria-label={
                id === "customer" ? customerText(locale, "customer") : t(id)
              }
              className={view === id ? "nav active" : "nav"}
              onClick={() => nav(id)}
            >
              <Icon size={20} />
              <span>
                {id === "customer" ? customerText(locale, "customer") : t(id)}
              </span>
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
            <span>/</span> <span>{PRODUCT_NAME}</span>
          </div>
          <div className="header-right">
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
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
        </header>
        <main>
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
              <section className="intro">
                <div>
                  <div className="eyebrow">
                    <span /> {t("tagline")}
                  </div>
                  <h1>{t("hero")}</h1>
                  <p>{t("subtitle")}</p>
                </div>
                <button className="outline" onClick={() => nav("materials")}>
                  {t("kit")}
                  <ArrowRight size={16} />
                </button>
              </section>
              <div className="workspace">
                <div className="editor-column">
                  <section className="card photo-card">
                    <div className="section-label">
                      {t("step1")}
                      <ImagePlus size={17} />
                    </div>
                    <PhotoActions
                      locale={locale}
                      onPhoto={selectPhoto}
                      uploadRef={upload}
                    />
                    <p className="photo-guidance" data-testid="photo-guidance">
                      {t("photoGuidance")}
                    </p>
                    {!image ? (
                      <div
                        className="upload-area"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (e.dataTransfer.files[0])
                            void selectPhoto(e.dataTransfer.files[0]);
                        }}
                      >
                        <div className="upload-icon">
                          <Upload size={28} />
                        </div>
                        <h2>{t("upload")}</h2>
                        <p>{t("uploadHint")}</p>
                        <button
                          className="primary"
                          onClick={() => upload.current?.click()}
                        >
                          {t("try")}
                          <ArrowRight size={16} />
                        </button>
                        <button
                          className="text-button"
                          onClick={() => {
                            addPhoto(sampleCanvas(), t("sample"), true);
                          }}
                        >
                          {t("sample")}
                        </button>
                      </div>
                    ) : (
                      <>
                        {!sample &&
                          photoCandidates.find((p) => p.id === photoId) && (
                            <PersonBackground
                              key={photoId!}
                              source={
                                photoCandidates.find((p) => p.id === photoId)!
                                  .original
                              }
                              initial={
                                photoCandidates.find((p) => p.id === photoId)!
                                  .background
                              }
                              locale={locale}
                              onBusy={setBackgroundBusy}
                              onChange={(background, prepared) => {
                                jobs.current.cancel();
                                worker.current?.terminate();
                                worker.current = null;
                                setBusy(false);
                                setImage(prepared);
                                setPhotoCandidates((v) =>
                                  v.map((p) =>
                                    p.id === photoId
                                      ? { ...p, image: prepared, background }
                                      : p,
                                  ),
                                );
                                // Source segmentation replaces the old single-face oval softening.
                                if (background.enabled && background.mask)
                                  setPortrait((v) => ({ ...v, background: 0 }));
                              }}
                            />
                          )}
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={group}
                            onChange={(e) => {
                              setGroup(e.target.checked);
                              setHeadOutline([]);
                              if (e.target.checked)
                                setPortrait((v) => ({ ...v, enabled: false }));
                            }}
                          />
                          {backgroundText(locale, "group")}
                        </label>
                        {group && (
                          <p className="workflow-notice">
                            {backgroundText(locale, "groupHint")}
                          </p>
                        )}
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
                        <label className="toggle">
                          <input
                            type="checkbox"
                            checked={portrait.enabled}
                            disabled={group}
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
                          {portrait.enabled && mode !== "color"
                            ? t(
                                `${portraitSolver === "global" ? "global" : portraitSolver}Solver` as import("./i18n").Key,
                              )
                            : t("continuousSolver")}
                        </p>
                        {portrait.enabled && mode !== "color" && (
                          <label>
                            {t("portraitSolver")}
                            <select
                              aria-label={t("portraitSolver")}
                              value={portraitSolver}
                              onChange={(e) => {
                                if (e.target.value === "basis") {
                                  setPinCount(320);
                                  setPinBasis(undefined);
                                  setPinLayout(undefined);
                                  setPinCoordinates(undefined);
                                } else if (pinCount > 240) {
                                  setPinCount(240);
                                  setPinBasis(undefined);
                                  setPinLayout(undefined);
                                  setPinCoordinates(undefined);
                                }
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
                                {t("guardedSolver")}
                              </option>
                              <option
                                value="anatomy"
                                disabled={
                                  portrait.regions?.placement !== "manual"
                                }
                              >
                                {t("anatomySolver")}
                              </option>
                              <option
                                value="basis"
                                disabled={shape !== "circle"}
                              >
                                {t("basisSolver")}
                              </option>
                              <option value="physical">
                                {t("physicalSolver")}
                              </option>
                              <option value="multiscale">
                                {t("multiscaleSolver")}
                              </option>
                              <option value="global">
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
                            onChange={(e) => {
                              const next = Number(e.target.value);
                              if (image && next !== resolution)
                                setPortrait((p) =>
                                  remapPortrait(
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
                                );
                              setResolution(next);
                            }}
                          >
                            {![160, 192].includes(resolution) && (
                              <option value={resolution}>
                                {resolution} × {resolution}
                              </option>
                            )}
                            <option value={160}>160 × 160</option>
                            <option value={192}>
                              192 × 192 · {t("experimental")}
                            </option>
                          </select>
                          <span className="fineprint">
                            {t("resolutionHint")}
                          </span>
                        </label>
                        <RegionEditor
                          resolution={resolution}
                          portrait={portrait}
                          setPortrait={setPortrait}
                          image={image}
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
                        </RegionEditor>
                        {portrait.enabled && sampling && (
                          <PortraitSamplingPanel sampling={sampling} t={t} />
                        )}
                        <p className="fineprint">
                          {t("processedTarget")} · {resolution} × {resolution} ·{" "}
                          {t("originalCrop")}
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
                            <details className="edits" open>
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
                        <details className="edits" open>
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
                          : t("photoTips")}
                      </span>
                    </div>
                  </section>
                  <section className="card settings-card">
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
                          {t("layoutNotice")} {pinLayout.phaseDegreesClockwise}°
                          · {pinLayout.version}
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
                          className={shape === id ? "shape selected" : "shape"}
                          onClick={() => {
                            setShape(id);
                            if (id !== "circle" && portraitSolver === "basis") {
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
                      onChange={(e) => setMode(e.target.value as typeof mode)}
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
                            className={preset === v ? "chip selected" : "chip"}
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
                          min: 0.1,
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
                    {recovery && (
                      <div className="fineprint">
                        <p>{t("recoveryNotice")}</p>
                        <button
                          disabled={busy}
                          className="outline full"
                          onClick={() =>
                            generate(recovery.seed, recovery.strategy, recovery)
                          }
                        >
                          {t("resumeOptimization")}
                        </button>
                        <button
                          disabled={busy}
                          className="text-button"
                          onClick={() =>
                            clearOptimizerRecovery().then(() =>
                              setRecovery(undefined),
                            )
                          }
                        >
                          {t("discardOptimization")}
                        </button>
                      </div>
                    )}
                    {busy && (
                      <>
                        <progress max="1" value={fraction} />
                        <button
                          className="text-button"
                          onClick={() => {
                            jobs.current.cancel();
                            worker.current?.terminate();
                            worker.current = null;
                            setBusy(false);
                            setNotice(t("cancel"));
                          }}
                        >
                          {t("cancel")}
                        </button>
                      </>
                    )}
                  </section>
                </div>
                <section className="card result-card">
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
                      <p className="fineprint" data-testid="assembly-effort">
                        {t("assemblyEstimateHint")} {pace} s ·{" "}
                        {assemblyEffort(result).actions} {t("assemblyActions")}{" "}
                        · {assemblyEffort(result).starts} {t("assemblyStarts")}{" "}
                        · {assemblyEffort(result).knots} {t("assemblyKnots")} ·{" "}
                        {assemblyEffort(result).colorChanges}{" "}
                        {t("assemblyColors")}
                      </p>
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
                            {v.name} {j + 1}
                          </button>
                        ))}
                      </div>
                      <p className="fineprint">
                        {t("quality")}: {result.metrics.baselineMse.toFixed(3)}{" "}
                        → {result.metrics.reconstructionMse.toFixed(3)}.{" "}
                        {t("qualityHint")}
                      </p>
                      <details
                        className="edits"
                        data-testid="variant-audit"
                        data-sequence-hash={result.sequenceHash}
                      >
                        <summary>{t("variantDetails")}</summary>
                        <p>
                          {t("requestedConnections")}:{" "}
                          {result.params.requestedLines.toLocaleString(locale)}{" "}
                          · {result.metrics.lines.toLocaleString(locale)}{" "}
                          {t("lines")}
                        </p>
                        <p>
                          {result.algorithm} · {result.profile.pins.length} pins
                          · {result.profile.threadMm} mm ·{" "}
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
                      {image &&
                        [
                          "continuous-guarded/6",
                          "density-multiscale/7",
                          "density-physical/8",
                          "density-anatomy/10",
                          "density-pin-basis/11",
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
                        ].includes(result.algorithm) ||
                          result.metrics.stoppedReason === "compute-limit") && (
                          <button
                            className="outline full"
                            disabled={busy}
                            onClick={() =>
                              generate(
                                result,
                                result.algorithm === "density-pin-basis/11"
                                  ? "basis"
                                  : result.algorithm === "density-anatomy/10"
                                    ? "anatomy"
                                    : result.algorithm === "density-physical/8"
                                      ? "physical"
                                      : [
                                            "continuous-guarded/6",
                                            "density-multiscale/7",
                                          ].includes(result.algorithm)
                                        ? "multiscale"
                                        : "global",
                              )
                            }
                          >
                            {t(
                              [
                                "density-optical/5",
                                "density-multiscale/7",
                                "density-physical/8",
                                "density-anatomy/10",
                                "density-pin-basis/11",
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
                      {result.metrics.refinement?.reason === "compute-limit" &&
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
                              {Object.entries(result.metrics.regions.final).map(
                                ([key, m]) => (
                                  <tr key={key}>
                                    <th>
                                      {t(
                                        key as
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
                                ),
                              )}
                            </tbody>
                          </table>
                        </details>
                      )}
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
                      <button
                        className="primary full"
                        onClick={() => void save()}
                      >
                        {t("save")}
                        <ArrowRight size={18} />
                      </button>
                      <code className="hash">
                        SHA-256 {result.sequenceHash.slice(0, 20)}…
                      </code>
                    </>
                  ) : (
                    <div className="result-footer">
                      <Leaf size={18} />
                      <p>{t("photoTips")}</p>
                    </div>
                  )}
                </section>
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
          {view === "crafts" && <GridStudio locale={locale} />}
        </main>
        <footer>
          <span>{PRODUCT_NAME}</span>
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
