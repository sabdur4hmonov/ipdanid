import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
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
  return (
    <nav
      className="card customer-actions"
      data-testid="owner-admin-navigation"
      aria-label={
        locale === "ru"
          ? "Разделы управления"
          : locale === "en"
            ? "Administration sections"
            : "Boshqaruv bo‘limlari"
      }
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
    </nav>
  );
}
