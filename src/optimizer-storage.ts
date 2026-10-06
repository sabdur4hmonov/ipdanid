import type { DensityCheckpoint } from "./core/density";
import type { EditParams, Instruction } from "./core/types";
export interface OptimizerRecovery {
  version: "iprasm.optimizer-recovery/1";
  checkpoint: DensityCheckpoint;
  seed: Instruction;
  pixels: Uint8Array;
  lines: number;
  strategy: "physical";
  edits: EditParams;
  name: string;
}
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("iprasm.optimizer-recovery", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("stages");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function readOptimizerRecovery(): Promise<
  OptimizerRecovery | undefined
> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction("stages", "readonly")
        .objectStore("stages")
        .get("physical");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
export async function saveOptimizerRecovery(value: OptimizerRecovery) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("stages", "readwrite");
      t.objectStore("stages").put(value, "physical");
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
export async function clearOptimizerRecovery() {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction("stages", "readwrite");
      t.objectStore("stages").delete("physical");
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}
