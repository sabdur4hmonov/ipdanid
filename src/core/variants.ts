import type { Instruction, EditParams } from "./types";
export interface Variant {
  instruction: Instruction;
  name: string;
  edits: EditParams;
}
export interface Variants {
  items: Variant[];
  selectedId?: string;
}
export function appendVariants(state: Variants, incoming: Variant[]): Variants {
  if (!incoming.length) return state;
  const items = [...state.items, ...incoming].slice(-6);
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
