import type { Locale } from "./core/types";
import { websiteText } from "./website-i18n";
import { ownerContact, phoneContact, telegramContact } from "./owner-contact";
export function CustomerContact({ locale }: { locale: Locale }) {
  return (
    <>
      <a
        className="customer-contact-float"
        data-testid="customer-contact"
        href={telegramContact()}
        target="_blank"
        rel="noopener noreferrer"
      >
        {websiteText(locale, "telegram")}
      </a>
      <div className="customer-contact-footer">
        <a href={telegramContact()} target="_blank" rel="noopener noreferrer">
          {websiteText(locale, "telegram")}
        </a>
        <a href={phoneContact()}>{ownerContact.phone}</a>
      </div>
    </>
  );
}
