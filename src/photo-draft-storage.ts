import {
  decodePhotoDraft,
  encodePhotoDraft,
  type PhotoDraft,
} from "./photo-draft";
import { RecoveryOrder } from "./recovery-order";
const order = new RecoveryOrder();
// One explicit working copy. Never silently evict an unrelated project/photo.
const NAME = "iprasm.editable-photo";
async function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("draft");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
) {
  const d = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = d.transaction("draft", mode),
        r = fn(t.objectStore("draft"));
      t.oncomplete = () => resolve(r.result);
      t.onabort = () =>
        reject(t.error ?? r.error ?? Error("photo-draft/storage"));
      t.onerror = () =>
        reject(t.error ?? r.error ?? Error("photo-draft/storage"));
    });
  } finally {
    d.close();
  }
}
export function savePhotoDraft(draft: PhotoDraft) {
  // Capture synchronously before a previous disk operation finishes.
  const copy = structuredClone(draft);
  return order.run(async () => {
    const bytes = await encodePhotoDraft(copy);
    await transaction("readwrite", (s) => s.put(bytes, "current"));
  });
}
export function readPhotoDraft() {
  return order.run(async () => {
    const bytes = await transaction("readonly", (s) => s.get("current"));
    if (!bytes) return undefined;
    try {
      return await decodePhotoDraft(bytes);
    } catch {
      await transaction("readwrite", (s) => s.delete("current"));
      throw Error("photo-draft/invalid-or-expired");
    }
  });
}
export function deletePhotoDraft() {
  return order.run(async () => {
    await transaction("readwrite", (s) => s.clear());
  });
}
