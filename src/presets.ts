import { validAnatomicalImportance } from "./core/anatomical-importance";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type {
  EditParams,
  Shape,
  PortraitSettings,
  CircleLayout,
  Pin,
} from "./core/types";
import { validateLayout, withCircleLayout } from "./core/pin-layout";
import { createProfile } from "./core/geometry";
import { MAX_LINES } from "./core/limits";
import { CROP_ZOOM_MIN, CROP_ZOOM_MAX } from "./core/shape-crop";
import { validPortrait } from "./core/portrait";
export interface MakerSettings {
  resolution?: number;
  shape: Shape;
  mode: "dark" | "light" | "color";
  lines: number;
  widthMm: number;
  heightMm: number;
  pinCount: number;
  threadMm: number;
  stockMeters: number;
  edits: EditParams;
  portrait?: PortraitSettings;
  portraitSolver?:
    "continuous" | "global" | "guarded" | "multiscale" | "physical" | "anatomy";
  anatomy?: import("./core/anatomical-importance").AnatomicalImportance;
  pinLayout?: CircleLayout;
  // Preserve exact imported coordinates, avoiding cross-runtime trig rounding.
  pinCoordinates?: Pin[];
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
    [s.lines, 200, MAX_LINES, true],
    [s.widthMm, 50, 2000, false],
    [s.heightMm, 50, 2000, false],
    [s.pinCount, 24, 240, true],
    [s.threadMm, 0.1, 2, false],
    [s.stockMeters, 0, 100000, false],
    [s.edits?.zoom, CROP_ZOOM_MIN, CROP_ZOOM_MAX, false],
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
  if (
    s.resolution !== undefined &&
    (!Number.isInteger(s.resolution) || s.resolution < 32 || s.resolution > 192)
  )
    throw new Error("Invalid saved computation resolution");
  if (s.portrait) validPortrait(s.portrait);
  if (s.anatomy !== undefined) {
    validAnatomicalImportance(s.anatomy);
    if (s.portraitSolver !== "anatomy")
      throw Error("Unbound anatomical preset");
  }
  if (s.pinLayout) {
    validateLayout(s.pinLayout);
    if (s.shape !== "circle" || s.widthMm !== s.heightMm)
      throw new Error("Invalid layout board");
  }
  if (s.pinCoordinates) {
    if (
      !s.pinLayout ||
      !Array.isArray(s.pinCoordinates) ||
      s.pinCoordinates.length !== s.pinCount
    )
      throw new Error("Invalid saved layout coordinates");
    const profile = createProfile(s.shape, s.pinCount, s.mode, {
      widthMm: s.widthMm,
      heightMm: s.heightMm,
    });
    profile.threadMm = s.threadMm;
    withCircleLayout(profile, s.pinLayout, s.pinCoordinates);
  }
  if (
    s.portraitSolver &&
    ![
      "continuous",
      "global",
      "guarded",
      "multiscale",
      "physical",
      "anatomy",
    ].includes(s.portraitSolver)
  )
    throw new Error("Invalid portrait solver");
}
export async function readPresets(): Promise<MakerPreset[]> {
  const raw = Capacitor.isNativePlatform()
    ? (await Preferences.get({ key: KEY })).value
    : localStorage.getItem(KEY);
  if (!raw) return [];
  if (raw.length > 512000) throw new Error("Preset storage exceeds limit");
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
    if (value.length > 512000) throw new Error("Preset storage exceeds limit");
    if (Capacitor.isNativePlatform())
      await Preferences.set({ key: KEY, value });
    else localStorage.setItem(KEY, value);
    return next;
  };
  return !Capacitor.isNativePlatform() && navigator.locks
    ? navigator.locks.request("iprasm-presets", write)
    : write();
}
