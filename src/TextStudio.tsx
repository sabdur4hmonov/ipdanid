import { useEffect, useRef, useState } from "react";
import type { Instruction, Locale } from "./core/types";
import { DEFAULT_EDITS } from "./core/types";
import { letteringText } from "./lettering-i18n";
import {
  letteringInput,
  loadLetteringFont,
  shapeLettering,
  type LetteringGeometry,
} from "./core/lettering";
import {
  generateGlyphOutline,
  letteringTarget,
  prepareLetteringTarget,
} from "./core/lettering-guide";
import { createProfile } from "./core/geometry";
import { renderInstruction } from "./core/render";
import { validateInstruction } from "./core/validation";
import { sealGenerationInput, saveGenerationInput } from "./generation-inputs";
import {
  saveOptimizerRecovery,
  clearOptimizerRecovery,
  type OptimizerRecovery,
} from "./optimizer-storage";
import { customerError } from "./errors";

export default function TextStudio({
  locale,
  onGuide,
}: {
  locale: Locale;
  onGuide: (i: Instruction) => void;
}) {
  const t = (key: Parameters<typeof letteringText>[1]) =>
    letteringText(locale, key);
  const [text, setText] = useState("SALOM"),
    [style, setStyle] = useState<"target" | "outline">("outline"),
    [width, setWidth] = useState(600),
    [height, setHeight] = useState(300),
    [pins, setPins] = useState(120),
    [lines, setLines] = useState(1500),
    [n, setN] = useState(160),
    [prepared, setPrepared] = useState<{
      key: string;
      g: LetteringGeometry;
      bytes: Uint8Array;
    }>(),
    [reviewed, setReviewed] = useState(false),
    [result, setResult] = useState<Instruction>(),
    [busy, setBusy] = useState(false),
    [fraction, setFraction] = useState(0),
    [error, setError] = useState("");
  const source = useRef<HTMLCanvasElement>(null),
    actual = useRef<HTMLCanvasElement>(null),
    worker = useRef<Worker | null>(null),
    serial = useRef(0),
    key = JSON.stringify([text, style, width, height, pins, lines, n]),
    valid = prepared?.key === key;
  useEffect(
    () => () => {
      serial.current++;
      worker.current?.terminate();
    },
    [],
  );
  useEffect(() => {
    setReviewed(false);
    setResult(undefined);
  }, [key]);
  useEffect(() => {
    if (!valid || !prepared || !source.current) return;
    const c = source.current,
      ctx = c.getContext("2d")!,
      p = createProfile("rectangle", pins, "dark", {
        widthMm: width,
        heightMm: height,
      }),
      pixels = letteringTarget(prepared.g, p, n);
    c.width = c.height = n;
    const image = ctx.createImageData(n, n);
    for (let k = 0; k < n * n; k++) {
      image.data.set(pixels.slice(k * 3, k * 3 + 3), k * 4);
      image.data[k * 4 + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  }, [valid, prepared, pins, n, width, height]);
  useEffect(() => {
    if (result && actual.current) {
      actual.current.width = 900;
      actual.current.height = Math.round(
        (900 * result.profile.heightMm) / result.profile.widthMm,
      );
      renderInstruction(actual.current.getContext("2d")!, result, {
        pins: true,
      });
    }
  }, [result]);
  function showError(e: unknown) {
    const m = String(e);
    setError(
      /lettering\/|Pin spacing|glyph|font|contour/i.test(m)
        ? t("error")
        : customerError(m, locale),
    );
  }
  function cancel() {
    serial.current++;
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
  }
  async function prepare() {
    const job = ++serial.current;
    setBusy(true);
    setError("");
    setResult(undefined);
    setReviewed(false);
    try {
      const { font } = letteringInput(text),
        bytes = await loadLetteringFont(font),
        g = await shapeLettering(text, bytes, {
          widthMm: width,
          heightMm: height,
          shape: "rectangle",
        });
      createProfile("rectangle", pins, "dark", {
        widthMm: width,
        heightMm: height,
      });
      if (job === serial.current) setPrepared({ key, g, bytes });
    } catch (e) {
      if (job === serial.current) showError(e);
    } finally {
      if (job === serial.current) setBusy(false);
    }
  }
  async function calculate() {
    if (!valid || !prepared || !reviewed) {
      setError(t("waiting"));
      return;
    }
    const job = ++serial.current;
    setBusy(true);
    setError("");
    setResult(undefined);
    setFraction(0);
    try {
      if (style === "outline") {
        const i = await generateGlyphOutline({
          text,
          fontBytes: prepared.bytes,
          widthMm: width,
          heightMm: height,
          count: pins,
          resolution: n,
        });
        if (job === serial.current) {
          setResult(i);
          setBusy(false);
        }
        return;
      }
      const profile = createProfile("rectangle", pins, "dark", {
          widthMm: width,
          heightMm: height,
        }),
        target = await prepareLetteringTarget(prepared.g, profile, n, true),
        w = new Worker(new URL("./core/generator.worker.ts", import.meta.url), {
          type: "module",
        });
      worker.current = w;
      let recovery: OptimizerRecovery | undefined;
      w.onmessage = async ({ data }) => {
        if (job !== serial.current) return;
        try {
          if (data.type === "progress") {
            setFraction(data.fraction);
            return;
          }
          if (data.type === "stage" || data.type === "checkpoint") return;
          if (data.type === "fit-checkpoint") {
            recovery = {
              version: "iprasm.optimizer-recovery/1",
              ...data,
              pixels: target.pixels,
              subject: target.subject,
              product: target.product,
              edits: DEFAULT_EDITS,
              name: text,
              strategy: "subjects",
            };
            await saveOptimizerRecovery(recovery!);
            return;
          }
          if (data.type !== "done") throw Error(data.message);
          const i = await validateInstruction(data.instruction),
            input = await sealGenerationInput(
              {
                targetHash: i.imageHash,
                preparedRevision: target.subject.sourceRevision,
                edits: DEFAULT_EDITS,
                resolution: n,
                profile: i.profile,
                subject: i.params.subject,
                product: i.params.product,
                mode: "dark",
                lines: i.params.requestedLines,
                strategy: "subjects",
                objective: i.params.optimization,
              },
              target.pixels,
            );
          await saveGenerationInput(i, input, recovery);
          await clearOptimizerRecovery();
          if (job !== serial.current) return;
          setResult(i);
          setBusy(false);
          w.terminate();
          worker.current = null;
        } catch (e) {
          if (job === serial.current) {
            showError(e);
            setBusy(false);
            w.terminate();
            worker.current = null;
          }
        }
      };
      w.onerror = () => {
        if (job === serial.current) {
          setError(t("error"));
          setBusy(false);
          w.terminate();
          worker.current = null;
        }
      };
      w.postMessage({
        ...target,
        profile,
        resolution: n,
        lines,
        mode: "dark",
        strategy: "subjects",
        jobId: job,
      });
    } catch (e) {
      if (job === serial.current) {
        showError(e);
        setBusy(false);
      }
    }
  }
  return (
    <section className="card" data-testid="text-studio">
      <h2>{t("title")}</h2>
      <p>{t("hint")}</p>
      <fieldset disabled={busy}>
        <label>
          {t("text")}
          <input
            data-testid="lettering-text"
            dir="auto"
            value={text}
            maxLength={128}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <label>
          {t("style")}
          <select
            data-testid="lettering-style"
            value={style}
            onChange={(e) => setStyle(e.target.value as typeof style)}
          >
            <option value="outline">{t("outline")}</option>
            <option value="target">{t("target")}</option>
          </select>
        </label>
        <details>
          <summary>{t("details")}</summary>
          {[
            [t("width"), width, setWidth, 50, 2000],
            [t("height"), height, setHeight, 50, 2000],
            [t("pins"), pins, setPins, 24, 240],
            [t("lines"), lines, setLines, 24, 20000],
          ].map(([label, value, set, min, max]) => (
            <label key={String(label)}>
              {String(label)}
              <input
                type="number"
                min={Number(min)}
                max={Number(max)}
                value={Number(value)}
                onChange={(e) =>
                  (set as (v: number) => void)(Number(e.target.value))
                }
              />
            </label>
          ))}
          <label>
            {t("resolution")}
            <select value={n} onChange={(e) => setN(Number(e.target.value))}>
              {[64, 160, 192, 320].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </details>
        <button onClick={() => void prepare()}>{t("prepare")}</button>
        {valid && (
          <>
            <p>{t("source")}</p>
            <canvas
              ref={source}
              aria-label={t("source")}
              style={{
                width: "100%",
                maxWidth: 600,
                aspectRatio: `${width}/${height}`,
              }}
            />
            <label className="check">
              <input
                type="checkbox"
                data-testid="lettering-review"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              {t("review")}
            </label>
            <button
              className="primary"
              disabled={!reviewed}
              onClick={() => void calculate()}
            >
              {t("generate")}
            </button>
          </>
        )}
      </fieldset>
      {busy && (
        <div role="status">
          <p>{t("busy")}</p>
          <progress max={1} value={fraction} />
          <button onClick={cancel}>{t("cancel")}</button>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {result && (
        <div data-testid="lettering-result">
          <h3>{t("result")}</h3>
          <canvas
            ref={actual}
            aria-label={t("result")}
            style={{ width: "100%", maxWidth: 600 }}
          />
          <p>
            {result.metrics.lines} {t("steps")} ·{" "}
            {result.metrics.estimatedMeters.toFixed(1)} {t("meters")} ·{" "}
            {((result.metrics.lines * 8) / 60).toFixed(1)} {t("minutes")}
          </p>
          <button className="primary" onClick={() => onGuide(result)}>
            {t("open")}
          </button>
        </div>
      )}
    </section>
  );
}
