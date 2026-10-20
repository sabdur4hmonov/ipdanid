import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import type {
  PartnerAccount,
  PartnerCampaign,
  PartnerQuote,
  PartnerTerms,
} from "./partner-types";
import type { KitBatch } from "./kit-inserts";
import { customerApi as api, ApiError } from "./customer-api";
import { partnerText, type PartnerWord } from "./partner-i18n";
import { amountMinor } from "./checkout-offer";
import { kitClaimLink } from "./kit-claim-link";
import { download } from "./download";

function usePartnerRun(locale: Locale, token?: string, onReset?: () => void) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const live = useRef(false),
    epoch = useRef(0),
    gate = useRef(false),
    credential = useRef(token);
  credential.current = token;
  useEffect(() => {
    live.current = true;
    const reset = () => {
      ++epoch.current;
      gate.current = false;
      setBusy(false);
      setError("");
      setNotice("");
      onReset?.();
    };
    if (!token) api.sessionChanged.add(reset);
    return () => {
      live.current = false;
      ++epoch.current;
      if (!token) api.sessionChanged.delete(reset);
    };
  }, [token]);
  async function run(task: () => Promise<() => void | Promise<void>>) {
    if (gate.current) return;
    gate.current = true;
    const ticket = epoch.current,
      auth = token ?? api.session?.token;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const commit = await task();
      if (
        live.current &&
        ticket === epoch.current &&
        auth === (credential.current ?? api.session?.token)
      )
        await commit();
    } catch (e) {
      if (live.current && ticket === epoch.current)
        setError(
          partnerText(
            locale,
            e instanceof ApiError && e.status === 409
              ? "conflict"
              : e instanceof ApiError && e.status === 403
                ? "denied"
                : "failure",
          ),
        );
    } finally {
      if (live.current && ticket === epoch.current) {
        gate.current = false;
        setBusy(false);
      }
    }
  }
  return { busy, error, notice, setNotice, run };
}
const money = (n: number, locale: Locale) =>
  (n / 100).toLocaleString(locale, { maximumFractionDigits: 2 }) + " UZS";
