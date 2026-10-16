import { useEffect, useRef, useState, useMemo } from "react";
import type { Instruction, Locale, RegionBox, Shape } from "./core/types";
import { DEFAULT_EDITS } from "./core/types";
import { faceFill, type KitPreparation } from "./core/standard-preparation";
import {
  faceFillReference,
  prepareReferenceCanvas,
} from "./core/reference-preparation";
import { referenceProfile } from "./core/classic-reference";
import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
  type StandardKitConfig,
} from "./core/standard-kit";
import {
  currentStandardKit,
  standardKitRevision,
} from "./standard-kit-settings";
import { hash } from "./core/engine";
import { qualityCurve, measuredKnee } from "./core/line-budget";
import { download } from "./download";
import { standardText } from "./standard-kit-i18n";
import { PhotoActions } from "./PhotoActions";
import { PersonBackground, type BackgroundState } from "./PersonBackground";
import { loadPhoto } from "./core/image";
import { renderInstruction } from "./core/render";
import { validateInstruction } from "./core/validation";
import {
  saveOptimizerRecovery,
  readOptimizerRecovery,
  clearOptimizerRecovery,
  type OptimizerRecovery,
} from "./optimizer-storage";

export function StandardKitStudio({
  locale,
  onGuide,
}: {
  locale: Locale;
  onGuide: (i: Instruction) => void;
}) {
  const t = (k: Parameters<typeof standardText>[1]) => standardText(locale, k);
  const [source, setSource] = useState<HTMLCanvasElement>(),
    [config, setConfig] = useState<StandardKitConfig>(
      structuredClone(DEFAULT_STANDARD_KIT),
    ),
    [shape, setShape] = useState<Shape>("circle"),
    [printedRevision, setPrintedRevision] = useState(1),
    [redAccent, setRedAccent] = useState(false),
    [redColour, setRedColour] = useState("#b31e35"),
    [recommendation, setRecommendation] =
      useState<ReturnType<typeof measuredKnee>>(),
    [sourceId, setSourceId] = useState(""),
    [background, setBackground] = useState<BackgroundState>(),
    [faces, setFaces] = useState<RegionBox[]>([]),
    [n, setN] = useState(500),
    [engine, setEngine] = useState<"classic2" | "classic">("classic2"),
    [lines, setLines] = useState(2500),
    [prepared, setPrepared] = useState<{
      pixels: Uint8Array;
      canvas: HTMLCanvasElement;
      proof: KitPreparation;
    }>(),
    [reviewed, setReviewed] = useState(false),
    [result, setResult] = useState<Instruction>(),
    [busy, setBusy] = useState(false),
    [backgroundBusy, setBackgroundBusy] = useState(false),
    [fraction, setFraction] = useState(0),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState<OptimizerRecovery>();
  const serial = useRef(0),
    profileRequest = useRef(0),
    photoSerial = useRef(0),
    worker = useRef<Worker | null>(null),
    photoPreview = useRef<HTMLCanvasElement>(null),
    target = useRef<HTMLCanvasElement>(null),
    actual = useRef<HTMLCanvasElement>(null);
  const profile = useMemo(() => {
    const p = standardProfiles(config).find((p) => p.shape === shape)!;
    return engine === "classic2" ? referenceProfile(p) : p;
  }, [config, shape, engine]);
  useEffect(() => {
    let live = true;
    const request = ++profileRequest.current;
    void currentStandardKit().then((c) => {
      if (live && request === profileRequest.current) {
        setConfig(c);
        setPrintedRevision(c.revision);
      }
    });
    return () => {
      live = false;
      profileRequest.current++;
    };
  }, []);
  useEffect(() => {
    void readOptimizerRecovery().then((r) => {
      if (r?.strategy === "classic" || r?.strategy === "classic2")
        setRecovery(r);
    });
    return () => {
      serial.current++;
      photoSerial.current++;
      worker.current?.terminate();
    };
  }, []);
  useEffect(() => {
    serial.current++;
    worker.current?.terminate();
    setBusy(false);
    setPrepared(undefined);
    setReviewed(false);
    setResult(undefined);
    setRecommendation(undefined);
  }, [
    source,
    background,
    faces,
    n,
    lines,
    config,
    shape,
    redAccent,
    redColour,
    engine,
  ]);
  useEffect(() => {
    if (!source || !photoPreview.current) return;
    const canvas = photoPreview.current;
    canvas.width = source.width;
    canvas.height = source.height;
    canvas
      .getContext("2d")!
      .drawImage(
        background?.enabled && background.canvas ? background.canvas : source,
        0,
        0,
      );
  }, [source, background]);
  useEffect(() => {
    if (prepared && target.current) {
      target.current.width = n;
      target.current.height = n;
      target.current.getContext("2d")!.drawImage(prepared.canvas, 0, 0);
    }
  }, [prepared, n]);
  useEffect(() => {
    if (result && actual.current) {
      actual.current.width = 1000;
      actual.current.height = 1000;
      renderInstruction(actual.current.getContext("2d")!, result);
    }
  }, [result]);
  async function photo(file: File) {
    const request = ++photoSerial.current;
    serial.current++;
    worker.current?.terminate();
    setBusy(false);
    setError("");
    try {
      const image = await loadPhoto(file);
      if (request !== photoSerial.current) {
        image.close();
        return;
      }
      const c = document.createElement("canvas"),
        scale = Math.min(1, 1536 / Math.max(image.width, image.height));
      c.width = Math.max(1, Math.round(image.width * scale));
      c.height = Math.max(1, Math.round(image.height * scale));
      c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
      image.close();
      setFaces([]);
      setEngine("classic2");
      setN(500);
      setLines(2500);
      setRedAccent(false);
      setBackground(undefined);
      setSourceId(crypto.randomUUID());
      setSource(c);
    } catch {
      if (request === photoSerial.current) setError(t("error"));
    }
  }
  async function prepare() {
    const request = serial.current;
    try {
      if (!source) throw Error();
      const transform =
        engine === "classic2"
          ? faceFillReference(faces, shape, source.width / source.height)
          : faceFill(
              faces,
              shape,
              source.width / source.height,
              profile.standardKit!.patternScale,
            );
      let c = document.createElement("canvas");
      c.width = c.height = n;
      const ctx = c.getContext("2d")!,
        s = transform.sourceBounds,
        d = transform.targetBounds;
      const image =
        background?.enabled && background.canvas ? background.canvas : source;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, n, n);
      ctx.drawImage(
        image,
        s.left * image.width,
        s.top * image.height,
        s.width * image.width,
        s.height * image.height,
        d.left * n,
        d.top * n,
        d.width * n,
        d.height * n,
      );
      const rgba = ctx.getImageData(0, 0, n, n).data;
      let pixels = Uint8Array.from(
        { length: n * n * 3 },
        (_, k) => rgba[Math.floor(k / 3) * 4 + (k % 3)],
      );
      if (engine === "classic2") {
        const prepared = prepareReferenceCanvas(
          source,
          background?.enabled ? background.mask : undefined,
          transform,
          n,
        );
        c = prepared.canvas;
        pixels = prepared.pixels;
      }
      const sourceHash = await hash(
        new Uint8Array(
          source
            .getContext("2d")!
            .getImageData(0, 0, source.width, source.height).data,
        ),
      );
      if (request !== serial.current) return;
      setPrepared({
        pixels,
        canvas: c,
        proof: {
          version:
            engine === "classic2"
              ? "standard-preparation/2"
              : "standard-preparation/1",
          sourceHash,
          sourceAspect: source.width / source.height,
          whiteBackground:
            background?.enabled && background.mask
              ? background.status === "manual"
                ? "manual"
                : "automatic"
              : "original",
          transform,
        },
      });
      setReviewed(false);
      setResult(undefined);
      setError("");
    } catch {
      setError(t("error"));
    }
  }
  useEffect(() => {
    if (
      source &&
      background &&
      !backgroundBusy &&
      background.status !== "processing" &&
      faces.length
    )
      void prepare();
  }, [
    source,
    background,
    backgroundBusy,
    faces,
    n,
    lines,
    config,
    shape,
    engine,
    redAccent,
    redColour,
  ]);
  function calculate(resume?: OptimizerRecovery) {
    if (!resume && (!prepared || !reviewed)) return;
    worker.current?.terminate();
    const request = ++serial.current,
      w = new Worker(new URL("./core/generator.worker.ts", import.meta.url), {
        type: "module",
      });
    worker.current = w;
    const pixels = resume?.pixels ?? prepared!.pixels,
      p = resume?.profile ?? profile,
      resolution = resume?.resolution ?? n,
      budget = resume?.lines ?? lines;
    setBusy(true);
    setFraction(0);
    setError("");
    w.onmessage = async ({ data }) => {
      if (request !== serial.current) return;
      if (data.type === "progress") setFraction(data.fraction);
      else if (data.type === "checkpoint") {
        try {
          const seed = await validateInstruction(data.instruction);
          if (request !== serial.current) return;
          const next: OptimizerRecovery = {
            version: "iprasm.optimizer-recovery/1",
            strategy: resume?.strategy ?? engine,
            pixels,
            profile: p,
            resolution,
            mode: "dark",
            lines: budget,
            seed,
            accessPolicy: "kit-build/1",
            redAccentColor:
              resume?.redAccentColor ??
              (shape === "heart" && redAccent ? redColour : undefined),
            edits: { ...DEFAULT_EDITS },
            name: t("title"),
          };
          await saveOptimizerRecovery(next);
          if (request === serial.current) setRecovery(next);
        } catch {
          if (request === serial.current) setError(t("error"));
        }
      } else if (data.type === "done") {
        try {
          const i = await validateInstruction(data.instruction);
          if (request !== serial.current) return;
          setResult(i);
          if (!["classic-greedy/2", "standard-accent/21"].includes(i.algorithm))
            setRecommendation(
              measuredKnee(qualityCurve(data.classicBody ?? i, pixels)),
            );
          await clearOptimizerRecovery();
          setRecovery(undefined);
        } catch {
          setError(t("error"));
        } finally {
          if (request === serial.current) {
            setBusy(false);
            w.terminate();
          }
        }
      } else if (data.type === "error") {
        setError(t("error"));
        setBusy(false);
        w.terminate();
      }
    };
    w.onerror = () => {
      if (request === serial.current) {
        setError(t("error"));
        setBusy(false);
      }
    };
    w.postMessage({
      strategy: resume?.strategy ?? engine,
      jobId: request,
      pixels,
      profile: p,
      resolution,
      lines: budget,
      mode: "dark",
      accessPolicy: "kit-build/1",
      kitPreparation: resume?.seed?.params.kitPreparation ?? prepared?.proof,
      redAccentColor:
        resume?.redAccentColor ??
        (shape === "heart" && redAccent ? redColour : undefined),
      ...(resume?.seed ? { seed: resume.seed } : {}),
    });
  }
  return (
    <section className="card" data-testid="standard-kit-studio">
      <h1>{t("title")}</h1>
      <details>
        <summary>{t("printedRevision")}</summary>
        <label>
          {t("printedRevision")}
          <input
            type="number"
            min="1"
            value={printedRevision}
            onChange={(e) => setPrintedRevision(Number(e.target.value))}
          />
        </label>
        <button
          onClick={() =>
            void (async () => {
              const request = ++profileRequest.current;
              try {
                const c = await standardKitRevision(printedRevision);
                if (request === profileRequest.current) {
                  setConfig(c);
                  setError("");
                }
              } catch {
                if (request === profileRequest.current)
                  setError(t("configError"));
              }
            })()
          }
        >
          {t("loadRevision")}
        </button>
      </details>
      <p>{t("hint")}</p>
      <p>
        {config.baseMm}×{config.baseMm} mm · {config.nails} · {config.threadMm}{" "}
        mm · r{config.revision}
      </p>
      <label>
        {t("shape")}
        <select
          aria-label={t("shape")}
          value={shape}
          onChange={(e) => setShape(e.target.value as Shape)}
        >
          {(["circle", "rectangle", "heart"] as const).map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </select>
      </label>
      {shape === "heart" && (
        <>
          <label>
            <input
              type="checkbox"
              checked={redAccent}
              onChange={(e) => setRedAccent(e.target.checked)}
            />
            {t("redAccent")}
          </label>
          {redAccent && (
            <label>
              {t("accentColour")}
              <input
                type="color"
                value={redColour}
                onChange={(e) => setRedColour(e.target.value)}
              />
            </label>
          )}
          <p>{t("accentNote")}</p>
        </>
      )}
      <details>
        <summary>{t("config")}</summary>
        <p>{t("profileNote")}</p>
        {(["sheet", "tiles", "stickers"] as const).map((kind) => (
          <button
            key={kind}
            onClick={() =>
              void (async () => {
                try {
                  const { standardKitPdf } =
                    await import("./core/standard-kit-pdf");
                  await download(
                    `ip-rasm-standard-${kind}-r${config.revision}.pdf`,
                    new Blob(
                      [new Uint8Array(await standardKitPdf(config, kind))],
                      { type: "application/pdf" },
                    ),
                  );
                } catch {
                  setError(t("error"));
                }
              })()
            }
          >
            {t(kind)}
          </button>
        ))}
      </details>
      <PhotoActions locale={locale} onPhoto={photo} hint={!source} />
      {source && (
        <>
          <figure style={{ margin: "16px 0" }}>
            <figcaption>{t("photoPreview")}</figcaption>
            <canvas
              ref={photoPreview}
              role="img"
              aria-label={t("photoPreview")}
              data-testid="standard-photo-preview"
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                maxHeight: "60vh",
                objectFit: "contain",
                borderRadius: 12,
              }}
            />
          </figure>
          <PersonBackground
            key={sourceId}
            source={source}
            locale={locale}
            initial={background}
            onBusy={setBackgroundBusy}
            onChange={(next) => {
              setBackground(next);
              if (next.faces?.length && next.faces !== background?.faces)
                setFaces(next.faces.map((f) => f.face));
            }}
          />
          <details>
            <summary>{t("faces")}</summary>
            <p>{t("faceReview")}</p>
            {faces.map((face, j) => (
              <fieldset key={j}>
                <legend>{j + 1}</legend>
                {(["left", "top", "width", "height"] as const).map((key) => (
                  <label key={key}>
                    {t(key)}
                    <input
                      aria-label={`${t("face")} ${j + 1} ${t(key)}`}
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={face[key]}
                      onChange={(e) =>
                        setFaces((v) =>
                          v.map((f, k) =>
                            k === j
                              ? { ...f, [key]: Number(e.target.value) }
                              : f,
                          ),
                        )
                      }
                    />
                  </label>
                ))}
                <button
                  onClick={() => setFaces((v) => v.filter((_, k) => k !== j))}
                >
                  {t("delete")}
                </button>
              </fieldset>
            ))}
            <button
              disabled={faces.length >= profile.standardKit!.maxPeople}
              onClick={() =>
                setFaces((v) => [
                  ...v,
                  { left: 0.3, top: 0.15, width: 0.4, height: 0.5 },
                ])
              }
            >
              {t("add")}
            </button>
          </details>
          {background?.status === "failed" || background?.enabled === false ? (
            <p role="status">{t("original")}</p>
          ) : null}
          <details>
            <summary>{t("lines")}</summary>
            <label>
              {t("engine")}
              <select
                aria-label={t("engine")}
                value={engine}
                onChange={(e) => {
                  const v = e.target.value as "classic" | "classic2";
                  setEngine(v);
                  setN(v === "classic2" ? 500 : 160);
                  setRedAccent(false);
                }}
              >
                <option value="classic2">classic-greedy/2</option>
                <option value="classic">classic-greedy/1</option>
              </select>
            </label>
            <label>
              {t("lines")}
              <input
                type="number"
                min="1"
                max="20000"
                value={lines}
                onChange={(e) => setLines(Number(e.target.value))}
              />
            </label>
            <label>
              {t("resolution")}
              <select
                aria-label={t("resolution")}
                value={n}
                onChange={(e) => setN(Number(e.target.value))}
              >
                {(engine === "classic2"
                  ? [64, 96, 160, 192, 500]
                  : [64, 96, 160, 192]
                ).map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          </details>
          <button disabled={backgroundBusy || busy} onClick={prepare}>
            {t("prepare")}
          </button>
        </>
      )}
      {prepared && (
        <>
          <p>{t("target")}</p>
          <canvas
            ref={target}
            role="img"
            aria-label={t("target")}
            data-testid="standard-prepared-target"
            style={{ width: "100%", maxWidth: 600 }}
          />
          <label>
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            {t("review")}
          </label>
          <button disabled={!reviewed || busy} onClick={() => calculate()}>
            {t("generate")}
          </button>
        </>
      )}
      {busy && (
        <>
          <progress max="1" value={fraction} />
          <button
            onClick={() => {
              serial.current++;
              worker.current?.terminate();
              setBusy(false);
            }}
          >
            {t("cancel")}
          </button>
        </>
      )}
      {recovery && !busy && (
        <button onClick={() => calculate(recovery)}>{t("resume")}</button>
      )}
      {error && <p role="alert">{error}</p>}
      {result && (
        <>
          <h2>{t("actual")}</h2>
          <canvas
            ref={actual}
            role="img"
            aria-label={t("actual")}
            data-testid="standard-thread-result"
            style={{ width: "100%", maxWidth: 600 }}
          />
          <p>
            {result.metrics.lines} · {result.metrics.estimatedMeters.toFixed(1)}{" "}
            m · {t("hours")}:{" "}
            {(
              (result.metrics.lines *
                (result.profile.standardKit?.config.secondsPerConnection ??
                  8)) /
              3600
            ).toFixed(1)}
          </p>
          <p>
            {recommendation?.status === "measured"
              ? `${t("recommended")}: ${recommendation.connections} · ${recommendation.hours.toFixed(1)} h`
              : t("pendingKnee")}
          </p>
          <button onClick={() => onGuide(result)}>{t("save")}</button>
        </>
      )}
    </section>
  );
}
