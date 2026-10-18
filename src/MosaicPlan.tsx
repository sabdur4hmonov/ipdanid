import { validateGridProject, type GridProject } from "./core/grid-craft";
import { mosaicPlan, mosaicPlanSvg } from "./core/mosaic-plan";
import type { Locale } from "./core/types";
import { craftPolishText } from "./craft-polish-i18n";
import { download } from "./download";
export function MosaicPlan({
  project,
  step,
  locale,
  run,
}: {
  project: GridProject;
  step: number;
  locale: Locale;
  run: (fn: () => Promise<void>) => Promise<void>;
}) {
  if (!project.layout) return null;
  const plan = mosaicPlan(project),
    current = plan.steps[step - 1],
    t = (k: Parameters<typeof craftPolishText>[1]) =>
      craftPolishText(locale, k);
  return (
    <section data-testid="mosaic-plan">
      <h3>{t("plates")}</h3>
      <p>
        {plan.required}/{plan.stock} · {plan.plateColumns} × {plan.plateRows}
      </p>
      <p>
        {t("board")}: {plan.boardWidthMm} × {plan.boardHeightMm} mm ·{" "}
        {t("unused")}: {plan.unusedStuds}
      </p>
      <p data-testid="mosaic-current">
        {t("plate")} {current.plate} · {current.row}, {current.column} ·{" "}
        {current.code}
      </p>
      <p>{t("blank")}</p>
      <div className="grid-actions">
        {(["Pdf", "Svg", "Json"] as const).map((format) => (
          <button
            key={format}
            onClick={() =>
              void run(async () => {
                await validateGridProject(project);
                const stem = "baseplates-" + plan.layoutHash.slice(0, 12);
                if (format === "Pdf") {
                  const { mosaicPdf } = await import("./core/mosaic-pdf");
                  await download(
                    stem + ".pdf",
                    new Blob(
                      [Uint8Array.from(await mosaicPdf(project, locale))],
                      { type: "application/pdf" },
                    ),
                  );
                } else if (format === "Svg")
                  await download(
                    stem + ".svg",
                    mosaicPlanSvg(project),
                    "image/svg+xml",
                  );
                else
                  await download(stem + ".json", JSON.stringify(plan, null, 2));
              })
            }
          >
            {t(`plan${format}`)}
          </button>
        ))}
      </div>
      <details>
        <summary>
          {t("plate")}: {plan.plates.length}
        </summary>
        {plan.plates.map((p) => (
          <p key={p.id}>
            {p.id}: {p.confirmed}/{p.steps.length} ·{" "}
            {p.counts
              .filter((c) => c.used)
              .map((c) => `${c.code}:${c.used}`)
              .join(" · ")}
          </p>
        ))}
      </details>
    </section>
  );
}
