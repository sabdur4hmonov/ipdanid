import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { validatePaintProject, type PaintProject } from "./core/paint";
const KEY = "iprasm.paint-projects.v1";
export async function readPaintProjects(): Promise<PaintProject[]> {
  const raw = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: KEY })).value
    : localStorage.getItem(KEY);
  if (!raw) return [];
  if (raw.length > 8_000_000) throw Error("Paint library exceeds limit");
  const data: PaintProject[] = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 20)
    throw Error("Invalid paint library");
  await Promise.all(data.map(validatePaintProject));
  if (new Set(data.map((p) => p.id)).size !== data.length)
    throw Error("Duplicate paint project IDs");
  return data;
}
export async function savePaintProject(
  project: PaintProject,
  expectedRevision?: number,
) {
  await validatePaintProject(project);
  const mutate = async () => {
    const all = await readPaintProjects(),
      prior = all.find((p) => p.id === project.id);
    if (prior) {
      if (
        expectedRevision === undefined ||
        prior.progress.revision !== expectedRevision ||
        project.progress.revision !== expectedRevision + 1 ||
        prior.guide.sequenceHash !== project.guide.sequenceHash
      )
        throw Error(
          "Paint progress changed in another window; reopen the project",
        );
    } else if (expectedRevision !== undefined)
      throw Error("Paint project no longer exists");
    const next = [project, ...all.filter((p) => p.id !== project.id)],
      value = JSON.stringify(next);
    if (next.length > 20 || value.length > 8_000_000)
      throw Error("Paint library exceeds limit");
    if (Capacitor.isNativePlatform())
      await Preferences.set({ key: KEY, value });
    else localStorage.setItem(KEY, value);
    return next;
  };
  return !Capacitor.isNativePlatform() && navigator.locks
    ? navigator.locks.request("iprasm-paint-library", mutate)
    : mutate();
}
