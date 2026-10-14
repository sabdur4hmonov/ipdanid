import type { AppScreenContext } from "../useAppController";
type ScreenContext = Pick<
  AppScreenContext,
  | "addPhoto"
  | "customerText"
  | "locale"
  | "moreOpen"
  | "nav"
  | "sampleCanvas"
  | "setMoreOpen"
  | "setShowPrivacy"
  | "simple"
  | "t"
>;
export function MoreMenu({ context }: { context: ScreenContext }) {
  const {
    addPhoto,
    customerText,
    locale,
    moreOpen,
    nav,
    sampleCanvas,
    setMoreOpen,
    setShowPrivacy,
    simple,
    t,
  } = context;
  return (
    <details
      className="more-menu"
      open={moreOpen}
      onToggle={(e) => setMoreOpen(e.currentTarget.open)}
    >
      <summary>{simple("more")}</summary>
      <div className="more-menu-items">
        <button onClick={() => nav("materials")}>{t("materials")}</button>
        <button onClick={() => nav("customer")}>
          {customerText(locale, "customer")}
        </button>
        <button onClick={() => nav("crafts")}>{t("crafts")}</button>
        <button
          onClick={() => {
            setShowPrivacy(true);
            setMoreOpen(false);
          }}
        >
          {t("privacy")}
        </button>
        <button
          onClick={() => {
            addPhoto(sampleCanvas(), t("sample"), true);
            nav("create");
          }}
        >
          {t("sample")}
        </button>
      </div>
    </details>
  );
}
