import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { validateGridProject, type GridProject } from "./core/grid-craft";
const KEY = "iprasm.grid-projects.v1";
export async function readGridProjects(): Promise<GridProject[]> {
  const raw = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: KEY })).value
    : localStorage.getItem(KEY);
  if (!raw) return [];
  if (raw.length > 8_000_000) throw Error("Grid library exceeds limit");
  const data: GridProject[] = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 20)
    throw Error("Invalid grid library");
  await Promise.all(data.map(validateGridProject));
  if (new Set(data.map((p) => p.id)).size !== data.length)
    throw Error("Duplicate grid project IDs");
  return data;
}
export async function saveGridProject(
  project: GridProject,
  expectedRevision?: number,
) {
  await validateGridProject(project);
  const mutate = async () => {
    const all = await readGridProjects(),
      prior = all.find((p) => p.id === project.id);
    if (prior) {
      if (
        expectedRevision === undefined ||
        prior.progress.revision !== expectedRevision ||
        project.progress.revision !== expectedRevision + 1 ||
        prior.guide.sequenceHash !== project.guide.sequenceHash
      )
        throw Error(
          "Grid progress changed in another window; reload the project",
        );
    } else if (expectedRevision !== undefined)
      throw Error("Grid project no longer exists");
    const next = [project, ...all.filter((p) => p.id !== project.id)];
    if (next.length > 20) throw Error("Maximum20 grid projects");
    const value = JSON.stringify(next);
    if (value.length > 8_000_000) throw Error("Grid library exceeds limit");
    if (Capacitor.isNativePlatform())
      await Preferences.set({ key: KEY, value });
    else localStorage.setItem(KEY, value);
    return next;
  };
  return !Capacitor.isNativePlatform() && navigator.locks
    ? navigator.locks.request("iprasm-grid-library", mutate)
    : mutate();
}
