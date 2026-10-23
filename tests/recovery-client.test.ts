import { describe, expect, it } from "vitest";
import {
  checkedRecovery,
  recoveredProject,
  recoveryFor,
} from "../src/recovery-client";
import { validateRecoveryWrite } from "../src/recovery-contract";
import { validateOrganization } from "../src/core/organization";
import type { Instruction, Project } from "../src/core/types";
import type { RecoverySnapshot } from "../src/recovery-types";
const guide = {
  sequenceHash: "a".repeat(64),
  metrics: { lines: 3000 },
} as Instruction;
const snapshot: RecoverySnapshot = {
  version: "account-recovery/1",
  progress: {
    sequenceHash: guide.sequenceHash,
    confirmed: 4,
    revision: 2,
    updatedAt: "2026-10-23T00:00:00Z",
  },
  details: {
    resume: { current: 17, pace: 8, resting: false },
    library: {
      name: "Portrait",
      folder: "Gifts",
      bookmarks: [{ step: 12, label: "Check" }],
    },
  },
};
describe("cross-client restore preserves local library contracts", () => {
  it("creates a local id, pauses viewed cursor and never turns it into confirmation", () => {
    const { project, session } = recoveredProject(guide, snapshot);
    expect(project.progress.confirmed).toBe(4);
    expect(session).toMatchObject({
      projectId: project.id,
      current: 17,
      resting: true,
    });
    expect(project.folder).toBe("Gifts");
    expect(project.bookmarks).toEqual(snapshot.details?.library.bookmarks);
    expect(() => validateOrganization(project)).not.toThrow();
  });
  it("updates an existing matching project without duplicating or changing its local id", () => {
    const original = recoveredProject(guide, snapshot).project;
    expect(recoveredProject(guide, snapshot, original).project.id).toBe(
      original.id,
    );
    expect(() =>
      recoveredProject(guide, snapshot, { ...original, deletedAt: "today" }),
    ).toThrow();
  });
  it("uses confirmed+1 only when no cursor was saved, including completed guides", () => {
    expect(
      recoveredProject(guide, { ...snapshot, details: null }).session.current,
    ).toBe(5);
    expect(
      recoveredProject(guide, {
        ...snapshot,
        details: null,
        progress: { ...snapshot.progress, confirmed: 3000 },
      }).session.current,
    ).toBe(3000);
  });
  it("uploads only a session bound to the exact local project and immutable sequence", () => {
    const { project, session } = recoveredProject(guide, snapshot);
    expect(recoveryFor(project, 2, session).resume?.current).toBe(17);
    expect(
      recoveryFor(project, 2, { ...session, projectId: "other" }).resume,
    ).toBeNull();
    expect(
      recoveryFor(project, 2, { ...session, sequenceHash: "other" }).resume,
    ).toBeNull();
    expect(recoveryFor(project, 2, session).confirmed).toBe(4);
  });
  it("strict metadata sizes match existing disk reload validation", () => {
    const project = recoveredProject(guide, snapshot).project,
      body = recoveryFor(project, 2, null);
    for (const library of [
      { ...body.library, name: "x".repeat(101) },
      { ...body.library, folder: "x".repeat(51) },
      { ...body.library, bookmarks: [{ step: 1, label: "x".repeat(81) }] },
      {
        ...body.library,
        bookmarks: Array.from({ length: 51 }, (_, i) => ({
          step: i + 1,
          label: "",
        })),
      },
    ])
      expect(() =>
        validateRecoveryWrite({ ...body, library }, guide.sequenceHash, 3000),
      ).toThrow();
  });
  it("refuses wrong sequence and malformed server progress before touching local state", () => {
    expect(() =>
      checkedRecovery(
        {
          ...snapshot,
          progress: { ...snapshot.progress, sequenceHash: "other" },
        },
        guide,
      ),
    ).toThrow();
    expect(() =>
      checkedRecovery(
        { ...snapshot, progress: { ...snapshot.progress, confirmed: 3001 } },
        guide,
      ),
    ).toThrow();
    expect(() =>
      checkedRecovery(
        { ...snapshot, progress: { ...snapshot.progress, updatedAt: "bad" } },
        guide,
      ),
    ).toThrow();
  });
});
