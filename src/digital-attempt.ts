import { isCommerceCurrency } from "./commerce-regions";
import type { DigitalPurchaseRequest } from "./journey-types";
export type DigitalAttempt = {
  version: "digital-attempt/1";
  createdAt: number;
  body: DigitalPurchaseRequest;
  display: { name: string; credits: number };
};
export function validDigitalAttempt(
  value: unknown,
  now = Date.now(),
): value is DigitalAttempt {
  const v = value as DigitalAttempt,
    b = v?.body,
    q = b?.quote;
  if (
    !v ||
    Object.keys(v).sort().join(",") !== "body,createdAt,display,version" ||
    !v.display ||
    Object.keys(v.display).sort().join(",") !== "credits,name" ||
    typeof v.display.name !== "string" ||
    !v.display.name.trim() ||
    v.display.name.length > 120 ||
    !Number.isSafeInteger(v.display.credits) ||
    v.display.credits < 1 ||
    v.display.credits > 100
  )
    return false;
  if (
    !v ||
    v.version !== "digital-attempt/1" ||
    !Number.isSafeInteger(v.createdAt) ||
    v.createdAt > now + 300000 ||
    v.createdAt < now - 7 * 86400000 ||
    !b ||
    Object.keys(b).sort().join(",") !==
      "kind,locale,name,productId,quote,requestKey" ||
    typeof b.productId !== "string" ||
    !/^[-a-z0-9]{2,80}$/.test(b.productId) ||
    typeof b.kind !== "string" ||
    !["app", "gift"].includes(b.kind) ||
    typeof b.locale !== "string" ||
    !["uz", "uz-Cyrl", "ru", "en"].includes(b.locale) ||
    typeof b.name !== "string" ||
    b.name.trim().length < 2 ||
    b.name.length > 120 ||
    /[\x00-\x1f\x7f]/.test(b.name) ||
    typeof b.requestKey !== "string" ||
    !/^[a-f0-9-]{36}$/.test(b.requestKey) ||
    !q ||
    Object.keys(q).sort().join(",") !==
      (q.catalogRevision === undefined
        ? "currency,productRevision,settingsRevision,totalMinor"
        : "catalogRevision,currency,productRevision,settingsRevision,totalMinor") ||
    !isCommerceCurrency(q.currency) ||
    ![
      q.productRevision,
      q.settingsRevision,
      q.totalMinor,
      ...(q.catalogRevision === undefined ? [] : [q.catalogRevision]),
    ].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    q.totalMinor < 1
  )
    return false;
  return JSON.stringify(v).length <= 20000;
}
