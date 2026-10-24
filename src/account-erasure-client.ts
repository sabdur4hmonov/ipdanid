import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { customerApi as api, customerCacheNamespace } from "./customer-api";
import { clearPrivatePhotoRetries } from "./photo-backup-storage";
import { clearRecoveryAccount } from "./RecoveryPanel";
import { clearDigitalPendingAccount } from "./digital-pending";
import { clearAccountReceipts } from "./build-access";
import { disablePush } from "./push-client";
const prefix = customerCacheNamespace + ":erase-cleanup:";
const valid = (id: string) => /^[a-f0-9-]{36}$/.test(id);
export function pendingErasureCleanup() {
  return Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix) && valid(k.slice(prefix.length)))
    .map((k) => k.slice(prefix.length));
}
async function remove(key: string) {
  if (Capacitor.isNativePlatform()) await Preferences.remove({ key });
  else localStorage.removeItem(key);
}
export async function finishErasureCleanup(account: string) {
  if (!valid(account)) throw Error("erasure/account");
  if (api.session?.id === account) {
    try {
      await api.logout();
    } catch {
      if (api.session?.id === account) await api.retain(null);
    }
  }
  // Explicit account keys only. Device-owned artwork/drafts are kept separately.
  const cleanup = [
    clearPrivatePhotoRetries(account),
    clearRecoveryAccount(account),
    clearDigitalPendingAccount(account),
    clearAccountReceipts(account),
  ];
  if (!api.session || api.session.id === account) cleanup.push(disablePush());
  const results = await Promise.allSettled(cleanup);
  await remove(customerCacheNamespace + ":checkout:" + account);
  if (results.some((r) => r.status === "rejected"))
    throw Error("erasure/local-cleanup");
  localStorage.removeItem(prefix + account);
}
export async function eraseCurrentAccount(credential: string) {
  const session = api.session;
  if (!session) throw Error("erasure/login");
  // Persist only an opaque cleanup marker, never the password or photo.
  // Before sending: inability to retain recovery must prevent an irreversible request.
  localStorage.setItem(prefix + session.id, "requested");
  let erased = false;
  try {
    const result = await api.request<{ erased: boolean }>(
      "/account/erasure",
      { confirm: "erase-account/1", credential },
      session.token,
    );
    if (result.erased !== true) throw Error("erasure/response");
    erased = true;
    if (api.session?.token === session.token) {
      // Hooks capture the old account synchronously; retaining null fences late responses.
      const hooks = Promise.allSettled(
        [...api.beforeLogout].map((fn) => fn()),
      );
      await api.retain(null);
      await hooks;
    }
    await finishErasureCleanup(session.id);
    return { erased: true, localClean: true };
  } catch (error) {
    // A known credential/validation rejection did not delete the server account.
    if (
      !erased &&
      typeof error === "object" &&
      error &&
      "status" in error &&
      [400, 403, 429].includes(Number(error.status))
    )
      localStorage.removeItem(prefix + session.id);
    if (erased) return { erased: true, localClean: false };
    throw error;
  }
}
