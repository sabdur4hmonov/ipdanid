import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
  type ReactNode,
  type PointerEvent,
} from "react";
import type { EditParams, PortraitSettings, RegionBox } from "./core/types";
import { portraitRegions } from "./core/portrait";
import { changeRegion, displayBox, displayToSample } from "./core/coordinates";
import type { Key } from "./i18n";
const keys = ["eyes", "nose", "mouth"] as const;
type Feature = (typeof keys)[number];
export function RegionEditor({
  resolution = 160,
  portrait,
  setPortrait,
  image,
  edits,
  aspect,
  t,
  children,
}: {
  resolution?: number;
  portrait: PortraitSettings;
  setPortrait: Dispatch<SetStateAction<PortraitSettings>>;
  image: object;
  edits: EditParams;
  aspect: number;
  t: (key: Key) => string;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Feature>("eyes");
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    key: Feature;
    x: number;
    y: number;
    box: RegionBox;
    resize: boolean;
  } | null>(null);
  const previous = useRef({ image, edits, aspect, regions: portrait.regions });
  useEffect(() => {
    const p = previous.current;
    const changed =
      p.image !== image ||
      p.aspect !== aspect ||
      (["zoom", "panX", "panY", "rotation"] as const).some(
        (key) => p.edits[key] !== edits[key],
      );
    if (changed && portrait.regions && portrait.regions === p.regions)
      setPortrait((v) => ({ ...v, regions: undefined }));
    previous.current = { image, edits, aspect, regions: portrait.regions };
  }, [image, edits, aspect, portrait.regions, setPortrait]);
  const boxes = portraitRegions(portrait);
  function update(key: Feature, box: RegionBox) {
    setPortrait((v) => {
      const b = portraitRegions(v);
      return {
        ...v,
        regions: {
          reference: "processed-target/sample-centers-v1",
          placement: "manual",
          eyes: b.eyes,
          nose: b.nose,
          mouth: b.mouth,
          [key]: box,
        },
      };
    });
  }
  function point(e: PointerEvent) {
    const r = frame.current!.getBoundingClientRect();
    return {
      x: displayToSample((e.clientX - r.left) / r.width, resolution),
      y: displayToSample((e.clientY - r.top) / r.height, resolution),
    };
  }
  function start(
    e: PointerEvent<HTMLDivElement>,
    key: Feature,
    resize: boolean,
  ) {
    e.preventDefault();
    e.stopPropagation();
    setSelected(key);
    const p = point(e);
    drag.current = {
      id: e.pointerId,
      key,
      ...p,
      box: { ...boxes[key] },
      resize,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = point(e);
    update(d.key, changeRegion(d.box, p.x - d.x, p.y - d.y, d.resize));
  }
  function end(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null;
  }
  return (
    <>
      <div ref={frame} className="target-frame" style={{ aspectRatio: aspect }}>
        {children}
        {portrait.enabled &&
          Object.entries(boxes)
            .filter(([key]) => key !== "outline")
            .map(([key, box]) => {
              const d = displayBox(box, resolution);
              return (
                <div
                  key={key}
                  className={`region-box region-${key} ${selected === key ? "region-selected" : ""}`}
                  data-region={key}
                  data-box={JSON.stringify(box)}
                  style={{
                    left: `${d.left * 100}%`,
                    top: `${d.top * 100}%`,
                    width: `${d.width * 100}%`,
                    height: `${d.height * 100}%`,
                  }}
                  onPointerDown={
                    key === "face"
                      ? undefined
                      : (e) => start(e, key as Feature, false)
                  }
                  onPointerMove={move}
                  onPointerUp={end}
                  onPointerCancel={end}
                >
                  <span>{t(key as "face" | Feature)}</span>
                  {key !== "face" && (
                    <div
                      className="region-resize"
                      role="button"
                      tabIndex={0}
                      aria-label={`${t(key as Feature)} ${t("resizeRegion")}`}
                      onPointerDown={(e) => start(e, key as Feature, true)}
                      onPointerMove={move}
                      onPointerUp={end}
                      onPointerCancel={end}
                      onKeyDown={(e) => {
                        const dx =
                          e.key === "ArrowRight"
                            ? 0.01
                            : e.key === "ArrowLeft"
                              ? -0.01
                              : 0;
                        const dy =
                          e.key === "ArrowDown"
                            ? 0.01
                            : e.key === "ArrowUp"
                              ? -0.01
                              : 0;
                        if (dx || dy) {
                          e.preventDefault();
                          update(
                            key as Feature,
                            changeRegion(box, dx, dy, true),
                          );
                        }
                      }}
                    />
                  )}
                </div>
              );
            })}
      </div>
      <div hidden={!portrait.enabled} data-testid="region-editor">
        <p className="fineprint">
          {t(
            portrait.regions &&
              portrait.regions.placement !== "proportional-estimate"
              ? "manualRegions"
              : "estimatedRegions",
          )}{" "}
          {t("regionEditHint")}
        </p>
        <div className="background-buttons">
          {keys.map((key) => (
            <button
              key={key}
              className="chip"
              aria-pressed={selected === key}
              onClick={() => setSelected(key)}
            >
              {t(key)}
            </button>
          ))}
          <button
            className="chip"
            onClick={() => setPortrait((v) => ({ ...v, regions: undefined }))}
          >
            {t("resetRegions")}
          </button>
        </div>
        {(["left", "top", "width", "height"] as const).map((key) => (
          <label key={key} className="range-label">
            <span>
              {t(selected)} · {t(key)}
            </span>
            <input
              type="number"
              min={key === "width" || key === "height" ? 0.01 : 0}
              max={
                key === "left"
                  ? 1 - boxes[selected].width
                  : key === "top"
                    ? 1 - boxes[selected].height
                    : key === "width"
                      ? 1 - boxes[selected].left
                      : 1 - boxes[selected].top
              }
              step=".005"
              aria-label={`${t(selected)} ${t(key)}`}
              value={Number(boxes[selected][key].toFixed(5))}
              onChange={(e) => {
                const v = +e.target.value,
                  b = boxes[selected];
                if (!Number.isFinite(v)) return;
                const max =
                  key === "left"
                    ? 1 - b.width
                    : key === "top"
                      ? 1 - b.height
                      : key === "width"
                        ? 1 - b.left
                        : 1 - b.top;
                update(selected, {
                  ...b,
                  [key]: Math.max(
                    key === "width" || key === "height" ? 0.01 : 0,
                    Math.min(max, v),
                  ),
                });
              }}
            />
          </label>
        ))}
      </div>
    </>
  );
}
