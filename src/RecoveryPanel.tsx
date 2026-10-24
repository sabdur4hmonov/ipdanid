import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { Instruction, Locale, Project } from "./core/types";
import type { RecoverySnapshot, RecoveryWrite } from "./recovery-types";
import {
  customerApi as api,
  customerCacheNamespace,
  ApiError,
} from "./customer-api";
import { readAssemblySession } from "./assembly-session";
import { checkedRecovery, recoveryFor } from "./recovery-client";
import { validateInstruction } from "./core/validation";
import { validateRecoveryWrite } from "./recovery-contract";
import { recoveryText } from "./recovery-i18n";

type Remote = { id: string; sequence_hash: string; name: string };
type Pending = { body: RecoveryWrite; createdAt: number };
type Cache = { pending: Record<string, Pending>; last: Record<string, string> };
let diskQueue = Promise.resolve();
const enqueue = (fn: () => Promise<void>) =>
  (diskQueue = diskQueue.catch(() => {}).then(fn));
// Retain cleanup when the customer switches away from the Sync panel.
let privacyEpoch = 0;
api.sessionChanged.add(() => {
  ++privacyEpoch;
});
api.beforeLogout.add(async () => {
  if (api.session) await clearRecoveryAccount(api.session.id);
});
export function clearRecoveryAccount(account: string) {
  ++privacyEpoch;
  const key = customerCacheNamespace + ":recovery:" + account;
  return enqueue(async () => {
    if (Capacitor.isNativePlatform()) await Preferences.remove({ key });
    else localStorage.removeItem(key);
  });
}
export default function RecoveryPanel({
  locale,
  projects,
  remote,
  onRestore,
}: {
  locale: Locale;
  projects: Project[];
  remote: Remote[];
  onRestore: (
    guide: Instruction,
    snapshot: RecoverySnapshot,
    valid: () => boolean,
  ) => Promise<void>;
}) {
  const token = api.session?.token,
    account = api.session?.id;
  const key = customerCacheNamespace + ":recovery:" + account;
  const privacy = useRef(privacyEpoch);
  const mounted = useRef(false),
    generation = useRef(0),
    working = useRef(false),
    cache = useRef<Cache>({ pending: {}, last: {} });
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [stored, setStored] = useState<Cache>(cache.current),
    [snapshots, setSnapshots] = useState<Record<string, RecoverySnapshot>>({});
  const t = (key: Parameters<typeof recoveryText>[1]) =>
    recoveryText(locale, key);
  const valid = () =>
    mounted.current &&
    privacy.current === privacyEpoch &&
    !!token &&
    api.session?.token === token &&
    api.session.id === account;
  async function persist(next: Cache, guard = valid) {
    await enqueue(async () => {
      if (!guard()) return;
      const value = JSON.stringify(next);
      if (Capacitor.isNativePlatform()) await Preferences.set({ key, value });
      else localStorage.setItem(key, value);
    });
    if (guard()) {
      cache.current = next;
      setStored(next);
    }
  }
  useEffect(() => {
    mounted.current = true;
    const epoch = ++generation.current;
    const live = () => valid() && generation.current === epoch;
    const invalidate = () => {
      ++generation.current;
      setReady(false);
      setNotice("");
      setSnapshots({});
    };
    api.sessionChanged.add(invalidate);
    void (async () => {
      const raw = Capacitor.isNativePlatform()
        ? (await Preferences.get({ key })).value
        : localStorage.getItem(key);
      if (!live()) return;
      const next: Cache = { pending: {}, last: {} };
      if (raw && raw.length <= 1_000_000) {
        try {
          const data = JSON.parse(raw);
          for (const r of remote) {
            const p = data.pending?.[r.id],
              local = projects.find(
                (p) =>
                  p.instruction.sequenceHash === r.sequence_hash &&
                  !p.deletedAt,
              );
            if (
              p &&
              local &&
              Number.isSafeInteger(p.createdAt) &&
              p.createdAt <= Date.now() &&
              p.createdAt > Date.now() - 7 * 86400000
            )
              try {
                next.pending[r.id] = {
                  body: validateRecoveryWrite(
                    p.body,
                    r.sequence_hash,
                    local.instruction.metrics.lines,
                  ),
                  createdAt: p.createdAt,
                };
              } catch {}
            if (
              typeof data.last?.[r.id] === "string" &&
              Number.isFinite(Date.parse(data.last[r.id]))
            )
              next.last[r.id] = data.last[r.id];
          }
        } catch {}
      }
      await persist(next, live);
      if (live()) setReady(true);
    })().catch(() => {
      if (live()) setNotice(t("failed"));
    });
    return () => {
      mounted.current = false;
      ++generation.current;
      api.sessionChanged.delete(invalidate);
    };
  }, [token, account]);
  async function run(fn: (guard: () => boolean) => Promise<void>) {
    if (working.current || !ready || !valid()) return;
    working.current = true;
    setBusy(true);
    setNotice("");
    const epoch = generation.current;
    const guard = () => valid() && generation.current === epoch;
    try {
      await fn(guard);
    } catch (error) {
      if (guard())
        setNotice(
          t(
            error instanceof ApiError && error.status === 409
              ? "conflict"
              : "failed",
          ),
        );
    } finally {
      working.current = false;
      if (guard()) setBusy(false);
    }
  }
  async function fetchSnapshot(r: Remote, guard: () => boolean) {
    const result = await api.request<RecoverySnapshot>(
      `/instructions/${r.id}/recovery`,
      undefined,
      token,
    );
    if (guard()) setSnapshots((old) => ({ ...old, [r.id]: result }));
    return result;
  }
  async function send(r: Remote, pending: Pending, guard: () => boolean) {
    if (!guard()) return;
    const result = await api.request<RecoverySnapshot>(
      `/instructions/${r.id}/recovery`,
      pending.body,
      token,
    );
    if (!guard()) return;
    const next = {
      pending: { ...cache.current.pending },
      last: { ...cache.current.last, [r.id]: result.progress.updatedAt },
    };
    delete next.pending[r.id];
    await persist(next, guard);
    if (guard()) {
      setSnapshots((old) => ({ ...old, [r.id]: result }));
      setNotice(t("saved"));
    }
  }
  return (
    <section className="card" data-testid="account-recovery">
      <h2>{t("title")}</h2>
      <p>{t("info")}</p>
      {notice && <p role="status">{notice}</p>}
      {!remote.length && <p>{t("empty")}</p>}
      {remote.map((r) => {
        const local = projects.find(
            (p) =>
              !p.deletedAt && p.instruction.sequenceHash === r.sequence_hash,
          ),
          snapshot = snapshots[r.id],
          pending = stored.pending[r.id];
        return (
          <article
            className="customer-item"
            key={r.id}
            data-testid="recovery-project"
          >
            <h3>{local?.name ?? r.name}</h3>
            <code>{r.sequence_hash.slice(0, 16)}</code>
            {stored.last[r.id] && (
              <p>
                {t("last")}: <time>{stored.last[r.id]}</time>
              </p>
            )}
            {snapshot && (
              <p>
                {t("confirmed")}: {snapshot.progress.confirmed} · {t("cursor")}:{" "}
                {snapshot.details?.resume?.current ?? "—"}
              </p>
            )}
            {pending && <p>{t("pending")}</p>}
            <fieldset disabled={busy || !ready}>
              <div className="customer-actions">
                <button
                  className="outline"
                  onClick={() =>
                    void run(async (guard) => {
                      await fetchSnapshot(r, guard);
                    })
                  }
                >
                  {t("refresh")}
                </button>
                {pending ? (
                  <>
                    <button
                      onClick={() =>
                        void run((guard) => send(r, pending, guard))
                      }
                    >
                      {t("retry")}
                    </button>
                    <button
                      className="outline"
                      onClick={() =>
                        void run(async (guard) => {
                          const next = {
                            ...cache.current,
                            pending: { ...cache.current.pending },
                          };
                          delete next.pending[r.id];
                          await persist(next, guard);
                          await fetchSnapshot(r, guard);
                        })
                      }
                    >
                      {t("discard")}
                    </button>
                  </>
                ) : (
                  local &&
                  snapshot && (
                    <button
                      onClick={() =>
                        void run(async (guard) => {
                          const session = await readAssemblySession();
                          if (!guard()) return;
                          const pending = {
                            body: recoveryFor(
                              local,
                              snapshot.progress.revision,
                              session,
                            ),
                            createdAt: Date.now(),
                          };
                          await persist(
                            {
                              ...cache.current,
                              pending: {
                                ...cache.current.pending,
                                [r.id]: pending,
                              },
                            },
                            guard,
                          );
                          await send(r, pending, guard);
                        })
                      }
                    >
                      {t("save")}
                    </button>
                  )
                )}
                {snapshot && !pending && (
                  <button
                    className="outline"
                    onClick={() =>
                      void run(async (guard) => {
                        const guide = await validateInstruction(
                          await api.request<Instruction>(
                            `/instructions/${r.id}`,
                            undefined,
                            token,
                          ),
                        );
                        if (!guard()) return;
                        const latest = checkedRecovery(
                          await fetchSnapshot(r, guard),
                          guide,
                        );
                        if (guard()) await onRestore(guide, latest, guard);
                      })
                    }
                  >
                    {t("restore")}
                  </button>
                )}
              </div>
            </fieldset>
          </article>
        );
      })}
    </section>
  );
}
