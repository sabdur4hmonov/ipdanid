import { hash } from "./core/engine";
import type {
  EditParams,
  Instruction,
  MaterialProfile,
  PortraitSettings,
} from "./core/types";
import type { GenerationStrategy } from "./core/generation-strategy";
import type { OptimizerRecovery } from "./optimizer-storage";
import { RecoveryOrder } from "./recovery-order";
import { validSubjectPlan } from "./core/subject-plan";
export interface LocalGenerationInput {
  version: "iprasm.local-input/1";
  recipeHash: string;
  recipe: {
    targetHash: string;
    preparedRevision: string;
    edits: EditParams;
    resolution: number;
    profile: MaterialProfile;
    portrait?: PortraitSettings;
    subject?: import("./core/subject-plan").SubjectPlan;
    mode: Instruction["params"]["mode"];
    lines: number;
    strategy: GenerationStrategy;
    objective: unknown;
  };
  pixels: Uint8Array;
}
const order = new RecoveryOrder();
async function db() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("iprasm.local-generation-inputs", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("inputs", { keyPath: "sequenceHash" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function sealGenerationInput(
  recipe: LocalGenerationInput["recipe"],
  pixels: Uint8Array,
): Promise<LocalGenerationInput> {
  const copy = structuredClone(recipe),
    bytes = pixels.slice();
  if (
    bytes.length !== copy.resolution ** 2 * 3 ||
    (await hash(bytes)) !== copy.targetHash
  )
    throw Error("Local target integrity mismatch");
  return {
    version: "iprasm.local-input/1",
    recipe: copy,
    recipeHash: await hash(copy),
    pixels: bytes,
  };
}
export async function validateLocalInput(
  value: LocalGenerationInput,
  i: Instruction,
) {
  if (
    value.version !== "iprasm.local-input/1" ||
    (await hash(value.recipe)) !== value.recipeHash ||
    (await hash(value.pixels)) !== value.recipe.targetHash ||
    value.recipe.targetHash !== i.imageHash ||
    value.recipe.resolution !== i.params.resolution ||
    value.pixels.length !== i.params.resolution ** 2 * 3 ||
    JSON.stringify(value.recipe.profile) !== JSON.stringify(i.profile) ||
    JSON.stringify(value.recipe.portrait) !==
      JSON.stringify(i.params.portrait) ||
    JSON.stringify(value.recipe.subject) !== JSON.stringify(i.params.subject) ||
    value.recipe.mode !== i.params.mode ||
    value.recipe.lines !== i.params.requestedLines ||
    JSON.stringify(value.recipe.objective) !==
      JSON.stringify(i.params.optimization)
  )
    throw Error("Local target integrity mismatch");
  if (value.recipe.subject !== undefined)
    validSubjectPlan(value.recipe.subject, value.recipe.portrait);
  return structuredClone(value);
}
export async function readGenerationInput(
  i: Instruction,
): Promise<
  { input: LocalGenerationInput; fit?: OptimizerRecovery } | undefined
> {
  return order.run(async () => {
    const d = await db();
    try {
      const row: any = await new Promise((resolve, reject) => {
        const r = d
          .transaction("inputs")
          .objectStore("inputs")
          .get(i.sequenceHash);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (!row) return undefined;
      return { input: await validateLocalInput(row.input, i), fit: row.fit };
    } finally {
      d.close();
    }
  });
}
export async function saveGenerationInput(
  i: Instruction,
  input: LocalGenerationInput,
  fit?: OptimizerRecovery,
) {
  await validateLocalInput(input, i);
  // Refuse exhausted storage instead of silently evicting another user's recipe/state.
  return order.run(async () => {
    const d = await db();
    try {
      await new Promise<void>((resolve, reject) => {
        const t = d.transaction("inputs", "readwrite"),
          store = t.objectStore("inputs"),
          r = store.getAll();
        r.onsuccess = () => {
          try {
            const rows = r.result.filter(
              (row) => row.sequenceHash !== i.sequenceHash,
            );
            const value = {
              sequenceHash: i.sequenceHash,
              input: structuredClone(input),
              fit: fit ? structuredClone(fit) : undefined,
            };
            const size =
              rows.reduce((sum, row) => sum + JSON.stringify(row).length, 0) +
              JSON.stringify(value).length;
            if (rows.length >= 32 || size > 64 * 1024 * 1024)
              throw Error("Local generation input storage is full");
            store.put(value);
          } catch (e) {
            reject(e);
            t.abort();
          }
        };
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error ?? Error("Local input write aborted"));
      });
    } finally {
      d.close();
    }
  });
}
export async function deleteGenerationInput(sequenceHash: string) {
  return order.run(async () => {
    const d = await db();
    try {
      await new Promise<void>((resolve, reject) => {
        const t = d.transaction("inputs", "readwrite");
        t.objectStore("inputs").delete(sequenceHash);
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      });
    } finally {
      d.close();
    }
  });
}
