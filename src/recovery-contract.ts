import type { RecoveryWrite } from "./recovery-types";

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, names: string[]) {
  return Object.keys(value).sort().join() === [...names].sort().join();
}
function text(value: unknown, max: number, empty = false): value is string {
  return (
    typeof value === "string" &&
    value.length <= max &&
    (empty || !!value.trim()) &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}
function step(value: unknown, max: number, min = 1): value is number {
  return (
    Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max
  );
}
export function validateRecoveryWrite(
  value: unknown,
  hash: string,
  lines: number,
): RecoveryWrite {
  if (
    !object(value) ||
    !keys(value, [
      "sequenceHash",
      "confirmed",
      "expectedRevision",
      "requestKey",
      "resume",
      "library",
    ]) ||
    value.sequenceHash !== hash ||
    !step(value.confirmed, lines, 0) ||
    !step(value.expectedRevision, Number.MAX_SAFE_INTEGER - 1, 0) ||
    typeof value.requestKey !== "string" ||
    !/^[a-zA-Z0-9_-]{16,80}$/.test(value.requestKey)
  )
    throw new Error("Invalid recovery data");
  const r = value.resume,
    l = value.library;
  if (
    r !== null &&
    (!object(r) ||
      !keys(r, ["current", "pace", "resting"]) ||
      !step(r.current, lines) ||
      typeof r.pace !== "number" ||
      !Number.isFinite(r.pace) ||
      r.pace < 2 ||
      r.pace > 120 ||
      typeof r.resting !== "boolean")
  )
    throw new Error("Invalid recovery position");
  if (
    !object(l) ||
    !keys(l, ["name", "folder", "bookmarks"]) ||
    !text(l.name, 100) ||
    !text(l.folder, 50, true) ||
    !Array.isArray(l.bookmarks) ||
    l.bookmarks.length > 50 ||
    l.bookmarks.some(
      (b) =>
        !object(b) ||
        !keys(b, ["step", "label"]) ||
        !step(b.step, lines) ||
        !text(b.label, 80, true),
    ) ||
    new Set(l.bookmarks.map((b) => b.step)).size !== l.bookmarks.length
  )
    throw new Error("Invalid recovery library");
  // Canonical ordering makes identical retries independent of JSON key order.
  return {
    sequenceHash: hash,
    confirmed: value.confirmed,
    expectedRevision: value.expectedRevision,
    requestKey: value.requestKey,
    resume:
      r === null
        ? null
        : {
            current: Number(r.current),
            pace: Number(r.pace),
            resting: Boolean(r.resting),
          },
    library: {
      name: l.name,
      folder: l.folder,
      bookmarks: l.bookmarks.map((b) => ({ step: b.step, label: b.label })),
    },
  };
}
