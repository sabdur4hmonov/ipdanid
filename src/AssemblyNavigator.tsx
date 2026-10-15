import { useEffect, useMemo, useState } from "react";
import type { Locale, Project } from "./core/types";
import { flatten } from "./core/engine";
import { guideText } from "./guide-i18n";
export function AssemblyNavigator({
  project,
  current,
  locale,
  disabled,
  onJump,
  onChange,
}: {
  project: Project;
  current: number;
  locale: Locale;
  disabled: boolean;
  onJump: (step: number) => void;
  onChange: (bookmarks: NonNullable<Project["bookmarks"]>) => void;
}) {
  const t = (key: Parameters<typeof guideText>[1]) => guideText(locale, key);
  const steps = useMemo(
    () => flatten(project.instruction),
    [project.instruction],
  );
  const [page, setPage] = useState(Math.floor((current - 1) / 50)),
    [label, setLabel] = useState("");
  useEffect(
    () => setPage(Math.floor((current - 1) / 50)),
    [current, project.id],
  );
  const pages = Math.ceil(steps.length / 50),
    bookmarks = project.bookmarks ?? [];
  return (
    <section className="card assembly-navigation">
      <h2>{t("guide")}</h2>
      <p className="fineprint">{t("note")}</p>
      <button
        className="outline"
        onClick={() =>
          onJump(Math.min(steps.length, project.progress.confirmed + 1))
        }
      >
        {t("resume")}
      </button>
      <div className="customer-actions">
        <button
          className="outline"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          {t("previous")}
        </button>
        <label>
          {t("page")}
          <select
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
          >
            {Array.from({ length: pages }, (_, p) => (
              <option key={p} value={p}>
                {p + 1}: {p * 50 + 1}–{Math.min((p + 1) * 50, steps.length)}
              </option>
            ))}
          </select>
        </label>
        <button
          className="outline"
          disabled={page >= pages - 1}
          onClick={() => setPage((p) => p + 1)}
        >
          {t("next")}
        </button>
      </div>
      <div className="step-list">
        {steps.slice(page * 50, (page + 1) * 50).map((step) => (
          <button
            key={step.index}
            className={`outline${step.index === current ? " active-step" : ""}`}
            aria-current={step.index === current ? "step" : undefined}
            onClick={() => onJump(step.index)}
          >
            <strong>{step.index}</strong>
            <i style={{ background: step.color }} /> {step.fromLabel??step.from} → {step.toLabel??step.to}
            {step.segmentStart ? " •" : ""}
          </button>
        ))}
      </div>
      <h3>{t("bookmarks")}</h3>
      <label>
        {t("label")}
        <input
          maxLength={80}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>
      <button
        className="outline"
        disabled={
          disabled ||
          bookmarks.length >= 50 ||
          bookmarks.some((b) => b.step === current)
        }
        onClick={() => {
          onChange(
            [...bookmarks, { step: current, label: label.trim() }].sort(
              (a, b) => a.step - b.step,
            ),
          );
          setLabel("");
        }}
      >
        {t("bookmark")}
      </button>
      {bookmarks.map((b) => (
        <div className="customer-row" key={b.step}>
          <button className="text-button" onClick={() => onJump(b.step)}>
            {b.step} · {b.label}
          </button>
          <button
            className="text-button"
            disabled={disabled}
            aria-label={`${t("remove")} ${b.step}`}
            onClick={() => onChange(bookmarks.filter((v) => v.step !== b.step))}
          >
            ×
          </button>
        </div>
      ))}
    </section>
  );
}
