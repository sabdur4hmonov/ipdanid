import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import type { PhotoDraft } from "./photo-draft";
import type { PhotoBackupRead, PhotoBackupStatus } from "./photo-backup-types";
import {
  checkedPhotoRead,
  checkedPhotoStatus,
  photoUpload,
  type PendingPhotoBackup,
} from "./photo-backup-client";
import { photoBackupSession } from "./photo-backup-storage";
import { customerApi as api, ApiError } from "./customer-api";
import { photoBackupText } from "./photo-backup-i18n";
export default function PrivatePhotoBackupPanel({
  locale,
  capture,
  restore,
}: {
  locale: Locale;
  capture?: () => PhotoDraft;
  restore: (d: PhotoDraft) => void;
}) {
  const [session, setSession] =
      useState<ReturnType<typeof photoBackupSession>>(),
    live = useRef(false),
    working = useRef(false);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false),
    [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState<PhotoBackupStatus>(),
    [pending, setPending] = useState<PendingPhotoBackup>(),
    [notice, setNotice] = useState("");
  const t = (k: Parameters<typeof photoBackupText>[1]) =>
    photoBackupText(locale, k);
  const valid = () => live.current && !!session?.valid();
  useEffect(() => {
    let mounted = true;
    void api
      .restore()
      .then(() => {
        if (mounted) setSession(photoBackupSession());
      })
      .catch(() => {
        if (mounted) setNotice(t("failed"));
      });
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    live.current = true;
    const invalidate = () => {
      setReady(false);
      setPending(undefined);
      setStatus(undefined);
      setConsent(false);
      setConfirm(false);
      setBusy(false);
      setNotice(t("login"));
      setSession(photoBackupSession());
    };
    api.sessionChanged.add(invalidate);
    void session
      ?.read()
      .then((p) => {
        if (valid()) {
          setPending(p);
          setReady(true);
        }
      })
      .catch(() => {
        if (valid()) setNotice(t("failed"));
      });
    return () => {
      live.current = false;
      api.sessionChanged.delete(invalidate);
    };
  }, [session]);
  async function run(action: () => Promise<void>) {
    if (working.current || !ready || !valid()) return;
    working.current = true;
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (e) {
      if (valid())
        setNotice(
          t(e instanceof ApiError && e.status === 409 ? "conflict" : "failed"),
        );
    } finally {
      working.current = false;
      if (valid()) setBusy(false);
    }
  }
  async function send(p: PendingPhotoBackup) {
    if (!valid()) return;
    const result = checkedPhotoStatus(
      await api.request<PhotoBackupStatus>(
        p.action === "save" ? "/photo-backup" : "/photo-backup/delete",
        p.body,
        session!.token,
      ),
    );
    if (!valid()) return;
    await session!.discard(p.body.requestKey);
    if (valid()) {
      setPending(undefined);
      setStatus(result);
      setConfirm(false);
      setConsent(false);
      setNotice(t(p.action === "save" ? "saved" : "removed"));
    }
  }
  async function change(action: "save" | "delete") {
    if (
      !status ||
      pending ||
      !session ||
      (action === "save" ? !consent || !capture : !confirm)
    )
      return;
    const body =
      action === "save"
        ? await photoUpload(capture!(), status.revision)
        : {
            expectedRevision: status.revision,
            requestKey: crypto.randomUUID(),
          };
    if (!valid()) return;
    const p = { action, body, createdAt: Date.now() };
    await session.retain(p);
    if (!valid()) return;
    setPending(p);
    await send(p);
  }
  return (
    <section data-testid="private-photo-backup">
      <h3>{t("title")}</h3>
      <p>{t("info")}</p>
      {!session && <p>{t("login")}</p>}
      <div style={{ display: "grid", gap: 12 }}>
        <button
          disabled={!ready || busy}
          onClick={() =>
            void run(async () => {
              const s = checkedPhotoStatus(
                await api.request<PhotoBackupStatus>(
                  "/photo-backup",
                  undefined,
                  session!.token,
                ),
              );
              if (valid()) setStatus(s);
            })
          }
        >
          {t("refresh")}
        </button>
        {status && (
          <p data-testid="photo-backup-status">
            {status.available
              ? t("available") +
                ": " +
                new Date(status.expiresAt!).toLocaleDateString()
              : t("empty")}
          </p>
        )}
        {pending ? (
          <>
            <p>{t("pending")}</p>
            <button
              disabled={!ready || busy}
              onClick={() => void run(() => send(pending))}
            >
              {t("retry")}
            </button>
            <button
              disabled={!ready || busy}
              onClick={() =>
                void run(async () => {
                  await session!.discard(pending.body.requestKey);
                  if (valid()) {
                    setPending(undefined);
                    setStatus(undefined);
                  }
                })
              }
            >
              {t("discard")}
            </button>
          </>
        ) : (
          <>
            <label>
              <input
                type="checkbox"
                checked={consent}
                disabled={!ready || busy}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {t("consent")}
            </label>
            <button
              disabled={!ready || busy || !status || !capture || !consent}
              onClick={() => void run(() => change("save"))}
            >
              {t("save")}
            </button>
            <button
              disabled={!ready || busy || !status?.available}
              onClick={() =>
                void run(async () => {
                  const result = await api.request<PhotoBackupRead>(
                      "/photo-backup/read",
                      undefined,
                      session!.token,
                    ),
                    draft = await checkedPhotoRead(result);
                  if (valid()) restore(draft);
                })
              }
            >
              {t("open")}
            </button>
            <label>
              <input
                type="checkbox"
                checked={confirm}
                disabled={!ready || busy || !status?.available}
                onChange={(e) => setConfirm(e.target.checked)}
              />
              {t("confirm")}
            </label>
            <button
              disabled={!ready || busy || !status?.available || !confirm}
              onClick={() => void run(() => change("delete"))}
            >
              {t("remove")}
            </button>
          </>
        )}
      </div>
      <p role="status">{notice}</p>
    </section>
  );
}
