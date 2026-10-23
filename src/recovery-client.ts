import type { Instruction, Project } from "./core/types";
import { DEFAULT_EDITS } from "./core/types";
import type { RecoverySnapshot, RecoveryWrite } from "./recovery-types";
import { validateRecoveryWrite } from "./recovery-contract";
import { validAssemblySession } from "./assembly-session";

export function recoveryFor(
  project: Project,
  revision: number,
  rawSession: unknown,
): RecoveryWrite {
  const session = validAssemblySession(rawSession, [project]);
  return validateRecoveryWrite(
    {
      sequenceHash: project.instruction.sequenceHash,
      confirmed: project.progress.confirmed,
      expectedRevision: revision,
      requestKey: crypto.randomUUID(),
      resume: session
        ? {
            current: session.current,
            pace: session.pace,
            resting: session.resting ?? false,
          }
        : null,
      library: {
        name: project.name,
        folder: project.folder ?? "",
        bookmarks: project.bookmarks ?? [],
      },
    },
    project.instruction.sequenceHash,
    project.instruction.metrics.lines,
  );
}
export function checkedRecovery(
  raw: RecoverySnapshot,
  guide: Instruction,
): RecoverySnapshot {
  if (
    raw?.version !== "account-recovery/1" ||
    !raw.progress ||
    !Number.isSafeInteger(raw.progress.revision) ||
    raw.progress.revision < 0 ||
    raw.progress.sequenceHash !== guide.sequenceHash ||
    typeof raw.progress.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(raw.progress.updatedAt))
  )
    throw Error("Invalid recovery response");
  const details = raw.details ?? {
    resume: null,
    library: { name: "Saved portrait", folder: "", bookmarks: [] },
  };
  const valid = validateRecoveryWrite(
    {
      ...details,
      sequenceHash: raw.progress.sequenceHash,
      confirmed: raw.progress.confirmed,
      expectedRevision: raw.progress.revision,
      requestKey: "validate-recovery-state",
    },
    guide.sequenceHash,
    guide.metrics.lines,
  );
  return {
    version: "account-recovery/1",
    progress: {
      sequenceHash: guide.sequenceHash,
      confirmed: valid.confirmed,
      revision: raw.progress.revision,
      updatedAt: raw.progress.updatedAt,
    },
    details:
      raw.details === null
        ? null
        : { resume: valid.resume, library: valid.library },
  };
}
export function recoveredProject(
  guide: Instruction,
  raw: RecoverySnapshot,
  existing?: Project,
) {
  const snapshot = checkedRecovery(raw, guide);
  if (
    existing &&
    (existing.deletedAt ||
      existing.instruction.sequenceHash !== guide.sequenceHash)
  )
    throw Error("Different or deleted project");
  const project: Project = {
    ...(existing ?? { id: crypto.randomUUID(), edits: { ...DEFAULT_EDITS } }),
    instruction: guide,
    progress: snapshot.progress,
    name: snapshot.details?.library.name ?? existing?.name ?? "Saved portrait",
    folder: snapshot.details?.library.folder ?? existing?.folder,
    bookmarks: snapshot.details?.library.bookmarks ?? existing?.bookmarks,
  };
  const resume = snapshot.details?.resume;
  return {
    project,
    session: {
      version: 1 as const,
      projectId: project.id,
      sequenceHash: guide.sequenceHash,
      current:
        resume?.current ??
        Math.min(guide.metrics.lines, snapshot.progress.confirmed + 1),
      pace: resume?.pace ?? 8,
      // Every cross-device restoration is paused, including a previously playing client.
      resting: true,
    },
  };
}
