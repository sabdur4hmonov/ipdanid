import type { AppScreenContext } from "../useAppController";
type ScreenContext = Pick<
  AppScreenContext,
  "ArrowRight" | "Leaf" | "customerText" | "locale" | "nav" | "t"
>;
export function MoreScreen({ context }: { context: ScreenContext }) {
  const { ArrowRight, Leaf, customerText, locale, nav, t } = context;
  return (
    <section className="card material-page">
      <Leaf size={36} />
      <h1>{t("materialTitle")}</h1>
      <p>{t("materialText")}</p>
      <div className="material-specs">
        <span>400 × 400 mm</span>
        <span>120 {t("pdfPin")}</span>
        <span>0.3 mm</span>
      </div>
      <p className="provisional">{t("provisional")}</p>
      <label className="field-label">{t("code")}</label>
      <button className="outline" onClick={() => nav("customer")}>
        {customerText(locale, "redeem")}
      </button>
      <p className="fineprint">{t("codeInfo")}</p>
      <button className="primary" onClick={() => nav("create")}>
        {t("try")}
        <ArrowRight size={16} />
      </button>
    </section>
  );
}
