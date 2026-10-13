import type { SubjectKind } from "./core/subject-plan";
import { subjectText } from "./subject-i18n";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Locale } from "./core/types";
import { paintPersonMask, type PersonMask } from "./core/person-mask";
import { whiteBackground } from "./person-background";
import { preparePersonPhoto } from "./photo-prepare";
import type { SourceFace } from "./core/face-features";
import { FaceFeaturePanel } from "./FaceFeaturePanel";
import { backgroundText } from "./person-background-i18n";
import { download } from "./download";
import "./person-background.css";
export type BackgroundState = {
  enabled: boolean;
  status: "processing" | "ready" | "failed" | "manual";
  mask?: PersonMask;
  automaticMask?: PersonMask;
  canvas?: HTMLCanvasElement;
  faces?: SourceFace[];
  faceUnavailable?: boolean;
  cleanupUnavailable?: boolean;
};
export function PersonBackground({
  source,
  initial,
  locale,
  onChange,
  onBusy,
  onUseFace,
  group = false,
  kind = "people",
}: {
  source: HTMLCanvasElement;
  initial?: BackgroundState;
  locale: Locale;
  onChange: (state: BackgroundState, image: HTMLCanvasElement) => void;
  onBusy: (busy: boolean) => void;
  onUseFace?: (face: SourceFace) => void;
  group?: boolean;
  kind?: SubjectKind;
}) {
  const [state, setState] = useState<BackgroundState>(
    initial ??
      (kind === "people"
        ? { enabled: true, status: "processing" }
        : { enabled: false, status: "manual" }),
  );
  const current = useRef(state),
    generation = useRef(0),
    controller = useRef<AbortController | undefined>(undefined),
    callbacks = useRef({ onChange, onBusy });
  callbacks.current = { onChange, onBusy };
  current.current = state;
  const [tool, setTool] = useState<"keep" | "erase">("keep"),
    [radius, setRadius] = useState(0.05),
    [history, setHistory] = useState<PersonMask[]>([]);
  const preview = useRef<HTMLCanvasElement>(null),
    stroke = useRef(false),
    previous = useRef<{ x: number; y: number } | undefined>(undefined);
  const t = (key: Parameters<typeof backgroundText>[1]) =>
    backgroundText(locale, key);
  function publish(next: BackgroundState) {
    const composed = next.mask ? whiteBackground(source, next.mask) : undefined;
    const value = { ...next, canvas: composed };
    current.current = value;
    setState(value);
    callbacks.current.onChange(
      value,
      value.enabled && composed ? composed : source,
    );
  }
  async function analyze() {
    if (kind !== "people") return;
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const token = ++generation.current;
    callbacks.current.onBusy(true);
    setState((v) => ({ ...v, status: "processing" }));
    try {
      const { mask, faces, faceUnavailable, cleanupUnavailable } =
        await preparePersonPhoto(source, request.signal);
      if (token !== generation.current) return;
      setHistory([]);
      publish({
        ...current.current,
        status: "ready",
        mask,
        automaticMask: mask,
        faces,
        faceUnavailable,
        cleanupUnavailable,
      });
    } catch (error) {
      if (token !== generation.current) return;
      console.warn("Local person segmentation unavailable", error);
      publish({ ...current.current, status: "failed" });
    } finally {
      if (token === generation.current) callbacks.current.onBusy(false);
    }
  }
  useEffect(() => {
    if (kind === "people" && (!initial || initial.status === "processing"))
      void analyze();
    else callbacks.current.onBusy(false);
    return () => {
      generation.current++;
      controller.current?.abort();
      callbacks.current.onBusy(false);
    };
  }, [source]);
  useEffect(() => {
    const c = preview.current;
    if (!c) return;
    c.width = source.width;
    c.height = source.height;
    c.getContext("2d")!.drawImage(
      state.enabled && state.canvas ? state.canvas : source,
      0,
      0,
    );
  }, [source, state]);
  function point(e: PointerEvent<HTMLCanvasElement>) {
    const b = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - b.left) / b.width)),
      y: Math.max(0, Math.min(1, (e.clientY - b.top) / b.height)),
    };
  }
  function paint(e: PointerEvent<HTMLCanvasElement>) {
    if (!stroke.current) return;
    const p = point(e),
      last = previous.current ?? p;
    let mask = current.current.mask!;
    const count = Math.max(
      1,
      Math.ceil(Math.hypot(p.x - last.x, p.y - last.y) / (radius / 3)),
    );
    for (let i = 1; i <= count; i++)
      mask = paintPersonMask(
        mask,
        last.x + ((p.x - last.x) * i) / count,
        last.y + ((p.y - last.y) * i) / count,
        radius,
        tool === "keep",
      );
    previous.current = p;
    publish({ ...current.current, enabled: true, status: "manual", mask });
  }
  return (
    <section className="person-background" data-testid="person-background">
      <label className="toggle">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={(e) => {
            publish({ ...current.current, enabled: e.target.checked });
          }}
        />
        {kind === "people" ? t("automatic") : subjectText(locale, "background")}
      </label>
      <p
        role="status"
        data-testid="background-status"
        data-status={state.status}
      >
        {kind !== "people"
          ? subjectText(locale, "manual")
          : !state.enabled
            ? t("original")
            : t(
                state.status === "processing"
                  ? "loading"
                  : state.status === "manual"
                    ? "manual"
                    : state.status === "ready"
                      ? "ready"
                      : "failed",
              )}
      </p>
      <p className="fineprint">
        {kind === "people" ? t("local") : subjectText(locale, "local")}
      </p>
      {state.cleanupUnavailable && (
        <p className="fineprint" data-testid="cleanup-unavailable">
          {t("cleanupUnavailable")}
        </p>
      )}
      {kind === "people" && (
        <FaceFeaturePanel
          source={source}
          faces={state.faces ?? []}
          unavailable={state.faceUnavailable}
          locale={locale}
          group={group}
          onUseFace={onUseFace}
        />
      )}
      <details>
        <summary>{t("tools")}</summary>
        <p className="fineprint">
          {state.enabled ? t("prepared") : t("original")}
        </p>
        <div className="preset-row">
          <button
            type="button"
            aria-pressed={tool === "keep"}
            onClick={() => setTool("keep")}
          >
            {kind === "people" ? t("keep") : subjectText(locale, "keep")}
          </button>
          <button
            type="button"
            aria-pressed={tool === "erase"}
            onClick={() => setTool("erase")}
          >
            {t("erase")}
          </button>
        </div>
        <label>
          {t("brush")}
          <input
            aria-label={t("brush")}
            type="range"
            min=".01"
            max=".15"
            step=".01"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </label>
        <canvas
          ref={preview}
          aria-label={t("prepared")}
          style={{
            touchAction: state.status === "processing" ? "auto" : "none",
          }}
          onPointerDown={(e) => {
            if (state.status === "processing") return;
            const mask = current.current.mask ?? {
              width: 256,
              height: 256,
              values: new Float32Array(256 * 256).fill(1),
            };
            current.current = { ...current.current, mask };
            setHistory((v) => [...v.slice(-7), mask]);
            stroke.current = true;
            previous.current = undefined;
            e.currentTarget.setPointerCapture(e.pointerId);
            paint(e);
          }}
          onPointerMove={paint}
          onPointerUp={(e) => {
            paint(e);
            stroke.current = false;
            previous.current = undefined;
          }}
          onPointerCancel={() => {
            stroke.current = false;
            previous.current = undefined;
          }}
        />
        <div className="preset-row">
          <button
            type="button"
            disabled={!history.length || state.status === "processing"}
            onClick={() => {
              publish({ ...current.current, mask: history.at(-1)! });
              setHistory((v) => v.slice(0, -1));
            }}
          >
            {t("undo")}
          </button>
          <button
            type="button"
            disabled={!state.automaticMask || state.status === "processing"}
            onClick={() => {
              setHistory([]);
              publish({
                ...current.current,
                status: "ready",
                mask: state.automaticMask,
              });
            }}
          >
            {t("reset")}
          </button>
          {kind === "people" && (
            <button
              type="button"
              disabled={state.status === "processing"}
              onClick={() => void analyze()}
            >
              {t("retry")}
            </button>
          )}
        </div>
      </details>
      <button
        type="button"
        disabled={
          !state.canvas || !state.enabled || state.status === "processing"
        }
        onClick={() =>
          state.canvas?.toBlob((b) => {
            if (b) void download("ip-rasm-prepared.png", b, "image/png");
          }, "image/png")
        }
      >
        {t("save")}
      </button>
      <p className="fineprint">{t("saved")}</p>
    </section>
  );
}
