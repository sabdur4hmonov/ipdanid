import { useEffect, useRef, useState } from "react";
import type { Locale } from "./core/types";
import type { PhotoDraft } from "./photo-draft";
import {
  savePhotoDraft,
  readPhotoDraft,
  deletePhotoDraft,
} from "./photo-draft-storage";
import { photoDraftText } from "./photo-draft-i18n";
import PrivatePhotoBackupPanel from "./PrivatePhotoBackupPanel";
export default function PhotoDraftPanel({
  locale,
  capture,
  restore,
  close,
}: {
  locale: Locale;
  capture?: () => PhotoDraft;
  restore: (d: PhotoDraft) => void;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    live = useRef(false);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const t = (k: Parameters<typeof photoDraftText>[1]) =>
    photoDraftText(locale, k);
  useEffect(() => {
    live.current = true;
    dialog.current?.showModal();
    return () => {
      live.current = false;
    };
  }, []);
  async function run(action: "save" | "open" | "remove") {
    setBusy(true);
    setNotice("");
    try {
      if (action === "save") {
        if (!capture) return;
        await savePhotoDraft(capture());
        if (live.current) setNotice(t("saved"));
      }
      if (action === "remove") {
        await deletePhotoDraft();
        if (live.current) setNotice(t("removed"));
      }
      if (action === "open") {
        const d = await readPhotoDraft();
        if (live.current) {
          if (d) {
            restore(d);
            close();
          } else setNotice(t("empty"));
        }
      }
    } catch {
      if (live.current) setNotice(t("failed"));
    } finally {
      if (live.current) setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      onCancel={close}
      data-testid="photo-draft-panel"
      aria-label={t("title")}
      style={{ maxWidth: "min(32rem, calc(100vw - 2rem))" }}
    >
      <h2>{t("title")}</h2>
      <p>{t("info")}</p>
      <div style={{ display: "grid", gap: 12 }}>
        <button disabled={busy || !capture} onClick={() => void run("save")}>
          {t("save")}
        </button>
        <button disabled={busy} onClick={() => void run("open")}>
          {t("open")}
        </button>
        <button disabled={busy} onClick={() => void run("remove")}>
          {t("remove")}
        </button>
        <button onClick={close}>{t("close")}</button>
      </div>
      <p role="status" data-testid="local-photo-draft-status">
        {notice}
      </p>
      <PrivatePhotoBackupPanel
        locale={locale}
        capture={capture}
        restore={(d) => {
          restore(d);
          close();
        }}
      />
    </dialog>
  );
}
