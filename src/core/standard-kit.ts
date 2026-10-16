import type { MaterialProfile, Shape } from "./types";
import { createProfile, assertPinSpacing, HEART_POLYGON } from "./geometry";
export interface StandardKitConfig {
  version: "standard-kit/1";
  revision: number;
  baseMm: number;
  circleDiameterMm: number;
  squareSideMm: number;
  heartEnvelopeMm: number;
  nails: number;
  sectors: number;
  shaftMm: number;
  threadMm: number;
  opacity: number;
  threadColor: string;
  minHoleGapMm: number;
  edgeMm: number;
  stockMeters: number;
  secondsPerConnection: number;
}
export const DEFAULT_STANDARD_KIT: Readonly<StandardKitConfig> = Object.freeze({
  version: "standard-kit/1",
  revision: 1,
  baseMm: 500,
  circleDiameterMm: 460,
  squareSideMm: 470,
  heartEnvelopeMm: 390,
  nails: 240,
  sectors: 4,
  shaftMm: 1.5,
  threadMm: 0.12,
  opacity: 0.85,
  minHoleGapMm: 3,
  edgeMm: 10,
  stockMeters: 1200,
  secondsPerConnection: 8,
  threadColor: "#000000",
});
export interface StandardProfile {
  referenceRender?: "classic-coverage/2";
  referenceEngine?: "classic-greedy/3";
  accessory?: { version: "legal-heart-accent/1"; colour: string };
  version: "standard-profile/1";
  config: StandardKitConfig;
  pattern: Shape;
  patternScale: number;
  maxPeople: number;
}
export function validateStandardConfig(c: StandardKitConfig) {
  const defaults = DEFAULT_STANDARD_KIT;
  if (
    !c ||
    c.version !== "standard-kit/1" ||
    Object.keys(c).sort().join() !== Object.keys(defaults).sort().join() ||
    Object.entries(c).some(
      ([key, v]) =>
        !["version", "threadColor"].includes(key) && !Number.isFinite(v),
    ) ||
    !/^#[0-9a-f]{6}$/i.test(c.threadColor) ||
    !Number.isSafeInteger(c.revision) ||
    c.revision < 1 ||
    !Number.isInteger(c.nails) ||
    c.nails < 24 ||
    c.nails > 240 ||
    !Number.isInteger(c.sectors) ||
    c.sectors < 1 ||
    c.sectors > 26 ||
    c.nails % c.sectors !== 0 ||
    c.baseMm < 100 ||
    c.baseMm > 1000 ||
    c.edgeMm < 5 ||
    c.edgeMm > 40 ||
    c.shaftMm < 0.5 ||
    c.shaftMm > 5 ||
    c.threadMm < 0.05 ||
    c.threadMm > 1 ||
    c.opacity <= 0 ||
    c.opacity > 1 ||
    c.minHoleGapMm < c.shaftMm + c.threadMm ||
    c.minHoleGapMm < 2 ||
    c.minHoleGapMm > 10 ||
    c.stockMeters < 0 ||
    c.stockMeters > 10000 ||
    c.secondsPerConnection < 2 ||
    c.secondsPerConnection > 60 ||
    [c.circleDiameterMm, c.squareSideMm, c.heartEnvelopeMm].some(
      (v) => v < 80 || v > c.baseMm - 2 * c.edgeMm,
    )
  )
    throw Error("kit/invalid-configuration");
}
function build(c: StandardKitConfig, shape: Shape): MaterialProfile {
  const original = createProfile(shape, c.nails, "dark", {
    widthMm: c.baseMm,
    heightMm: c.baseMm,
  });
  const patternScale =
    (shape === "circle"
      ? c.circleDiameterMm
      : shape === "rectangle"
        ? c.squareSideMm
        : c.heartEnvelopeMm) / c.baseMm;
  const factor = shape === "heart" ? patternScale : patternScale / 0.96;
  let pins = original.pins.map((p) => ({
    id: p.id,
    x: 0.5 + (p.x - 0.5) * factor,
    y: 0.5 + (p.y - 0.5) * factor,
  }));
  if (shape === "heart") {
    // The analytic notch cusp puts opposing arc-length samples too close.
    // Select a clockwise clearance-separated subset of the actual polygon,
    // then distribute the requested IDs over it. Never move a hole secretly.
    const candidates: { x: number; y: number }[] = [];
    for (let j = 0; j < HEART_POLYGON.length; j++) {
      const a = HEART_POLYGON[j],
        b = HEART_POLYGON[(j + 1) % HEART_POLYGON.length];
      const steps = Math.max(
        1,
        Math.ceil((Math.hypot(b.x - a.x, b.y - a.y) * c.heartEnvelopeMm) / 0.4),
      );
      for (let k = 0; k < steps; k++) {
        const x = 0.5 + (a.x + ((b.x - a.x) * k) / steps - 0.5) * factor,
          y = 0.5 + (a.y + ((b.y - a.y) * k) / steps - 0.5) * factor;
        if (
          candidates.every(
            (p) =>
              Math.hypot(p.x - x, p.y - y) * c.baseMm >= c.minHoleGapMm + 1e-6,
          )
        )
          candidates.push({ x, y });
      }
    }
    if (candidates.length < c.nails) throw Error("kit/heart-spacing-capacity");
    pins = Array.from({ length: c.nails }, (_, id) => ({
      id,
      ...candidates[Math.floor((id * candidates.length) / c.nails)],
    }));
  }
  pins = pins.map((p) => ({
    ...p,
    sectorLabel: `${String.fromCharCode(65 + Math.floor(p.id / (c.nails / c.sectors)))}-${(p.id % (c.nails / c.sectors)) + 1}`,
  }));
  return {
    ...original,
    id: `standard-${shape}-r${c.revision}`,
    version: 9,
    baseColor: "#ffffff",
    threadMm: c.threadMm,
    shaftMm: c.shaftMm,
    opacity: c.opacity,
    stockMeters: c.stockMeters,
    colors: [c.threadColor],
    pins,
    standardKit: {
      version: "standard-profile/1",
      config: structuredClone(c),
      pattern: shape,
      patternScale,
      maxPeople: shape === "heart" ? 2 : 3,
    },
  };
}
export function standardProfiles(c: StandardKitConfig): MaterialProfile[] {
  validateStandardConfig(c);
  const profiles = (["circle", "rectangle", "heart"] as const).map((shape) =>
    build(c, shape),
  );
  combinedHoles(profiles);
  return profiles;
}
export interface DrillHole {
  xMm: number;
  yMm: number;
  pattern: Shape;
  pin: number;
  label: string;
}
export function combinedHoles(profiles: MaterialProfile[]) {
  if (profiles.length !== 3) throw Error("kit/three-patterns-required");
  const c = profiles[0].standardKit!.config;
  const holes: DrillHole[] = [];
  for (const p of profiles) {
    if (
      !p.standardKit ||
      JSON.stringify(p.standardKit.config) !== JSON.stringify(c)
    )
      throw Error("kit/base-mismatch");
    assertPinSpacing(p);
    for (const pin of p.pins) {
      const xMm = pin.x * p.widthMm,
        yMm = pin.y * p.heightMm;
      if (
        Math.min(xMm, yMm, c.baseMm - xMm, c.baseMm - yMm) <
        c.edgeMm + c.shaftMm / 2
      )
        throw Error("kit/edge-clearance");
      if (
        holes.some(
          (h) => Math.hypot(h.xMm - xMm, h.yMm - yMm) < c.minHoleGapMm - 1e-8,
        )
      )
        throw Error("kit/hole-collision");
      holes.push({
        xMm,
        yMm,
        pattern: p.shape,
        pin: pin.id,
        label: pinLabel(p, pin.id),
      });
    }
  }
  return holes;
}
// Canonical profiles are expensive (combined hole collision/Heart clearance).
// Cache only private validation templates; callers always compare a fresh clone.
const validationProfiles = new Map<string, MaterialProfile[]>();
export function validateStandardProfile(p: MaterialProfile) {
  if (!p.standardKit) return;
  if (
    p.standardKit.referenceEngine !== undefined &&
    (p.standardKit.referenceEngine !== "classic-greedy/3" ||
      p.standardKit.referenceRender !== "classic-coverage/2" ||
      p.standardKit.accessory)
  )
    throw Error("kit/unbound-reference-engine");
  const config = p.standardKit.config;
  validateStandardConfig(config);
  const key = JSON.stringify(config);
  let profiles = validationProfiles.get(key);
  if (!profiles) {
    profiles = standardProfiles(config);
    if (validationProfiles.size >= 8)
      validationProfiles.delete(validationProfiles.keys().next().value!);
    validationProfiles.set(key, profiles);
  }
  const stored = profiles.find((v) => v.shape === p.shape),
    expected = stored ? structuredClone(stored) : undefined;
  if (expected && p.standardKit.referenceRender === "classic-coverage/2") {
    expected.id += "-classic2";
    expected.version = 11;
    expected.opacity = 0.9;
    expected.standardKit!.referenceRender = "classic-coverage/2";
  }
  if (expected && p.standardKit.referenceEngine === "classic-greedy/3") {
    expected.id = stored!.id + "-classic3";
    expected.version = 13;
    expected.standardKit!.referenceEngine = "classic-greedy/3";
  }
  if (expected && p.standardKit.accessory) {
    const accessory = p.standardKit.accessory;
    if (
      p.shape !== "heart" ||
      accessory.version !== "legal-heart-accent/1" ||
      !/^#[0-9a-f]{6}$/i.test(accessory.colour) ||
      accessory.colour === expected.colors[0]
    )
      throw Error("kit/invalid-accessory");
    expected.standardKit!.accessory = structuredClone(accessory);
    expected.version = p.standardKit.referenceRender ? 12 : 10;
    expected.id += `-accent-${accessory.colour.slice(1)}`;
    expected.minPinGap = 1;
    expected.colors.push(accessory.colour);
  }
  // JS engines differ by a few trig ULPs. Metadata/labels remain exact; only
  // coordinate reconstruction has the same 1e-12 normalized tolerance as the
  // existing circle contract. The hash still binds the exact saved doubles.
  if (
    !expected ||
    JSON.stringify({ ...p, pins: [] }) !==
      JSON.stringify({ ...expected, pins: [] }) ||
    p.pins.length !== expected.pins.length ||
    p.pins.some((pin, id) => {
      const e = expected.pins[id];
      return (
        Math.abs(pin.x - e.x) > 1e-12 ||
        Math.abs(pin.y - e.y) > 1e-12 ||
        JSON.stringify({ ...pin, x: 0, y: 0 }) !==
          JSON.stringify({ ...e, x: 0, y: 0 })
      );
    })
  )
    throw Error("kit/profile-coordinate-contract");
}
export function pinLabel(p: MaterialProfile, id: number, hyphen = true) {
  if (!Number.isInteger(id) || id < 0 || id >= p.pins.length)
    throw Error("kit/pin-index");
  if (!p.standardKit) return String(id);
  const count = p.pins.length / p.standardKit.config.sectors;
  return `${String.fromCharCode(65 + Math.floor(id / count))}${hyphen ? "-" : ""}${(id % count) + 1}`;
}
export function sectorPin(
  p: MaterialProfile,
  value: string,
): number | undefined {
  if (/^\d+$/.test(value)) {
    const id = Number(value);
    return id < p.pins.length ? id : undefined;
  }
  if (!p.standardKit) return;
  const m = value
    .trim()
    .toUpperCase()
    .match(/^([A-Z])-?(\d+)$/);
  if (!m) return;
  const sector = m[1].charCodeAt(0) - 65,
    count = p.pins.length / p.standardKit.config.sectors,
    within = Number(m[2]);
  if (sector >= p.standardKit.config.sectors || within < 1 || within > count)
    return;
  return sector * count + within - 1;
}
