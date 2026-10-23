import { frameFreePhoto, freePhotoCanvas } from "./core/free-photo-framing";
import { whiteBackground } from "./person-background";
import { paintPersonMask, type PersonMask } from "./core/person-mask";
import { usePhotoTone } from "./usePhotoTone";
import { productSource, type ProductKind } from "./core/product-framing";
import { productText } from "./product-i18n";
import { withPortraitCaption, captionGeometry } from "./core/portrait-caption";
import { leastSquaresProfile } from "./core/classic-least-squares";
import {
  lazy,
  Suspense,
  useState,
  useEffect,
  useMemo,
  useRef,
  type PointerEvent,
} from "react";
import type { Instruction, Locale, Shape } from "./core/types";
import { DEFAULT_EDITS } from "./core/types";
import type { KitPreparation } from "./core/standard-preparation";
import { turnPoint } from "./core/customer-framing";
import {
  defaultHeadAdjustment,
  type HeadAdjustment,
} from "./core/portrait-framing";
import { type QuarterTurn } from "./core/photo-orientation";
import { loadPhoto } from "./core/image";
import { hash } from "./core/engine";
import { preparePersonPhoto, type PhotoAnalysis } from "./photo-prepare";
import { classicPins } from "./core/classic-reference";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
  type StandardKitConfig,
} from "./core/standard-kit";
import { currentStandardKit } from "./standard-kit-settings";
import { renderInstruction } from "./core/render";
import { HEART_POLYGON } from "./core/geometry";
import { PhotoActions } from "./PhotoActions";
import { customerFlowText } from "./customer-flow-i18n";
import { DEFAULT_CUSTOMER_LINES } from "./customer-defaults";
import { analyticsClient } from "./analytics-client";
import { validateInstruction } from "./core/validation";
import { useBuildAccess } from "./useBuildAccess";
import { BuildGate } from "./BuildGate";
import { download } from "./download";
import {
  saveOptimizerRecovery,
  clearOptimizerRecovery,
} from "./optimizer-storage";
import "./customer-flow.css";
import type { PhotoDraft } from "./photo-draft";
import { photoDraftText } from "./photo-draft-i18n";
const SequenceAnimation = lazy(() => import("./SequenceAnimation"));
const PhotoDraftPanel = lazy(() => import("./PhotoDraftPanel"));

