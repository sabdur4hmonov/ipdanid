// Supplied fallback placeholders; Admin storefront settings override them without rebuilding.
export type OwnerContact = { telegram: string; phone: string };
export const ownerContact: Readonly<OwnerContact> = Object.freeze({
  telegram: "SENING_USERNAME",
  phone: "+998XXXXXXXXX",
});
export function configuredContact(settings: { sellerTelegram?: string; sellerPhone?: string }) {
  return {
    telegram: settings.sellerTelegram || ownerContact.telegram,
    phone: settings.sellerPhone || ownerContact.phone,
  };
}
export function telegramContact(workId?: string, contact = ownerContact) {
  const text = workId
    ? `Ip Rasm: kit sotib olmoqchiman. Ish raqami: ${workId}`
    : "Ip Rasm: kit haqida ma'lumot olmoqchiman.";
  return `https://t.me/${contact.telegram}?text=${encodeURIComponent(text)}`;
}
export const phoneContact = (contact = ownerContact) => `tel:${contact.phone}`;
