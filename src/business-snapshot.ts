import type { StorefrontSettings, Announcement } from "./business-types";
export type BusinessSnapshot = {
  settings: StorefrontSettings;
  announcements: Announcement[];
  serverTime?: number;
};
export function validBusinessSnapshot(
  value: unknown,
): value is BusinessSnapshot {
  const v = value as BusinessSnapshot,
    s = v?.settings;
  return Boolean(
    s &&
    Number.isSafeInteger(s.revision) &&
    s.revision >= 0 &&
    [
      "brandName",
      "sellerName",
      "sellerPhone",
      "paymentDetails",
      "pickupAddress",
    ].every((k) => typeof s[k as keyof StorefrontSettings] === "string") &&
    s.brandName &&
    typeof s.deliveryEnabled === "boolean" &&
    Number.isSafeInteger(s.deliveryFeeMinor) &&
    s.deliveryFeeMinor >= 0 &&
    s.homeTitle &&
    ["uz", "ru", "en"].every(
      (k) => typeof s.homeTitle[k as "uz"] === "string",
    ) &&
    (s.homeTitle["uz-Cyrl"] === undefined ||
      typeof s.homeTitle["uz-Cyrl"] === "string") &&
    (v.serverTime === undefined || Number.isFinite(v.serverTime)) &&
    Array.isArray(v.announcements) &&
    v.announcements.length <= 100 &&
    v.announcements.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        a.id.length > 0 &&
        typeof a.title === "string" &&
        typeof a.body === "string" &&
        typeof a.active === "boolean" &&
        Number.isSafeInteger(a.revision) &&
        a.revision > 0 &&
        Number.isSafeInteger(a.startsAt) &&
        Number.isSafeInteger(a.endsAt) &&
        a.endsAt > a.startsAt &&
        ["news", "promotion"].includes(a.kind),
    ),
  );
}
