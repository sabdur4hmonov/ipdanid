import { it, expect } from "vitest";
import { generate } from "../src/core/engine";
import { createProfile } from "../src/core/geometry";
import {
  parseProjectFile,
  progressFor,
  projectFile,
} from "../src/core/validation";
import { DEFAULT_EDITS, type Project } from "../src/core/types";
async function fixture(): Promise<Project> {
  const i = await generate({
    pixels: new Uint8Array(32 * 32 * 3).fill(90),
    resolution: 32,
    profile: createProfile("circle", 48),
    lines: 40,
    mode: "dark",
  });
  return {
    id: crypto.randomUUID(),
    name: "Portrait",
    instruction: i,
    progress: { ...progressFor(i), confirmed: 3 },
    edits: DEFAULT_EDITS,
    folder: "Family",
    bookmarks: [{ step: 4, label: "Next pin" }],
  };
}
it("exported organization preserves the exact sequence and confirmed progress on re-import", async () => {
  const p = await fixture(),
    reimported = (await parseProjectFile(
      JSON.stringify(projectFile(p)),
    )) as Project;
  expect(reimported.instruction.sequenceHash).toBe(p.instruction.sequenceHash);
  expect(reimported.instruction.segments).toEqual(p.instruction.segments);
  expect(reimported.progress).toEqual(p.progress);
  expect(reimported.bookmarks).toEqual(p.bookmarks);
  expect(reimported.folder).toBe("Family");
  expect(reimported.id).not.toBe(p.id);
});
it("out-of-sequence or duplicate bookmarks fail import while old projects remain compatible", async () => {
  const p = await fixture();
  p.bookmarks = [{ step: p.instruction.metrics.lines + 1, label: "Invalid" }];
  await expect(
    parseProjectFile(JSON.stringify(projectFile(p))),
  ).rejects.toThrow(/bookmarks/);
  p.bookmarks = [
    { step: 4, label: "One" },
    { step: 4, label: "Two" },
  ];
  await expect(
    parseProjectFile(JSON.stringify(projectFile(p))),
  ).rejects.toThrow(/bookmarks/);
  delete p.bookmarks;
  delete p.folder;
  await expect(
    parseProjectFile(JSON.stringify(projectFile(p))),
  ).resolves.toMatchObject({ progress: p.progress });
});