type Props = {
  kitConfig?: StandardKitConfig;
  active: boolean;
  locale: Locale;
  setLocale: (l: Locale) => void;
  onExpert: () => void;
  onNavigate: (v: "library" | "customer") => void;
  onGuide: (i: Instruction) => void;
  onPersist: (i: Instruction) => void;
};
export function CustomerStudio({
  kitConfig,
  active,
  locale,
  setLocale,
  onExpert,
  onNavigate,
  onGuide,
  onPersist,
}: Props) {
  const t = (k: Parameters<typeof customerFlowText>[1]) =>
    customerFlowText(locale, k);
  const [step, setStep] = useState<"start" | "adjust" | "result">("start"),
    [shape, setShape] = useState<Shape>("circle"),
    [kind, setKind] = useState<ProductKind>("people"),
    [lettering, setLettering] = useState("SALOM"),
    [caption, setCaption] = useState(""),
    [captionRaster, setCaptionRaster] = useState<{
      key: string;
      pixels: Uint8Array;
    }>(),
    [captionInvalid, setCaptionInvalid] = useState(false),
    [source, setSource] = useState<HTMLCanvasElement>(),
    [analysis, setAnalysis] = useState<PhotoAnalysis>(),
    [sourceHash, setSourceHash] = useState(""),
    [config, setConfig] = useState(structuredClone(DEFAULT_STANDARD_KIT)),
    [adjustments, setAdjustments] = useState<HeadAdjustment[]>([]),
    [rotation, setRotation] = useState<QuarterTurn>(0),
    [maskEdit, setMaskEdit] = useState(false),
    [brush, setBrush] = useState<"erase" | "restore">("erase"),
    [maskWarning, setMaskWarning] = useState(false),
    [maskHistory, setMaskHistory] = useState<PersonMask[]>([]),
    [restoredMaskEdited, setRestoredMaskEdited] = useState(false),
    [before, setBefore] = useState(false),
    [selected, setSelected] = useState(0),
    [preparing, setPreparing] = useState(false),
    [busy, setBusy] = useState(false),
    [fraction, setFraction] = useState(0),
    [error, setError] = useState<"" | "error" | "noFace">(""),
    [result, setResult] = useState<Instruction>(),
    [lines, setLines] = useState<number>(DEFAULT_CUSTOMER_LINES),
    [gate, setGate] = useState<"pdf" | "start">(),
    [pdfBusy, setPdfBusy] = useState(false),
    [draftOpen, setDraftOpen] = useState(false);
  const generation = useRef(0),
    configRead = useRef(0),
    upload = useRef(0),
    controller = useRef<AbortController | undefined>(undefined),
    worker = useRef<Worker | undefined>(undefined),
    canvas = useRef<HTMLCanvasElement>(null),
    actual = useRef<HTMLCanvasElement>(null),
    surface = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null),
    pointers = useRef(new Map<number, { x: number; y: number }>()),
    gesture = useRef<{ x: number; y: number; distance: number } | undefined>(
      undefined,
    );
  const profiles = useMemo(() => standardProfiles(config), [config]);
  const profile = useMemo(
    () =>
      leastSquaresProfile(
        profiles.find((p) => p.shape === shape)!,
        true,
      ),
    [profiles, shape],
  );
  const maskCanvas = useRef<HTMLCanvasElement>(null);
  const baseFraming = useMemo(
    () =>
      source && analysis
        ? frameFreePhoto(
            kind,
            analysis.faces.map((f) => f.face),
            shape,
            source.width / source.height,
            adjustments[0] ?? defaultHeadAdjustment(),
            rotation,
          )
        : undefined,
    [source, analysis, shape, adjustments, rotation, kind],
  );
  const framing = useMemo(() => {
    if (!baseFraming || kind !== "people") return baseFraming;
    try {
      return withPortraitCaption(baseFraming, shape, caption, "bidi/2");
    } catch {
      return undefined;
    }
  }, [baseFraming, kind, shape, caption]);
  const captionKey = JSON.stringify(framing?.caption);
  useEffect(() => {
    let live = true;
    setCaptionInvalid(false);
    if (framing?.caption)
      void (async () => {
        const { rasterLettering } = await import("./core/lettering"),
          { shapeText } = await import("./core/mixed-lettering"),
          proof = framing.caption!,
          g = await shapeText(proof.text, {
            widthMm: 500,
            heightMm: 500,
            shape: "rectangle",
          }),
          pixels = rasterLettering(captionGeometry(g, proof.bounds), 500);
        if (live) setCaptionRaster({ key: captionKey, pixels });
      })().catch(() => {
        if (live) setCaptionInvalid(true);
      });
    return () => {
      live = false;
    };
  }, [captionKey]);
  const cutout = useMemo(
    () =>
      source && analysis ? whiteBackground(source, analysis.mask) : undefined,
    [source, analysis],
  );
  const tone = usePhotoTone(source, analysis?.mask, !maskEdit),
    tonal = tone?.canvas;
  const prepared = useMemo(
    () =>
      tonal &&
      framing &&
      (!framing.caption || captionRaster?.key === captionKey)
        ? freePhotoCanvas(tonal, framing, shape, captionRaster?.pixels)
        : undefined,
    [tonal, framing, shape, captionRaster, captionKey],
  );
  const display = useMemo(
    () =>
      framing && source && cutout
        ? freePhotoCanvas(
            before ? source : cutout,
            framing,
            shape,
            captionRaster?.pixels,
          )
        : undefined,
    [framing, source, cutout, before, shape, captionRaster],
  );
  useEffect(() => {
    const c = maskCanvas.current;
    if (!maskEdit || !c || !source || !cutout) return;
    const scale = Math.min(1, 600 / Math.max(source.width, source.height));
    c.width = Math.round(source.width * scale);
    c.height = Math.round(source.height * scale);
    c.getContext("2d")!.drawImage(
      before ? source : cutout,
      0,
      0,
      c.width,
      c.height,
    );
  }, [source, cutout, maskEdit, before]);
  const allowed = useBuildAccess(result ? [result] : []);
  useEffect(() => {
    let live = true;
    const request = ++configRead.current;
    void (kitConfig ? Promise.resolve(kitConfig) : currentStandardKit()).then(
      (c) => {
        if (live && request === configRead.current)
          setConfig((old) =>
            JSON.stringify(old) === JSON.stringify(c) ? old : c,
          );
      },
    );
    return () => {
      live = false;
    };
  }, [kitConfig]);
  useEffect(
    () => () => {
      upload.current++;
      generation.current++;
      controller.current?.abort();
      worker.current?.terminate();
    },
    [],
  );
  useEffect(() => {
    generation.current++;
    worker.current?.terminate();
    setBusy(false);
    setResult(undefined);
    setStep((s) => (s === "result" ? "adjust" : s));
  }, [framing, profile]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !source) return;
    c.width = c.height = 500;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 500, 500);
    if (display) ctx.drawImage(display.canvas, 0, 0);
    else {
      ctx.save();
      ctx.beginPath();
      if (shape === "circle") ctx.arc(250, 250, 250, 0, Math.PI * 2);
      else if (shape === "rectangle") ctx.rect(0, 0, 500, 500);
      else {
        HEART_POLYGON.forEach((p, j) =>
          j
            ? ctx.lineTo(p.x * 500, p.y * 500)
            : ctx.moveTo(p.x * 500, p.y * 500),
        );
        ctx.closePath();
      }
      ctx.clip();
      const size = Math.min(500 / source.width, 500 / source.height);
      ctx.drawImage(
        source,
        (500 - source.width * size) / 2,
        (500 - source.height * size) / 2,
        source.width * size,
        source.height * size,
      );
      ctx.restore();
    }
  }, [source, display, step, shape]);
  useEffect(() => {
    if (result && actual.current) {
      actual.current.width = actual.current.height = 1000;
      renderInstruction(actual.current.getContext("2d")!, result);
    }
  }, [result, step]);
  useEffect(() => {
    if (gate) dialog.current?.showModal();
  }, [gate]);
  useEffect(() => {
    if (gate && result && allowed(result)) {
      const action = gate;
      setGate(undefined);
      if (action === "start") onGuide(result);
      else void pdf(result);
    }
  }, [gate, result, result ? allowed(result) : false]);
  async function pdf(i: Instruction) {
    if (!allowed(i)) return;
    setPdfBusy(true);
    try {
      const { exportPdf } = await import("./core/pdf");
      await download(
        "ip-rasm.pdf",
        new Blob([Uint8Array.from(await exportPdf(i, locale)).buffer], {
          type: "application/pdf",
        }),
      );
    } catch {
      setError("error");
    } finally {
      setPdfBusy(false);
    }
  }
  async function photo(file: File) {
    const telemetry = analyticsClient.capture();
    const id = ++upload.current;
    const configRequest = ++configRead.current;
    void (kitConfig ? Promise.resolve(kitConfig) : currentStandardKit())
      .then((c) => {
        if (configRequest === configRead.current && id === upload.current)
          setConfig((old) =>
            JSON.stringify(old) === JSON.stringify(c) ? old : c,
          );
      })
      .catch(() => {
        if (id === upload.current) setError("error");
      });
    controller.current?.abort();
    worker.current?.terminate();
    generation.current++;
    setResult(undefined);
    setSource(undefined);
    setAnalysis(undefined);
    setSourceHash("");
    setAdjustments([]);
    setRotation(0);
    setMaskEdit(false);
    setMaskHistory([]);
    setRestoredMaskEdited(false);
    setBefore(false);
    setSelected(0);
    setLines(DEFAULT_CUSTOMER_LINES);
    setBusy(false);
    setPreparing(true);
    setError("");
    setStep("adjust");
    try {
      const image = await loadPhoto(file);
      if (id !== upload.current) {
        image.close();
        return;
      }
      const c = document.createElement("canvas");
      const scale = Math.min(1, 1536 / Math.max(image.width, image.height));
      c.width = Math.round(image.width * scale);
      c.height = Math.round(image.height * scale);
      c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
      image.close();
      setSource(c);
      telemetry({ kind: "photo-selected", shape });
      const abort = new AbortController();
      controller.current = abort;
      const a = await analyseCutout(c, abort.signal);
      if (id !== upload.current) return;
      const digest = await hash(
        new Uint8Array(
          c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data,
        ),
      );
      if (id !== upload.current) return;
      setSource(c);
      setSourceHash(digest);
      setAnalysis(a);
    } catch {
      if (id === upload.current) setError("error");
    } finally {
      if (id === upload.current) setPreparing(false);
    }
  }
  function captureDraft(): PhotoDraft {
    if (!source || !analysis || preparing || busy)
      throw Error("photo-draft/not-ready");
    return {
      version: "editable-photo/1",
      maskEdited: restoredMaskEdited || maskHistory.length > 0,
      savedAt: Date.now(),
      width: source.width,
      height: source.height,
      rgba: new Uint8Array(
        source.getContext("2d")!.getImageData(0, 0, source.width, source.height)
          .data,
      ),
      analysis: structuredClone({
        mask: analysis.mask,
        faces: analysis.faces,
        faceUnavailable: analysis.faceUnavailable,
        cleanupUnavailable: analysis.cleanupUnavailable,
        ...(analysis.analysisTurn === undefined
          ? {}
          : { analysisTurn: analysis.analysisTurn }),
      }),
      shape,
      kind,
      caption,
      adjustment: { ...(adjustments[0] ?? defaultHeadAdjustment()) },
      rotation,
      lines,
      config: structuredClone(config),
    };
  }
  function restoreDraft(d: PhotoDraft) {
    // Restored drafts have passed bounded integrity checks. Never rerun segmentation
    // or silently replace their kit configuration with today's Admin revision.
    ++upload.current;
    ++generation.current;
    ++configRead.current;
    controller.current?.abort();
    worker.current?.terminate();
    const c = document.createElement("canvas");
    c.width = d.width;
    c.height = d.height;
    c.getContext("2d")!.putImageData(
      new ImageData(new Uint8ClampedArray(d.rgba), d.width, d.height),
      0,
      0,
    );
    setSourceHash("");
    setSource(c);
    setAnalysis(d.analysis);
    setShape(d.shape);
    setKind(d.kind);
    setCaption(d.caption);
    setAdjustments([d.adjustment]);
    setRotation(d.rotation);
    setLines(d.lines);
    setConfig((old) =>
      JSON.stringify(old) === JSON.stringify(d.config) ? old : d.config,
    );
    setResult(undefined);
    setBefore(false);
    setMaskEdit(false);
    setMaskHistory([]);
    setSelected(0);
    setMaskWarning(d.analysis.cleanupUnavailable);
    setRestoredMaskEdited(d.maskEdited);
    setBusy(false);
    setPreparing(true);
    setError("");
    setStep("adjust");
    const id = upload.current;
    void hash(d.rgba).then(
      (digest) => {
        if (id === upload.current) {
          setSourceHash(digest);
          setPreparing(false);
        }
      },
      () => {
        if (id === upload.current) {
          setError("error");
          setPreparing(false);
        }
      },
    );
  }
  async function analyseCutout(
    c: HTMLCanvasElement,
    signal: AbortSignal,
  ): Promise<PhotoAnalysis> {
    setMaskWarning(false);
    if (kind === "people") {
      try {
        return await preparePersonPhoto(c, signal);
      } catch {
        if (signal.aborted) throw Error("cancelled");
      }
    }
    // Conservative colour-border fallback is explicitly disclosed, editable,
    // and never presented as phone-quality object segmentation.
    const small = document.createElement("canvas"),
      scale = Math.min(1, 512 / Math.max(c.width, c.height));
    small.width = Math.round(c.width * scale);
    small.height = Math.round(c.height * scale);
    small.getContext("2d")!.drawImage(c, 0, 0, small.width, small.height);
    let mask: PersonMask;
    try {
      mask = productSource(small).mask;
    } catch {
      mask = {
        width: small.width,
        height: small.height,
        values: new Float32Array(small.width * small.height).fill(1),
      };
    }
    setMaskWarning(true);
    return { faces: [], mask, faceUnavailable: true, cleanupUnavailable: true };
  }
  async function recut() {
    if (!source || preparing || busy) return;
    const id = ++upload.current,
      abort = new AbortController();
    controller.current?.abort();
    controller.current = abort;
    setPreparing(true);
    setError("");
    try {
      const a = await analyseCutout(source, abort.signal);
      if (id === upload.current) {
        // Re-cut changes only the mask. Re-running a detector can jitter its
        // boxes; keep the existing reviewed placement and importance regions.
        setAnalysis((old) =>
          old
            ? { ...old, mask: a.mask, cleanupUnavailable: a.cleanupUnavailable }
            : a,
        );
        setMaskHistory([]);
        setRestoredMaskEdited(false);
      }
    } catch {
      if (id === upload.current) setError("error");
    } finally {
      if (id === upload.current) setPreparing(false);
    }
  }
  function paintMask(e: PointerEvent<HTMLCanvasElement>) {
    if (!analysis || preparing || busy) return;
    if (e.type === "pointerdown") {
      e.currentTarget.setPointerCapture(e.pointerId);
      setMaskHistory((old) => [...old.slice(-7), analysis.mask]);
    } else if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = e.currentTarget.getBoundingClientRect(),
      x = (e.clientX - r.left) / r.width,
      y = (e.clientY - r.top) / r.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    setAnalysis((old) =>
      old
        ? {
            ...old,
            mask: paintPersonMask(old.mask, x, y, 0.045, brush === "restore"),
          }
        : old,
    );
  }
  function change(_j: number, fn: (a: HeadAdjustment) => HeadAdjustment) {
    setAdjustments((old) => [fn(old[0] ?? defaultHeadAdjustment())]);
  }
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));
  function pan(dx: number, dy: number) {
    const d = turnPoint(
      0.5 + dx,
      0.5 + dy,
      ((4 - rotation) % 4) as QuarterTurn,
    );
    change(selected, (a) => ({
      ...a,
      x: clamp(a.x + d.x - 0.5, -1.5, 1.5),
      y: clamp(a.y + d.y - 0.5, -1.5, 1.5),
    }));
  }
  function zoom(value: number) {
    change(selected, (a) => ({ ...a, zoom: clamp(value, 0.2, 4) }));
  }
  function point(e: { clientX: number; clientY: number }) {
    const r = surface.current!.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
  }
  function snapshot() {
    const ps = [...pointers.current.values()];
    if (!ps.length) return;
    return {
      x: ps.reduce((a, p) => a + p.x, 0) / ps.length,
      y: ps.reduce((a, p) => a + p.y, 0) / ps.length,
      distance:
        ps.length === 2 ? Math.hypot(ps[1].x - ps[0].x, ps[1].y - ps[0].y) : 0,
    };
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    if (busy || !framing) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    pointers.current.set(e.pointerId, p);
    gesture.current = snapshot();
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, point(e));
    const g = snapshot(),
      last = gesture.current;
    if (g && last) {
      pan(g.x - last.x, g.y - last.y);
      if (g.distance && last.distance)
        change(selected, (a) => ({
          ...a,
          zoom: clamp((a.zoom * g.distance) / last.distance, 0.2, 4),
        }));
    }
    gesture.current = g;
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);
    gesture.current = snapshot();
  }
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = surface.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      if (!framing || busy) return;
      e.preventDefault();
      zoomRef.current(
        (adjustments[selected]?.zoom ?? 1) * Math.exp(-e.deltaY * 0.0015),
      );
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [step, framing, busy, adjustments, selected]);
  function reset() {
    setAdjustments([]);
    setRotation(0);
    setMaskEdit(false);
    setMaskHistory([]);
    setBefore(false);
    setSelected(0);
  }
  async function generate(budget = lines) {
    const telemetry = analyticsClient.capture();
    if (!prepared || !framing || !source || !sourceHash) return;
    worker.current?.terminate();
    const id = ++generation.current,
      w = new Worker(new URL("./core/generator.worker.ts", import.meta.url), {
        type: "module",
      });
    worker.current = w;
    setLines(budget);
    setBusy(true);
    setFraction(0);
    setError("");
    const proof: KitPreparation = {
      version: "standard-preparation/9",
      sourceHash,
      sourceAspect: source.width / source.height,
      whiteBackground:
        restoredMaskEdited || maskHistory.length ? "manual" : "automatic",
      transform: framing,
    };
    w.onmessage = async ({ data }) => {
      if (id !== generation.current) return;
      if (data.type === "progress") setFraction(data.fraction);
      else if (data.type === "checkpoint") {
        try {
          const seed = await validateInstruction(data.instruction);
          if (id === generation.current)
            await saveOptimizerRecovery({
              version: "iprasm.optimizer-recovery/1",
              strategy: "classic3",
              pixels: prepared.pixels,
              profile,
              resolution: 500,
              mode: "dark",
              lines: budget,
              seed,
              accessPolicy: "kit-build/1",
              edits: { ...DEFAULT_EDITS },
              name: t("result"),
            });
        } catch {}
      } else if (data.type === "done") {
        try {
          const i = await validateInstruction(data.instruction);
          if (id !== generation.current) return;
          setResult(i);
          telemetry({ kind: "preview-ready", shape: i.profile.shape });
          onPersist(i);
          setStep("result");
          await clearOptimizerRecovery();
        } catch {
          setError("error");
        } finally {
          if (id === generation.current) setBusy(false);
          w.terminate();
        }
      } else if (data.type === "error") {
        setError("error");
        setBusy(false);
        w.terminate();
      }
    };
    w.onerror = () => {
      if (id === generation.current) {
        setError("error");
        setBusy(false);
      }
    };
    w.postMessage({
      strategy: "classic3",
      jobId: id,
      pixels: prepared.pixels,
      profile,
      resolution: 500,
      lines: budget,
      mode: "dark",
      accessPolicy: "kit-build/1",
      kitPreparation: proof,
    });
  }
  const pins = classicPins(profile, 500),
    shapePath =
      shape === "heart"
        ? HEART_POLYGON.map(
            (p, j) => `${j ? "L" : "M"}${1 + p.x * 497},${1 + p.y * 497}`,
          ).join(" ") + "Z"
        : undefined;
  return (
    <section
      className="customer-flow"
      data-testid="customer-flow"
      data-screen={step}
      data-kind={kind}
    >
      <header className="customer-toolbar">
        {step !== "start" ? (
          <button
            className="customer-back"
            aria-label={t("back")}
            onClick={() => {
              if (busy) {
                generation.current++;
                worker.current?.terminate();
                setBusy(false);
              }
              setStep(step === "result" ? "adjust" : "start");
            }}
          >
            ‹
          </button>
        ) : (
          <span />
        )}
        <span>
          {step === "start" ? "" : t(step === "adjust" ? "adjust" : "result")}
        </span>
        <details className="customer-menu" data-testid="customer-menu">
          <summary>{t("menu")}</summary>
          <div>
            <button
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                setDraftOpen(true);
              }}
            >
              {photoDraftText(locale, "title")}
            </button>
            {active && (
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
            )}
            <button
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                onNavigate("library");
              }}
            >
              {t("library")}
            </button>
            <button
              onClick={(event) => {
                event.currentTarget.closest("details")?.removeAttribute("open");
                onNavigate("customer");
              }}
            >
              {t("account")}
            </button>
            <label>
              {productText(locale, "kind")}
              <select
                data-testid="product-kind"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as ProductKind);
                  setStep("start");
                  setSource(undefined);
                  setAnalysis(undefined);
                }}
              >
                {(
                  [
                    "people",
                    "animal",
                    "vehicle",
                    "object",
                    "lettering",
                  ] as const
                ).map((k) => (
                  <option key={k} value={k}>
                    {productText(locale, k)}
                  </option>
                ))}
              </select>
            </label>
            <button data-testid="enter-expert" onClick={onExpert}>
              {t("expert")}
            </button>
          </div>
        </details>
      </header>
      {draftOpen && active && (
        <Suspense fallback={null}>
          <PhotoDraftPanel
            locale={locale}
            capture={
              source && analysis && !preparing && !busy
                ? captureDraft
                : undefined
            }
            restore={restoreDraft}
            close={() => setDraftOpen(false)}
          />
        </Suspense>
      )}
      {step === "start" && (
        <div className="customer-start" data-testid="customer-start">
          {kind === "lettering" ? (
            <div>
              <label>
                {productText(locale, "lettering")}
                <input
                  data-testid="lettering-input"
                  dir="auto"
                  value={lettering}
                  onChange={(e) => setLettering(e.target.value)}
                />
              </label>
              <button
                className="primary"
                data-testid="prepare-lettering"
                onClick={() =>
                  void (async () => {
                    try {
                      const { rasterLettering } =
                          await import("./core/lettering"),
                        { shapeText } = await import("./core/mixed-lettering");
                      const g = await shapeText(lettering, {
                        widthMm: 500,
                        heightMm: 500,
                        shape: "rectangle",
                      });
                      const pixels = rasterLettering(g, 500);
                      const c = document.createElement("canvas");
                      c.width = c.height = 500;
                      const ctx = c.getContext("2d")!,
                        d = ctx.createImageData(500, 500);
                      for (let k = 0; k < 500 * 500; k++) {
                        d.data[k * 4] =
                          d.data[k * 4 + 1] =
                          d.data[k * 4 + 2] =
                            pixels[k * 3];
                        d.data[k * 4 + 3] = 255;
                      }
                      ctx.putImageData(d, 0, 0);
                      const blob = await new Promise<Blob>((r) =>
                        c.toBlob((b) => r(b!)),
                      );
                      await photo(
                        new File([blob], "lettering.png", {
                          type: "image/png",
                        }),
                      );
                    } catch {
                      setError("error");
                    }
                  })()
                }
              >
                {t("adjust")}
              </button>
            </div>
          ) : (
            <PhotoActions
              locale={locale}
              onPhoto={photo}
              galleryLabel={t("gallery")}
              cameraLabel={t("camera")}
              hint={false}
            />
          )}
        </div>
      )}
      {step === "adjust" && (
        <div data-testid="customer-adjust">
          <div className="compare-switch">
            {[true, false].map((b) => (
              <button
                key={String(b)}
                aria-pressed={before === b}
                onClick={() => setBefore(b)}
              >
                {t(b ? "before" : "after")}
              </button>
            ))}
          </div>
          <div
            className="customer-photo"
            ref={surface}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            data-testid="customer-gesture-surface"
          >
            <canvas
              ref={canvas}
              width="500"
              height="500"
              role="img"
              aria-label={t("adjust")}
              data-testid="customer-photo"
              data-framing={JSON.stringify(framing ?? null)}
            />
            <svg
              viewBox="0 0 500 500"
              className="customer-pin-ring"
              aria-hidden="true"
            >
              {shape === "circle" ? (
                <circle cx="249.5" cy="249.5" r="248.5" />
              ) : shape === "rectangle" ? (
                <rect x="1" y="1" width="497" height="497" />
              ) : (
                <path d={shapePath} />
              )}
              <g>
                {pins.map((p, j) => (
                  <circle key={j} cx={p.x} cy={p.y} r=".8" />
                ))}
              </g>
            </svg>
          </div>
          <div className="shape-chips" aria-label={t("chooseShape")}>
            {(["circle", "rectangle", "heart"] as const).map((s) => (
              <button
                key={s}
                aria-pressed={shape === s}
                disabled={busy}
                onClick={() => setShape(s)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {s === "circle" ? (
                    <circle cx="12" cy="12" r="9" />
                  ) : s === "rectangle" ? (
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                  ) : (
                    <path d="M12 21C-6 10 3-2 12 6C21-2 30 10 12 21Z" />
                  )}
                </svg>
                {t(s)}
              </button>
            ))}
          </div>
          {preparing ? (
            <p role="status">{t("preparing")}</p>
          ) : (
            <>
              <p className="customer-hint">{t("hint")}</p>
              <label className="customer-zoom">
                {t("zoom")}
                <input
                  aria-label={t("zoom")}
                  type="range"
                  min=".2"
                  max="4"
                  step=".01"
                  value={adjustments[selected]?.zoom ?? 1}
                  disabled={!display || busy}
                  onChange={(e) => zoom(Number(e.target.value))}
                />
              </label>
              <div className="customer-adjust-tools">
                <button
                  disabled={!display || busy}
                  onClick={() =>
                    setRotation(((rotation + 1) % 4) as QuarterTurn)
                  }
                >
                  {t("rotate")} ↻
                </button>
                <button disabled={!display || busy} onClick={reset}>
                  {t("reset")}
                </button>
              </div>
              <div className="customer-adjust-tools">
                <button
                  disabled={busy || preparing}
                  onClick={() => void recut()}
                >
                  {t("recut")}
                </button>
                <button
                  data-testid="edit-cutout"
                  disabled={busy || preparing || !analysis}
                  onClick={() => setMaskEdit(!maskEdit)}
                >
                  {t(maskEdit ? "maskDone" : "maskEdit")}
                </button>
              </div>
              {maskWarning && <p role="status">{t("maskWarning")}</p>}
              {maskEdit && (
                <section aria-label={t("maskEdit")}>
                  <p>{t("maskHint")}</p>
                  <div className="customer-adjust-tools">
                    <button
                      aria-pressed={brush === "erase"}
                      onClick={() => setBrush("erase")}
                    >
                      {t("erase")}
                    </button>
                    <button
                      aria-pressed={brush === "restore"}
                      onClick={() => setBrush("restore")}
                    >
                      {t("restore")}
                    </button>
                    <button
                      disabled={!maskHistory.length}
                      onClick={() => {
                        const mask = maskHistory.at(-1)!;
                        setAnalysis((a) => (a ? { ...a, mask } : a));
                        setMaskHistory((h) => h.slice(0, -1));
                      }}
                    >
                      {t("undoMask")}
                    </button>
                  </div>
                  <canvas
                    ref={maskCanvas}
                    data-testid="cutout-editor"
                    style={{ width: "100%", touchAction: "none" }}
                    onPointerDown={paintMask}
                    onPointerMove={paintMask}
                    onPointerUp={(e) =>
                      e.currentTarget.releasePointerCapture(e.pointerId)
                    }
                    onPointerCancel={(e) =>
                      e.currentTarget.releasePointerCapture(e.pointerId)
                    }
                  />
                </section>
              )}
              {kind === "people" && (
                <label className="customer-caption">
                  {t("caption")}
                  <input
                    data-testid="portrait-caption"
                    value={caption}
                    maxLength={64}
                    dir="auto"
                    disabled={busy}
                    onChange={(e) => setCaption(e.target.value)}
                  />
                </label>
              )}
              {kind === "people" &&
                caption.trim() &&
                (!framing || captionInvalid) && (
                  <p role="alert">{t("captionError")}</p>
                )}
            </>
          )}
          {source && analysis && !maskEdit && !tonal && (
            <p role={tone?.failed ? "alert" : "status"}>
              {t(tone?.failed ? "error" : "preparing")}
            </p>
          )}
          <button
            className="primary customer-main-action"
            disabled={preparing || maskEdit || !prepared || !sourceHash}
            onClick={() => {
              if (busy) {
                generation.current++;
                worker.current?.terminate();
                setBusy(false);
              } else void generate();
            }}
          >
            {busy ? t("cancel") : t("generate")}
          </button>
        </div>
      )}
      {step === "result" && result && (
        <div data-testid="customer-result">
          <canvas
            ref={actual}
            width="1000"
            height="1000"
            data-testid="customer-thread-result"
            role="img"
            aria-label={t("result")}
          />
          <p className="customer-effort">
            {result.metrics.lines} {t("threads")} · ~
            {((result.metrics.lines * 8) / 3600).toFixed(1)} {t("hours")}
          </p>
          <button
            className="primary customer-main-action"
            disabled={busy}
            onClick={() =>
              allowed(result) ? onGuide(result) : setGate("start")
            }
          >
            {t("start")}
          </button>
          <button
            className="outline customer-main-action"
            disabled={pdfBusy || busy}
            onClick={() =>
              allowed(result) ? void pdf(result) : setGate("pdf")
            }
          >
            {pdfBusy ? "…" : t("pdf")}
          </button>
          <button
            className="text-button customer-main-action"
            disabled={busy}
            onClick={() => setStep("adjust")}
          >
            {t("readjust")}
          </button>
          <details className="customer-details">
            <summary>{t("details")}</summary>
            <div className="budget-chips">
              {[2500, 3000, 3500].map((v) => (
                <button
                  key={v}
                  aria-pressed={lines === v}
                  disabled={busy}
                  onClick={() => void generate(v)}
                >
                  {v} · ~{((v * 8) / 3600).toFixed(1)} {t("hours")}
                </button>
              ))}
            </div>
            <Suspense fallback={<span>…</span>}>
              <SequenceAnimation
                instruction={result}
                locale={locale}
                active={active}
              />
            </Suspense>
          </details>
        </div>
      )}
      {busy && (
        <div className="customer-progress" role="status">
          {t("creating")} {Math.round(fraction * 100)}%
          <progress max="1" value={fraction} />
        </div>
      )}
      {error && (
        <div role="alert">
          {t(error)}
          <button onClick={() => setStep("start")}>{t("another")}</button>
        </div>
      )}
      {gate && result && (
        <dialog
          ref={dialog}
          className="customer-unlock"
          onCancel={() => setGate(undefined)}
        >
          <button onClick={() => setGate(undefined)}>{t("close")}</button>
          <BuildGate
            instruction={result}
            locale={locale}
            preview={<span />}
            onBuy={() => {
              setGate(undefined);
              onNavigate("customer");
            }}
          />
        </dialog>
      )}
    </section>
  );
}
