import { memo, useEffect, useState } from "react";
import { Preview } from "./GuidePreview";
import { translate } from "../i18n";
import type { Instruction, Locale } from "../core/types";

const CachedPreview = memo(Preview);

export function AssemblyResultComparison({
  instruction,
  current,
  total,
  locale,
}: {
  instruction: Instruction;
  current: number;
  total: number;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const [renderedStep, setRenderedStep] = useState<number>();
  const t = translate(locale);
  useEffect(() => {
    if (!open || renderedStep === current) return;
    const timer = setTimeout(() => setRenderedStep(current), 120);
    return () => clearTimeout(timer);
  }, [open, current, renderedStep]);
  return (
    <details
      className="card assembly-result-card"
      data-testid="assembly-current-result"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        {t("currentResult")} · {current}/{total}
      </summary>
      {renderedStep !== undefined && (
        <div
          className="assembly-result-comparison"
          aria-busy={open && renderedStep !== current}
        >
          <figure data-testid="assembly-partial-result">
            <figcaption>
              {t("partialResult")} · {renderedStep}/{total}
            </figcaption>
            <CachedPreview
              instruction={instruction}
              completed={renderedStep}
              pins={false}
            />
          </figure>
          <figure data-testid="assembly-final-result">
            <figcaption>
              {t("finalResult")} · {total}/{total}
            </figcaption>
            <CachedPreview instruction={instruction} pins={false} />
          </figure>
          <p className="fineprint">{t("currentResultHint")}</p>
        </div>
      )}
    </details>
  );
}
