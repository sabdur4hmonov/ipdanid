// The owner's supplied placeholders. Replace ONLY these two values before launch.
export const ownerContact = Object.freeze({
  telegram: "SENING_USERNAME",
  phone: "+998XXXXXXXXX",
});
export function telegramContact(workId?: string) {
  const text = workId
    ? `Ip Rasm: kit sotib olmoqchiman. Ish raqami: ${workId}`
    : "Ip Rasm: kit haqida ma'lumot olmoqchiman.";
  return `https://t.me/${ownerContact.telegram}?text=${encodeURIComponent(text)}`;
}
export const phoneContact = () => `tel:${ownerContact.phone}`;
