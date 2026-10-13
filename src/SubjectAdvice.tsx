import type { SubjectAdviceResult, AdviceItem } from "./core/subject-advice";
import type { Locale } from "./core/types";
import { portraitHelp } from "./portrait-help-i18n";
import { subjectText } from "./subject-i18n";
const MESSAGE = {
  small: "adviceSmall",
  "many-people": "adviceManyPeople",
  contrast: "adviceContrast",
  blur: "adviceBlur",
} as const;
const FIX = { zoom: "fixZoom", crop: "fixCrop", photo: "fixPhoto" } as const;
// Advice only: generation stays available whatever is listed here.
export function SubjectAdvice({
  advice,
  locale,
  disabled,
  onFix,
}: {
  advice: SubjectAdviceResult | null;
  locale: Locale;
  disabled?: boolean;
  onFix: (item: AdviceItem) => void;
}) {
  if (!advice) return null;
  const t = (key: Parameters<typeof subjectText>[1]) =>
    subjectText(locale, key);
  return (
    <section
      className="notice"
      data-testid="subject-advice"
      data-count={advice.items.length}
      aria-label={t("adviceTitle")}
    >
      <h3>{t("adviceTitle")}</h3>
      {advice.items.length ? (
        <>
          <p className="fineprint">{t("adviceIntro")}</p>
          {advice.items.map((item, k) => (
            <div
              key={`${item.key}-${item.person ?? 0}-${k}`}
              data-advice={item.key}
              data-person={item.person}
            >
              <p>
                {item.person !== undefined &&
                  `${portraitHelp(locale, "person")} ${item.person}: `}
                {t(MESSAGE[item.key])}
              </p>
              <div className="subject-advice-fix">
                <button
                  type="button"
                  className="outline"
                  data-fix={item.fix}
                  disabled={disabled}
                  onClick={() => onFix(item)}
                >
                  {t(FIX[item.fix])}
                </button>
                {item.fix !== "photo" && (
                  <button
                    type="button"
                    className="text-button"
                    data-fix="photo"
                    disabled={disabled}
                    onClick={() => onFix({ ...item, fix: "photo" })}
                  >
                    {t("fixPhoto")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      ) : (
        <p className="fineprint">{t("adviceNone")}</p>
      )}
    </section>
  );
}
