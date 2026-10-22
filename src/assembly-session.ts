import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { Project } from "./core/types";
const KEY = "iprasm.assembly-session.v1";
export type AssemblySession = {
  version: 1;
  projectId: string;
  sequenceHash: string;
  current: number;
  pace: number;
  updatedAt?: number;
  resting?: boolean;
};
export function validAssemblySession(
  raw: unknown,
  projects: Project[],
): AssemblySession | undefined {
  if (!raw || typeof raw !== "object") return;
  const s = raw as AssemblySession,
    p = projects.find((p) => p.id === s.projectId && !p.deletedAt);
  if (
    (s.resting !== undefined && typeof s.resting !== "boolean") ||
    s.version !== 1 ||
    !p ||
    s.sequenceHash !== p.instruction.sequenceHash ||
    !Number.isInteger(s.current) ||
    s.current < 1 ||
    s.current > p.instruction.metrics.lines ||
    !Number.isFinite(s.pace) ||
    s.pace < 2 ||
    s.pace > 120 ||
    (s.updatedAt !== undefined &&
      (!Number.isSafeInteger(s.updatedAt) || s.updatedAt < 0))
  )
    return;
  return {
    version: 1,
    projectId: s.projectId,
    sequenceHash: s.sequenceHash,
    current: s.current,
    pace: s.pace,
    ...(s.resting !== undefined ? { resting: s.resting } : {}),
    ...(s.updatedAt !== undefined ? { updatedAt: s.updatedAt } : {}),
  };
}
export async function readAssemblySession() {
  try {
    const raw = Capacitor.isNativePlatform()
      ? (await Preferences.get({ key: KEY })).value
      : localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
let queue = Promise.resolve();
export function writeAssemblySession(s: AssemblySession) {
  const snapshot = { ...s, updatedAt: Date.now() };
  queue = queue
    .catch(() => {})
    .then(async () => {
      const value = JSON.stringify(snapshot);
      if (Capacitor.isNativePlatform())
        await Preferences.set({ key: KEY, value });
      else localStorage.setItem(KEY, value);
    });
  return queue;
}
