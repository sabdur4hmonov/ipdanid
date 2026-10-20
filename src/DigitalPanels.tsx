import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import type { CommerceProduct } from "./catalog-checkout";
import type { DigitalPurchase, JourneyProduct } from "./journey-types";
import { customerApi as api, ApiError } from "./customer-api";
import { journeyText, type JourneyWord } from "./journey-i18n";
import { PaymentOptions } from "./PaymentOptions";
import { giftClaimLink } from "./gift-claim-link";
import {
  readDigitalPending,
  saveDigitalPending,
  startDigitalPendingLifecycle,
} from "./digital-pending";
import type { DigitalAttempt } from "./digital-attempt";
function useJourneyRun(
  locale: Locale,
  credential?: string,
  onReset?: () => void,
) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    live = useRef(false),
    epoch = useRef(0),
    gate = useRef(false),
    authRef = useRef(credential);
  authRef.current = credential;
  useEffect(() => {
    live.current = true;
    const clear = () => {
      ++epoch.current;
      gate.current = false;
      setBusy(false);
      setError("");
      setNotice("");
      onReset?.();
    };
    if (!credential) api.sessionChanged.add(clear);
    return () => {
      live.current = false;
      ++epoch.current;
      gate.current = false;
      if (!credential) api.sessionChanged.delete(clear);
    };
  }, [credential]);
  async function run(
    task: (token: string, valid: () => boolean) => Promise<() => void>,
  ) {
    if (gate.current) return;
    const auth = credential ?? api.session?.token;
    if (!auth) {
      setError(journeyText(locale, "signIn"));
      return;
    }
    gate.current = true;
    const ticket = ++epoch.current,
      valid = () =>
        live.current &&
        ticket === epoch.current &&
        auth === (authRef.current ?? api.session?.token);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const apply = await task(auth, valid);
      if (valid()) apply();
    } catch (e) {
      if (valid())
        setError(
          journeyText(
            locale,
            e instanceof ApiError && e.status === 403
              ? credential
                ? "denied"
                : "signIn"
              : e instanceof ApiError && e.status === 409
                ? "stale"
                : "error",
          ),
        );
    } finally {
      if (valid()) {
        setBusy(false);
        gate.current = false;
      }
    }
  }
  return {
    busy,
    error,
    run,
    setNotice,
    status: (
      <>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
      </>
    ),
  };
}
const money = (n: number, currency: string, locale: Locale) =>
  (n / 100).toLocaleString(locale, { maximumFractionDigits: 2 }) +
  " " +
  currency;
