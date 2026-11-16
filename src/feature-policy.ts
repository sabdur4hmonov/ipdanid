// Public capabilities, not an authorization boundary. API enforcement is server-side.
export const FEATURE_NAMES = [
  "mosaic", "diamond", "paint", "book", "qr", "models", "workshops",
  "partner", "commissions", "push", "gallery", "expert", "analytics",
  "digital", "gifts", "offers", "inbox", "trials", "lettering", "photoBackup",
] as const;
export type Feature = typeof FEATURE_NAMES[number];
export type Features = Record<Feature, boolean>;
export const noFeatures = (): Features => Object.fromEntries(FEATURE_NAMES.map(k => [k, false])) as Features;
export function resolveFeatures(env: { NODE_ENV?: string; FEATURES?: string }): Features {
  const names = env.FEATURES === undefined
    ? (env.NODE_ENV === "production" ? [] : [...FEATURE_NAMES])
    : env.FEATURES.split(",").map(s => s.trim()).filter(Boolean);
  if (names.some(k => !FEATURE_NAMES.includes(k as Feature)) || new Set(names).size !== names.length)
    throw Error("Invalid FEATURES configuration");
  return Object.fromEntries(FEATURE_NAMES.map(k => [k, names.includes(k)])) as Features;
}
export function validFeatures(value: unknown): value is Features {
  return !!value && typeof value === "object" &&
    Object.keys(value).length === FEATURE_NAMES.length &&
    FEATURE_NAMES.every(k => typeof (value as Features)[k] === "boolean");
}
export const craftsEnabled = (f: Features) => ["mosaic", "diamond", "paint", "book", "qr", "models", "workshops", "lettering"].some(k => f[k as Feature]);
export function familyEnabled(f: Features, family: string): boolean {
  if (family === "string") return true;
  const key = ({ brick: "mosaic", guided: "workshops", solid: "models", workshop: "workshops" } as Record<string, Feature>)[family] ?? family;
  return FEATURE_NAMES.includes(key as Feature) && f[key as Feature];
}
export function routeFeature(path: string): Feature | undefined {
  const rules: [RegExp, Feature][] = [
    [/^\/api\/(?:admin\/)?gallery(?:\/|$)/, "gallery"],
    [/^\/api\/(?:admin\/)?push(?:\/|$)/, "push"],
    [/^\/api\/(?:admin\/)?partners?(?:\/|$)/, "partner"],
    [/^\/api\/(?:admin\/)?commissions(?:\/|$)/, "commissions"],
    [/^\/api\/(?:admin\/)?analytics(?:\/|$)/, "analytics"],
    [/^\/api\/(?:admin\/)?(?:offers|referrals)(?:\/|$)/, "offers"],
    [/^\/api\/(?:admin\/)?(?:trial|trials)(?:\/|$)/, "trials"],
    [/^\/api\/(?:admin\/)?(?:inbox|mail)(?:\/|$)/, "inbox"],
    [/^\/api\/(?:admin\/journeys|digital)(?:\/|$)/, "digital"],
    [/^\/api\/gifts(?:\/|$)/, "gifts"],
    [/^\/api\/photo-backup(?:\/|$)/, "photoBackup"],
  ];
  return rules.find(([pattern]) => pattern.test(path))?.[1];
}
