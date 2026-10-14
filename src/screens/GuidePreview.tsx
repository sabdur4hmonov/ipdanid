import { useRef, useEffect } from "react";
import type { Instruction, Locale } from "../core/types";
import { translate } from "../i18n";
import { subjectPlanOf } from "../core/subject-plan";
import { subjectText } from "../subject-i18n";
import { renderInstruction } from "../core/render";
export function Supply({
  instruction: i,
  locale,
}: {
  instruction: Instruction;
  locale: Locale;
}) {
  const t = translate(locale),
    shortfall = Math.max(0, i.metrics.estimatedMeters - i.profile.stockMeters);
  return (
    <div className="supply" data-testid="supply">
      {i.profile.pinLayout && (
        <p>
          {t("layoutNotice")} {i.profile.pinLayout.phaseDegreesClockwise}° ·{" "}
          {i.profile.pinLayout.version}
        </p>
      )}
      <p>
        {t("stockMeters")}: {i.profile.stockMeters.toFixed(1)} m ·{" "}
        {t("stockShortfall")}:{" "}
        <strong>{(Math.ceil(shortfall * 10) / 10).toFixed(1)} m</strong>
      </p>
      <p className="fineprint">{t("stockHint")}</p>
      <p className="fineprint">
        {t("stopReason")}:{" "}
        {t(
          i.metrics.stoppedReason === "requested"
            ? "requestedStop"
            : i.metrics.stoppedReason === "compute-limit"
              ? "computeLimit"
              : ["quality-plateau", "no-improvement"].includes(
                    i.metrics.stoppedReason,
                  )
                ? "qualityPlateau"
                : "legacyStop",
        )}
      </p>
      {i.metrics.refinement?.reason === "compute-limit" && (
        <p className="fineprint">{t("refineLimit")}</p>
      )}
      {Object.entries(i.metrics.perColorMeters).map(([color, m]) => (
        <span key={color} className="color-length">
          <i style={{ background: color }} />
          {color}: {(Math.ceil(m * 10) / 10).toFixed(1)} m{" "}
        </span>
      ))}
    </div>
  );
}
export function ResultSubject({
  instruction,
  locale,
}: {
  instruction: Instruction;
  locale: Locale;
}) {
  let view;
  try {
    view = subjectPlanOf(instruction.params);
  } catch {
    return null;
  }
  const { plan, legacy } = view;
  return (
    <p
      className="fineprint"
      data-testid="result-subject"
      data-kind={plan.kind}
      data-legacy={legacy}
      data-subjects={plan.subjects.length}
    >
      {subjectText(locale, "title")} {subjectText(locale, plan.kind)}
      {plan.kind === "people" ? ` · ${plan.subjects.length}` : ""}
    </p>
  );
}
export function Preview({
  instruction,
  step = 0,
  completed,
  pins = true,
}: {
  instruction: Instruction;
  step?: number;
  completed?: number;
  pins?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current)
      renderInstruction(canvas.current.getContext("2d")!, instruction, {
        highlight: step,
        completed,
        pins,
      });
  }, [instruction, step, completed, pins]);
  return (
    <canvas
      ref={canvas}
      width={720}
      height={Math.round(
        (720 * instruction.profile.heightMm) / instruction.profile.widthMm,
      )}
      aria-label={`Thread preview ${instruction.sequenceHash}`}
      data-sequence-hash={instruction.sequenceHash}
    />
  );
}
