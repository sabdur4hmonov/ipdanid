import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
import type { Project } from "./core/types";
import { validateInstruction } from "./core/validation";
const KEY = "iprasm.projects.v1";
let lastSnapshot: string | null | undefined;
export class StorageConflictError extends Error {}
const get = async () =>
  Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: KEY })).value
    : localStorage.getItem(KEY);
export async function readProjects(): Promise<Project[]> {
  const raw = await get();
  if (!raw) {
    lastSnapshot = null;
    return [];
  }
  if (raw.length > 12_000_000) throw new Error("Library storage exceeds limit");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Invalid saved library");
  for (const p of data) {
    if (
      typeof p.id !== "string" ||
      typeof p.name !== "string" ||
      p.name.length > 100 ||
      !p.edits
    )
      throw new Error("Invalid saved project metadata");
    await validateInstruction(p.instruction);
    if (
      p.progress.sequenceHash !== p.instruction.sequenceHash ||
      !Number.isInteger(p.progress.confirmed) ||
      p.progress.confirmed < 0 ||
      p.progress.confirmed > p.instruction.metrics.lines
    )
      throw new Error("Invalid saved progress");
  }
  lastSnapshot = raw;
  return data;
}
let queue = Promise.resolve();
export function writeProjects(projects: Project[]): Promise<void> {
  const value = JSON.stringify(projects);
  queue = queue
    .catch(() => {})
    .then(async () => {
      const write = async () => {
        const stored = await get();
        if (lastSnapshot === undefined || stored !== lastSnapshot)
          throw new StorageConflictError(
            "Library changed in another tab. Export your current project, then reload the saved library.",
          );
        if (Capacitor.isNativePlatform())
          await Preferences.set({ key: KEY, value });
        else localStorage.setItem(KEY, value);
        lastSnapshot = value;
      };
      if (!Capacitor.isNativePlatform() && navigator.locks)
        await navigator.locks.request("iprasm-library", write);
      else await write();
    });
  return queue;
}
