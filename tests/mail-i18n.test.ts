import { expect, it } from "vitest";
import { mailText, mailState, type MailWord } from "../src/mail-i18n";
it("message delivery and consent controls have all four language forms and unknown status is honest", () => {
  const keys: MailWord[] = [
    "title",
    "admin",
    "empty",
    "refresh",
    "read",
    "seen",
    "email",
    "consent",
    "privacy",
    "language",
    "save",
    "saved",
    "register",
    "disabled",
    "mock",
    "configured",
    "retry",
    "attempts",
    "polls",
    "retention",
    "in_app",
    "queued",
    "sending",
    "accepted",
    "checking",
    "delivered",
    "failed",
    "cancelled",
    "unknown",
    "uz",
    "cyrl",
    "ru",
    "en",
    "serviceDisabled",
    "serviceMock",
    "serviceResend",
  ];
  for (const locale of ["uz", "uz-Cyrl", "ru", "en"] as const) {
    for (const k of keys)
      expect(mailText(locale, k)?.length).toBeGreaterThan(0);
    expect(mailState(locale, "future-status")).toBe(
      mailText(locale, "unknown"),
    );
  }
  expect(mailText("uz-Cyrl", "title")).toMatch(/[А-Яа-я]/);
  expect(mailText("ru", "accepted")).not.toBe(mailText("ru", "delivered"));
  expect(mailText("en", "unknown")).toContain("unknown");
});
