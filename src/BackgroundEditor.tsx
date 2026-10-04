import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction, PointerEvent } from "react";
import type { EditParams, PortraitSettings } from "./core/types";
import { prepare } from "./core/image";
import { paintBackgroundMask, processPortrait, putRgb } from "./core/portrait";
import type { Key } from "./i18n";

export function BackgroundEditor({
  image,
  edits,
  aspect,
  portrait,
  setPortrait,
  t,
}: {
  image: CanvasImageSource & { width: number; height: number };
  edits: EditParams;
  aspect: number;
  portrait: PortraitSettings;
  setPortrait: Dispatch<SetStateAction<PortraitSettings>>;
  t: (key: Key) => string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [before, setBefore] = useState(false),
    [erase, setErase] = useState(true),
    [radius, setRadius] = useState(0.05);
  const [history, setHistory] = useState<
    { backgroundMask?: string; foregroundMask?: string }[]
  >([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const manual = portrait.backgroundMode === "manual-light";
  // A correction belongs to this crop. Moving the crop clears it; loading matching saved settings retains it.
  const previous = useRef({
    image,
    edits,
    aspect,
    mask: portrait.backgroundMask,
    foreground: portrait.foregroundMask,
  });
  useEffect(() => {
    const p = previous.current;
    const changed =
      p.image !== image ||
      p.aspect !== aspect ||
      (Object.keys(edits) as (keyof EditParams)[]).some(
        (key) => p.edits[key] !== edits[key],
      );
    if (changed) {
      setHistory([]);
      if (
        (portrait.backgroundMask || portrait.foregroundMask) &&
        portrait.backgroundMask === p.mask &&
        portrait.foregroundMask === p.foreground
      )
        setPortrait((v) => ({
          ...v,
          backgroundMask: undefined,
          foregroundMask: undefined,
        }));
    }
    previous.current = {
      image,
      edits,
      aspect,
      mask: portrait.backgroundMask,
      foreground: portrait.foregroundMask,
    };
  }, [
    image,
    edits,
    aspect,
    portrait.backgroundMask,
    portrait.foregroundMask,
    setPortrait,
  ]);
  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const raw = prepare(ctx, image, edits, aspect);
    putRgb(
      ctx,
      processPortrait(
        raw,
        160,
        before ? { ...portrait, backgroundMode: "soften" } : portrait,
      ),
      160,
    );
  }, [image, edits, aspect, portrait, before]);
  function paint(e: PointerEvent<HTMLCanvasElement>) {
    if (!manual || before) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - box.left) / box.width));
    const y = Math.max(0, Math.min(1, (e.clientY - box.top) / box.height));
    const start = last.current ?? { x, y },
      steps = Math.max(
        1,
        Math.ceil(Math.hypot(x - start.x, y - start.y) / (radius / 2)),
      );
    setPortrait((v) => {
      let backgroundMask = v.backgroundMask,
        foregroundMask = v.foregroundMask;
      for (let i = 1; i <= steps; i++) {
        const px = start.x + ((x - start.x) * i) / steps,
          py = start.y + ((y - start.y) * i) / steps;
        backgroundMask = paintBackgroundMask(
          backgroundMask,
          px,
          py,
          radius,
          erase,
        );
        foregroundMask = paintBackgroundMask(
          foregroundMask,
          px,
          py,
          radius,
          !erase,
        );
      }
      return { ...v, backgroundMask, foregroundMask };
    });
    last.current = { x, y };
  }
  return (
    <section className="background-editor" aria-label={t("backgroundTools")}>
      <label>
        {t("backgroundTools")}
        <select
          aria-label={t("backgroundTools")}
          value={manual ? "manual-light" : "soften"}
          onChange={(e) => {
            setBefore(false);
            setPortrait((v) => ({
              ...v,
              backgroundMode: e.target.value as "soften" | "manual-light",
            }));
          }}
        >
          <option value="soften">{t("softBackground")}</option>
          <option value="manual-light">{t("manualBackground")}</option>
        </select>
      </label>
      <p className="fineprint">{t("backgroundNotice")}</p>
      {manual && (
        <>
          <p className="fineprint">{t("brushHint")}</p>
          <div className="background-buttons">
            <button
              className="chip"
              aria-pressed={erase}
              onClick={() => {
                setErase(true);
                setBefore(false);
              }}
            >
              {t("paintBackground")}
            </button>
            <button
              className="chip"
              aria-pressed={!erase}
              onClick={() => {
                setErase(false);
                setBefore(false);
              }}
            >
              {t("restoreSubject")}
            </button>
          </div>
          <label className="range-label">
            <span>{t("brushSize")}</span>
            <input
              aria-label={t("brushSize")}
              type="range"
              min=".015"
              max=".15"
              step=".005"
              value={radius}
              onChange={(e) => setRadius(+e.target.value)}
            />
            <output>{Math.round(radius * 200)}%</output>
          </label>
        </>
      )}
      <div className="background-buttons">
        <button
          className="chip"
          aria-pressed={before}
          onClick={() => setBefore(true)}
        >
          {t("beforeBackground")}
        </button>
        <button
          className="chip"
          aria-pressed={!before}
          onClick={() => setBefore(false)}
        >
          {t("afterBackground")}
        </button>
        <button
          className="text-button"
          disabled={!history.length}
          onClick={() => {
            const mask = history.at(-1)!;
            setHistory((h) => h.slice(0, -1));
            setPortrait((v) => ({ ...v, ...mask }));
          }}
        >
          {t("undoBrush")}
        </button>
        <button
          className="text-button"
          onClick={() => {
            setHistory([]);
            setPortrait((v) => ({
              ...v,
              backgroundMask: undefined,
              foregroundMask: undefined,
            }));
          }}
        >
          {t("resetBackground")}
        </button>
      </div>
      <canvas
        ref={canvas}
        width={160}
        height={160}
        aria-label={before ? t("beforeBackground") : t("afterBackground")}
        style={{
          aspectRatio: aspect,
          touchAction: manual && !before ? "none" : "auto",
          cursor: manual && !before ? "crosshair" : "default",
        }}
        onPointerDown={(e) => {
          if (!manual || before) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setHistory((h) =>
            [
              ...h,
              {
                backgroundMask: portrait.backgroundMask,
                foregroundMask: portrait.foregroundMask,
              },
            ].slice(-20),
          );
          last.current = null;
          paint(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) paint(e);
        }}
        onPointerUp={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          last.current = null;
        }}
        onPointerCancel={() => {
          last.current = null;
        }}
      />
    </section>
  );
}
