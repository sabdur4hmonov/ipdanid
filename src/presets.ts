import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { EditParams, Shape } from "./core/types";
export interface MakerSettings {
  shape: Shape;
  mode: "dark" | "light" | "color";
  lines: number;
  widthMm: number;
  heightMm: number;
  pinCount: number;
  threadMm: number;
  stockMeters: number;
  edits: EditParams;
}
export interface MakerPreset {
  id: string;
  name: string;
  settings: MakerSettings;
}
const KEY = "iprasm.presets.v1";
function validate(p: MakerPreset) {
  if (
    !p ||
    typeof p.id !== "string" ||
    typeof p.name !== "string" ||
    !p.name.trim() ||
    p.name.length > 60 ||
    !p.settings
  )
    throw new Error("Invalid settings preset");
  const s = p.settings;
  if (
    !["circle", "rectangle", "heart"].includes(s.shape) ||
    !["dark", "light", "color"].includes(s.mode)
  )
    throw new Error("Invalid preset mode");
  for (const [v, min, max, integer] of [
    [s.lines, 200, 3000, true],
    [s.widthMm, 50, 2000, false],
    [s.heightMm, 50, 2000, false],
    [s.pinCount, 24, 240, true],
    [s.threadMm, 0.1, 2, false],
    [s.stockMeters, 1, 10000, false],
    [s.edits?.zoom, 1, 3, false],
    [s.edits?.panX, -0.5, 0.5, false],
    [s.edits?.panY, -0.5, 0.5, false],
    [s.edits?.rotation, -180, 180, false],
    [s.edits?.brightness, -100, 100, false],
    [s.edits?.contrast, 0.5, 2, false],
  ] as [number, number, number, boolean][]) {
    if (
      !Number.isFinite(v) ||
      v < min ||
      v > max ||
      (integer && !Number.isInteger(v))
    )
      throw new Error("Invalid preset parameters");
  }
}
export async function readPresets(): Promise<MakerPreset[]> {
  const raw = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: KEY })).value
    : localStorage.getItem(KEY);
  if (!raw) return [];
  if (raw.length > 40000) throw new Error("Preset storage exceeds limit");
  const data: MakerPreset[] = JSON.parse(raw);
  if (!Array.isArray(data) || data.length > 20)
    throw new Error("Invalid preset library");
  data.forEach(validate);
  return data;
}
// Reread on mutation: unrelated presets from another tab are preserved.
export async function changePreset(
  preset: MakerPreset | null,
  removeId?: string,
): Promise<MakerPreset[]> {
  if (preset) validate(preset);
  const write = async () => {
    const existing = await readPresets();
    const next = existing.filter((p) => p.id !== (removeId ?? preset?.id));
    if (preset) next.unshift(preset);
    if (next.length > 20) throw new Error("Maximum 20 presets");
    const value = JSON.stringify(next);
    if (Capacitor.isNativePlatform())
      await Preferences.set({ key: KEY, value });
    else localStorage.setItem(KEY, value);
    return next;
  };
  return !Capacitor.isNativePlatform() && navigator.locks
    ? navigator.locks.request("iprasm-presets", write)
    : write();
}
