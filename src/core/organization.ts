import type { Project } from "./types";
export function validateOrganization(project: Project) {
  if (
    project.folder !== undefined &&
    (typeof project.folder !== "string" || project.folder.length > 50)
  )
    throw new Error("Invalid project folder");
  if (
    project.bookmarks !== undefined &&
    (!Array.isArray(project.bookmarks) ||
      project.bookmarks.length > 50 ||
      new Set(project.bookmarks.map((b) => b?.step)).size !==
        project.bookmarks.length ||
      project.bookmarks.some(
        (b) =>
          !b ||
          !Number.isSafeInteger(b.step) ||
          b.step < 1 ||
          b.step > project.instruction.metrics.lines ||
          typeof b.label !== "string" ||
          b.label.length > 80,
      ))
  )
    throw new Error("Invalid project bookmarks");
}
