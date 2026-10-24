import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import { customerApi as api } from "./customer-api";
import {
  eraseCurrentAccount,
  finishErasureCleanup,
  pendingErasureCleanup,
} from "./account-erasure-client";
import { erasureText } from "./account-erasure-i18n";
type Review = {
  version: "account-erasure/1";
  credential: "password" | "kit-code";
  activeOrders: number;
};
export default function AccountErasurePanel({
  locale,
  connected,
}: {
  locale: Locale;
  connected: boolean;
}) {
  const t = (k: Parameters<typeof erasureText>[1]) => erasureText(locale, k),
    live = useRef(true);
  const [review, setReview] = useState<Review>(),
    [credential, setCredential] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [pending, setPending] = useState<string[]>(() => pendingErasureCleanup());
  useEffect(() => {
    live.current = true;
    const reset = () => {
      setReview(undefined);
      setCredential("");
      setConfirm(false);
    };
    api.sessionChanged.add(reset);
    return () => {
      live.current = false;
      api.sessionChanged.delete(reset);
    };
  }, []);
  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch {
      if (live.current) setNotice(t("failed"));
    } finally {
      if (live.current) {
        setBusy(false);
        setPending(pendingErasureCleanup());
      }
    }
  }
  // Keep the open disclosure mounted while revoking the current session.
  // Otherwise the session notification briefly renders null, closes it and
  // hides the deletion result and cache-retry action from the customer.
  if (!connected && !pending.length && !notice && !busy) return null;
  return (
    <details className="card" data-testid="account-erasure">
      <summary>{t("title")}</summary>
      <p>{t("info")}</p>
      <p>{t("local")}</p>
      {connected && (
        <>
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const token = api.session?.token;
                const r = await api.request<Review>("/account/erasure");
                if (
                  live.current &&
                  token === api.session?.token &&
                  r.version === "account-erasure/1"
                )
                  setReview(r);
              })
            }
          >
            {t("review")}
          </button>
          {review && (
            <fieldset disabled={busy}>
              <p>
                {t("active")}: {review.activeOrders}
              </p>
              <label>
                {t(review.credential === "password" ? "password" : "kit")}
                <input
                  type="password"
                  autoComplete="off"
                  maxLength={256}
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={confirm}
                  onChange={(e) => setConfirm(e.target.checked)}
                />
                {t("confirm")}
              </label>
              <button
                disabled={!confirm || !credential}
                onClick={() =>
                  void run(async () => {
                    const result = await eraseCurrentAccount(credential);
                    if (live.current) {
                      setCredential("");
                      setNotice(
                        t(result.localClean ? "done" : "cleanupFailed"),
                      );
                      setReview(undefined);
                      setConfirm(false);
                    }
                  })
                }
              >
                {t("remove")}
              </button>
            </fieldset>
          )}
        </>
      )}
      {!!pending.length && (
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              for (const account of pending)
                await finishErasureCleanup(account);
              if (live.current) setNotice(t("clean"));
            })
          }
        >
          {t("cleanup")}
        </button>
      )}
      <p role="status">{notice}</p>
    </details>
  );
}
