import type { Instruction, EditParams } from "./types";
export interface Variant {
  instruction: Instruction;
  name: string;
  edits: EditParams;
  // Ephemeral source association; never stores photographs in exported guides.
  photoId?: string;
}
export interface Variants {
  items: Variant[];
  selectedId?: string;
}
export function appendVariants(state: Variants, incoming: Variant[]): Variants {
  if (!incoming.length) return state;
  // Immutable comparison references must survive long staged experiments.
  const items = [...state.items, ...incoming].filter(
    (v, index, all) =>
      all.findIndex((other) => other.instruction.id === v.instruction.id) ===
      index,
  );
  return { items, selectedId: incoming[incoming.length - 1].instruction.id };
}
// Invalidate on cancellation/photo change. Keep the job active until validation has finished.
export class GenerationJobs {
  private serial = 0;
  begin() {
    return ++this.serial;
  }
  cancel() {
    ++this.serial;
  }
  accepts(jobId: number) {
    return jobId === this.serial;
  }
}
