import { customerApi as api, customerCacheNamespace } from "./customer-api";
import {
  checkedPendingPhoto,
  type PendingPhotoBackup,
} from "./photo-backup-client";
import { RecoveryOrder } from "./recovery-order";
const order = new RecoveryOrder();
let epoch = 0,
  previousAccount = api.session?.id;
const keyFor = (account: string) => customerCacheNamespace + ":" + account;
async function disk<T>(
  key: string,
  fn: (store: IDBObjectStore, old: PendingPhotoBackup | undefined) => T,
  valid: () => boolean = () => true,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("iprasm.private-photo-pending", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("pending");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("pending", "readwrite"),
        store = tx.objectStore("pending"),
        get = store.get(key);
      let result: T, error: unknown;
      get.onsuccess = () => {
        try {
          if (!valid()) throw Error("photo-backup/session");
          result = fn(store, get.result);
        } catch (e) {
          error = e;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () =>
        reject(error ?? tx.error ?? Error("photo-backup/disk"));
    });
  } finally {
    db.close();
  }
}
function clearAccount(account?: string) {
  if (!account) return Promise.resolve();
  return order.run(() =>
    disk(keyFor(account), (s) => {
      s.delete(keyFor(account));
    }),
  );
}
export function clearPrivatePhotoRetries(account: string) {
  ++epoch;
  return clearAccount(account);
}
// Module-level cleanup survives closing the panel. No token is persisted with pixels.
api.sessionChanged.add(() => {
  ++epoch;
  const old = previousAccount;
  previousAccount = api.session?.id;
  if (old && old !== previousAccount) void clearAccount(old).catch(() => {});
});
api.beforeLogout.add(async () => {
  ++epoch;
  await clearAccount(api.session?.id);
});
export function photoBackupSession() {
  const session = api.session,
    capturedEpoch = epoch;
  if (!session) return undefined;
  previousAccount ??= session.id;
  const key = keyFor(session.id),
    valid = () =>
      epoch === capturedEpoch &&
      api.session?.token === session.token &&
      api.session?.id === session.id;
  return {
    token: session.token,
    valid,
    read: () =>
      order.run(async () => {
        const p = await disk(key, (_s, old) => old, valid);
        if (!p) return undefined;
        try {
          return await checkedPendingPhoto(p);
        } catch {
          await disk(
            key,
            (s) => {
              s.delete(key);
            },
            valid,
          );
          return undefined;
        }
      }),
    retain: (pending: PendingPhotoBackup) => {
      const p = structuredClone(pending);
      return order.run(async () => {
        await checkedPendingPhoto(p);
        await disk(
          key,
          (s, old) => {
            if (old) throw Error("photo-backup/pending-exists");
            s.put(p, key);
          },
          valid,
        );
      });
    },
    discard: (requestKey: string) =>
      order.run(() =>
        disk(
          key,
          (s, old) => {
            if (old?.body.requestKey === requestKey) s.delete(key);
          },
          valid,
        ),
      ),
  };
}
