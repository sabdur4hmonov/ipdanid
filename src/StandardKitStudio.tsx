import { useEffect, useRef, useState,useMemo } from "react";
import type { Instruction, Locale, RegionBox,Shape } from "./core/types";
import { DEFAULT_EDITS } from "./core/types";
import { faceFill,type KitPreparation } from "./core/standard-preparation";
import { DEFAULT_STANDARD_KIT,standardProfiles,type StandardKitConfig } from "./core/standard-kit";
import { currentStandardKit } from "./standard-kit-settings";
import { hash } from "./core/engine";
import { qualityCurve,measuredKnee } from "./core/line-budget";
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
    [config,setConfig]=useState<StandardKitConfig>(structuredClone(DEFAULT_STANDARD_KIT)),
    [shape,setShape]=useState<Shape>("circle"),
    [recommendation,setRecommendation]=useState<ReturnType<typeof measuredKnee>>(),
    [sourceId, setSourceId] = useState(""),
    [background, setBackground] = useState<BackgroundState>(),
    [faces, setFaces] = useState<RegionBox[]>([]),
    [n, setN] = useState(160),
    [lines, setLines] = useState(2500),
    [prepared, setPrepared] = useState<{
      pixels: Uint8Array;
      canvas: HTMLCanvasElement;
      proof:KitPreparation;
    }>(),
    [reviewed, setReviewed] = useState(false),
    [result, setResult] = useState<Instruction>(),
    [busy, setBusy] = useState(false),
    [backgroundBusy, setBackgroundBusy] = useState(false),
    [fraction, setFraction] = useState(0),
    [error, setError] = useState(""),
    [recovery, setRecovery] = useState<OptimizerRecovery>();
  const serial = useRef(0),
    photoSerial = useRef(0),
    worker = useRef<Worker | null>(null),
    target = useRef<HTMLCanvasElement>(null),
    actual = useRef<HTMLCanvasElement>(null);
  const profile=useMemo(()=>standardProfiles(config).find(p=>p.shape===shape)!,[config,shape]);
  useEffect(()=>{let live=true;void currentStandardKit().then(c=>{if(live)setConfig(c);});return()=>{live=false;};},[]);
  useEffect(() => {
    void readOptimizerRecovery().then((r) => {
      if (r?.strategy === "classic") setRecovery(r);
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
  }, [source, background, faces, n, lines,config,shape]);
  useEffect(() => {
    if (prepared && target.current) {
      target.current.width = n;
      target.current.height = n;
      target.current.getContext("2d")!.drawImage(prepared.canvas, 0, 0);
    }
  }, [prepared, n]);
  useEffect(() => {
    if (result && actual.current) {
      actual.current.width = 600;
      actual.current.height = 600;
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
      setBackground(undefined);
      setSourceId(crypto.randomUUID());
      setSource(c);
    } catch {
      if (request === photoSerial.current) setError(t("error"));
    }
  }
  async function prepare() {
    const request=serial.current;
    try {
      if (!source) throw Error();
      const transform = faceFill(
        faces,
        shape,
        source.width / source.height,
        profile.standardKit!.patternScale,
      );
      const c = document.createElement("canvas");
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
      const rgba = ctx.getImageData(0, 0, n, n).data,
        pixels = Uint8Array.from(
          { length: n * n * 3 },
          (_, k) => rgba[Math.floor(k / 3) * 4 + (k % 3)],
        );
      const sourceHash=await hash(new Uint8Array(source.getContext("2d")!.getImageData(0,0,source.width,source.height).data));
      if(request!==serial.current)return;
      setPrepared({ pixels, canvas: c,proof:{version:"standard-preparation/1",sourceHash,sourceAspect:source.width/source.height,
        whiteBackground:background?.enabled && background.mask?(background.status==="manual"?"manual":"automatic"):"original",transform} });
      setReviewed(false);
      setResult(undefined);
      setError("");
    } catch {
      setError(t("error"));
    }
  }
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
            strategy: "classic",
            pixels,
            profile: p,
            resolution,
            mode: "dark",
            lines: budget,
            seed,
            accessPolicy: "kit-build/1",
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
          setRecommendation(measuredKnee(qualityCurve(i,pixels)));
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
      strategy: "classic",
      jobId: request,
      pixels,
      profile: p,
      resolution,
      lines: budget,
      mode: "dark",
      accessPolicy: "kit-build/1",
      kitPreparation:resume?.seed?.params.kitPreparation??prepared?.proof,
      ...(resume?.seed ? { seed: resume.seed } : {}),
    });
  }
  return (
    <section className="card" data-testid="standard-kit-studio">
      <h1>{t("title")}</h1>
      <p>{t("hint")}</p>
      <p>{config.baseMm}×{config.baseMm} mm · {config.nails} · {config.threadMm} mm · r{config.revision}</p>
      <label>{t("shape")}<select aria-label={t("shape")} value={shape} onChange={e=>setShape(e.target.value as Shape)}>{(["circle","rectangle","heart"] as const).map(s=><option key={s} value={s}>{t(s)}</option>)}</select></label>
      <details><summary>{t("config")}</summary><p>{t("profileNote")}</p>{(["sheet","tiles","stickers"] as const).map(kind=><button key={kind} onClick={()=>void (async()=>{try{const {standardKitPdf}=await import("./core/standard-kit-pdf");await download(`ip-rasm-standard-${kind}-r${config.revision}.pdf`,new Blob([new Uint8Array(await standardKitPdf(config,kind))],{type:"application/pdf"}));}catch{setError(t("error"));}})()}>{t(kind)}</button>)}</details>
      <PhotoActions locale={locale} onPhoto={photo} />
      {source && (
        <>
          <details>
            <summary>{t("faces")}</summary>
            <PersonBackground
              key={sourceId}
              source={source}
              locale={locale}
              initial={background}
              onBusy={setBackgroundBusy}
              onChange={(next) => {
                setBackground(next);
                if (next.faces?.length) setFaces(next.faces.map((f) => f.face));
              }}
            />
            <p>{t("faceReview")}</p>
            {faces.map((face, j) => (
              <fieldset key={j}>
                <legend>{j + 1}</legend>
                {(["left", "top", "width", "height"] as const).map((key) => (
                  <label key={key}>
                    {key}
                    <input
                      aria-label={`Face ${j + 1} ${key}`}
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
                {[64, 96, 160, 192].map((v) => (
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
          <canvas ref={target} style={{ width: "100%", maxWidth: 600 }} />
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
          <canvas ref={actual} style={{ width: "100%", maxWidth: 600 }} />
          <p>
            {result.metrics.lines} · {result.metrics.estimatedMeters.toFixed(1)}{" "}
            m · {t("hours")}: {((result.metrics.lines * (result.profile.standardKit?.config.secondsPerConnection??8)) / 3600).toFixed(1)}
          </p>
          <p>{recommendation?.status==="measured"?`${t("recommended")}: ${recommendation.connections} · ${recommendation.hours.toFixed(1)} h`:t("pendingKnee")}</p>
          <button onClick={() => onGuide(result)}>{t("save")}</button>
        </>
      )}
    </section>
  );
}
