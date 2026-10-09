import { useEffect, useRef, useState } from "react";
import type { SourceFace } from "./core/face-features";
import type { Locale } from "./core/types";
import { backgroundText } from "./person-background-i18n";
export function FaceFeaturePanel({
  source,
  faces,
  locale,
  group,
  onUseFace,
  unavailable,
}: {
  source: HTMLCanvasElement;
  faces: SourceFace[];
  locale: Locale;
  group: boolean;
  onUseFace?: (face: SourceFace) => void;
  unavailable?: boolean;
}) {
  const [selected, setSelected] = useState(0),
    [notice, setNotice] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const t = (key: Parameters<typeof backgroundText>[1]) =>
    backgroundText(locale, key);
  useEffect(() => {
    setSelected(0);
    setNotice("");
  }, [source, faces]);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = source.width;
    c.height = source.height;
    c.getContext("2d")!.drawImage(source, 0, 0);
  }, [source, faces]);
  if (!faces.length)
    return unavailable ? (
      <p className="fineprint">{t("faceUnavailable")}</p>
    ) : null;
  const face = faces[Math.min(selected, faces.length - 1)];
  return (
    <details
      className="face-feature-panel"
      data-testid="face-features"
      data-count={faces.length}
    >
      <summary>
        {t("features")} · {faces.length}
      </summary>
      <p className="fineprint">{t("featuresHint")}</p>
      <label>
        {t("faceSelection")}
        <select
          aria-label={t("faceSelection")}
          value={Math.min(selected, faces.length - 1)}
          onChange={(e) => {
            setSelected(Number(e.target.value));
            setNotice("");
          }}
        >
          {faces.map((_, i) => (
            <option key={i} value={i}>
              {i + 1}
            </option>
          ))}
        </select>
      </label>
      <div className="face-feature-preview">
        <canvas ref={canvas} aria-label={t("featuresPreview")} />
        <svg viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
          {faces.map((f, i) => (
            <rect
              key={i}
              x={f.face.left}
              y={f.face.top}
              width={f.face.width}
              height={f.face.height}
              fill="none"
              stroke={i === selected ? "#21b06b" : "#f4b54a"}
              strokeWidth=".003"
            />
          ))}
          {(["eyes", "nose", "mouth"] as const).map((key, i) => {
            const b = face[key];
            return (
              <rect
                data-feature={key}
                key={key}
                x={b.left}
                y={b.top}
                width={b.width}
                height={b.height}
                fill="none"
                stroke={["#109be5", "#e7a21c", "#e21a70"][i]}
                strokeWidth=".004"
              />
            );
          })}
        </svg>
      </div>
      <p className="fineprint">{t("featureColors")}</p>
      {onUseFace && (
        <button
          type="button"
          disabled={group}
          onClick={() => {
            try {
              onUseFace(face);
              setNotice(t("featuresApplied"));
            } catch {
              setNotice(t("fitFirst"));
            }
          }}
        >
          {t("useFeatures")}
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
    </details>
  );
}
