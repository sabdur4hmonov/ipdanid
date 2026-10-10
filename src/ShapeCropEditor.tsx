import {
  useId,
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type PointerEvent,
} from "react";
import type { EditParams, PortraitSettings, Shape } from "./core/types";
import {
  changeRegion,
  displayBox,
  displayToSample,
  sourceToTarget,
  targetToSource,
  sampleToDisplay,
} from "./core/coordinates";
import { fitMarkedOutline, type OutlinePoint } from "./core/head-outline";
import { outlineBackgroundMask } from "./core/outline-background";
import {
  fitMarkedFace,
  missingPhotoCoverage,
  panCrop,
  shapePath,
  zoomCrop,
} from "./core/shape-crop";
import type { Key } from "./i18n";
export function ShapeCropEditor({
  shape,
  edits,
  portrait,
  aspect,
  widthMm,
  heightMm,
  resolution,
  imageWidth,
  imageHeight,
  headOutline,
  onOutline,
  onCrop,
  onFace,
  onRestore,
  t,
  children,
  group = false,
}: {
  shape: Shape;
  edits: EditParams;
  portrait: PortraitSettings;
  aspect: number;
  widthMm: number;
  heightMm: number;
  resolution: number;
  imageWidth: number;
  imageHeight: number;
  headOutline: OutlinePoint[];
  onOutline: (points: OutlinePoint[]) => void;
  onCrop: (e: EditParams) => void;
  onFace: (s: PortraitSettings) => void;
  onRestore: (e: EditParams, s: PortraitSettings) => void;
  t: (k: Key) => string;
  children: ReactNode;
  group?: boolean;
}) {
  const id = useId().replaceAll(":", ""),
    frame = useRef<HTMLDivElement>(null),
    points = useRef(new Map<number, { x: number; y: number }>()),
    mode = useRef<{
      x: number;
      y: number;
      face: PortraitSettings["face"];
      resize: boolean;
      draw: boolean;
    } | null>(null);
  const [mark, setMark] = useState(false),
    [outlineMode, setOutlineMode] = useState(false),
    [corrected, setCorrected] = useState(false),
    [undo, setUndo] = useState<{
      edits: EditParams;
      portrait: PortraitSettings;
    }>(),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (group) {
      setMark(false);
      setOutlineMode(false);
      mode.current = null;
      points.current.clear();
    }
  }, [group]);
  const outlineDrag = useRef<number | null>(null);
  const latestOutline = useRef(headOutline);
  latestOutline.current = headOutline;
  // Undo stores target-coordinate regions. A new sample grid invalidates that
  // snapshot; the parent remaps current anatomy and clears crop-bound masks.
  useEffect(() => {
    setUndo(undefined);
  }, [resolution]);
  const updateOutline = (next: OutlinePoint[]) => {
    latestOutline.current = next;
    onOutline(next);
  };
  const latest = useRef({ edits, onCrop, mark, aspect, portrait, outlineMode });
  latest.current = { edits, onCrop, mark, aspect, portrait, outlineMode };
  useEffect(() => {
    const element = frame.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const current = latest.current;
      if (current.mark || current.outlineMode) return;
      const r = element.getBoundingClientRect();
      const next = zoomCrop(
        current.edits,
        Math.exp(-e.deltaY * 0.002),
        {
          x: (e.clientX - r.left) / r.width,
          y: (e.clientY - r.top) / r.height,
        },
        current.aspect,
      );
      latest.current = { ...current, edits: next };
      current.onCrop(next);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  const point = (e: { clientX: number; clientY: number }) => {
    const r = frame.current!.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".floating")) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = point(e);
    if (outlineMode) {
      const handle = (e.target as HTMLElement).closest("[data-outline-index]");
      if (handle) {
        outlineDrag.current = Number(handle.getAttribute("data-outline-index"));
        return;
      }
      const q = outlineSource(p);
      if (q && latestOutline.current.length < 48)
        updateOutline([...latestOutline.current, q]);
      return;
    }
    points.current.set(e.pointerId, p);
    if (mark)
      mode.current = {
        ...p,
        face: { ...latest.current.portrait.face },
        resize: !!(e.target as HTMLElement).closest("[data-face-resize]"),
        draw: !(e.target as HTMLElement).closest(".crop-face-box"),
      };
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (outlineMode) {
      if (outlineDrag.current !== null) {
        const q = outlineSource(point(e));
        if (q)
          updateOutline(
            latestOutline.current.map((p, j) =>
              j === outlineDrag.current ? q : p,
            ),
          );
      }
      return;
    }
    const old = points.current.get(e.pointerId);
    if (!old) return;
    const p = point(e);
    if (mark && mode.current) {
      const d = mode.current;
      const b = d.draw
        ? {
            left: Math.max(0, displayToSample(Math.min(p.x, d.x), resolution)),
            top: Math.max(0, displayToSample(Math.min(p.y, d.y), resolution)),
            width: (Math.abs(p.x - d.x) * resolution) / (resolution - 1),
            height: (Math.abs(p.y - d.y) * resolution) / (resolution - 1),
          }
        : changeRegion(
            d.face,
            ((p.x - d.x) * resolution) / (resolution - 1),
            ((p.y - d.y) * resolution) / (resolution - 1),
            d.resize,
          );
      b.width = Math.max(0.1, b.width);
      b.height = Math.max(0.1, b.height);
      b.width = Math.min(1, b.width);
      b.height = Math.min(1, b.height);
      b.left = Math.min(b.left, 1 - b.width);
      b.top = Math.min(b.top, 1 - b.height);
      // Moving the outer head box does not move the photo or its anatomy.
      // Preserve separately corrected feature windows on the same pixels.
      const nextPortrait = { ...latest.current.portrait, face: b };
      latest.current.portrait = nextPortrait;
      onFace(nextPortrait);
      setCorrected(true);
    } else if (points.current.size === 2) {
      const other = [...points.current.entries()].find(
          ([k]) => k !== e.pointerId,
        )![1],
        before = Math.hypot(old.x - other.x, (old.y - other.y) / aspect),
        after = Math.hypot(p.x - other.x, (p.y - other.y) / aspect);
      if (before > 0.01) {
        const oldCenter = {
            x: (old.x + other.x) / 2,
            y: (old.y + other.y) / 2,
          },
          newCenter = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
        const next = panCrop(
          zoomCrop(latest.current.edits, after / before, oldCenter, aspect),
          newCenter.x - oldCenter.x,
          newCenter.y - oldCenter.y,
          aspect,
        );
        latest.current.edits = next;
        onCrop(next);
      }
    } else {
      const next = panCrop(
        latest.current.edits,
        p.x - old.x,
        p.y - old.y,
        aspect,
      );
      latest.current.edits = next;
      onCrop(next);
    }
    points.current.set(e.pointerId, p);
  };
  const end = (e: PointerEvent) => {
    outlineDrag.current = null;
    points.current.delete(e.pointerId);
    mode.current = null;
  };
  const outlineSource = (p: OutlinePoint) => {
    const q = targetToSource(
      displayToSample(p.x, resolution),
      displayToSample(p.y, resolution),
      imageWidth,
      imageHeight,
      latest.current.edits,
      aspect,
      resolution,
    );
    const normalized = { x: q.x / imageWidth, y: q.y / imageHeight };
    return normalized.x >= 0 &&
      normalized.x <= 1 &&
      normalized.y >= 0 &&
      normalized.y <= 1
      ? normalized
      : null;
  };
  const displayedOutline = headOutline.map((p) => {
    const q = sourceToTarget(
      p.x * imageWidth,
      p.y * imageHeight,
      imageWidth,
      imageHeight,
      edits,
      aspect,
      resolution,
    );
    return {
      x: sampleToDisplay(q.x, resolution),
      y: sampleToDisplay(q.y, resolution),
    };
  });
  const b = displayBox(portrait.face, resolution),
    path = shapePath(shape, resolution),
    missing = missingPhotoCoverage(
      shape,
      edits,
      imageWidth,
      imageHeight,
      aspect,
      resolution,
    );
  return (
    <>
      <div
        ref={frame}
        className="photo-frame shape-crop-frame"
        style={{ aspectRatio: aspect }}
        data-testid="shape-crop"
        data-edits={JSON.stringify(edits)}
        data-portrait={JSON.stringify(portrait)}
        data-outline={JSON.stringify(headOutline)}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {children}
        <svg
          className="shape-crop-overlay"
          viewBox="0 0 1 1"
          preserveAspectRatio="none"
          aria-hidden="true"
          data-shape={shape}
        >
          <defs>
            <mask id={id}>
              <rect width="1" height="1" fill="white" />
              <path d={path} fill="black" />
            </mask>
          </defs>
          <rect
            width="1"
            height="1"
            fill="#18201d"
            opacity=".55"
            mask={`url(#${id})`}
          />
          <path d={path} fill="none" stroke="#ffcf70" strokeWidth=".004" />
        </svg>
        {headOutline.length > 0 && (
          <svg
            className="head-outline-overlay"
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polyline
              points={
                displayedOutline.map((p) => `${p.x},${p.y}`).join(" ") +
                (headOutline.length >= 6
                  ? ` ${displayedOutline[0].x},${displayedOutline[0].y}`
                  : "")
              }
              fill="none"
              stroke="#30c6cc"
              strokeWidth=".005"
            />
            {displayedOutline.map((p, j) => (
              <circle
                key={j}
                data-outline-index={j}
                cx={p.x}
                cy={p.y}
                r=".015"
                fill="#234c40"
                stroke="#fff"
                strokeWidth=".003"
                style={{ pointerEvents: outlineMode ? "all" : "none" }}
              />
            ))}
          </svg>
        )}
        {mark && (
          <div
            className="crop-face-box"
            data-testid="crop-face-box"
            style={{
              left: b.left * 100 + "%",
              top: b.top * 100 + "%",
              width: b.width * 100 + "%",
              height: b.height * 100 + "%",
            }}
          >
            <span>{t("faceRegion")}</span>
            <button
              type="button"
              data-face-resize
              aria-label={t("resizeRegion")}
              className="region-resize"
            />
          </div>
        )}
      </div>
      <p className="fineprint">{t("shapeCropHint")}</p>
      {!group && missing > 0.02 && (
        <p
          role="status"
          className="workflow-notice"
          data-testid="missing-photo"
        >
          {t("missingPhoto")} {Math.round(missing * 100)}%.{" "}
          {t("missingPhotoHint")}
        </p>
      )}
      <details className="edits crop-options">
        <summary>{t("zoom")}</summary>
        <div className="preset-row">
          <button
            type="button"
            className="outline"
            onClick={() => {
              setUndo({
                edits: { ...edits },
                portrait: structuredClone(portrait),
              });
              onCrop({ ...edits, zoom: 1, panX: 0, panY: 0, rotation: 0 });
              setMessage(t("centerPhotoNotice"));
            }}
          >
            {t("centerPhoto")}
          </button>
          <button
            type="button"
            className="outline"
            aria-pressed={mark}
            disabled={group}
            onClick={() => {
              setMark(!mark);
              setOutlineMode(false);
              points.current.clear();
            }}
          >
            {t("markFace")}
          </button>
          <button
            type="button"
            className="outline"
            disabled={group}
            onClick={() => {
              if (!corrected) {
                setMark(true);
                setMessage(t("markBeforeFit"));
                return;
              }
              try {
                const fitted = fitMarkedFace(
                  shape,
                  portrait.face,
                  edits,
                  aspect,
                  widthMm,
                  heightMm,
                  resolution,
                );
                setUndo({
                  edits: { ...edits },
                  portrait: structuredClone(portrait),
                });
                onCrop(fitted.edits);
                setMessage(t("shapeFitNotice"));
              } catch {
                setMessage(t("shapeFitUnavailable"));
              }
            }}
          >
            {t("fitFaceShape")}
          </button>
          {undo && (
            <button
              type="button"
              className="text-button"
              onClick={() => {
                onRestore(undo.edits, undo.portrait);
                setUndo(undefined);
                setMessage("");
              }}
            >
              {t("undoShapeFit")}
            </button>
          )}
        </div>
        <details className="head-outline-controls" hidden={group}>
          <summary>{t("headOutline")}</summary>
          <p className="fineprint">{t("outlineHint")}</p>
          <div className="preset-row">
            <button
              className="outline"
              type="button"
              aria-pressed={outlineMode}
              onClick={() => {
                setOutlineMode(!outlineMode);
                setMark(false);
                points.current.clear();
              }}
            >
              {t("markOutline")}
            </button>
            <button
              className="outline"
              type="button"
              disabled={headOutline.length === 0}
              onClick={() => onOutline(headOutline.slice(0, -1))}
            >
              {t("removeOutlinePoint")}
            </button>
            <button
              className="text-button"
              type="button"
              disabled={headOutline.length === 0}
              onClick={() => onOutline([])}
            >
              {t("clearOutline")}
            </button>
            <button
              className="outline"
              type="button"
              disabled={headOutline.length < 6}
              onClick={() => {
                try {
                  const fit = fitMarkedOutline(
                    shape,
                    headOutline,
                    edits,
                    aspect,
                    widthMm,
                    heightMm,
                    imageWidth,
                    imageHeight,
                    resolution,
                  );
                  setUndo({
                    edits: { ...edits },
                    portrait: structuredClone(portrait),
                  });
                  onCrop(fit.edits);
                  setOutlineMode(false);
                  setMessage(t("shapeFitNotice"));
                } catch {
                  setMessage(t("outlineInvalid"));
                }
              }}
            >
              {t("fitOutline")}
            </button>
            <button
              className="outline"
              type="button"
              disabled={!portrait.enabled || headOutline.length < 6}
              onClick={() => {
                try {
                  const manual = portrait.backgroundMode === "manual-light";
                  const mask = outlineBackgroundMask(
                    headOutline,
                    edits,
                    aspect,
                    imageWidth,
                    imageHeight,
                    resolution,
                    manual ? portrait.backgroundMask : undefined,
                  );
                  setUndo({
                    edits: { ...edits },
                    portrait: structuredClone(portrait),
                  });
                  onFace({
                    ...portrait,
                    backgroundMode: "manual-light",
                    backgroundMask: mask,
                    foregroundMask: manual
                      ? portrait.foregroundMask
                      : undefined,
                  });
                  setMessage(t("outlineBackgroundNotice"));
                } catch {
                  setMessage(t("outlineInvalid"));
                }
              }}
            >
              {t("outlineBackground")}
            </button>
          </div>
          <p className="fineprint" role="status">
            {headOutline.length}/48 · {t("outlineSession")}
          </p>
          {headOutline.length > 0 && (
            <details>
              <summary>{t("outlineCoordinates")}</summary>
              {headOutline.map((p, j) => (
                <div className="customer-actions" key={j}>
                  <strong>{j + 1}</strong>
                  {(["x", "y"] as const).map((axis) => (
                    <label key={axis}>
                      {axis.toUpperCase()} %
                      <input
                        aria-label={`${t("outlinePoint")} ${j + 1} ${axis.toUpperCase()}`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={Number((p[axis] * 100).toFixed(2))}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (
                            e.target.value !== "" &&
                            Number.isFinite(v) &&
                            v >= 0 &&
                            v <= 100
                          )
                            onOutline(
                              headOutline.map((q, k) =>
                                k === j ? { ...q, [axis]: v / 100 } : q,
                              ),
                            );
                        }}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </details>
          )}
        </details>
        <p className="fineprint">{t("shapeFaceEstimate")}</p>
      </details>
      {mark && <p className="workflow-notice">{t("drawHeadHint")}</p>}
      {message && (
        <p role="status" className="fineprint">
          {message}
        </p>
      )}
    </>
  );
}
