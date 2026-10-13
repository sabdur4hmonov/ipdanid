import type { PhotoQualityAdvice as Advice } from "./core/photo-quality";
import type { Locale } from "./core/types";
import { portraitHelp } from "./portrait-help-i18n";
export function PhotoQualityAdvice({
  advice,
  locale,
}: {
  advice: Advice | null;
  locale: Locale;
}) {
  if (!advice) return null;
  return (
    <details
      className="edits"
      data-testid="photo-quality-advice"
      open={advice.some((a) => a.clipped || a.small)}
    >
      <summary>{portraitHelp(locale, "title")}</summary>
      <p>{portraitHelp(locale, "hint")}</p>
      {advice.map((a) => (
        <div key={a.person} data-person={a.person}>
          {a.estimatedRegions && <p>{portraitHelp(locale, "estimated")}</p>}
          {advice.length > 1 && (
            <strong>
              {portraitHelp(locale, "person")} {a.person}
            </strong>
          )}
          {(["clipped", "small", "flat"] as const)
            .filter((key) => a[key])
            .map((key) => (
              <p key={key}>{portraitHelp(locale, key)}</p>
            ))}
          {!a.clipped && !a.small && !a.flat && (
            <p>{portraitHelp(locale, "clear")}</p>
          )}
          <p className="fineprint">
            {a.sampling
              .map(
                (r) =>
                  `${portraitHelp(locale,r.key)}: ${Math.round(r.widthPixels)} × ${Math.round(r.heightPixels)} px, Δ ${r.toneRange.toFixed(2)}`,
              )
              .join(" · ")}
          </p>
        </div>
      ))}
      <p>{portraitHelp(locale, "review")}</p>
    </details>
  );
}
