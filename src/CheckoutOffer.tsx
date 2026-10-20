import { useEffect, useRef, useState } from "react";
import { customerApi as api } from "./customer-api";
import type { Locale } from "./core/types";
import type { OfferQuote } from "./offer-types";
import { validOfferQuote } from "./checkout-offer";
import { offersText } from "./offers-i18n";

export function useCheckoutOffer(binding: string) {
  const [code, setCode] = useState(""),
    [bound, setBound] = useState<{ binding: string; quote: OfferQuote } | null>(
      null,
    ),
    [checking, setChecking] = useState(false),
    [failed, setFailed] = useState(false),
    [now, setNow] = useState(Date.now);
  const current = useRef(binding);
  current.current = binding;
  const epoch = useRef(0),
    live = useRef(true);
  const clear = () => {
    ++epoch.current;
    setCode("");
    setBound(null);
    setChecking(false);
    setFailed(false);
  };
  useEffect(() => {
    live.current = true;
    api.sessionChanged.add(clear);
    return () => {
      live.current = false;
      ++epoch.current;
      api.sessionChanged.delete(clear);
    };
  }, []);
  useEffect(() => {
    if (!bound) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [bound]);
  const quote =
    bound?.binding === binding && bound.quote.expiresAt > now
      ? bound.quote
      : null;
  return {
    code,
    quote,
    checking,
    failed,
    stale: !!bound && !quote,
    blocked: checking || (!!code.trim() && !quote),
    clear,
    edit(value: string) {
      ++epoch.current;
      setCode(value);
      setBound(null);
      setChecking(false);
      setFailed(false);
    },
    async apply(
      items: { productId: string; quantity: number }[],
      method: string,
    ) {
      const ticket = ++epoch.current,
        signature = current.current,
        token = api.session?.token;
      setChecking(true);
      setFailed(false);
      setBound(null);
      try {
        const response = await api.request<OfferQuote>("/offers/quote", {
          code: code.trim(),
          items,
          method,
        });
        if (
          !live.current ||
          ticket !== epoch.current ||
          signature !== current.current ||
          token !== api.session?.token
        )
          return;
        if (!validOfferQuote(response) || response.expiresAt <= Date.now())
          throw Error("Invalid quote");
        setNow(Date.now());
        setBound({ binding: signature, quote: response });
      } catch {
        if (
          live.current &&
          ticket === epoch.current &&
          token === api.session?.token
        )
          setFailed(true);
      } finally {
        if (live.current && ticket === epoch.current) setChecking(false);
      }
    },
  };
}
export function CheckoutOffer({
  locale,
  offer,
  items,
  method,
  money,
}: {
  locale: Locale;
  offer: ReturnType<typeof useCheckoutOffer>;
  items: { productId: string; quantity: number }[];
  method: string;
  money: (n: number) => string;
}) {
  const t = (k: Parameters<typeof offersText>[1]) => offersText(locale, k);
  return (
    <section data-testid="checkout-offer">
      <label>
        {t("code")}
        <input
          maxLength={24}
          autoCapitalize="characters"
          value={offer.code}
          onChange={(e) => offer.edit(e.target.value)}
        />
      </label>
      <div className="customer-actions">
        <button
          className="outline"
          disabled={offer.checking || !offer.code.trim() || !items.length}
          onClick={() => void offer.apply(items, method)}
        >
          {t("apply")}
        </button>
        {!!offer.code && (
          <button className="text-button" onClick={offer.clear}>
            {t("clear")}
          </button>
        )}
      </div>
      {offer.failed && <p role="alert">{t("failure")}</p>}
      {offer.quote ? (
        <div data-testid="applied-offer">
          <p>
            {offer.quote.offer.code} · {t("discount")}:{" "}
            {money(offer.quote.discountMinor)}
          </p>
          <p>
            {t("expires")}:{" "}
            {new Date(offer.quote.expiresAt).toLocaleTimeString(locale)}
          </p>
        </div>
      ) : (
        !!offer.code.trim() && (
          <p role="status">{t(offer.stale ? "stale" : "review")}</p>
        )
      )}
    </section>
  );
}
