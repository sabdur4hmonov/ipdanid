import {
  frameProduct,
  prepareProductCanvas,
  productSource,
  type ProductKind,
} from "./core/product-framing";
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
import type { Instruction, Locale, RegionBox, Shape } from "./core/types";
import { DEFAULT_EDITS } from "./core/types";
import type { KitPreparation } from "./core/standard-preparation";
import {
  frameCustomerHeads,
  prepareCustomerCanvas,
  turnPoint,
} from "./core/customer-framing";
import {
  defaultHeadAdjustment,
  type HeadAdjustment,
} from "./core/portrait-framing";
import {
  unturnBox,
  unturnMask,
  type QuarterTurn,
} from "./core/photo-orientation";
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
import { validateInstruction } from "./core/validation";
import { useBuildAccess } from "./useBuildAccess";
import { BuildGate } from "./BuildGate";
import { download } from "./download";
import {
  saveOptimizerRecovery,
  clearOptimizerRecovery,
} from "./optimizer-storage";
import "./customer-flow.css";
const SequenceAnimation = lazy(() => import("./SequenceAnimation"));

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
    [bounds, setBounds] = useState<RegionBox>(),
    [lettering, setLettering] = useState("SALOM"),
    [caption, setCaption] = useState(""),
    [captionRaster, setCaptionRaster] = useState<{
      key: string;
      pixels: Uint8Array;
    }>(),
    [captionInvalid, setCaptionInvalid] = useState(false),
    [source, setSource] = useState<HTMLCanvasElement>(),
    [cleaned, setCleaned] = useState<HTMLCanvasElement>(),
    [analysis, setAnalysis] = useState<PhotoAnalysis>(),
    [sourceHash, setSourceHash] = useState(""),
    [config, setConfig] = useState(structuredClone(DEFAULT_STANDARD_KIT)),
    [adjustments, setAdjustments] = useState<HeadAdjustment[]>([]),
    [rotation, setRotation] = useState<QuarterTurn>(0),
    [shoulders, setShoulders] = useState(false),
    [before, setBefore] = useState(false),
    [selected, setSelected] = useState(0),
    [preparing, setPreparing] = useState(false),
    [busy, setBusy] = useState(false),
    [fraction, setFraction] = useState(0),
    [error, setError] = useState<"" | "error" | "noFace">(""),
    [result, setResult] = useState<Instruction>(),
    [lines, setLines] = useState<number>(DEFAULT_CUSTOMER_LINES),
    [gate, setGate] = useState<"pdf" | "start">(),
    [pdfBusy, setPdfBusy] = useState(false);
  const generation = useRef(0),
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
  const profile = useMemo(
    () =>
      leastSquaresProfile(
        standardProfiles(config).find((p) => p.shape === shape)!,
        true,
      ),
    [config, shape],
  );
  const faces = analysis?.faces.map((f) => f.face) ?? [];
  const baseFraming = useMemo(
    () =>
      source && analysis && (kind !== "people" || analysis.faces.length)
        ? frameProduct(
            kind,
            analysis.faces.map((f) => f.face),
            shape,
            source.width / source.height,
            shoulders,
            (kind === "people" ? analysis.faces : [0]).map(
              (_, j) => adjustments[j] ?? defaultHeadAdjustment(),
            ),
            rotation,
            bounds,
          )
        : undefined,
    [source, analysis, shape, shoulders, adjustments, rotation, kind, bounds],
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
  const prepared = useMemo(
    () =>
      source &&
      analysis &&
      framing &&
      (!framing.caption || captionRaster?.key === captionKey)
        ? prepareProductCanvas(
            cleaned ?? source,
            analysis.mask,
            framing,
            shape,
            false,
            captionRaster?.pixels,
          )
        : undefined,
    [source, cleaned, analysis, framing, shape, captionRaster, captionKey],
  );
  const original = useMemo(
    () =>
      before && source && framing
        ? prepareProductCanvas(source, undefined, framing, shape, true)
        : undefined,
    [before, source, framing, shape],
  );
  const allowed = useBuildAccess(result ? [result] : []);
  useEffect(() => {
    let live = true;
    void (kitConfig ? Promise.resolve(kitConfig) : currentStandardKit()).then(
      (c) => {
        if (live) setConfig(c);
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
    if (prepared) ctx.drawImage(original?.canvas ?? prepared.canvas, 0, 0);
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
  }, [source, prepared, original, step, shape]);
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
    const id = ++upload.current;
    controller.current?.abort();
    worker.current?.terminate();
    generation.current++;
    setResult(undefined);
    setSource(undefined);
    setCleaned(undefined);
    setAnalysis(undefined);
    setSourceHash("");
    setAdjustments([]);
    setRotation(0);
    setShoulders(false);
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
      let c = document.createElement("canvas");
      const scale = Math.min(1, 1536 / Math.max(image.width, image.height));
      c.width = Math.round(image.width * scale);
      c.height = Math.round(image.height * scale);
      c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
      image.close();
      setSource(c);
      const abort = new AbortController();
      controller.current = abort;
      let a: PhotoAnalysis;
      if (kind === "people") a = await preparePersonPhoto(c, abort.signal);
      else {
        const prepared = productSource(c);
        setCleaned(prepared.canvas);
        setBounds(prepared.bounds);
        a = {
          faces: [],
          mask: { width: 1, height: 1, values: new Float32Array([1]) },
          faceUnavailable: false,
          cleanupUnavailable: false,
        } as PhotoAnalysis;
      }
      if (id !== upload.current) return;
      if (a.analysisTurn) {
        const r = a.analysisTurn,
          rotated = document.createElement("canvas");
        rotated.width = r % 2 ? c.height : c.width;
        rotated.height = r % 2 ? c.width : c.height;
        const rc = rotated.getContext("2d")!;
        rc.translate(rotated.width / 2, rotated.height / 2);
        rc.rotate((r * Math.PI) / 2);
        rc.drawImage(c, -c.width / 2, -c.height / 2);
        c = rotated;
        const inverse = ((4 - r) % 4) as QuarterTurn;
        a = {
          ...a,
          mask: unturnMask(a.mask, inverse),
          faces: a.faces.map((f) => ({
            ...f,
            face: unturnBox(f.face, inverse),
          })),
          analysisTurn: 0,
        };
      }
      const digest = await hash(
        new Uint8Array(
          c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data,
        ),
      );
      if (id !== upload.current) return;
      setSource(c);
      setSourceHash(digest);
      if (
        kind === "people" &&
        (!a.faces.length || a.faces.length > (shape === "heart" ? 2 : 3))
      ) {
        setError("noFace");
        return;
      }
      setAnalysis(a);
    } catch {
      if (id === upload.current) setError("error");
    } finally {
      if (id === upload.current) setPreparing(false);
    }
  }
  function change(j: number, fn: (a: HeadAdjustment) => HeadAdjustment) {
    setAdjustments((old) =>
      (kind === "people" ? faces : [0]).map((_, k) =>
        k === j
          ? fn(old[k] ?? defaultHeadAdjustment())
          : (old[k] ?? defaultHeadAdjustment()),
      ),
    );
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
      x: clamp(a.x + d.x - 0.5, -0.3, 0.3),
      y: clamp(a.y + d.y - 0.5, -0.3, 0.3),
    }));
  }
  function zoom(value: number) {
    change(selected, (a) => ({ ...a, zoom: clamp(value, 0.65, 1.5) }));
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
    if (!pointers.current.size) {
      let nearest = 0,
        distance = Infinity;
      (framing.targetFaces ?? []).forEach((f, j) => {
        const d = Math.hypot(
          p.x - f.left - f.width / 2,
          p.y - f.top - f.height / 2,
        );
        if (d < distance) {
          nearest = j;
          distance = d;
        }
      });
      setSelected(nearest);
    }
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
          zoom: clamp((a.zoom * g.distance) / last.distance, 0.65, 1.5),
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
    setShoulders(false);
    setBefore(false);
    setSelected(0);
  }
  async function generate(budget = lines) {
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
      version: framing.caption
        ? "standard-preparation/6"
        : "standard-preparation/5",
      sourceHash,
      sourceAspect: source.width / source.height,
      whiteBackground: "automatic",
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
            <button onClick={() => onNavigate("library")}>
              {t("library")}
            </button>
            <button onClick={() => onNavigate("customer")}>
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
                  setCleaned(undefined);
                  setAnalysis(undefined);
                  setBounds(undefined);
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
          <div className="shape-chips" aria-label={t("adjust")}>
            {(["circle", "rectangle", "heart"] as const).map((s) => (
              <button
                key={s}
                aria-pressed={shape === s}
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
          {preparing ? (
            <p role="status">{t("preparing")}</p>
          ) : (
            <>
              <p className="customer-hint">{t("hint")}</p>
              {faces.length > 1 && (
                <div className="person-chips">
                  {faces.map((_, j) => (
                    <button
                      key={j}
                      aria-pressed={selected === j}
                      onClick={() => setSelected(j)}
                    >
                      {t("person")} {j + 1}
                    </button>
                  ))}
                </div>
              )}
              <label className="customer-zoom">
                {t("zoom")}
                <input
                  aria-label={t("zoom")}
                  type="range"
                  min=".65"
                  max="1.5"
                  step=".01"
                  value={adjustments[selected]?.zoom ?? 1}
                  disabled={!prepared || busy}
                  onChange={(e) => zoom(Number(e.target.value))}
                />
              </label>
              <div className="customer-adjust-tools">
                <button
                  disabled={!prepared || busy}
                  onClick={() =>
                    setRotation(((rotation + 1) % 4) as QuarterTurn)
                  }
                >
                  {t("rotate")} ↻
                </button>
                <button disabled={!prepared || busy} onClick={reset}>
                  {t("reset")}
                </button>
              </div>
              <label className="customer-shoulders" hidden={kind !== "people"}>
                <input
                  type="checkbox"
                  checked={shoulders}
                  disabled={!prepared || busy}
                  onChange={(e) => setShoulders(e.target.checked)}
                />
                {t("shoulders")}
              </label>
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
          <button
            className="primary customer-main-action"
            disabled={preparing || !prepared || !sourceHash}
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
