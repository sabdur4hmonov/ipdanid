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
import {
  DEFAULT_PORTRAIT,
  processPortrait,
  putRgb,
  portraitRegions,
} from "./core/portrait";
import { MAX_LINES } from "./core/limits";
import { deepFreeze, flatten } from "./core/engine";
import { renderInstruction } from "./core/render";
import { loadPhoto, prepare, sampleCanvas, suitability } from "./core/image";
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
} from "./core/types";
import { spokenPin, translate } from "./i18n";
import { readProjects, writeProjects, StorageConflictError } from "./storage";
import { download } from "./download";
import { PRODUCT_NAME } from "./config";
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
  sample: boolean;
  edits: EditParams;
};

type View = "create" | "assemble" | "library" | "materials";
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
      <p>
        {t("stockMeters")}: {i.profile.stockMeters.toFixed(1)} m ·{" "}
        {t("stockShortfall")}:{" "}
        <strong>{(Math.ceil(shortfall * 10) / 10).toFixed(1)} m</strong>
      </p>
      <p className="fineprint">{t("stockHint")}</p>
      <p className="fineprint">
        {t("stopReason")}:{" "}
        {t(
          i.metrics.stoppedReason === "compute-limit"
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
  const [portrait, setPortrait] = useState(structuredClone(DEFAULT_PORTRAIT));
  const [portraitSolver, setPortraitSolver] = useState<"continuous" | "global">(
    "continuous",
  );
  const targetCanvas = useRef<HTMLCanvasElement>(null);
  const [variants, setVariants] = useState<
      { instruction: Instruction; name: string; edits: EditParams }[]
    >([]),
    [variant, setVariant] = useState(0),
    [busy, setBusy] = useState(false),
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
  const [photoCandidates, setPhotoCandidates] = useState<PhotoCandidate[]>([]),
    [photoId, setPhotoId] = useState<string | null>(null),
    [makerPresets, setMakerPresets] = useState<MakerPreset[]>([]),
    [presetName, setPresetName] = useState(""),
    [selectedPreset, setSelectedPreset] = useState("");
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
    [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
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
  const photo = useRef<HTMLCanvasElement>(null),
    upload = useRef<HTMLInputElement>(null),
    importInput = useRef<HTMLInputElement>(null),
    worker = useRef<Worker | null>(null),
    audio = useRef<AudioContext | null>(null),
    gain = useRef<GainNode | null>(null),
    drag = useRef<{ x: number; y: number } | null>(null);
  const result = variants[variant]?.instruction,
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
  const stopSpeech = () => window.speechSynthesis?.cancel();
  const pause = () => {
    setPlaying(false);
    stopSpeech();
    setSound(false);
  };
  const speak = () => {
    stopSpeech();
    if (view !== "assemble" || !active || !chosenVoice || !voiceEnabled) return;
    const u = new SpeechSynthesisUtterance(
      `${t("pdfStep")} ${spokenPin(locale, current)}. ${spokenPin(locale, active.from)} ${t("from")}, ${spokenPin(locale, active.to)} ${t("to")}.${active.segmentStart ? " " + t(active.segment === 0 ? "startKnot" : "colorChange") : ""}`,
    );
    u.voice = chosenVoice;
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
      worker.current?.terminate();
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    if (loaded)
      writeProjects(projects).catch((e) => {
        setError(String(e));
        setNotice("");
        if (e instanceof StorageConflictError) {
          setStorageConflict(true);
          setLoaded(false);
          pause();
        }
      });
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
    if (!window.speechSynthesis) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
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
          160,
          portrait,
        );
        putRgb(ctxTarget, pixels, 160);
      }
    }
  }, [image, edits, view, aspect, portrait]);
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
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setError("");
    try {
      const next = await loadPhoto(file);
      addPhoto(next, file.name, false);
      next.close();
    } catch (e) {
      setError(String(e));
    }
  }
  function rememberEdits() {
    return photoCandidates.map((p) =>
      p.id === photoId ? { ...p, edits: { ...edits } } : p,
    );
  }
  function addPhoto(
    source: CanvasImageSource & { width: number; height: number },
    label: string,
    isSample: boolean,
  ) {
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
      sample: isSample,
      edits: { ...DEFAULT_EDITS },
    };
    setPhotoCandidates([...rememberEdits(), p].slice(-4));
    setPhotoId(p.id);
    setImage(c);
    setSample(isSample);
    setEdits(p.edits);
  }
  function switchPhoto(p: PhotoCandidate) {
    if (p.id === photoId) return;
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
    setError("");
    setPhotoCandidates(rememberEdits());
    setPhotoId(p.id);
    setImage(p.image);
    setSample(p.sample);
    setEdits({ ...p.edits });
  }
  function applySettings(s: MakerSettings) {
    setShape(s.shape);
    setMode(s.mode);
    setLines(s.lines);
    setWidthMm(s.widthMm);
    setHeightMm(s.heightMm);
    setPinCount(s.pinCount);
    setThreadMm(s.threadMm);
    setStockMeters(s.stockMeters);
    setEdits({ ...s.edits });
    setPortrait(structuredClone(s.portrait ?? DEFAULT_PORTRAIT));
    setPortraitSolver(s.portraitSolver ?? "continuous");
    setPreset("balanced");
  }
  async function savePreset() {
    try {
      const next = await changePreset({
        id: crypto.randomUUID(),
        name: presetName.trim(),
        settings: {
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
        },
      });
      setMakerPresets(next);
      setPresetName("");
      setNotice(t("presetSaved"));
    } catch (e) {
      setError(String(e));
    }
  }
  function generate(seed?: Instruction, strategyOverride?: "global") {
    if (!image) return;
    let profile;
    try {
      profile = seed
        ? structuredClone(seed.profile)
        : createProfile(shape, pinCount, mode, {
            widthMm,
            heightMm: boardHeight,
          });
      if (!seed) {
        profile.threadMm = threadMm;
        profile.stockMeters = stockMeters;
      }
    } catch (e) {
      setError(String(e));
      return;
    }
    setError("");
    setBusy(true);
    setFraction(0);
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    const generationPortrait = seed?.params.portrait ?? portrait;
    const generationEdits = seed
      ? (variants.find((v) => v.instruction.id === seed.id)?.edits ?? edits)
      : edits;
    const pixels = processPortrait(
      prepare(
        c.getContext("2d")!,
        image,
        generationEdits,
        seed ? profile.widthMm / profile.heightMm : aspect,
      ),
      160,
      generationPortrait,
    );
    const w = new Worker(
      new URL("./core/generator.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = w;
    w.onmessage = async ({ data }) => {
      if (data.type === "progress") setFraction(data.fraction);
      else {
        setBusy(false);
        w.terminate();
        worker.current = null;
        if (data.type === "done") {
          try {
            const i = await validateInstruction(data.instruction);
            const baseline = data.baseline
              ? await validateInstruction(data.baseline)
              : undefined;
            setVariants((v) =>
              [
                ...v,
                ...(baseline
                  ? [
                      {
                        instruction: baseline,
                        name: t("continuousSolver"),
                        edits: { ...generationEdits },
                      },
                    ]
                  : []),
                {
                  instruction: i,
                  name: `${photoCandidates.find((p) => p.id === photoId)?.name ?? t("sample")} · ${i.algorithm === "density-optical/5" ? t("globalSolver") : t(preset as "balanced" | "lighter" | "detailed")}`,
                  edits: { ...generationEdits },
                },
              ].slice(-6),
            );
            setVariant(Math.min(variants.length + (baseline ? 1 : 0), 5));
          } catch (e) {
            setError(String(e));
          }
        } else setError(data.message);
      }
    };
    w.onerror = (e) => {
      setBusy(false);
      setError(e.message);
      w.terminate();
      worker.current = null;
    };
    w.postMessage({
      pixels,
      resolution: 160,
      profile,
      lines: seed?.params.requestedLines ?? lines,
      mode: seed?.params.mode ?? mode,
      portrait: generationPortrait,
      seed,
      strategy:
        strategyOverride ??
        (seed?.algorithm === "density-optical/5"
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
    setNotice(t("saved"));
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
  const ranges: {
    key: keyof EditParams;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: "zoom", min: 1, max: 3, step: 0.05 },
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
            {t(view)} <span>/</span> <span>{PRODUCT_NAME}</span>
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
                    <input
                      ref={upload}
                      type="file"
                      accept="image/jpeg,image/png"
                      hidden
                      onChange={(e) => {
                        if (e.target.files?.[0])
                          void selectPhoto(e.target.files[0]);
                        e.target.value = "";
                      }}
                    />
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
                        <div
                          className="photo-frame"
                          style={{ aspectRatio: aspect }}
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
                        </div>
                        {sample && (
                          <p className="fineprint">{t("sampleNotice")}</p>
                        )}
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
                        {portrait.enabled && mode !== "color" && (
                          <label>
                            {t("portraitSolver")}
                            <select
                              aria-label={t("portraitSolver")}
                              value={portraitSolver}
                              onChange={(e) =>
                                setPortraitSolver(
                                  e.target.value as "continuous" | "global",
                                )
                              }
                            >
                              <option value="continuous">
                                {t("continuousSolver")}
                              </option>
                              <option value="global">
                                {t("globalSolver")}
                              </option>
                            </select>
                            <span className="fineprint">{t("globalHint")}</span>
                          </label>
                        )}
                        <div
                          className="target-frame"
                          style={{ aspectRatio: aspect }}
                        >
                          <canvas
                            ref={targetCanvas}
                            width={160}
                            height={160}
                            aria-label={t("processedTarget")}
                          />
                          {portrait.enabled &&
                            Object.entries(portraitRegions(portrait.face))
                              .filter(([key]) => key !== "outline")
                              .map(([key, box]) => (
                                <div
                                  key={key}
                                  className={`region-box region-${key}`}
                                  style={{
                                    left: `${box.left * 100}%`,
                                    top: `${box.top * 100}%`,
                                    width: `${box.width * 100}%`,
                                    height: `${box.height * 100}%`,
                                  }}
                                >
                                  <span>
                                    {t(
                                      key as "face" | "eyes" | "nose" | "mouth",
                                    )}
                                  </span>
                                </div>
                              ))}
                        </div>
                        <p className="fineprint">
                          {t("processedTarget")} · 160 × 160 ·{" "}
                          {t("originalCrop")}
                        </p>
                        {portrait.enabled && (
                          <details className="edits" open>
                            <summary>{t("faceRegion")}</summary>
                            <p className="fineprint">{t("regionHint")}</p>
                            {(["left", "top", "width", "height"] as const).map(
                              (key) => (
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
                              ),
                            )}
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
                                onChange={(e) =>
                                  setEdits((v) => ({
                                    ...v,
                                    [r.key]: +e.target.value,
                                  }))
                                }
                              />
                              <output>{edits[r.key]}</output>
                            </label>
                          ))}
                          <button
                            className="text-button"
                            onClick={() => setEdits(DEFAULT_EDITS)}
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
                          onClick={() => setShape(id)}
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
                          set: setPinCount,
                          min: 24,
                          max: 240,
                          step: 1,
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
                      disabled={!image || busy}
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
                          onClick={() => {
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
                            {Math.ceil((result.metrics.lines * pace) / 60)}
                          </strong>
                          <span>{t("minutes")}</span>
                        </div>
                      </div>
                      <div className="variant-tabs">
                        {variants.map((v, j) => (
                          <button
                            key={v.instruction.id}
                            className={variant === j ? "chip selected" : "chip"}
                            onClick={() => setVariant(j)}
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
                      <Supply instruction={result} locale={locale} />
                      {image &&
                        result.params.portrait?.enabled &&
                        result.params.mode !== "color" &&
                        (result.algorithm !== "density-optical/5" ||
                          result.metrics.stoppedReason === "compute-limit") && (
                          <button
                            className="outline full"
                            disabled={busy}
                            onClick={() => generate(result, "global")}
                          >
                            {t(
                              result.algorithm === "density-optical/5"
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
                        ((steps.length - project.progress.confirmed) * pace) /
                          60,
                      )}{" "}
                      {t("minutes")} {t("remaining")}
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
                  {projects.map((p) => (
                    <article
                      className={`card project-card ${p.deletedAt ? "archived" : ""}`}
                      key={p.id}
                    >
                      <Preview instruction={p.instruction} />
                      <h2>{p.name}</h2>
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
                                shape: profile.shape,
                                mode: p.instruction.params.mode,
                                lines: p.instruction.params.requestedLines,
                                widthMm: profile.widthMm,
                                heightMm: profile.heightMm,
                                pinCount: profile.pins.length,
                                threadMm: profile.threadMm,
                                stockMeters: profile.stockMeters,
                                edits: p.edits,
                                portrait: p.instruction.params.portrait,
                                portraitSolver:
                                  p.instruction.algorithm ===
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
              <input placeholder="•••• – ••••" disabled />
              <p className="fineprint">{t("codeInfo")}</p>
              <button className="primary" onClick={() => nav("create")}>
                {t("try")}
                <ArrowRight size={16} />
              </button>
            </section>
          )}
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
