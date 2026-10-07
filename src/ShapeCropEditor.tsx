import {
  useId,
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type PointerEvent,
} from "react";
import type { EditParams, PortraitSettings, Shape } from "./core/types";
import { changeRegion, displayBox, displayToSample } from "./core/coordinates";
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
  onCrop,
  onFace,
  onRestore,
  t,
  children,
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
  onCrop: (e: EditParams) => void;
  onFace: (s: PortraitSettings) => void;
  onRestore: (e: EditParams, s: PortraitSettings) => void;
  t: (k: Key) => string;
  children: ReactNode;
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
    [corrected, setCorrected] = useState(false),
    [undo, setUndo] = useState<{
      edits: EditParams;
      portrait: PortraitSettings;
    }>(),
    [message, setMessage] = useState("");
  const latest = useRef({ edits, onCrop, mark, aspect, portrait });
  latest.current = { edits, onCrop, mark, aspect, portrait };
  useEffect(() => {
    const element = frame.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const current = latest.current;
      if (current.mark) return;
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
    points.current.delete(e.pointerId);
    mode.current = null;
  };
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
      {missing > 0.02 && (
        <p
          role="status"
          className="workflow-notice"
          data-testid="missing-photo"
        >
          {t("missingPhoto")} {Math.round(missing * 100)}%.{" "}
          {t("missingPhotoHint")}
        </p>
      )}
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
          onClick={() => {
            setMark(!mark);
            points.current.clear();
          }}
        >
          {t("markFace")}
        </button>
        <button
          type="button"
          className="outline"
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
      <p className="fineprint">{t("shapeFaceEstimate")}</p>
      {mark && <p className="workflow-notice">{t("drawHeadHint")}</p>}
      {message && (
        <p role="status" className="fineprint">
          {message}
        </p>
      )}
    </>
  );
}