export function DigitalAdmin({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = (k: JourneyWord) => journeyText(locale, k),
    task = useJourneyRun(locale, token),
    [products, setProducts] = useState<CommerceProduct[]>([]),
    [policies, setPolicies] = useState<JourneyProduct[]>([]),
    [id, setId] = useState(""),
    [kind, setKind] = useState<"app" | "gift">("app"),
    [enabled, setEnabled] = useState(false);
  async function load() {
    const next = await api.request<{
      products: CommerceProduct[];
      policies: JourneyProduct[];
    }>("/admin/journeys/products", undefined, token);
    return () => {
      setProducts(next.products);
      setPolicies(next.policies);
    };
  }
  useEffect(() => {
    void task.run(load);
  }, [token]);
  return (
    <section className="card" id="admin-digital" data-testid="digital-admin">
      <h2>{t("admin")}</h2>
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void task.run(load)}
      >
        {t("refresh")}
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void task.run(async () => {
            const saved = await api.request<JourneyProduct>(
                "/admin/journeys/products",
                {
                  version: "journey-product/1",
                  productId: id,
                  kind,
                  enabled,
                  revision:
                    policies.find((p) => p.productId === id)?.revision ?? 0,
                },
                token,
              ),
              apply = await load();
            return () => {
              apply();
              setKind(saved.kind);
              setEnabled(saved.enabled);
              task.setNotice(t("saved"));
            };
          });
        }}
      >
        <fieldset disabled={task.busy}>
          <label>
            {t("product")}
            <select
              required
              value={id}
              onChange={(e) => {
                const p = policies.find((p) => p.productId === e.target.value);
                setId(e.target.value);
                setKind(p?.kind ?? "app");
                setEnabled(p?.enabled ?? false);
              }}
            >
              <option value="">—</option>
              {products
                .filter((p) => p.family === "digital")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.currency}
                  </option>
                ))}
            </select>
          </label>
          {!products.some((p) => p.family === "digital") && (
            <p>{t("missing")}</p>
          )}
          <label>
            {t("kind")}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "app" | "gift")}
            >
              <option value="app">{t("app")}</option>
              <option value="gift">{t("gift")}</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            {t("enabled")}
          </label>
          <p>{t("noShipping")}</p>
          <p>{t(kind === "gift" ? "giftTerms" : "appTerms")}</p>
          <button type="submit" disabled={!id}>
            {t("save")}
          </button>
        </fieldset>
      </form>
    </section>
  );
}
export function DigitalStudio({
  locale,
  products,
  policies,
  catalogRevision,
  settingsRevision,
  durable,
  claimOrigin,
  onUpdated,
}: {
  locale: Locale;
  products: CommerceProduct[];
  policies: JourneyProduct[];
  catalogRevision?: number;
  settingsRevision: number;
  durable: boolean;
  claimOrigin?: string | null;
  onUpdated: () => Promise<void>;
}) {
  const t = (k: JourneyWord) => journeyText(locale, k),
    [rows, setRows] = useState<DigitalPurchase[]>([]),
    [pending, setPending] = useState<DigitalAttempt | null>(null),
    [selected, setSelected] = useState(""),
    [name, setName] = useState(""),
    [shown, setShown] = useState<Set<string>>(new Set()),
    task = useJourneyRun(locale, undefined, () => {
      setRows([]);
      setPending(null);
      setSelected("");
      setName("");
      setShown(new Set());
    });
  const product = products.find((p) => p.id === selected),
    policy = policies.find((p) => p.productId === selected && p.enabled),
    hasPending = !!pending || rows.some((p) => p.status === "pending"),
    sessionToken = api.session?.token;
  async function load(token: string) {
    const [next, attempt] = await Promise.all([
      api.request<DigitalPurchase[]>("/digital/purchases", undefined, token),
      readDigitalPending(token),
    ]);
    const confirmed =
      attempt && next.some((p) => p.requestKey === attempt.body.requestKey);
    if (confirmed) await saveDigitalPending(null, token);
    return () => {
      setRows(next);
      setPending(confirmed ? null : attempt);
    };
  }
  useEffect(() => {
    startDigitalPendingLifecycle();
    void task.run(async (token) => load(token));
  }, [sessionToken]);
  async function update() {
    await task.run(async (token, valid) => {
      const apply = await load(token);
      if (valid()) await onUpdated();
      return apply;
    });
  }
  async function purchase(attempt: DigitalAttempt) {
    await task.run(async (token, valid) => {
      await saveDigitalPending(attempt, token);
      if (!valid()) return () => {};
      setPending(attempt);
      try {
        await api.request<DigitalPurchase>(
          "/digital/purchases",
          attempt.body,
          token,
        );
      } catch (e) {
        if (
          valid() &&
          e instanceof ApiError &&
          [400, 403, 409, 422].includes(e.status)
        ) {
          await saveDigitalPending(null, token);
          if (valid()) setPending(null);
        }
        throw e;
      }
      if (!valid()) return () => {};
      await saveDigitalPending(null, token);
      const apply = await load(token);
      if (valid()) await onUpdated();
      return () => {
        apply();
        setPending(null);
        setSelected("");
      };
    });
  }
  function state(value: string) {
    return t(
      ([
        "pending",
        "paid",
        "cancelled",
        "return_requested",
        "refunded",
        "fulfilled",
        "active",
        "redeemed",
        "expired",
      ].includes(value)
        ? value
        : "pending") as JourneyWord,
    );
  }
  if (!rows.length && !pending && !policies.length && !task.busy && !task.error)
    return null;
  return (
    <section className="card" data-testid="digital-studio">
      <h2>{t("admin")}</h2>
      <p>{t("noShipping")}</p>
      {!durable && <p>{t("signIn")}</p>}
      {task.status}
      <button
        className="outline"
        disabled={task.busy}
        onClick={() => void update()}
      >
        {t("refresh")}
      </button>
      <div className="customer-grid">
        {products
          .filter((p) =>
            policies.some(
              (policy) => policy.enabled && policy.productId === p.id,
            ),
          )
          .map((p) => {
            const kind = policies.find(
              (policy) => policy.productId === p.id,
            )!.kind;
            return (
              <article
                className="customer-item"
                key={p.id}
                data-testid="digital-product"
              >
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <p>
                  {money(p.price_minor, p.currency, locale)} · {p.credits}{" "}
                  {t("credits")}
                </p>
                <p>{t(kind === "gift" ? "giftTerms" : "appTerms")}</p>
                <button
                  disabled={task.busy || !durable || hasPending || p.stock < 1}
                  onClick={() => setSelected(p.id)}
                >
                  {t(kind === "gift" ? "buyGift" : "buyApp")}
                </button>
              </article>
            );
          })}
      </div>
      {hasPending && <p>{t("resolve")}</p>}
      {pending && (
        <div data-testid="digital-pending">
          <h3>{pending.display.name}</h3>
          <p>{t("uncertain")}</p>
          <p>
            {money(
              pending.body.quote.totalMinor,
              pending.body.quote.currency,
              locale,
            )}{" "}
            · {pending.display.credits} {t("credits")}
          </p>
          <button disabled={task.busy} onClick={() => void purchase(pending)}>
            {t("retry")}
          </button>
        </div>
      )}
      {product && policy && !pending && !hasPending && (
        <form
          data-testid="digital-purchase-form"
          onSubmit={(e) => {
            e.preventDefault();
            void purchase({
              version: "digital-attempt/1",
              createdAt: Date.now(),
              display: { name: product.name, credits: product.credits },
              body: {
                productId: product.id,
                kind: policy.kind,
                name,
                locale,
                requestKey: crypto.randomUUID(),
                quote: {
                  productRevision: product.revision,
                  settingsRevision,
                  totalMinor: product.price_minor,
                  currency: product.currency as "UZS" | "USD" | "RUB",
                  ...(catalogRevision === undefined ? {} : { catalogRevision }),
                },
              },
            });
          }}
        >
          <fieldset disabled={task.busy || !durable}>
            <h3>{product.name}</h3>
            <p>{money(product.price_minor, product.currency, locale)}</p>
            <label>
              {t("name")}
              <input
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <button type="submit">{t("purchase")}</button>
          </fieldset>
        </form>
      )}
      <h3>{t("myPurchases")}</h3>
      {rows.map((p) => (
        <article
          className="customer-item"
          key={p.orderId}
          data-testid="digital-order"
        >
          <h4>{p.name}</h4>
          <div data-testid="digital-seller">
            <p>{t("seller")}</p>
            <p>{p.seller?.name || t("unset")}</p>
            {p.seller?.phone && <p>{p.seller.phone}</p>}
            {p.seller?.paymentDetails && (
              <p style={{ whiteSpace: "pre-wrap" }}>
                {p.seller.paymentDetails}
              </p>
            )}
          </div>
          <p>
            {state(p.status)} · {money(p.totalMinor, p.currency, locale)} ·{" "}
            {p.credits} {t("credits")}
          </p>
          {p.status === "pending" && (
            <>
              <PaymentOptions
                orderId={p.orderId}
                currency={p.currency}
                online
                locale={locale}
                onUpdated={update}
              />
              <button
                disabled={task.busy}
                className="outline"
                onClick={() =>
                  void task.run(async (token, valid) => {
                    await api.request(
                      "/orders/" + p.orderId + "/cancel",
                      {},
                      token,
                    );
                    const apply = await load(token);
                    if (valid()) await onUpdated();
                    return apply;
                  })
                }
              >
                {t("cancel")}
              </button>
            </>
          )}
          {p.gift && (
            <div data-testid="purchased-gift">
              <p>
                {state(p.gift.status)} · {t("expires")}:{" "}
                {new Date(p.gift.expiresAt).toLocaleDateString(locale)}
              </p>
              {p.gift.claimToken && (
                <>
                  <p>{t("private")}</p>
                  <button
                    className="outline"
                    disabled={task.busy}
                    onClick={() =>
                      setShown((v) => {
                        const next = new Set(v);
                        if (next.has(p.orderId)) next.delete(p.orderId);
                        else next.add(p.orderId);
                        return next;
                      })
                    }
                  >
                    {t(shown.has(p.orderId) ? "hide" : "reveal")}
                  </button>
                  {shown.has(p.orderId) && (
                    <code className="claim-token" data-sensitive="gift-code">
                      {p.gift.claimToken}
                    </code>
                  )}
                  <button
                    className="outline"
                    disabled={task.busy}
                    onClick={() =>
                      void task.run(async () => {
                        await navigator.clipboard.writeText(
                          p.gift!.claimToken!,
                        );
                        return () => task.setNotice(t("copied"));
                      })
                    }
                  >
                    {t("copy")}
                  </button>
                  {claimOrigin && (
                    <button
                      className="outline"
                      disabled={task.busy}
                      onClick={() =>
                        void task.run(async () => {
                          await navigator.clipboard.writeText(
                            giftClaimLink(claimOrigin, p.gift!.claimToken!),
                          );
                          return () => task.setNotice(t("copied"));
                        })
                      }
                    >
                      {t("copyLink")}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          {p.status === "paid" && (!p.gift || p.gift.status !== "redeemed") && (
            <button
              className="outline"
              disabled={task.busy}
              onClick={() =>
                void task.run(async (token, valid) => {
                  await api.request(
                    "/orders/" + p.orderId + "/return",
                    {},
                    token,
                  );
                  const apply = await load(token);
                  if (valid()) await onUpdated();
                  return apply;
                })
              }
            >
              {t("requestReturn")}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
export function GiftClaimPanel({
  locale,
  code,
  durable,
  onDismiss,
  onAccepted,
}: {
  locale: Locale;
  code: string;
  durable: boolean;
  onDismiss: () => void;
  onAccepted: () => Promise<void>;
}) {
  const t = (k: JourneyWord) => journeyText(locale, k),
    task = useJourneyRun(locale),
    [manual, setManual] = useState(code);
  useEffect(() => setManual(code), [code]);
  return (
    <section className="card" data-testid="gift-claim">
      <h2>{t("acceptTitle")}</h2>
      <p>{t("acceptHelp")}</p>
      {task.status}
      {!durable && <p>{t("signIn")}</p>}
      <button
        disabled={!durable || task.busy || !manual}
        onClick={() =>
          void task.run(async (token, valid) => {
            await api.request("/gifts/redeem", { claimToken: manual }, token);
            if (valid()) await onAccepted();
            return () => {
              setManual("");
              task.setNotice(t("accepted"));
            };
          })
        }
      >
        {t("accept")}
      </button>
      <button className="outline" disabled={task.busy} onClick={onDismiss}>
        {t("dismiss")}
      </button>
    </section>
  );
}
