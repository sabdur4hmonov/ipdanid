import { PaymentOptions } from "./PaymentOptions";
import { AdminPasswordLogin, adminLoginText } from "./AdminPasswordLogin";
import { OwnerAdminNavigation } from "./OwnerAdminNavigation";
import { NativeServerSettings } from "./NativeServerSettings";
import { BusinessAdmin } from "./BusinessAdmin";
import { KitAdmin } from "./KitAdmin";
import { KitLogin } from "./KitLogin";
import { PromotionPreference } from "./Announcements";
import { PushSettings } from "./PushSettings";
import { useBusiness } from "./BusinessContext";
import { businessText } from "./business-i18n";
import type { OrderCommerce } from "./business-types";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { galleryText } from "./gallery-i18n";
import { customerHealthSandbox } from "./customer-health";
import { CheckoutOffer, useCheckoutOffer } from "./CheckoutOffer";
import { offersText } from "./offers-i18n";
import { partnerText } from "./partner-i18n";
import { catalogText, countryName, type CatalogWord } from "./catalog-i18n";
import {
  checkoutRegion,
  cartMatchesCurrency,
  type CommerceProduct,
  type ShopCatalog,
} from "./catalog-checkout";
import type { CatalogSku } from "./catalog-types";
import type { CommerceRegions } from "./commerce-regions";
import type { JourneyProduct } from "./journey-types";
import { journeyText } from "./journey-i18n";
import type { CommissionPolicy } from "./commission-types";
const CommissionStudio = lazy(() => import("./CommissionPanels").then(m => ({default:m.CommissionStudio})));
const CommissionPolicyAdmin = lazy(() => import("./CommissionPanels").then(m => ({default:m.CommissionPolicyAdmin})));
const CommissionOrdersAdmin = lazy(() => import("./CommissionPanels").then(m => ({default:m.CommissionOrdersAdmin})));
const DigitalAdmin = lazy(() =>
  import("./DigitalPanels").then((m) => ({ default: m.DigitalAdmin })),
);
const DigitalStudio = lazy(() =>
  import("./DigitalPanels").then((m) => ({ default: m.DigitalStudio })),
);
const GiftClaimPanel = lazy(() =>
  import("./DigitalPanels").then((m) => ({ default: m.GiftClaimPanel })),
);
const CatalogAdmin = lazy(() =>
  import("./CatalogAdmin").then((m) => ({ default: m.CatalogAdmin })),
);
const RegionsAdmin = lazy(() =>
  import("./CatalogAdmin").then((m) => ({ default: m.RegionsAdmin })),
);
const KitCreditTerms = lazy(() =>
  import("./KitCreditTerms").then((m) => ({ default: m.KitCreditTerms })),
);
const PartnerPortal = lazy(() =>
  import("./PartnerPanels").then((m) => ({ default: m.PartnerPortal })),
);
const PartnerAdmin = lazy(() =>
  import("./PartnerPanels").then((m) => ({ default: m.PartnerAdmin })),
);
const KitClaimPanel = lazy(() =>
  import("./PartnerPanels").then((m) => ({ default: m.KitClaimPanel })),
);
const ReferralPanel = lazy(() =>
  import("./OfferPanels").then((m) => ({ default: m.ReferralPanel })),
);
const OfferAdmin = lazy(() =>
  import("./OfferPanels").then((m) => ({ default: m.OfferAdmin })),
);
const GalleryStudio = lazy(() => import("./GalleryStudio"));
const GalleryModeration = lazy(() =>
  import("./GalleryStudio").then((m) => ({ default: m.GalleryModeration })),
);
import type { Instruction, Locale, Progress, Project } from "./core/types";
import { validateInstruction } from "./core/validation";
import {
  customerApi as api,
  ApiError,
  customerCacheNamespace,
} from "./customer-api";
import {
  checkoutSubmission,
  validCheckoutAttempt,
  type CheckoutAttempt,
} from "./checkout-recovery";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { customerText, type CustomerWord } from "./customer-i18n";
import "./customer.css";
import { StaffAccessPanel } from "./StaffAccessPanel";
import type { AdminSession, AdminPermission } from "./admin-types";

type Product = CommerceProduct;
type Order = {
  id: string;
  status: string;
  total_minor: number;
  currency: string;
  commerce?: OrderCommerce;
  items: { name: string; quantity: number }[];
  fulfillments: { tracking: string; state: string }[];
};
type Ticket = {
  id: string;
  subject: string;
  body: string;
  state: string;
  replies: { id: string; body: string; created_at: string }[];
};
type Remote = { id: string; sequence_hash: string; name: string };
type Pane = "account" | "shop" | "sync" | "support" | "admin" | "gallery";
const freshProduct = (): Product => ({
  id: "",
  name: "",
  family: "string",
  price_minor: 0,
  currency: "UZS",
  stock: 0,
  credits: 0,
  revision: 0,
  description: "",
  profile_id: "",
  active: 1,
});

