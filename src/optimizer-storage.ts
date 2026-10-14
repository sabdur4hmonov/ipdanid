import type {
  DensityCheckpoint,
  DensityTuning,
  ChordExchangeSettings,
} from "./core/density";
import type { EditParams, Instruction } from "./core/types";
import { RecoveryOrder } from "./recovery-order";
const operations = new RecoveryOrder();
export interface OptimizerRecovery {
  version: "iprasm.optimizer-recovery/1";
  checkpoint?: DensityCheckpoint;
  hairCheckpoint?: import("./core/hair-cycles").HairCycleCheckpoint;
  seed?: Instruction;
  profile?: import("./core/types").MaterialProfile;
  portrait?: import("./core/types").PortraitSettings;
  subject?: import("./core/subject-plan").SubjectPlan;
  product?: import("./core/lettering-contract").LetteringProduct;
  resolution?: number;
  mode?: "dark" | "light" | "color";
  pixels: Uint8Array;
  lines: number;
  strategy:
    "physical" | "anatomy" | "basis" | "features" | "texture" | "subjects";
  headRefine?: boolean;
  hairSeed?: Instruction;
  head?: import("./core/head-importance").HeadImportance;
  anatomy?: import("./core/anatomical-importance").AnatomicalImportance;
  features?: import("./core/feature-contrast").FeatureContrastSettings;
  texture?: import("./core/local-texture").LocalTextureSettings;
  subjectObjective?: import("./core/subject-objective").SubjectObjectiveSettings;
  edits: EditParams;
  name: string;
  extension?: DensityTuning["extension"];
  totalSweeps?: number;
  exchange?: ChordExchangeSettings;
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
  return operations.run(readRecovery);
}
async function readRecovery(): Promise<OptimizerRecovery | undefined> {
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
  return operations.run(() => writeRecovery(value));
}
async function writeRecovery(value: OptimizerRecovery) {
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
  return operations.run(() => deleteRecovery());
}
async function deleteRecovery() {
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
