import { useMemo } from "react";
import { validatePaintProject, type PaintProject } from "./core/paint";
import { paintBoundaryPlan, paintBoundarySvg } from "./core/paint-boundaries";
import type { Locale } from "./core/types";
import { craftPolishText } from "./craft-polish-i18n";
import { download } from "./download";
export function PaintPolish({
  project,
  region,
  locale,
  run,
}: {
  project: PaintProject;
  region: number;
  locale: Locale;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  const plan = useMemo(() => paintBoundaryPlan(project.guide), [project.guide]),
    current = plan.regions[region],
    paintedCells = project.guide.regions
      .filter((r) => project.progress.completed.includes(r.id))
      .reduce((n, r) => n + r.cells.length, 0),
    t = (k: Parameters<typeof craftPolishText>[1]) =>
      craftPolishText(locale, k);
  return (
    <section data-testid="paint-boundaries">
      <h3>{t("boundaryPlan")}</h3>
      <p data-testid="paint-area-progress">
        {t("painted")}:{" "}
        {((100 * paintedCells) / project.guide.cells.length).toFixed(1)}% ·{" "}
        {((paintedCells * project.guide.pitchMm ** 2) / 100).toFixed(2)} cm²
      </p>
      <p>
        {current.areaCm2.toFixed(2)} cm² · {t("loops")}: {current.loops.length}{" "}
        · {t("holes")}:{" "}
        {current.loops.filter((l) => l.signedAreaCells < 0).length}
      </p>
      <p>
        {t("labelsMissing")}: {plan.regions.filter((r) => !r.labelFits).length}
      </p>
      <p>{t("boundaryHint")}</p>
      <div className="grid-actions">
        {(["Svg", "Json"] as const).map((format) => (
          <button
            key={format}
            onClick={() =>
              void run(async () => {
                await validatePaintProject(project);
                const stem =
                  "boundaries-" + project.guide.sequenceHash.slice(0, 12);
                if (format === "Svg")
                  await download(
                    stem + ".svg",
                    paintBoundarySvg(project.guide),
                    "image/svg+xml",
                  );
                else
                  await download(
                    stem + ".json",
                    JSON.stringify(
                      paintBoundaryPlan(
                        project.guide,
                        project.progress.completed,
                      ),
                      null,
                      2,
                    ),
                  );
              })
            }
          >
            {t(`boundary${format}`)}
          </button>
        ))}
      </div>
    </section>
  );
}
