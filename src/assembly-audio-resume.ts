import type { AssemblySession } from "./assembly-session";
export function newerAudioPosition(
  saved: AssemblySession,
  value: unknown,
  total: number,
  now = Date.now(),
): number | undefined {
  // Explicit customer rest is authoritative, including a late native audio checkpoint.
  if (saved.resting || !value || typeof value !== "object") return;
  const c = value as {
    projectId?: string;
    sequenceHash?: string;
    current?: number;
    updatedAt?: number;
  };
  if (
    c.projectId !== saved.projectId ||
    c.sequenceHash !== saved.sequenceHash ||
    !Number.isInteger(c.current) ||
    c.current! < 1 ||
    c.current! > total ||
    !Number.isSafeInteger(c.updatedAt) ||
    c.updatedAt! <= (saved.updatedAt ?? 0) ||
    c.updatedAt! > now + 60000 ||
    c.updatedAt! < now - 7 * 86400000
  )
    return;
  return c.current;
}