export function CustomerHub({
  locale,
  projects,
  onImport,
  onProgress,
  onApplyProfile,
  kitClaim,
  onClaimHandled,
  giftClaim,
  onGiftHandled,
}: {
  locale: Locale;
  projects: Project[];
  onImport: (instruction: Instruction, progress: Progress) => void;
  onProgress: (id: string, progress: Progress) => void;
  onApplyProfile: (profile: string) => void | Promise<void>;
  kitClaim?: string | null;
  onClaimHandled?: () => void;
  giftClaim?: string | null;
  onGiftHandled?: () => void;
}) {
  const { settings: storefront, refresh: refreshStorefront } = useBusiness();
  const ct = (key: CatalogWord) => catalogText(locale, key);
  const bt = (key: Parameters<typeof businessText>[1]) =>
    businessText(locale, key);
  const t = (key: CustomerWord) => customerText(locale, key);
  const [pane, setPane] = useState<Pane>("account"),
    [connected, setConnected] = useState(false),
    [busy, setBusy] = useState(false);
  const requestScope = useRef({ alive: true, life: 0, customer: 0, admin: 0 });
  useEffect(() => {
    const s = requestScope.current;
    s.alive = true;
    api.sessionChanged.add(resetCustomer);
    return () => {
      s.alive = false;
      ++s.life;
      ++s.customer;
      ++s.admin;
      api.sessionChanged.delete(resetCustomer);
    };
  }, []);
  useEffect(() => {
    if (kitClaim || giftClaim) setPane("account");
  }, [kitClaim, giftClaim]);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [recovery, setRecovery] = useState(""),
    [newRecovery, setNewRecovery] = useState("");
  const [me, setMe] = useState<{
      email: string | null;
      credits: number;
      durable?: boolean;
    } | null>(null),
    [products, setProducts] = useState<Product[]>([]),
    [skus, setSkus] = useState<Record<string, CatalogSku>>({}),
    [contents, setContents] = useState<
      Record<string, { name: string; quantity: number }[]>
    >({}),
    [catalogRevision, setCatalogRevision] = useState<number>(),
    [regions, setRegions] = useState<CommerceRegions>(),
    [journeyPolicies, setJourneyPolicies] = useState<JourneyProduct[]>([]),
    [commissionPolicies, setCommissionPolicies] = useState<CommissionPolicy[]>([]),
    [publicClaimOrigin, setPublicClaimOrigin] = useState<string | null>(null),
    [orders, setOrders] = useState<Order[]>([]),
    [tickets, setTickets] = useState<Ticket[]>([]),
    [remote, setRemote] = useState<Remote[]>([]);
  const [code, setCode] = useState(""),
    [material, setMaterial] = useState(""),
    [claim, setClaim] = useState(""),
    [gift, setGift] = useState<{
      id: string;
      claimToken?: string;
      status: string;
    } | null>(null),
    [giftCredits, setGiftCredits] = useState(1);
  const giftRequest = useRef<{
    key: string;
    expiry: number;
    credits: number;
  } | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({}),
    [address, setAddress] = useState({
      name: "",
      phone: "",
      city: "",
      street: "",
      deliveryMethod: "pickup",
      country: "UZ",
    });
  const region = checkoutRegion(regions, address.country ?? "UZ", storefront);
  const currency = region?.currency ?? "UZS";
  const subtotal = Object.entries(cart).reduce(
    (sum, [id, q]) =>
      sum + q * (products.find((p) => p.id === id)?.price_minor ?? 0),
    0,
  );
  const deliveryFee =
    address.deliveryMethod === "courier" && region?.courierEnabled
      ? region.courierFeeMinor
      : 0;
  const checkoutTotal = subtotal + deliveryFee;
  const offerEnabled =
    currency === "UZS" &&
    (address.country ?? "UZ") === "UZ" &&
    deliveryFee ===
      (address.deliveryMethod === "courier" ? storefront.deliveryFeeMinor : 0);
  const checkoutItems = Object.entries(cart).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
  const offer = useCheckoutOffer(
    JSON.stringify([
      api.session?.id,
      checkoutItems.map((i) => ({
        ...i,
        product: products.find((p) => p.id === i.productId),
      })),
      address.deliveryMethod,
      address.country,
      currency,
      catalogRevision,
      regions?.revision,
      storefront.revision,
      deliveryFee,
    ]),
  );
  const orderRequest = useRef<CheckoutAttempt | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const checkoutKey = () =>
    `${customerCacheNamespace}:checkout:${api.session?.id ?? "none"}`;
  async function retainCheckout(attempt: typeof orderRequest.current) {
    const key = checkoutKey();
    if (Capacitor.isNativePlatform()) {
      if (attempt)
        await Preferences.set({ key, value: JSON.stringify(attempt) });
      else await Preferences.remove({ key });
    } else if (attempt) localStorage.setItem(key, JSON.stringify(attempt));
    else localStorage.removeItem(key);
    orderRequest.current = attempt;
    setPendingCheckout(Boolean(attempt));
  }
  async function restoreCheckout(valid = () => true) {
    const key = checkoutKey(),
      raw = Capacitor.isNativePlatform()
        ? (await Preferences.get({ key })).value
        : localStorage.getItem(key);
    if (!valid() || !raw) return;
    const attempt = JSON.parse(raw);
    if (!validCheckoutAttempt(attempt))
      throw Error("Invalid saved checkout; original orders remain available");
    orderRequest.current = attempt;
    setPendingCheckout(true);
    const body = JSON.parse(attempt.payload);
    setCart(
      Object.fromEntries(
        body.items.map((i: { productId: string; quantity: number }) => [
          i.productId,
          i.quantity,
        ]),
      ),
    );
    setAddress({ ...body.address, country: body.address.country ?? "UZ" });
  }
  const [subject, setSubject] = useState(""),
    [body, setBody] = useState("");
  const [snapshots, setSnapshots] = useState<Record<string, Progress>>({});
  const [adminToken, setAdminToken] = useState(""),
    [unlocked, setUnlocked] = useState(false),
    [adminProducts, setAdminProducts] = useState<Product[]>([]),
    [adminOrders, setAdminOrders] = useState<Order[]>([]),
    [adminTickets, setAdminTickets] = useState<Ticket[]>([]),
    [audit, setAudit] = useState<
      { id: string; action: string; entity_id: string; created_at: string }[]
    >([]),
    [codes, setCodes] = useState<
      {
        hash: string;
        profile_id: string;
        quota: number;
        revoked: number;
        redeemed_by: string | null;
      }[]
    >([]);
  const [adminMode, setAdminMode] = useState<"password" | "token">();
  const [sandboxMode, setSandboxMode] = useState<boolean>();
  useEffect(() => {
    let live = true;
    void api
      .request<{ adminAuth?: string; sandbox: boolean; apiVersion?: string }>(
        "/health",
      )
      .then((h) => {
        if (live) {
          setSandboxMode(customerHealthSandbox(h));
          setAdminMode(h.adminAuth === "password" ? "password" : "token");
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const [product, setProduct] = useState<Product>(freshProduct),
    [quota, setQuota] = useState(1),
    [days, setDays] = useState(30),
    [codeProfile, setCodeProfile] = useState("dev-circle-120-dark"),
    [issued, setIssued] = useState("");
  const [ticketStates, setTicketStates] = useState<Record<string, string>>({});
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const can = (permission: AdminPermission) =>
    adminSession?.permissions.includes(permission) ?? false;
  const [replies, setReplies] = useState<Record<string, string>>({}),
    [tracking, setTracking] = useState<Record<string, string>>({});
  const busyGate = useRef(false);
  async function run(fn: () => Promise<void>) {
    if (busyGate.current) return;
    busyGate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      const status = e instanceof ApiError ? e.status : -1;
      setError(
        t(
          status === 0
            ? "offline"
            : status === 401
              ? "expired"
              : status === 409
                ? "conflict"
                : status === 429
                  ? "limited"
                  : status === 402
                    ? "noCredits"
                    : "failure",
        ),
      );
    } finally {
      setBusy(false);
      busyGate.current = false;
    }
  }
  async function refresh() {
    const scope = requestScope.current,
      ticket = ++scope.customer,
      life = scope.life,
      token = api.session?.token;
    const valid = () =>
      scope.alive &&
      scope.life === life &&
      scope.customer === ticket &&
      token === api.session?.token;
    if (!token) throw new ApiError(401, "Account required");
    const [health, m, c, o, s, r] = await Promise.all([
      api.request<unknown>("/health", undefined, ""),
      api.request<{ email: string | null; credits: number; durable?: boolean }>(
        "/account",
        undefined,
        token,
      ),
      api.request<ShopCatalog>("/catalog", undefined, ""),
      api.request<Order[]>("/orders", undefined, token),
      api.request<Ticket[]>("/support", undefined, token),
      api.request<Remote[]>("/instructions", undefined, token),
    ]);
    if (!valid()) return;
    const sandbox = customerHealthSandbox(health);
    if (!orderRequest.current) await restoreCheckout(valid);
    if (!valid()) return;
    setSandboxMode(sandbox);
    setMe(m);
    setProducts(c.products);
    setSkus(c.skus ?? {});
    setContents(c.contents ?? {});
    setCatalogRevision(c.catalogRevision);
    setRegions(c.regions);
    setJourneyPolicies(c.journeys ?? []);
    setCommissionPolicies(c.commissions ?? []);
    setPublicClaimOrigin(c.claimOrigin ?? null);
    setOrders(o);
    setTickets(s);
    setRemote(r);
    setConnected(true);
    await refreshStorefront();
  }
  useEffect(() => {
    let alive = true;
    void api
      .restore()
      .then(() => {
        if (alive && api.session) void run(refresh);
      })
      .catch(() => {
        if (alive) setError(t("failure"));
      });
    return () => {
      alive = false;
    };
  }, []);
  async function authenticate(mode: "register" | "login" | "recover") {
    if (mode === "register" && !api.session) await api.connect();
    const result = await api.authenticate(mode, {
      email,
      password,
      recoveryKey: recovery,
    });
    resetCustomer();
    setPassword("");
    setRecovery("");
    setNewRecovery(result.recoveryKey ?? "");
    await refresh();
  }
  function resetCustomer() {
    ++requestScope.current.customer;
    offer.clear();
    setConnected(false);
    setMe(null);
    setRemote([]);
    setOrders([]);
    setTickets([]);
    setSnapshots({});
    setNewRecovery("");
    setCart({});
    setAddress({
      name: "",
      phone: "",
      city: "",
      street: "",
      deliveryMethod: "pickup",
      country: "UZ",
    });
    setClaim("");
    setGift(null);
    setMaterial("");
    setSubject("");
    setBody("");
    setCode("");
    giftRequest.current = null;
    orderRequest.current = null;
    setPendingCheckout(false);
  }
  async function adminRefresh(credential = adminToken) {
    const scope = requestScope.current,
      ticket = ++scope.admin,
      life = scope.life,
      valid = () =>
        scope.alive && scope.life === life && scope.admin === ticket;
    try {
      const session = await api.request<AdminSession>(
        "/admin/session",
        undefined,
        credential,
      );
      if (!valid()) throw new ApiError(409, "Admin session changed");
      const allowed = (permission: AdminPermission) =>
        session.permissions.includes(permission);
      const [p, o, s, a, c] = await Promise.all([
        allowed("catalog")
          ? api.request<Product[]>("/admin/products", undefined, credential)
          : [],
        allowed("orders")
          ? api.request<Order[]>("/admin/orders", undefined, credential)
          : [],
        allowed("support")
          ? api.request<Ticket[]>("/admin/support", undefined, credential)
          : [],
        allowed("audit")
          ? api.request<typeof audit>("/admin/audit", undefined, credential)
          : [],
        allowed("codes")
          ? api.request<typeof codes>("/admin/codes", undefined, credential)
          : [],
      ]);
      if (!valid()) throw new ApiError(409, "Admin session changed");
      setAdminProducts(p);
      setAdminOrders(o);
      setAdminTickets(s);
      setAudit(a);
      setCodes(c);
      setAdminSession(session);
      setUnlocked(true);
    } catch (error) {
      if (valid()) {
        setUnlocked(false);
        setAdminSession(null);
      }
      throw error;
    }
  }
  const money = (
    v: number,
    unit = orderRequest.current?.display?.currency ?? currency,
  ) =>
    `${(v / 100).toLocaleString(locale, { maximumFractionDigits: 2 })} ${unit}`;
  const state = (v: string) =>
    t(
      (
        [
          "pending",
          "paid",
          "cancelled",
          "fulfilled",
          "return_requested",
          "refunded",
          "open",
          "answered",
          "closed",
        ] as string[]
      ).includes(v)
        ? (v as CustomerWord)
        : "saved",
    );
  async function upload(p: Project) {
    if (p.instruction.params.accessPolicy) {
      await api.request("/builds/archive", { instruction: p.instruction });
      await refresh();
      setNotice(t("saved"));
      return;
    }
    const job = await api.request<{
      id: string;
      status: string;
      instruction_id?: string;
    }>("/jobs/reserve", {
      requestKey: `save-${p.instruction.sequenceHash}`,
      sequenceHash: p.instruction.sequenceHash,
    });
    if (job.status !== "succeeded")
      await api.request("/jobs/finish", {
        jobId: job.id,
        instruction: p.instruction,
      });
    await refresh();
    setNotice(t("saved"));
  }
  async function inspect(r: Remote) {
    const p = await api.request<Progress>(`/instructions/${r.id}/progress`);
    setSnapshots((v) => ({ ...v, [r.id]: p }));
    return p;
  }

  return (
    <div className="customer-hub">
      {sandboxMode && (
        <p className="sandbox-notice" role="note">
          {t("sandbox")}
        </p>
      )}
      <PromotionPreference locale={locale} />
      <PushSettings locale={locale} />
      <div className="customer-tabs" role="group" aria-label={t("customer")}>
        {(
          ["account", "shop", "gallery", "sync", "support", "admin"] as Pane[]
        ).map((p) => (
          <button
            key={p}
            className={pane === p ? "active" : "outline"}
            aria-pressed={pane === p}
            onClick={() => {
              setPane(p);
              setError("");
            }}
          >
            {p === "gallery" ? galleryText(locale, "title") : t(p)}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="customer-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {busy && <p role="status">{t("loading")}</p>}
      <fieldset disabled={busy} className="customer-fields">
        {pane !== "admin" && (
          <div className="customer-session">
            {connected ? (
              <>
                <span>
                  {me?.email ?? t("guest")} · {t("credits")}:{" "}
                  <strong data-testid="customer-credits">{me?.credits}</strong>
                </span>
                <button className="outline" onClick={() => void run(refresh)}>
                  {t("refresh")}
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    void run(async () => {
                      try {
                        await api.logout();
                      } finally {
                        resetCustomer();
                      }
                    })
                  }
                >
                  {t("logout")}
                </button>
              </>
            ) : (
              <button
                onClick={() =>
                  void run(async () => {
                    await api.connect();
                    await refresh();
                  })
                }
              >
                {t("connect")}
              </button>
            )}
          </div>
        )}
        {pane === "gallery" && (
          <Suspense fallback={<p role="status">…</p>}>
            <GalleryStudio
              locale={locale}
              onAccount={() => setPane("account")}
            />
          </Suspense>
        )}
        {pane === "account" && (
          <div className="customer-grid">
            {giftClaim && (
              <Suspense fallback={<p role="status">…</p>}>
                <GiftClaimPanel
                  locale={locale}
                  code={giftClaim}
                  durable={!!me?.durable}
                  onDismiss={() => onGiftHandled?.()}
                  onAccepted={async () => {
                    const token = api.session?.token;
                    await refresh();
                    if (token !== api.session?.token)
                      throw new ApiError(409, "Gift account changed");
                    onGiftHandled?.();
                    setNotice(journeyText(locale, "accepted"));
                  }}
                />
              </Suspense>
            )}
            {kitClaim && (
              <Suspense fallback={<p role="status">…</p>}>
                <KitClaimPanel
                  key={kitClaim}
                  locale={locale}
                  code={kitClaim}
                  onDismiss={() => onClaimHandled?.()}
                  onClaim={async (profile) => {
                    const credential = api.session?.token;
                    await refresh();
                    if (!credential || credential !== api.session?.token)
                      throw new ApiError(409, "Claim account changed");
                    setMaterial(profile);
                    setNotice(partnerText(locale, "claimedNotice"));
                    onClaimHandled?.();
                  }}
                />
              </Suspense>
            )}
            <KitLogin locale={locale} onLogin={refresh} />
            {connected && (
              <Suspense fallback={<p role="status">…</p>}>
                <KitCreditTerms locale={locale} />
              </Suspense>
            )}
            {connected && (
              <Suspense fallback={<p role="status">…</p>}>
                <PartnerPortal locale={locale} />
              </Suspense>
            )}
            {connected && (
              <Suspense fallback={<p role="status">…</p>}>
                <ReferralPanel locale={locale} />
              </Suspense>
            )}
            <section className="card">
              <h2>{t("account")}</h2>
              <label>
                {t("email")}
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                {t("password")}
                <input
                  type="password"
                  autoComplete="current-password"
                  minLength={12}
                  maxLength={256}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="customer-actions">
                <button
                  disabled={!!me?.email || password.length < 12 || !email}
                  onClick={() => void run(() => authenticate("register"))}
                >
                  {t("register")}
                </button>
                <button
                  className="outline"
                  disabled={password.length < 12 || !email}
                  onClick={() => void run(() => authenticate("login"))}
                >
                  {t("login")}
                </button>
              </div>
              <details>
                <summary>{t("recover")}</summary>
                <label>
                  {t("recoveryKey")}
                  <input
                    type="password"
                    value={recovery}
                    onChange={(e) => setRecovery(e.target.value)}
                  />
                </label>
                <button
                  disabled={!recovery || password.length < 12 || !email}
                  onClick={() => void run(() => authenticate("recover"))}
                >
                  {t("recover")}
                </button>
              </details>
              {newRecovery && (
                <div className="recovery-key">
                  <p>{t("recoveryNotice")}</p>
                  <code>{newRecovery}</code>
                  <button
                    className="text-button"
                    onClick={() => setNewRecovery("")}
                  >
                    {t("closed")}
                  </button>
                </div>
              )}
            </section>
            {connected && (
              <section className="card">
                <h2>{t("code")}</h2>
                <label>
                  {t("code")}
                  <input
                    value={code}
                    maxLength={200}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <button
                  disabled={!code.trim()}
                  onClick={() =>
                    void run(async () => {
                      const r = await api.request<{ profile: string }>(
                        "/codes/redeem",
                        { code: code.trim() },
                      );
                      setMaterial(r.profile);
                      setCode("");
                      await refresh();
                      setNotice(t("saved"));
                    })
                  }
                >
                  {t("redeem")}
                </button>
                {material && (
                  <div>
                    <p>
                      {t("profile")}: {material}
                    </p>
                    <button
                      className="outline"
                      onClick={() =>
                        void run(async () => {
                          await onApplyProfile(material);
                        })
                      }
                    >
                      {t("apply")}
                    </button>
                  </div>
                )}
                <hr />
                <h3>{t("createGift")}</h3>
                <label>
                  {t("quota")}
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={giftCredits}
                    onChange={(e) => {
                      setGiftCredits(Number(e.target.value));
                      giftRequest.current = null;
                    }}
                  />
                </label>
                <button
                  disabled={giftCredits < 1 || giftCredits > (me?.credits ?? 0)}
                  onClick={() =>
                    void run(async () => {
                      giftRequest.current ??= {
                        key: crypto.randomUUID(),
                        expiry: Date.now() + 30 * 86400000,
                        credits: giftCredits,
                      };
                      const q = giftRequest.current;
                      setGift(
                        await api.request("/gifts", {
                          credits: q.credits,
                          expiresAt: q.expiry,
                          requestKey: q.key,
                        }),
                      );
                      await refresh();
                    })
                  }
                >
                  {t("createGift")}
                </button>
                {gift?.claimToken && (
                  <div>
                    <p>{t("giftNotice")}</p>
                    <code className="claim-token">{gift.claimToken}</code>
                    <button
                      className="text-button"
                      onClick={() =>
                        void run(async () => {
                          await api.request(`/gifts/${gift.id}/cancel`, {});
                          setGift(null);
                          giftRequest.current = null;
                          await refresh();
                        })
                      }
                    >
                      {t("cancelGift")}
                    </button>
                  </div>
                )}
                <label>
                  {t("claim")}
                  <input
                    value={claim}
                    maxLength={200}
                    onChange={(e) => setClaim(e.target.value)}
                  />
                </label>
                <button
                  className="outline"
                  disabled={!claim.trim()}
                  onClick={() =>
                    void run(async () => {
                      await api.request("/gifts/redeem", {
                        claimToken: claim.trim(),
                      });
                      setClaim("");
                      await refresh();
                      setNotice(t("saved"));
                    })
                  }
                >
                  {t("redeemGift")}
                </button>
              </section>
            )}
          </div>
        )}
        {pane === "shop" && connected && (
          <>
            {(commissionPolicies.length > 0 || me?.durable) && <Suspense fallback={<p role="status">…</p>}><CommissionStudio locale={locale} products={products} policies={commissionPolicies} regions={regions} durable={!!me?.durable} archives={remote} onUpdated={refresh}/></Suspense>}
            {(journeyPolicies.length > 0 || me?.durable) && (
              <Suspense fallback={<p role="status">…</p>}>
                <DigitalStudio
                  locale={locale}
                  products={products}
                  policies={journeyPolicies}
                  catalogRevision={catalogRevision}
                  settingsRevision={storefront.revision}
                  durable={!!me?.durable}
                  claimOrigin={publicClaimOrigin}
                  onUpdated={refresh}
                />
              </Suspense>
            )}
            {regions && !regions.usesLegacy && (
              <section className="card">
                <label>
                  {ct("country")}
                  <select
                    disabled={busy || pendingCheckout}
                    value={address.country ?? "UZ"}
                    onChange={(e) => {
                      setAddress((v) => ({
                        ...v,
                        country: e.target.value,
                        deliveryMethod: "pickup",
                      }));
                      setCart({});
                      offer.clear();
                    }}
                  >
                    {!regions.regions.some(
                      (r) =>
                        r.enabled && r.country === (address.country ?? "UZ"),
                    ) && (
                      <option value={address.country ?? "UZ"} disabled>
                        {countryName(locale, address.country ?? "UZ")}
                      </option>
                    )}
                    {regions.regions
                      .filter((r) => r.enabled)
                      .map((r) => (
                        <option key={r.country} value={r.country}>
                          {countryName(locale, r.country)} · {r.currency}
                        </option>
                      ))}
                  </select>
                </label>
                <p>{ct("changeCountry")}</p>
                <p>{ct("noFx")}</p>
              </section>
            )}
            {!region?.enabled && <p role="status">{ct("notServed")}</p>}
            <div className="customer-grid">
              {products
                .filter(
                  (p) =>
                    p.family !== "digital" &&
                    !commissionPolicies.some(c => c.productId === p.id) &&
                    region?.enabled &&
                    p.currency === currency,
                )
                .map((p) => (
                  <section className="card" key={p.id}>
                    <span className="eyebrow">{p.family}</span>
                    <h2>{p.name}</h2>
                    <p>{p.description}</p>
                    {skus[p.id] && (
                      <>
                        <p>
                          {skus[p.id].label} · {ct("material")}:{" "}
                          {skus[p.id].material}
                        </p>
                        {skus[p.id].parts.length > 0 && (
                          <p>
                            {ct("contents")}:{" "}
                            {(contents[p.id] ?? [])
                              .map((part) => part.name + " × " + part.quantity)
                              .join(", ")}
                          </p>
                        )}
                      </>
                    )}
                    <p>
                      {t("price")}: {money(p.price_minor, p.currency)}
                    </p>
                    {p.credits > 0 && <p>{ct("creditTerms")}</p>}
                    <p>
                      {t("stock")}: {p.stock} · {t("credits")}: {p.credits}
                    </p>
                    <button
                      disabled={
                        pendingCheckout ||
                        busy ||
                        p.stock < 1 ||
                        (cart[p.id] ?? 0) >= Math.min(10, p.stock)
                      }
                      onClick={() => {
                        setCart((v) => ({ ...v, [p.id]: (v[p.id] ?? 0) + 1 }));
                        orderRequest.current = null;
                      }}
                    >
                      {t("add")}
                    </button>
                  </section>
                ))}
            </div>
            <section className="card">
              <h2>{t("cart")}</h2>
              {pendingCheckout && (
                <p data-testid="pending-checkout">{bt("pendingCheckout")}</p>
              )}
              <fieldset disabled={pendingCheckout || busy}>
                {Object.entries(cart).map(([id, q]) => (
                  <div className="customer-row" key={id}>
                    <span>
                      {orderRequest.current?.display?.items?.find(
                        (p) => p.productId === id,
                      )?.name ??
                        products.find((p) => p.id === id)?.name ??
                        id}{" "}
                      × {q}
                      {orderRequest.current?.display?.items?.find(
                        (p) => p.productId === id,
                      )?.sku?.material && (
                        <span>
                          {" "}
                          ·{" "}
                          {
                            orderRequest.current.display.items.find(
                              (p) => p.productId === id,
                            )!.sku!.material
                          }
                        </span>
                      )}
                    </span>
                    <button
                      className="text-button"
                      onClick={() => {
                        setCart((v) => {
                          const next = { ...v };
                          delete next[id];
                          return next;
                        });
                        orderRequest.current = null;
                      }}
                    >
                      {t("remove")}
                    </button>
                  </div>
                ))}
                <p data-testid="checkout-subtotal">
                  {bt("subtotal")}:{" "}
                  {money(orderRequest.current?.display?.subtotal ?? subtotal)}
                </p>
                <label>
                  {bt("method")}{" "}
                  <select
                    aria-label={bt("method")}
                    value={address.deliveryMethod}
                    onChange={(e) => {
                      setAddress((v) => ({
                        ...v,
                        deliveryMethod: e.target.value,
                      }));
                      orderRequest.current = null;
                    }}
                  >
                    <option
                      value="pickup"
                      disabled={!region?.pickupAddress.trim()}
                    >
                      {bt("pickup")}
                    </option>
                    <option value="courier" disabled={!region?.courierEnabled}>
                      {bt("courier")}
                    </option>
                  </select>
                </label>
                <label>
                  {t("name")}
                  <input
                    value={address.name}
                    maxLength={200}
                    onChange={(e) => {
                      setAddress((v) => ({ ...v, name: e.target.value }));
                      orderRequest.current = null;
                    }}
                  />
                </label>
                <label>
                  {bt("phone")}
                  <input
                    type="tel"
                    value={address.phone}
                    maxLength={40}
                    onChange={(e) => {
                      setAddress((v) => ({ ...v, phone: e.target.value }));
                      orderRequest.current = null;
                    }}
                  />
                </label>
                {address.deliveryMethod === "courier" &&
                  (["city", "street"] as const).map((k) => (
                    <label key={k}>
                      {t(k)}
                      <input
                        value={address[k]}
                        maxLength={200}
                        onChange={(e) => {
                          setAddress((v) => ({ ...v, [k]: e.target.value }));
                          orderRequest.current = null;
                        }}
                      />
                    </label>
                  ))}
                <p>
                  {bt("deliveryTotal")}:{" "}
                  {money(
                    orderRequest.current?.display?.feeMinor ?? deliveryFee,
                  )}
                </p>
                {offerEnabled && (
                  <CheckoutOffer
                    locale={locale}
                    offer={offer}
                    items={checkoutItems}
                    method={address.deliveryMethod}
                    money={money}
                  />
                )}
                {pendingCheckout &&
                  orderRequest.current?.display?.offerCode && (
                    <p data-testid="pending-offer">
                      {orderRequest.current.display.offerCode} ·{" "}
                      {offersText(locale, "discount")}:{" "}
                      {money(orderRequest.current.display.discountMinor ?? 0)}
                    </p>
                  )}
                <p data-testid="checkout-total">
                  <strong>
                    {bt("total")}:{" "}
                    {money(
                      pendingCheckout
                        ? JSON.parse(orderRequest.current!.payload).quote
                            .totalMinor
                        : ((offerEnabled
                            ? offer.quote?.totalMinor
                            : undefined) ?? checkoutTotal),
                    )}
                  </strong>
                </p>
                <div data-testid="checkout-seller">
                  <p>{bt("seller")}</p>
                  <p>
                    {(orderRequest.current?.display?.sellerName ??
                      storefront.sellerName) ||
                      bt("unset")}
                  </p>
                  <p>
                    {orderRequest.current?.display?.sellerPhone ??
                      storefront.sellerPhone}
                  </p>
                  <p>
                    {orderRequest.current?.display?.paymentDetails ??
                      storefront.paymentDetails}
                  </p>
                  {address.deliveryMethod === "pickup" && (
                    <p>
                      {orderRequest.current?.display?.pickupAddress ??
                        region?.pickupAddress}
                    </p>
                  )}
                </div>
                <p>{bt("orderOnline")}</p>
              </fieldset>
              <button
                disabled={
                  !pendingCheckout &&
                  ((offerEnabled && offer.blocked) ||
                    !region?.enabled ||
                    !cartMatchesCurrency(products, cart, currency) ||
                    !Object.keys(cart).length ||
                    address.name.trim().length < 2 ||
                    address.phone.replace(/\D/g, "").length < 7 ||
                    (address.deliveryMethod === "courier"
                      ? !region?.courierEnabled ||
                        address.city.trim().length < 2 ||
                        address.street.trim().length < 2
                      : !region?.pickupAddress.trim()))
                }
                onClick={() =>
                  void run(async () => {
                    const items = Object.entries(cart).map(
                      ([productId, quantity]) => ({ productId, quantity }),
                    );
                    const quote = {
                      totalMinor:
                        (offerEnabled ? offer.quote?.totalMinor : undefined) ??
                        checkoutTotal,
                      settingsRevision:
                        (offerEnabled
                          ? offer.quote?.settingsRevision
                          : undefined) ?? storefront.revision,
                      ...(offerEnabled && offer.quote
                        ? { offerQuoteId: offer.quote.id }
                        : {}),
                      ...(checkoutItems.some((i) => skus[i.productId])
                        ? { catalogRevision }
                        : {}),
                      ...(regions
                        ? { currency, shippingRevision: regions.revision }
                        : {}),
                    };
                    const payload = JSON.stringify({ items, address, quote });
                    if (!orderRequest.current)
                      await retainCheckout({
                        key: crypto.randomUUID(),
                        payload,
                        display: {
                          subtotal,
                          currency,
                          items: checkoutItems.map((i) => {
                            const p = products.find(
                              (p) => p.id === i.productId,
                            )!;
                            return {
                              productId: p.id,
                              quantity: i.quantity,
                              name: p.name,
                              priceMinor: p.price_minor,
                              currency: p.currency,
                              profileId: p.profile_id,
                              credits: p.credits,
                              sku: skus[p.id] ?? null,
                            };
                          }),
                          feeMinor: deliveryFee,
                          sellerName: storefront.sellerName,
                          sellerPhone: storefront.sellerPhone,
                          paymentDetails: storefront.paymentDetails,
                          pickupAddress: region?.pickupAddress ?? "",
                          ...(offerEnabled && offer.quote
                            ? {
                                discountMinor: offer.quote.discountMinor,
                                offerCode: offer.quote.offer.code,
                              }
                            : {}),
                        },
                      });
                    try {
                      await api.request(
                        "/orders",
                        checkoutSubmission(orderRequest.current!),
                      );
                    } catch (error) {
                      // A known validation refusal created no order; allow corrected review.
                      if (
                        error instanceof ApiError &&
                        [400, 409, 422].includes(error.status)
                      )
                        await retainCheckout(null);
                      throw error;
                    }
                    offer.clear();
                    setCart({});
                    await retainCheckout(null);
                    await refresh();
                    setNotice(t("saved"));
                  })
                }
              >
                {pendingCheckout ? bt("retryCheckout") : t("checkout")}
              </button>
            </section>
            <section className="card">
              <h2>{t("orders")}</h2>
              {!orders.length && <p>{t("noOrders")}</p>}
              {orders
                .filter((o) => o.commerce?.method !== "online")
                .map((o) => (
                  <article className="customer-item" key={o.id}>
                    <code>{o.id}</code>
                    <p>
                      {state(o.status)} · {money(o.total_minor, o.currency)}
                    </p>
                    {o.commerce && (
                      <div data-testid="order-seller-snapshot">
                        <p>
                          {bt(
                            o.commerce.method === "pickup"
                              ? "pickup"
                              : "courier",
                          )}{" "}
                          · {money(o.commerce.feeMinor, o.currency)}
                        </p>
                        <p>
                          {o.commerce.sellerName} · {o.commerce.sellerPhone}
                        </p>
                        <p>{o.commerce.paymentDetails}</p>
                        {o.commerce.method === "pickup" && (
                          <p>{o.commerce.pickupAddress}</p>
                        )}
                      </div>
                    )}
                    {o.items.map((l, k) => (
                      <p key={k}>
                        {l.name} × {l.quantity}
                      </p>
                    ))}
                    {o.fulfillments.map((f, k) => (
                      <p key={k}>
                        {t("tracking")}: {f.tracking}
                      </p>
                    ))}
                    {o.status === "pending" && (
                      <PaymentOptions
                        orderId={o.id}
                        currency={o.currency}
                        locale={locale}
                        onUpdated={refresh}
                      />
                    )}
                    {o.status === "pending" && (
                      <button
                        className="outline"
                        onClick={() =>
                          void run(async () => {
                            await api.request(`/orders/${o.id}/cancel`, {});
                            await refresh();
                          })
                        }
                      >
                        {t("cancel")}
                      </button>
                    )}
                    {["paid", "fulfilled"].includes(o.status) && (
                      <button
                        className="outline"
                        onClick={() =>
                          void run(async () => {
                            await api.request(`/orders/${o.id}/return`, {});
                            await refresh();
                          })
                        }
                      >
                        {t("return")}
                      </button>
                    )}
                  </article>
                ))}
            </section>
          </>
        )}
        {pane === "sync" && connected && (
          <>
            <p>{t("uploadNotice")}</p>
            <section className="card">
              <h2>{t("localProjects")}</h2>
              {!projects.filter((p) => !p.deletedAt).length && (
                <p>{t("noProjects")}</p>
              )}
              {projects
                .filter((p) => !p.deletedAt)
                .map((p) => (
                  <article className="customer-item" key={p.id}>
                    <h3>{p.name}</h3>
                    <p>
                      {t("confirmed")}: {p.progress.confirmed}/
                      {p.instruction.metrics.lines}
                    </p>
                    <code>{p.instruction.sequenceHash.slice(0, 16)}</code>
                    <button
                      className="outline"
                      onClick={() => void run(() => upload(p))}
                    >
                      {t("upload")}
                    </button>
                  </article>
                ))}
            </section>
            <section className="card">
              <h2>{t("serverProjects")}</h2>
              {!remote.length && <p>{t("empty")}</p>}
              {remote.map((r) => {
                const local = projects.find(
                  (p) =>
                    !p.deletedAt &&
                    p.instruction.sequenceHash === r.sequence_hash,
                );
                const snapshot = snapshots[r.id];
                return (
                  <article className="customer-item" key={r.id}>
                    <code>{r.sequence_hash.slice(0, 16)}</code>
                    <button
                      className="outline"
                      onClick={() =>
                        void run(async () => {
                          await inspect(r);
                        })
                      }
                    >
                      {t("refresh")}
                    </button>
                    {snapshot && (
                      <>
                        <p>
                          {t("confirmed")}: {snapshot.confirmed} · revision{" "}
                          {snapshot.revision}
                        </p>
                        {local ? (
                          <div className="customer-actions">
                            <button
                              onClick={() =>
                                void run(async () => {
                                  const saved = await api.request<Progress>(
                                    `/instructions/${r.id}/progress`,
                                    {
                                      progress: local.progress,
                                      expectedRevision: snapshot.revision,
                                    },
                                  );
                                  setSnapshots((v) => ({
                                    ...v,
                                    [r.id]: saved,
                                  }));
                                  setNotice(t("saved"));
                                })
                              }
                            >
                              {t("push")}
                            </button>
                            <button
                              className="outline"
                              onClick={() =>
                                void run(async () => {
                                  const latest = await inspect(r);
                                  onProgress(local.id, latest);
                                  setNotice(t("saved"));
                                })
                              }
                            >
                              {t("pull")}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              void run(async () => {
                                const i = await api.request<Instruction>(
                                  `/instructions/${r.id}`,
                                );
                                await validateInstruction(i);
                                const p = await inspect(r);
                                onImport(i, p);
                              })
                            }
                          >
                            {t("download")}
                          </button>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </section>
          </>
        )}
        {pane === "support" && connected && (
          <section className="card">
            <h2>{t("support")}</h2>
            <label>
              {t("subject")}
              <input
                maxLength={150}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label>
              {t("message")}
              <textarea
                maxLength={4000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>
            <button
              disabled={!subject.trim() || !body.trim()}
              onClick={() =>
                void run(async () => {
                  await api.request("/support", { subject, body });
                  setSubject("");
                  setBody("");
                  await refresh();
                  setNotice(t("saved"));
                })
              }
            >
              {t("sendTicket")}
            </button>
            {tickets.map((ticket) => (
              <article className="customer-item" key={ticket.id}>
                <h3>{ticket.subject}</h3>
                <p>{state(ticket.state)}</p>
                <p>{ticket.body}</p>
                {ticket.replies.map((r) => (
                  <blockquote key={r.id}>{r.body}</blockquote>
                ))}
              </article>
            ))}
          </section>
        )}
        {pane === "admin" && (
          <>
            <NativeServerSettings locale={locale} />
            <section className="card">
              <h2>{t("admin")}</h2>
              {adminMode === "password" && (
                <AdminPasswordLogin
                  locale={locale}
                  token={
                    unlocked && adminSession?.role === "owner" ? adminToken : ""
                  }
                  onLogin={async (token) => {
                    await adminRefresh(token);
                    setAdminToken(token);
                  }}
                  onLogout={() => {
                    ++requestScope.current.admin;
                    setAdminToken("");
                    setUnlocked(false);
                    setAdminSession(null);
                  }}
                />
              )}
              {adminMode && (
                <details open={adminMode === "token"}>
                  <summary>
                    {adminMode === "password"
                      ? adminLoginText(locale, "staff")
                      : t("adminNotice")}
                  </summary>
                  <label>
                    {t("adminToken")}
                    <input
                      type="password"
                      autoComplete="off"
                      value={adminToken}
                      onChange={(e) => {
                        ++requestScope.current.admin;
                        setAdminToken(e.target.value);
                        setUnlocked(false);
                        setAdminSession(null);
                      }}
                    />
                  </label>
                  <button
                    disabled={!adminToken}
                    onClick={() => void run(adminRefresh)}
                  >
                    {t("unlock")}
                  </button>
                </details>
              )}
            </section>
            {unlocked && (
              <>
                {adminSession?.role === "owner" && (
                  <OwnerAdminNavigation locale={locale} />
                )}
                {can("codes") && (
                  <KitAdmin locale={locale} token={adminToken} />
                )}
                <BusinessAdmin
                  locale={locale}
                  token={adminToken}
                  settingsAllowed={can("settings")}
                  messagesAllowed={can("messages")}
                  run={run}
                />
                {can("support") && (
                  <Suspense fallback={<p role="status">…</p>}>
                    <GalleryModeration locale={locale} token={adminToken} />
                  </Suspense>
                )}
                {can("finance") && (
                  <Suspense fallback={<p role="status">…</p>}>
                    <OfferAdmin locale={locale} token={adminToken} />
                  </Suspense>
                )}
                {can("access") && (
                  <Suspense fallback={<p role="status">…</p>}>
                    <PartnerAdmin locale={locale} token={adminToken} />
                  </Suspense>
                )}
                {can("catalog") && (
                  <Suspense fallback={<p role="status">…</p>}>
                    <CatalogAdmin locale={locale} token={adminToken} />
                  </Suspense>
                )}
                {can("catalog") && (
                  <Suspense fallback={<p role="status">…</p>}>
                    <DigitalAdmin locale={locale} token={adminToken} />
                  </Suspense>
                )}
                {can("catalog") && <Suspense fallback={<p role="status">…</p>}><CommissionPolicyAdmin locale={locale} token={adminToken}/></Suspense>}
                {can("orders") && <Suspense fallback={<p role="status">…</p>}><CommissionOrdersAdmin locale={locale} token={adminToken} canFulfill={can("fulfill")}/></Suspense>}
                {can("settings") && (
                  <Suspense fallback={<p role="status">…</p>}>
                    <RegionsAdmin locale={locale} token={adminToken} />
                  </Suspense>
                )}
                {can("access") && (
                  <StaffAccessPanel
                    locale={locale}
                    token={adminToken}
                    run={run}
                  />
                )}
                <section
                  className="card"
                  id="admin-prices"
                  data-admin-permission="catalog"
                  hidden={!can("catalog")}
                >
                  <h2>{t("products")}</h2>
                  <div className="customer-actions">
                    {adminProducts.map((p) => (
                      <button
                        className="outline"
                        key={p.id}
                        onClick={() => setProduct(p)}
                      >
                        {p.name}
                      </button>
                    ))}
                    <button
                      className="outline"
                      onClick={() => setProduct(freshProduct())}
                    >
                      +
                    </button>
                  </div>
                  {(["id", "name", "description", "profile_id"] as const).map(
                    (k) => (
                      <label key={k}>
                        {t(
                          k === "id"
                            ? "productId"
                            : k === "profile_id"
                              ? "profile"
                              : k,
                        )}
                        <input
                          value={product[k]}
                          maxLength={k === "description" ? 2000 : 120}
                          onChange={(e) =>
                            setProduct((v) => ({ ...v, [k]: e.target.value }))
                          }
                        />
                      </label>
                    ),
                  )}
                  <label>
                    {t("family")}
                    <select
                      value={product.family}
                      onChange={(e) =>
                        setProduct((v) => ({ ...v, family: e.target.value }))
                      }
                    >
                      {[
                        "string",
                        "brick",
                        "diamond",
                        "paint",
                        "book",
                        "guided",
                        "digital",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  {(["price_minor", "stock", "credits"] as const).map((k) => (
                    <label key={k}>
                      {t(k === "price_minor" ? "price" : k)}
                      <input
                        type="number"
                        min={0}
                        value={
                          k === "price_minor" ? product[k] / 100 : product[k]
                        }
                        step={k === "price_minor" ? 0.01 : 1}
                        onChange={(e) =>
                          setProduct((v) => ({
                            ...v,
                            [k]:
                              k === "price_minor"
                                ? Math.round(Number(e.target.value) * 100)
                                : Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                  ))}
                  <p>
                    {ct("currency")}: {product.currency ?? "UZS"}
                  </p>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={!!product.active}
                      onChange={(e) =>
                        setProduct((v) => ({
                          ...v,
                          active: e.target.checked ? 1 : 0,
                        }))
                      }
                    />
                    {t("active")}
                  </label>
                  <button
                    disabled={!product.id || !product.name}
                    onClick={() =>
                      void run(async () => {
                        const p = await api.request<Product>(
                          "/admin/products",
                          { ...product, expectedRevision: product.revision },
                          adminToken,
                        );
                        setProduct(p);
                        await adminRefresh();
                        setNotice(t("saved"));
                      })
                    }
                  >
                    {t("saveProduct")}
                  </button>
                </section>
                <section
                  className="card"
                  data-admin-permission="codes"
                  hidden={!can("codes")}
                >
                  <h2>{t("codes")}</h2>
                  <label>
                    {t("profile")}
                    <input
                      value={codeProfile}
                      onChange={(e) => setCodeProfile(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("quota")}
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={quota}
                      onChange={(e) => setQuota(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    {t("days")}
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                    />
                  </label>
                  <button
                    onClick={() =>
                      void run(async () => {
                        const c = await api.request<{ code: string }>(
                          "/admin/codes",
                          {
                            profile: codeProfile,
                            quota,
                            expiresAt: Date.now() + days * 86400000,
                          },
                          adminToken,
                        );
                        setIssued(c.code);
                        await adminRefresh();
                      })
                    }
                  >
                    {t("issueCode")}
                  </button>
                  {issued && (
                    <code className="claim-token" data-testid="issued-code">
                      {issued}
                    </code>
                  )}
                  {codes.map((c) => (
                    <div className="customer-row" key={c.hash}>
                      <span>
                        {c.profile_id} · {c.quota} · {c.hash.slice(0, 8)}
                      </span>
                      <button
                        className="text-button"
                        disabled={!!c.revoked}
                        onClick={() =>
                          void run(async () => {
                            await api.request(
                              "/admin/codes/revoke",
                              { hash: c.hash },
                              adminToken,
                            );
                            await adminRefresh();
                          })
                        }
                      >
                        {t("revoke")}
                      </button>
                    </div>
                  ))}
                </section>
                <section
                  className="card"
                  id="admin-orders"
                  data-admin-permission="orders"
                  hidden={!can("orders")}
                >
                  <h2>{t("orders")}</h2>
                  {adminOrders.map((o) => (
                    <article className="customer-item" key={o.id}>
                      <code>{o.id}</code>
                      <p>
                        {state(o.status)} · {money(o.total_minor, o.currency)}
                      </p>
                      {o.status === "pending" && can("finance") && (
                        <button
                          onClick={() =>
                            void run(async () => {
                              await api.request(
                                `/admin/orders/${o.id}/test-payment`,
                                {},
                                adminToken,
                              );
                              await adminRefresh();
                            })
                          }
                        >
                          {t("testPayment")}
                        </button>
                      )}
                      {o.status === "return_requested" && can("finance") && (
                        <button
                          onClick={() =>
                            void run(async () => {
                              await api.request(
                                `/admin/orders/${o.id}/refund`,
                                {},
                                adminToken,
                              );
                              await adminRefresh();
                            })
                          }
                        >
                          {t("refund")}
                        </button>
                      )}
                      {o.status === "paid" &&
                        o.commerce?.method !== "online" &&
                        can("fulfill") && (
                          <>
                            <label>
                              {t("tracking")}
                              <input
                                value={tracking[o.id] ?? ""}
                                onChange={(e) =>
                                  setTracking((v) => ({
                                    ...v,
                                    [o.id]: e.target.value,
                                  }))
                                }
                              />
                            </label>
                            <button
                              disabled={
                                (tracking[o.id] ?? "").trim().length < 2
                              }
                              onClick={() =>
                                void run(async () => {
                                  await api.request(
                                    `/admin/orders/${o.id}/fulfill`,
                                    { tracking: tracking[o.id] },
                                    adminToken,
                                  );
                                  await adminRefresh();
                                })
                              }
                            >
                              {t("fulfill")}
                            </button>
                          </>
                        )}
                    </article>
                  ))}
                </section>
                <section
                  className="card"
                  data-admin-permission="support"
                  hidden={!can("support")}
                >
                  <h2>{t("support")}</h2>
                  {adminTickets.map((ticket) => (
                    <article className="customer-item" key={ticket.id}>
                      <h3>{ticket.subject}</h3>
                      <p>{ticket.body}</p>
                      {ticket.replies.map((r) => (
                        <blockquote key={r.id}>{r.body}</blockquote>
                      ))}
                      <label>
                        {t("message")}
                        <textarea
                          value={replies[ticket.id] ?? ""}
                          maxLength={4000}
                          onChange={(e) =>
                            setReplies((v) => ({
                              ...v,
                              [ticket.id]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        {t("ticketState")}
                        <select
                          value={ticketStates[ticket.id] ?? "answered"}
                          onChange={(e) =>
                            setTicketStates((v) => ({
                              ...v,
                              [ticket.id]: e.target.value,
                            }))
                          }
                        >
                          {["open", "answered", "closed"].map((v) => (
                            <option key={v} value={v}>
                              {state(v)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        disabled={!(replies[ticket.id] ?? "").trim()}
                        onClick={() =>
                          void run(async () => {
                            await api.request(
                              `/admin/support/${ticket.id}/reply`,
                              {
                                body: replies[ticket.id],
                                state: ticketStates[ticket.id] ?? "answered",
                              },
                              adminToken,
                            );
                            setReplies((v) => ({ ...v, [ticket.id]: "" }));
                            await adminRefresh();
                          })
                        }
                      >
                        {t("reply")}
                      </button>
                    </article>
                  ))}
                </section>
                <section
                  className="card"
                  data-admin-permission="audit"
                  hidden={!can("audit")}
                >
                  <h2>{t("audit")}</h2>
                  {audit.map((a) => (
                    <p key={a.id}>
                      {a.action} · {a.entity_id.slice(0, 12)} · {a.created_at}
                    </p>
                  ))}
                </section>
              </>
            )}
          </>
        )}
      </fieldset>
    </div>
  );
}
