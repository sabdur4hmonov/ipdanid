import { useFeatures } from "./FeatureContext";
import { uiText } from "./ui-i18n";
import { trialText } from "./trial-i18n";
import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
import { galleryText } from "./gallery-i18n";
import { offersText } from "./offers-i18n";
import { partnerText } from "./partner-i18n";
import { catalogText } from "./catalog-i18n";
import { journeyText } from "./journey-i18n";
import { commissionText } from "./commission-i18n";
import { financeText } from "./finance-i18n";
import {mailText} from './mail-i18n';
import {analyticsText} from './analytics-i18n';
const words = {
  uz: [
    "Kit kodlari",
    "Kreditlar",
    "Buyurtmalar",
    "Narxlar",
    "Dostavka",
    "E’lonlar",
  ],
  ru: ["Коды наборов", "Кредиты", "Заказы", "Цены", "Доставка", "Объявления"],
  en: ["Kit codes", "Credits", "Orders", "Prices", "Delivery", "Announcements"],
};
export function OwnerAdminNavigation({ locale }: { locale: Locale }) {
  const features = useFeatures();
  return (
    <nav
      className="card customer-actions"
      data-testid="owner-admin-navigation"
      aria-label={uiText(locale,"ownerSections")}
    >
      {["kits", "credits", "orders", "prices", "delivery", "announcements"].map(
        (name, j) => (
          <button
            className="outline"
            key={name}
            onClick={() =>
              document
                .getElementById("admin-" + name)
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
          >
            {scriptText(words[baseLocale(locale)][j], locale)}
          </button>
        ),
      )}
      <button hidden={!features.trials} className="outline" onClick={()=>document.getElementById("admin-trials")?.scrollIntoView({behavior:"smooth",block:"start"})}>{trialText(locale,"admin")}</button>
      <button hidden={!features.partner}
        className="outline"
        onClick={() =>
          document
            .getElementById("admin-partners")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      >
        {partnerText(locale, "admin")}
      </button>
      {(["catalog", "regions"] as const).map((id) => (
        <button
          key={id}
          className="outline"
          onClick={() =>
            document
              .getElementById("admin-" + id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          {catalogText(locale, id === "catalog" ? "admin" : "regions")}
        </button>
      ))}
      <button className="outline" onClick={()=>document.getElementById("admin-finance")?.scrollIntoView({behavior:"smooth",block:"start"})}>{financeText(locale,"title")}</button>
      <button hidden={!features.inbox} className="outline" onClick={()=>document.getElementById('admin-mail')?.scrollIntoView({behavior:'smooth',block:'start'})}>{mailText(locale,'admin')}</button>
      <button hidden={!features.analytics} className="outline" onClick={()=>document.getElementById('admin-analytics')?.scrollIntoView({behavior:'smooth',block:'start'})}>{analyticsText(locale,'admin')}</button>
      <button hidden={!features.commissions} className="outline" onClick={()=>document.getElementById("admin-commissions")?.scrollIntoView({behavior:"smooth",block:"start"})}>{commissionText(locale,"orders")}</button>
      <button hidden={!features.digital}
        className="outline"
        onClick={() =>
          document
            .getElementById("admin-digital")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      >
        {journeyText(locale, "admin")}
      </button>
      <button hidden={!features.offers}
        className="outline"
        onClick={() =>
          document
            .getElementById("admin-offers")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      >
        {offersText(locale, "admin")}
      </button>
      <button hidden={!features.gallery}
        className="outline"
        onClick={() =>
          document
            .getElementById("admin-gallery")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      >
        {galleryText(locale, "moderation")}
      </button>
    </nav>
  );
}
