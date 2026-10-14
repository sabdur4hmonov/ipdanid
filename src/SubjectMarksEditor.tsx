import { useState, useRef, type ReactNode, type PointerEvent } from "react";
import type { SubjectPlan } from "./core/subject-plan";
import type { Locale, RegionBox } from "./core/types";
import { changeRegion, displayBox, displayToSample } from "./core/coordinates";
import { subjectFitText } from "./subject-fit-i18n";
type Subjects = SubjectPlan["subjects"];
export function SubjectMarksEditor({
  subjects,
  onChange,
  n,
  aspect,
  locale,
  children,
  disabled,
}: {
  subjects: Subjects;
  onChange: (s: Subjects) => void;
  n: number;
  aspect: number;
  locale: Locale;
  children: ReactNode;
  disabled?: boolean;
}) {
  const [selected, setSelected] = useState(0),
    [detail, setDetail] = useState(-1),
    frame = useRef<HTMLDivElement>(null),
    drag = useRef<{
      pointer: number;
      x: number;
      y: number;
      box: RegionBox;
      resize: boolean;
    } | null>(null),
    index = Math.min(selected, subjects.length - 1),
    subject = subjects[index],
    region = detail >= 0 ? subject.regions[detail] : undefined,
    box = region?.box ?? subject.bounds,
    t = (key: Parameters<typeof subjectFitText>[1]) =>
      subjectFitText(locale, key);
  function update(next: RegionBox) {
    onChange(
      subjects.map((s, k) =>
        k !== index
          ? s
          : {
              ...s,
              reviewed: false,
              ...(region
                ? {
                    regions: s.regions.map((r, j) =>
                      j === detail ? { ...r, box: next } : r,
                    ),
                  }
                : { bounds: next }),
            },
      ),
    );
  }
  function point(e: PointerEvent) {
    const r = frame.current!.getBoundingClientRect();
    return {
      x: displayToSample((e.clientX - r.left) / r.width, n),
      y: displayToSample((e.clientY - r.top) / r.height, n),
    };
  }
  function start(e: PointerEvent, resize: boolean) {
    if (disabled) return;
    e.preventDefault();
    const p = point(e);
    drag.current = { pointer: e.pointerId, ...p, box: { ...box }, resize };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  const shown = displayBox(box, n);
  return (
    <section data-testid="subject-marks" data-count={subjects.length}>
      <p>{t("mark")}</p>
      <label>
        {t("subject")}
        <select
          value={index}
          disabled={disabled}
          onChange={(e) => {
            setSelected(+e.target.value);
            setDetail(-1);
          }}
        >
          {subjects.map((s, k) => (
            <option key={s.id} value={k}>
              {k + 1}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={disabled || subjects.length >= 3}
        onClick={() => {
          onChange([
            ...subjects,
            {
              id: crypto.randomUUID(),
              bounds: { left: 0.2, top: 0.2, width: 0.6, height: 0.6 },
              reviewed: false,
              regions: [],
            },
          ]);
          setSelected(subjects.length);
          setDetail(-1);
        }}
      >
        {t("addSubject")}
      </button>
      <button
        type="button"
        disabled={disabled || subjects.length <= 1}
        onClick={() => {
          onChange(subjects.filter((_, k) => k !== index));
          setSelected(0);
          setDetail(-1);
        }}
      >
        {t("removeSubject")}
      </button>
      <label>
        {t("detail")}
        <select
          value={region ? detail : -1}
          disabled={disabled}
          onChange={(e) => setDetail(+e.target.value)}
        >
          <option value={-1}>{t("bounds")}</option>
          {subject.regions.map((r, k) => (
            <option key={k} value={k}>
              {t(r.role)} {k + 1}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={disabled || subject.regions.length >= 12}
        onClick={() => {
          onChange(
            subjects.map((s, k) =>
              k !== index
                ? s
                : {
                    ...s,
                    reviewed: false,
                    regions: [
                      ...s.regions,
                      {
                        role: "detail",
                        box: {
                          left: s.bounds.left + s.bounds.width * 0.3,
                          top: s.bounds.top + s.bounds.height * 0.3,
                          width: s.bounds.width * 0.4,
                          height: s.bounds.height * 0.4,
                        },
                      },
                    ],
                  },
            ),
          );
          setDetail(subject.regions.length);
        }}
      >
        {t("addDetail")}
      </button>
      <button
        type="button"
        disabled={disabled || !region}
        onClick={() => {
          onChange(
            subjects.map((s, k) =>
              k !== index
                ? s
                : {
                    ...s,
                    reviewed: false,
                    regions: s.regions.filter((_, j) => j !== detail),
                  },
            ),
          );
          setDetail(-1);
        }}
      >
        {t("removeDetail")}
      </button>
      {region && (
        <label>
          {t("detail")}
          <select
            data-testid="subject-detail-role"
            disabled={disabled}
            value={region.role}
            onChange={(e) =>
              onChange(
                subjects.map((s, k) =>
                  k !== index
                    ? s
                    : {
                        ...s,
                        reviewed: false,
                        regions: s.regions.map((r, j) =>
                          j === detail
                            ? { ...r, role: e.target.value as typeof r.role }
                            : r,
                        ),
                      },
                ),
              )
            }
          >
            {(["detail", "eyes", "nose", "mouth"] as const).map((role) => (
              <option key={role} value={role}>
                {t(role)}
              </option>
            ))}
          </select>
        </label>
      )}
      <div
        ref={frame}
        className="target-frame"
        style={{ position: "relative", aspectRatio: aspect }}
        aria-label={t("preview")}
      >
        {children}
        <div
          data-testid="subject-mark-box"
          style={{
            position: "absolute",
            left: `${shown.left * 100}%`,
            top: `${shown.top * 100}%`,
            width: `${shown.width * 100}%`,
            height: `${shown.height * 100}%`,
            border: "2px solid #2066b0",
            touchAction: "none",
            boxSizing: "border-box",
            cursor: "move",
          }}
          onPointerDown={(e) => start(e, false)}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || d.pointer !== e.pointerId) return;
            const p = point(e);
            update(changeRegion(d.box, p.x - d.x, p.y - d.y, d.resize));
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          <span
            aria-hidden="true"
            style={{ background: "#fff", color: "#102a4d" }}
          >
            {t(region?.role ?? "subject")} {index + 1}
          </span>
          <button
            type="button"
            aria-label={t("width") + " / " + t("height")}
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              minWidth: 44,
              minHeight: 44,
              touchAction: "none",
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              start(e, true);
            }}
          >
            ↔
          </button>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: 8,
        }}
      >
        {(["left", "top", "width", "height"] as const).map((key) => (
          <label key={key}>
            {t(key)} %
            <input
              disabled={disabled}
              type="number"
              min={key === "width" || key === "height" ? 1 : 0}
              max={100}
              step={1}
              value={Math.round(box[key] * 100)}
              onChange={(e) => {
                const value = +e.target.value / 100;
                if (!Number.isFinite(value)) return;
                const b = {
                  ...box,
                  [key]: Math.max(
                    key === "width" || key === "height" ? 0.01 : 0,
                    Math.min(1, value),
                  ),
                };
                b.left = Math.min(b.left, 1 - b.width);
                b.top = Math.min(b.top, 1 - b.height);
                update(b);
              }}
            />
          </label>
        ))}
      </div>
      <label>
        <input
          data-testid="subject-mark-reviewed"
          type="checkbox"
          checked={subject.reviewed}
          disabled={disabled}
          onChange={(e) =>
            onChange(
              subjects.map((s, k) =>
                k === index ? { ...s, reviewed: e.target.checked } : s,
              ),
            )
          }
        />
        {t("review")}
      </label>
    </section>
  );
}