function Campaign({
  campaign: c,
  locale,
  busy,
  onApprove,
  onIssue,
  onCancel,
}: {
  campaign: PartnerCampaign;
  locale: Locale;
  busy: boolean;
  onApprove?: () => void;
  onIssue?: () => void;
  onCancel: () => void;
}) {
  const t = (k: PartnerWord) => partnerText(locale, k),
    [authorized, setAuthorized] = useState(false),
    [revoke, setRevoke] = useState(false);
  return (
    <article
      className="customer-item"
      data-testid="partner-campaign"
      data-campaign-id={c.id}
    >
      <h3>{c.name}</h3>
      <p>{t(c.status)}</p>
      <p>
        {c.quote.count} × {money(c.quote.unitMinor, locale)} · {t("total")}:{" "}
        {money(c.quote.totalMinor, locale)}
      </p>
      {["pending", "approved"].includes(c.status) && (
        <p>
          {t(c.status === "approved" ? "reservationExpiry" : "quoteExpiry")}:{" "}
          {new Date(
            c.status === "approved"
              ? c.reservationExpiresAt!
              : c.quote.expiresAt,
          ).toLocaleString(locale)}
        </p>
      )}
      {c.batchId && (
        <p>
          {t("claimed")}: {c.claimed} · {t("available")}: {c.available} ·{" "}
          {t("revoked")}: {c.revoked}
        </p>
      )}
      <fieldset disabled={busy}>
        {c.status === "pending" && onApprove && (
          <>
            <label>
              <input
                type="checkbox"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
              />
              {t("approveConsent")}
            </label>
            <button disabled={!authorized} onClick={onApprove}>
              {t("approve")}
            </button>
          </>
        )}
        {c.status === "approved" && onIssue && (
          <button onClick={onIssue}>{t("issue")}</button>
        )}
        {c.status === "issued" && (
          <label>
            <input
              type="checkbox"
              checked={revoke}
              onChange={(e) => setRevoke(e.target.checked)}
            />
            {t("revokeConsent")}
          </label>
        )}
        {["pending", "approved", "issued"].includes(c.status) && (
          <button
            className="outline"
            disabled={c.status === "issued" && !revoke}
            onClick={onCancel}
          >
            {t(c.status === "issued" ? "revoke" : "cancel")}
          </button>
        )}
      </fieldset>
    </article>
  );
}
type Portal = {
  partner: PartnerAccount;
  campaigns: PartnerCampaign[];
  claimOrigin: string | null;
};
export function PartnerPortal({ locale }: { locale: Locale }) {
  const t = (k: PartnerWord) => partnerText(locale, k),
    [data, setData] = useState<Portal | null>(null),
    [count, setCount] = useState(2),
    [name, setName] = useState(""),
    [quote, setQuote] = useState<PartnerQuote | null>(null),
    [batch, setBatch] = useState<KitBatch | null>(null);
  const quoteRequest = useRef<{ key: string; count: number } | null>(null),
    campaignRequest = useRef<{
      key: string;
      quoteId: string;
      name: string;
    } | null>(null);
  const action = usePartnerRun(locale, undefined, () => {
    setData(null);
    setQuote(null);
    setBatch(null);
    quoteRequest.current = null;
    campaignRequest.current = null;
  });
  const load = () =>
    action.run(async () => {
      const next = await api.request<Portal>("/partner");
      return () => {
        setData(next);
        setCount((c) =>
          Math.max(
            next.partner.terms.minBatch,
            Math.min(c, next.partner.terms.maxBatch),
          ),
        );
      };
    });
  const origin = (() => {
    try {
      if (data?.claimOrigin) {
        kitClaimLink(data.claimOrigin, "x".repeat(32));
        return data.claimOrigin;
      }
    } catch {}
    return undefined;
  })();
  return (
    <details className="card" data-testid="partner-portal">
      <summary>{t("portal")}</summary>
      <p>
        {t("account")}:{" "}
        <code data-testid="partner-account-id">{api.session?.id}</code>
      </p>
      <p>{t("quoteHelp")}</p>
      <button
        disabled={action.busy}
        className="outline"
        onClick={() => void load()}
      >
        {t("access")}
      </button>
      {action.error && <p role="alert">{action.error}</p>}
      {action.notice && <p role="status">{action.notice}</p>}
      {data && (
        <>
          <h3>{data.partner.terms.name}</h3>
          <fieldset disabled={action.busy}>
            <label>
              {t("quantity")}
              <input
                type="number"
                min={data.partner.terms.minBatch}
                max={data.partner.terms.maxBatch}
                value={count}
                onChange={(e) => {
                  setCount(Number(e.target.value));
                  setQuote(null);
                  quoteRequest.current = null;
                  campaignRequest.current = null;
                }}
              />
            </label>
            <button
              onClick={() =>
                void action.run(async () => {
                  if (quote || !quoteRequest.current)
                    quoteRequest.current = { key: crypto.randomUUID(), count };
                  const q = await api.request<PartnerQuote>("/partner/quotes", {
                    count: quoteRequest.current.count,
                    requestKey: quoteRequest.current.key,
                  });
                  return () => {
                    setQuote(q);
                    campaignRequest.current = null;
                  };
                })
              }
            >
              {t("quote")}
            </button>
            {quote && (
              <div data-testid="partner-quote">
                <p>
                  {t("total")}: {money(quote.totalMinor, locale)}
                </p>
                <p>
                  {t("expiry")}:{" "}
                  {new Date(quote.expiresAt).toLocaleString(locale)}
                </p>
                <label>
                  {t("campaignName")}
                  <input
                    maxLength={80}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      campaignRequest.current = null;
                    }}
                  />
                </label>
                <button
                  disabled={!name.trim() || quote.expiresAt <= Date.now()}
                  onClick={() =>
                    void action.run(async () => {
                      if (!campaignRequest.current)
                        campaignRequest.current = {
                          key: crypto.randomUUID(),
                          quoteId: quote.id,
                          name: name.trim(),
                        };
                      const r = campaignRequest.current;
                      await api.request("/partner/campaigns", {
                        quoteId: r.quoteId,
                        name: r.name,
                        requestKey: r.key,
                      });
                      const next = await api.request<Portal>("/partner");
                      return () => {
                        setData(next);
                        setQuote(null);
                        setName("");
                        quoteRequest.current = null;
                        campaignRequest.current = null;
                        action.setNotice(t("saved"));
                      };
                    })
                  }
                >
                  {t("request")}
                </button>
              </div>
            )}
          </fieldset>
          <p>{t("once")}</p>
          {batch && (
            <section className="card" data-testid="partner-issued">
              <p>{t("private")}</p>
              <button
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const { kitInsertsPdf } = await import("./kit-inserts-pdf");
                    const bytes = await kitInsertsPdf(
                      batch,
                      locale,
                      undefined,
                      origin,
                    );
                    return () =>
                      download(
                        "ip-rasm-partner-kit-cards.pdf",
                        new Blob([Uint8Array.from(bytes).buffer], {
                          type: "application/pdf",
                        }),
                      );
                  })
                }
              >
                {t("pdf")}
              </button>
              <button
                disabled={action.busy || !origin}
                onClick={() =>
                  void action.run(async () => {
                    const csv =
                      "claim_url,builds,activation_expiry\n" +
                      batch.codes
                        .map((c) =>
                          [
                            kitClaimLink(origin!, c.code),
                            c.quota,
                            c.expiresAt === null
                              ? ""
                              : new Date(c.expiresAt).toISOString(),
                          ].join(","),
                        )
                        .join("\n");
                    return () =>
                      download(
                        "ip-rasm-partner-recipient-links.csv",
                        csv,
                        "text/csv",
                      );
                  })
                }
              >
                {t("links")}
              </button>
              {!origin && <p>{t("noOrigin")}</p>}
              <div data-sensitive="kit-codes">
                {batch.codes.map((c) => (
                  <p key={c.code}>
                    <code>{c.code}</code>
                    {origin && (
                      <>
                        {" "}
                        ·{" "}
                        <a href={kitClaimLink(origin, c.code)} rel="noreferrer">
                          {t("claimTitle")}
                        </a>
                      </>
                    )}
                  </p>
                ))}
              </div>
              <button
                className="outline"
                disabled={action.busy}
                onClick={() => setBatch(null)}
              >
                {t("dismiss")}
              </button>
            </section>
          )}
          {data.campaigns.map((c) => (
            <Campaign
              key={`${c.id}:${c.revision}`}
              campaign={c}
              locale={locale}
              busy={action.busy || !!batch}
              onIssue={() =>
                void action.run(async () => {
                  const issued = await api.request<{
                    campaign: PartnerCampaign;
                    batch: KitBatch;
                  }>(`/partner/campaigns/${c.id}/issue`, {
                    revision: c.revision,
                  });
                  return () => {
                    setBatch(issued.batch);
                    setData((d) =>
                      d
                        ? {
                            ...d,
                            campaigns: d.campaigns.map((item) =>
                              item.id === issued.campaign.id
                                ? issued.campaign
                                : item,
                            ),
                          }
                        : d,
                    );
                  };
                })
              }
              onCancel={() =>
                void action.run(async () => {
                  await api.request(`/partner/campaigns/${c.id}/cancel`, {
                    revision: c.revision,
                  });
                  const next = await api.request<Portal>("/partner");
                  return () => setData(next);
                })
              }
            />
          ))}
        </>
      )}
    </details>
  );
}
type Product = {
  id: string;
  name: string;
  price_minor: number;
  credits: number;
  active: number;
};
const defaultTerms = (product?: Product): PartnerTerms => ({
  name: "",
  productId: product?.id ?? "",
  enabled: false,
  maxKits: 20,
  minBatch: 2,
  maxBatch: 10,
  codeDays: 30,
  creditDays: 0,
  tiers: [{ minCount: 2, unitMinor: product?.price_minor ?? 0 }],
  revision: 0,
});
function PartnerForm({
  locale,
  account,
  products,
  disabled,
  onSave,
}: {
  locale: Locale;
  account?: PartnerAccount;
  products: Product[];
  disabled: boolean;
  onSave: (id: string, terms: PartnerTerms) => void;
}) {
  const t = (k: PartnerWord) => partnerText(locale, k),
    [accountId, setAccountId] = useState(account?.accountId ?? ""),
    [terms, setTerms] = useState(
      account?.terms ??
        defaultTerms(products.find((p) => p.active && p.credits)),
    ),
    [prices, setPrices] = useState(
      (
        account?.terms ??
        defaultTerms(products.find((p) => p.active && p.credits))
      ).tiers.map((t) => (t.unitMinor / 100).toFixed(2)),
    ),
    [error, setError] = useState(false);
  return (
    <form
      data-testid="partner-terms"
      onSubmit={(e) => {
        e.preventDefault();
        setError(false);
        try {
          const next = {
            ...terms,
            tiers: terms.tiers.map((tier, i) => ({
              minCount: i === 0 ? terms.minBatch : tier.minCount,
              unitMinor: amountMinor(prices[i]),
            })),
          };
          onSave(accountId.trim(), next);
        } catch {
          setError(true);
        }
      }}
    >
      <fieldset disabled={disabled}>
        <label>
          {t("account")}
          <input
            required
            maxLength={36}
            disabled={!!account}
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          />
        </label>
        <label>
          {t("name")}
          <input
            required
            maxLength={80}
            value={terms.name}
            onChange={(e) => setTerms((v) => ({ ...v, name: e.target.value }))}
          />
        </label>
        <label>
          {t("product")}
          <select
            value={terms.productId}
            onChange={(e) => {
              const product = products.find((p) => p.id === e.target.value)!;
              setTerms((v) => ({
                ...v,
                productId: product.id,
                tiers: [
                  { minCount: v.minBatch, unitMinor: product.price_minor },
                ],
              }));
              setPrices([(product.price_minor / 100).toFixed(2)]);
            }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={terms.enabled}
            onChange={(e) =>
              setTerms((v) => ({ ...v, enabled: e.target.checked }))
            }
          />
          {t("enabled")}
        </label>
        {(
          ["maxKits", "minBatch", "maxBatch", "codeDays", "creditDays"] as const
        ).map((k) => (
          <label key={k}>
            {t(k)}
            <input
              required
              type="number"
              min={k === "creditDays" ? 0 : 1}
              max={
                k === "maxKits"
                  ? 10000
                  : k === "creditDays" || k === "codeDays"
                    ? 3650
                    : 100
              }
              value={terms[k]}
              onChange={(e) =>
                setTerms((v) => ({ ...v, [k]: Number(e.target.value) }))
              }
            />
          </label>
        ))}
        {terms.tiers.map((tier, i) => (
          <div key={i} data-testid="partner-tier">
            <label>
              {t("tierCount")}
              <input
                type="number"
                required
                min={terms.minBatch}
                max={terms.maxBatch}
                disabled={i === 0}
                value={i === 0 ? terms.minBatch : tier.minCount}
                onChange={(e) =>
                  setTerms((v) => ({
                    ...v,
                    tiers: v.tiers.map((t, j) =>
                      j === i ? { ...t, minCount: Number(e.target.value) } : t,
                    ),
                  }))
                }
              />
            </label>
            <label>
              {t("tierPrice")}
              <input
                required
                inputMode="decimal"
                value={prices[i]}
                onChange={(e) =>
                  setPrices((v) =>
                    v.map((p, j) => (j === i ? e.target.value : p)),
                  )
                }
              />
            </label>
            {i > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setTerms((v) => ({
                    ...v,
                    tiers: v.tiers.filter((_, j) => j !== i),
                  }));
                  setPrices((v) => v.filter((_, j) => j !== i));
                }}
              >
                {t("removeTier")}
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="outline"
          disabled={terms.tiers.length >= 6}
          onClick={() => {
            setTerms((v) => ({
              ...v,
              tiers: [
                ...v.tiers,
                { minCount: v.tiers.at(-1)!.minCount + 1, unitMinor: 0 },
              ],
            }));
            setPrices((v) => [...v, v.at(-1)!]);
          }}
        >
          {t("addTier")}
        </button>
        {error && <p role="alert">{t("invalid")}</p>}
        <button type="submit">{t("save")}</button>
      </fieldset>
    </form>
  );
}
export function PartnerAdmin({
  locale,
  token,
}: {
  locale: Locale;
  token: string;
}) {
  const t = (k: PartnerWord) => partnerText(locale, k),
    [partners, setPartners] = useState<PartnerAccount[]>([]),
    [products, setProducts] = useState<Product[]>([]),
    [campaigns, setCampaigns] = useState<PartnerCampaign[]>([]),
    [selected, setSelected] = useState(""),
    [loaded, setLoaded] = useState(false),
    action = usePartnerRun(locale, token);
  async function snapshot(id: string) {
    const [all, items, list] = await Promise.all([
      api.request<PartnerAccount[]>("/admin/partners", undefined, token),
      api.request<Product[]>("/admin/products", undefined, token),
      id
        ? api.request<PartnerCampaign[]>(
            `/admin/partners/${id}/campaigns`,
            undefined,
            token,
          )
        : Promise.resolve([]),
    ]);
    return () => {
      setPartners(all);
      setProducts(items);
      setCampaigns(list);
      setLoaded(true);
    };
  }
  useEffect(() => {
    setLoaded(false);
    void action.run(() => snapshot(""));
  }, [token]);
  const account = partners.find((p) => p.id === selected);
  return (
    <section
      className="card"
      id="admin-partners"
      data-testid="partner-admin"
      style={{ overflowWrap: "anywhere" }}
    >
      <h2>{t("admin")}</h2>
      <p>{t("bounded")}</p>
      <p>{t("quoteHelp")}</p>
      <button
        className="outline"
        disabled={action.busy}
        onClick={() => void action.run(() => snapshot(selected))}
      >
        {t("refresh")}
      </button>
      {action.error && <p role="alert">{action.error}</p>}
      {action.notice && <p role="status">{action.notice}</p>}
      {loaded && (
        <>
          <label>
            {t("name")}
            <select
              disabled={action.busy}
              value={selected}
              onChange={(e) => {
                const id = e.target.value;
                setSelected(id);
                setCampaigns([]);
                void action.run(() => snapshot(id));
              }}
            >
              <option value="">{t("newPartner")}</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.terms.name}
                </option>
              ))}
            </select>
          </label>
          <PartnerForm
            key={`${selected}:${account?.terms.revision ?? 0}`}
            locale={locale}
            account={account}
            products={products}
            disabled={action.busy || !products.length}
            onSave={(accountId, terms) =>
              void action.run(async () => {
                const saved = await api.request<PartnerAccount>(
                    "/admin/partners",
                    { accountId, terms },
                    token,
                  ),
                  commit = await snapshot(saved.id);
                return () => {
                  commit();
                  setSelected(saved.id);
                  action.setNotice(t("saved"));
                };
              })
            }
          />
          {campaigns.map((c) => (
            <Campaign
              key={`${c.id}:${c.revision}`}
              campaign={c}
              locale={locale}
              busy={action.busy}
              onApprove={() =>
                void action.run(async () => {
                  await api.request(
                    `/admin/partners/campaigns/${c.id}/approve`,
                    { revision: c.revision, authorizeIssue: true },
                    token,
                  );
                  return snapshot(selected);
                })
              }
              onCancel={() =>
                void action.run(async () => {
                  await api.request(
                    `/admin/partners/campaigns/${c.id}/cancel`,
                    { revision: c.revision },
                    token,
                  );
                  return snapshot(selected);
                })
              }
            />
          ))}
        </>
      )}
    </section>
  );
}
export function KitClaimPanel({
  locale,
  code,
  onClaim,
  onDismiss,
}: {
  locale: Locale;
  code: string;
  onClaim: (profile: string) => Promise<void>;
  onDismiss: () => void;
}) {
  const t = (k: PartnerWord) => partnerText(locale, k),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    live = useRef(false),
    epoch = useRef(0);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      ++epoch.current;
    };
  }, []);
  return (
    <section className="card" data-testid="kit-claim">
      <h2>{t("claimTitle")}</h2>
      <p>{t("claimHelp")}</p>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy}
        onClick={() => {
          const ticket = ++epoch.current;
          setBusy(true);
          setError("");
          void (async () => {
            try {
              await api.restore();
              if (!api.session) await api.connect();
              const credential = api.session!.token;
              const result = await api.request<{ profile: string }>(
                "/codes/redeem",
                { code },
              );
              if (
                live.current &&
                ticket === epoch.current &&
                credential === api.session?.token
              )
                await onClaim(result.profile);
            } catch {
              if (live.current && ticket === epoch.current)
                setError(t("failure"));
            } finally {
              if (live.current && ticket === epoch.current) setBusy(false);
            }
          })();
        }}
      >
        {t("claim")}
      </button>
      <button className="outline" disabled={busy} onClick={onDismiss}>
        {t("dismiss")}
      </button>
    </section>
  );
}
