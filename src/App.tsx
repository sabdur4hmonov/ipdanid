import type { Locale, Project, Shape } from "./core/types";
import { lazy, Suspense, useState, useEffect } from "react";
import { startPushRuntime } from "./push-client";
import { CustomerStudio } from "./CustomerStudio";
import { customerFlowText } from "./customer-flow-i18n";
import { standardText } from "./standard-kit-i18n";
import { takeKitClaim, kitClaimCode } from "./kit-claim-link";
import { giftClaimCode, takeGiftClaim } from "./gift-claim-link";
import { startDigitalPendingLifecycle } from "./digital-pending";
import { standardKitRevision } from "./standard-kit-settings";
import type { StandardKitConfig } from "./core/standard-kit";
const StandardKitStudio = lazy(() =>
  import("./StandardKitStudio").then((m) => ({ default: m.StandardKitStudio })),
);

import { useAppController } from "./useAppController";
import { MoreMenu } from "./screens/MoreMenu";
import { CreateScreen } from "./screens/CreateScreen";
import { AssembleScreen } from "./screens/AssembleScreen";
import { LibraryScreen } from "./screens/LibraryScreen";
import { MoreScreen } from "./screens/MoreScreen";
export default function App() {
  const [kitClaim, setKitClaim] = useState(() =>
    kitClaimCode(window.location.hash),
  );
  const [claimedKit, setClaimedKit] = useState<StandardKitConfig>();
  const [giftClaim, setGiftClaim] = useState(() =>
    giftClaimCode(window.location.hash),
  );
  const [standard, setStandard] = useState(true);
  const [customerFlow, setCustomerFlow] = useState(true);
  const context = useAppController(
    kitClaim || giftClaim ? "customer" : "create",
  );
  const {
    Announcements,
    Check,
    CraftStudio,
    CustomerHub,
    DEFAULT_EDITS,
    FolderOpen,
    Layers,
    PRODUCT_NAME,
    ShieldCheck,
    Sparkles,
    WifiOff,
    X,
    canBuild,
    chooseSubject,
    confirm,
    customerError,
    customerText,
    deepFreeze,
    doImport,
    error,
    guideText,
    importInput,
    loaded,
    localSaveState,
    locale,
    nav,
    notice,
    online,
    open,
    progressFor,
    projects,
    readProjects,
    setError,
    setHeightMm,
    setLoaded,
    setLocale,
    setMode,
    setPinCount,
    setProjects,
    setSelected,
    setShape,
    setShowPrivacy,
    setStorageConflict,
    setStrongSubjectFit,
    setThreadMm,
    setView,
    setWidthMm,
    showPrivacy,
    storageConflict,
    storefront,
    t,
    view,
  } = context;
  useEffect(() => startPushRuntime(locale), [locale]);
  useEffect(() => {
    startDigitalPendingLifecycle();
  }, []);
  useEffect(() => {
    takeKitClaim();
    takeGiftClaim();
    const claim = () => {
      if (window.location.hash.startsWith("#gift=")) {
        const token = takeGiftClaim();
        if (token) {
          setGiftClaim(token);
          setView("customer");
        }
        return;
      }
      if (!window.location.hash.startsWith("#kit=")) return;
      const code = takeKitClaim();
      if (code) {
        setKitClaim(code);
        setView("customer");
      }
    };
    window.addEventListener("hashchange", claim);
    return () => window.removeEventListener("hashchange", claim);
  }, []);
  return (
    <div
      className={customerFlow && view === "create" ? "app customer-app" : "app"}
    >
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            nav("create");
          }}
        >
          <img src="/icon.svg" alt="" />
          <span>
            {storefront.brandName || PRODUCT_NAME}
            <span className="brand-sub">{t("tagline")}</span>
          </span>
        </a>
        <nav aria-label="Main">
          {(
            [
              { id: "create", icon: Sparkles },
              { id: "assemble", icon: Layers },
              { id: "library", icon: FolderOpen },
            ] as const
          ).map(({ id, icon: Icon }) => (
            <button
              key={id}
              aria-label={t(id)}
              className={view === id ? "nav active" : "nav"}
              onClick={() => nav(id)}
            >
              <Icon size={20} />
              <span>{t(id)}</span>
              {id === "library" && (
                <small aria-hidden="true">
                  {projects.filter((p) => !p.deletedAt).length}
                </small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <ShieldCheck size={18} />
            {t("private")}
          </div>
          <button className="text-button" onClick={() => setShowPrivacy(true)}>
            {t("privacy")}
          </button>
          <span className="version">Ip Rasm · development 0.1</span>
        </div>
      </aside>
      <div className="body">
        <header>
          <div className="breadcrumbs">
            {view === "customer" ? customerText(locale, "customer") : t(view)}{" "}
            <span>/</span> <span>{storefront.brandName || PRODUCT_NAME}</span>
          </div>
          <div className="header-right">
            <MoreMenu
              customerMode={customerFlow}
              context={context}
              onCustomer={() => {
                setCustomerFlow(true);
                nav("create");
              }}
              onExpert={() => {
                setCustomerFlow(false);
                nav("create");
              }}
            />
            {!online && (
              <span className="offline">
                <WifiOff size={15} />
                {t("offline")}
              </span>
            )}
            {!(customerFlow && view === "create") && (
              <select
                aria-label="Language"
                value={locale}
                onChange={(e) => setLocale(e.target.value as Locale)}
              >
                <option value="uz">O‘zbekcha</option>
                <option value="uz-Cyrl">Ўзбекча</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            )}
          </div>
        </header>
        <main>
          <Announcements locale={locale} />
          {projects.length > 0 && (
            <p
              className="fineprint library-save-status"
              role="status"
              data-testid="library-save-state"
              data-state={localSaveState}
            >
              {guideText(
                locale,
                localSaveState === "failed" ? "saveFailed" : localSaveState,
              )}
            </p>
          )}
          {storageConflict && (
            <div className="alert error" role="alert">
              <span>{t("conflict")}</span>
              <button
                className="outline"
                onClick={() =>
                  readProjects()
                    .then((ps) => {
                      setProjects(ps);
                      setLoaded(true);
                      setStorageConflict(false);
                      setSelected(null);
                      setError("");
                      setView("library");
                    })
                    .catch((e) => setError(String(e)))
                }
              >
                {t("reloadLibrary")}
              </button>
            </div>
          )}
          {error && (
            <div role="alert" className="alert error">
              {customerError(error, locale)}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              <Check size={17} />
              {notice}
            </div>
          )}
          {view === "customer" && (
            <CustomerHub
              kitClaim={kitClaim}
              giftClaim={giftClaim}
              onGiftHandled={() => setGiftClaim(null)}
              onClaimHandled={() => setKitClaim(null)}
              locale={locale}
              projects={projects.filter((p) => canBuild(p.instruction))}
              onImport={(i, p) => {
                const next: Project = {
                  id: crypto.randomUUID(),
                  name: "Server · " + i.sequenceHash.slice(0, 8),
                  instruction: deepFreeze(i),
                  progress: p,
                  edits: { ...DEFAULT_EDITS },
                };
                setProjects((ps) => [next, ...ps]);
                open(next);
              }}
              onProgress={(id, p) => {
                const local = projects.find((item) => item.id === id);
                if (!local || local.instruction.sequenceHash !== p.sequenceHash)
                  throw new Error("Different sequences");
                const progress = confirm(
                  local.progress,
                  p.confirmed,
                  local.instruction,
                );
                setProjects((ps) =>
                  ps.map((item) =>
                    item.id === id ? { ...item, progress } : item,
                  ),
                );
              }}
              onApplyProfile={async (id) => {
                const standardRevision = id.match(
                  /^standard-(?:base|circle|rectangle|heart)-r([1-9]\d*)(?:-classic[23](?:-polished)?)?$/,
                );
                if (standardRevision) {
                  setClaimedKit(
                    await standardKitRevision(Number(standardRevision[1])),
                  );
                  setCustomerFlow(true);
                  setStandard(true);
                  nav("create");
                  return;
                }
                const match = id.match(
                  /^dev-(circle|rectangle|heart)-(\d+)-(dark|light|color)$/,
                );
                if (!match || Number(match[2]) < 24 || Number(match[2]) > 240) {
                  setError(customerText(locale, "failure"));
                  return;
                }
                setShape(match[1] as Shape);
                setCustomerFlow(false);
                setStandard(false);
                setPinCount(Number(match[2]));
                setMode(match[3] as "dark" | "light" | "color");
                setWidthMm(400);
                setHeightMm(400);
                setThreadMm(0.3);
                nav("create");
              }}
            />
          )}
          {customerFlow && (
            <div className="customer-entry" hidden={view !== "create"}>
              <CustomerStudio
                kitConfig={claimedKit}
                active={view === "create"}
                locale={locale}
                setLocale={setLocale}
                onExpert={() => {
                  setCustomerFlow(false);
                  setStandard(true);
                }}
                onNavigate={nav}
                onPersist={(i) => {
                  if (!loaded) return;
                  setProjects((ps) =>
                    ps.some(
                      (p) => p.instruction.sequenceHash === i.sequenceHash,
                    )
                      ? ps
                      : [
                          {
                            id: crypto.randomUUID(),
                            name: customerFlowText(locale, "result"),
                            instruction: i,
                            progress: progressFor(i),
                            edits: { ...DEFAULT_EDITS },
                          },
                          ...ps,
                        ],
                  );
                }}
                onGuide={(i) => {
                  if (!loaded) return;
                  const existing = projects.find(
                    (p) => p.instruction.sequenceHash === i.sequenceHash,
                  );
                  const p = existing ?? {
                    id: crypto.randomUUID(),
                    name: customerFlowText(locale, "result"),
                    instruction: i,
                    progress: progressFor(i),
                    edits: { ...DEFAULT_EDITS },
                  };
                  if (!existing) setProjects((ps) => [p, ...ps]);
                  open(p);
                }}
              />
            </div>
          )}
          {view === "create" && !customerFlow && (
            <>
              <details open={!standard} data-testid="expert-tools">
                <summary>{standardText(locale, "details")}</summary>
                <button
                  className="outline"
                  data-testid="create-mode"
                  onClick={() => setStandard((v) => !v)}
                >
                  {standardText(locale, standard ? "legacy" : "standard")}
                </button>
              </details>
              {standard ? (
                <Suspense fallback={<p>…</p>}>
                  <StandardKitStudio
                    locale={locale}
                    onGuide={(i) => {
                      if (!loaded) return;
                      const p: Project = {
                        id: crypto.randomUUID(),
                        name: standardText(locale, "title"),
                        instruction: i,
                        progress: progressFor(i),
                        edits: { ...DEFAULT_EDITS },
                      };
                      setProjects((ps) => [p, ...ps]);
                      open(p);
                    }}
                  />
                </Suspense>
              ) : (
                <CreateScreen context={context} />
              )}
            </>
          )}
          {view === "assemble" && <AssembleScreen context={context} />}
          {view === "library" && <LibraryScreen context={context} />}
          {view === "materials" && <MoreScreen context={context} />}
          {view === "crafts" && (
            <CraftStudio
              locale={locale}
              onPreset={(kind) => {
                chooseSubject(kind);
                setStrongSubjectFit(true);
                nav("create");
              }}
              onGuide={(i) => {
                if (!loaded) return;
                const p: Project = {
                  id: crypto.randomUUID(),
                  name: i.params.product?.text ?? t("defaultName"),
                  instruction: i,
                  progress: progressFor(i),
                  edits: { ...DEFAULT_EDITS },
                };
                setProjects((ps) => [p, ...ps]);
                open(p);
              }}
            />
          )}
        </main>
        <footer>
          <span>{storefront.brandName || PRODUCT_NAME}</span>
          <span>
            <ShieldCheck size={14} />
            {t("private")}
          </span>
        </footer>
      </div>
      <input
        type="file"
        ref={importInput}
        accept=".json,.txt"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) void doImport(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {showPrivacy && (
        <div className="modal-backdrop" onClick={() => setShowPrivacy(false)}>
          <section
            className="card modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("privacy")}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{t("privacy")}</h2>
            <p>{t("privacyText")}</p>
            <button
              className="primary"
              autoFocus
              onClick={() => setShowPrivacy(false)}
            >
              {t("clear")}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
