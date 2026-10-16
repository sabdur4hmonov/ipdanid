import { customerFlowText } from "../customer-flow-i18n";
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
export function MoreMenu({
  context,
  customerMode = false,
  onCustomer,
  onExpert,
}: {
  context: ScreenContext;
  customerMode?: boolean;
  onCustomer?: () => void;
  onExpert?: () => void;
}) {
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
      <summary>
        {customerMode ? customerFlowText(locale, "menu") : simple("more")}
      </summary>
      <div className="more-menu-items">
        {onCustomer && (
          <button onClick={onCustomer}>
            {customerFlowText(locale, "simple")}
          </button>
        )}
        {onExpert && (
          <button onClick={onExpert}>
            {customerFlowText(locale, "expert")}
          </button>
        )}
        {!customerMode && (
          <button onClick={() => nav("materials")}>{t("materials")}</button>
        )}
        <button onClick={() => nav("customer")}>
          {customerText(locale, "customer")}
        </button>
        {!customerMode && (
          <button onClick={() => nav("crafts")}>{t("crafts")}</button>
        )}
        <button
          onClick={() => {
            setShowPrivacy(true);
            setMoreOpen(false);
          }}
        >
          {t("privacy")}
        </button>
        {!customerMode && (
          <button
            onClick={() => {
              addPhoto(sampleCanvas(), t("sample"), true);
              nav("create");
            }}
          >
            {t("sample")}
          </button>
        )}
      </div>
    </details>
  );
}
