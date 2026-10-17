import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import { baseLocale, scriptText } from "./uzbek-script";
import { customerApi as api } from "./customer-api";
type Provider = "click" | "payme";
type Invoice = {
  id: string;
  provider: Provider;
  state: number;
  status: string;
  amountMinor: number;
};
const words = {
  uz: {
    title: "Buyurtma to‘lovi",
    test: "sinov",
    pending: "To‘lov kutilmoqda",
    paid: "To‘landi",
    cancelled: "Bekor qilindi",
    pay: "Sinov to‘lovini tasdiqlash",
    refresh: "To‘lovni tekshirish",
    change: "Boshqa usulni tanlash",
    error: "To‘lovni tekshirib, qayta urinib ko‘ring.",
    note: "Bu sinov: haqiqiy pul olinmaydi. Naqd yoki olib ketish tanlovi ham qoladi.",
  },
  ru: {
    title: "Оплата заказа",
    test: "тест",
    pending: "Ожидается оплата",
    paid: "Оплачено",
    cancelled: "Отменено",
    pay: "Подтвердить тестовую оплату",
    refresh: "Проверить оплату",
    change: "Другой способ",
    error: "Проверьте оплату и повторите попытку.",
    note: "Это тест, реальные деньги не списываются. Наличные и самовывоз также доступны.",
  },
  en: {
    title: "Order payment",
    test: "test",
    pending: "Awaiting payment",
    paid: "Paid",
    cancelled: "Cancelled",
    pay: "Confirm test payment",
    refresh: "Check payment",
    change: "Choose another method",
    error: "Check the payment and try again.",
    note: "This is a test; no money is charged. Cash and pickup remain available.",
  },
};
export function PaymentOptions({
  orderId,
  locale,
  onUpdated,
}: {
  orderId: string;
  locale: Locale;
  onUpdated: () => Promise<void>;
}) {
  const [config, setConfig] = useState<{
      providers: Provider[];
      mockCheckout: boolean;
    }>(),
    [invoice, setInvoice] = useState<Invoice>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const key = useRef(crypto.randomUUID());
  const t = (k: keyof typeof words.en) =>
    scriptText(words[baseLocale(locale)][k], locale);
  useEffect(() => {
    let live = true;
    void api
      .request<{ providers: Provider[]; mockCheckout: boolean }>(
        "/payments/config",
      )
      .then((c) => {
        if (live) setConfig(c);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(false);
    try {
      await fn();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  if (!config?.providers.length) return null;
  return (
    <section data-testid="payment-options">
      <h3>{t("title")}</h3>
      <p>{t("note")}</p>
      {!invoice ? (
        <div className="customer-actions">
          {config.providers.map((p) => (
            <button
              key={p}
              disabled={busy}
              data-testid={"pay-" + p}
              onClick={() =>
                void run(async () =>
                  setInvoice(
                    await api.request<Invoice>("/payments/invoices", {
                      provider: p,
                      orderId,
                      requestKey: key.current,
                    }),
                  ),
                )
              }
            >
              {p === "click" ? "Click" : "Payme"} ({t("test")})
            </button>
          ))}
        </div>
      ) : (
        <div>
          <p>
            {invoice.provider === "click" ? "Click" : "Payme"} ·{" "}
            {t(
              invoice.state === 2
                ? "paid"
                : invoice.state < 0
                  ? "cancelled"
                  : "pending",
            )}
          </p>
          {config.mockCheckout && invoice.state >= 0 && invoice.state < 2 && (
            <button
              data-testid="simulate-payment"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const next = await api.request<Invoice>(
                    "/payments/invoices/" + invoice.id + "/mock",
                    {},
                  );
                  setInvoice(next);
                  if (next.state === 2) await onUpdated();
                })
              }
            >
              {t("pay")}
            </button>
          )}
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const next = await api.request<Invoice>(
                  "/payments/invoices/" + invoice.id,
                );
                setInvoice(next);
                if (next.state === 2) await onUpdated();
              })
            }
          >
            {t("refresh")}
          </button>
          {invoice.state === 0 && (
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await api.request(
                    "/payments/invoices/" + invoice.id + "/cancel",
                    {},
                  );
                  key.current = crypto.randomUUID();
                  setInvoice(undefined);
                })
              }
            >
              {t("change")}
            </button>
          )}
        </div>
      )}
      {error && <p role="alert">{t("error")}</p>}
    </section>
  );
}
