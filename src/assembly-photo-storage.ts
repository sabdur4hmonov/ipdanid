import {
  BOARD_PHOTO_TTL,
  boardPhotoCapacity,
  boardPhotoMetadata,
  boardPhotoScopeKey,
  validateBoardPhoto,
  type BoardPhoto,
  type BoardPhotoScope,
} from "./assembly-photo";
const NAME = "iprasm.board-checkpoints";
async function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let abandoned = false;
    const r = indexedDB.open(NAME, 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("photos", { keyPath: "id" });
    r.onblocked = () => {
      abandoned = true;
      reject(Error("board-photo/storage"));
    };
    r.onerror = () => reject(r.error);
    r.onsuccess = () => {
      if (abandoned) r.result.close();
      else resolve(r.result);
    };
  });
}
async function update<T>(fn: (rows: BoardPhoto[], store: IDBObjectStore) => T) {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite"),
        s = tx.objectStore("photos"),
        request = s.openCursor(),
        rows: BoardPhoto[] = [];
      let result: T, error: unknown;
      tx.oncomplete = () => resolve(result);
      tx.onerror = tx.onabort = () =>
        reject(error ?? tx.error ?? Error("board-photo/storage"));
      request.onsuccess = () => {
        try {
          const c = request.result;
          if (c) {
            if (rows.length >= 1000) throw Error("board-photo/capacity");
            boardPhotoMetadata(c.value);
            rows.push(c.value);
            c.continue();
            return;
          }
          const now = Date.now(),
            active = rows.filter((p) => now - p.createdAt < BOARD_PHOTO_TTL);
          for (const p of rows)
            if (now - p.createdAt >= BOARD_PHOTO_TTL) s.delete(p.id);
          result = fn(active, s);
        } catch (e) {
          error = e;
          tx.abort();
        }
      };
    });
  } finally {
    db.close();
  }
}
export function readBoardPhotos(scope: BoardPhotoScope) {
  boardPhotoScopeKey(scope);
  return update((rows) =>
    rows
      .filter(
        (p) =>
          p.projectId === scope.projectId &&
          p.sequenceHash === scope.sequenceHash,
      )
      .map((p) => {
        if (p.total !== scope.total) throw Error("board-photo/integrity");
        return p;
      })
      .sort((a, b) => b.createdAt - a.createdAt),
  );
}
export async function saveBoardPhoto(photo: BoardPhoto) {
  await validateBoardPhoto(photo);
  return update((rows, s) => {
    boardPhotoCapacity(rows, photo);
    s.put(photo);
  });
}
export function deleteBoardPhoto(id: string, scope: BoardPhotoScope) {
  boardPhotoScopeKey(scope);
  return update((rows, s) => {
    const p = rows.find((p) => p.id === id);
    if (
      p &&
      (p.projectId !== scope.projectId || p.sequenceHash !== scope.sequenceHash)
    )
      throw Error("board-photo/owner");
    s.delete(id);
  });
}
