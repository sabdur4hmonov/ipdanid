import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
  type StandardKitConfig,
} from "./core/standard-kit";
import { customerApi, customerCacheNamespace } from "./customer-api";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
const key = `${customerCacheNamespace}:standard-kit/1`;
export async function standardKitRevision(
  revision: number,
): Promise<StandardKitConfig> {
  if (!Number.isSafeInteger(revision) || revision < 1)
    throw Error("Invalid kit revision");
  const cacheKey = `${key}:r${revision}`;
  let config: StandardKitConfig;
  try {
    config = await customerApi.request<StandardKitConfig>(
      `/kit-profiles/${revision}`,
    );
    standardProfiles(config);
    if (config.revision !== revision) throw Error("Wrong kit revision");
    try {
      if (Capacitor.isNativePlatform())
        await Preferences.set({ key: cacheKey, value: JSON.stringify(config) });
      else localStorage.setItem(cacheKey, JSON.stringify(config));
    } catch {}
  } catch (error) {
    const raw = Capacitor.isNativePlatform()
      ? (await Preferences.get({ key: cacheKey })).value
      : localStorage.getItem(cacheKey);
    if (!raw) throw error;
    config = JSON.parse(raw);
    standardProfiles(config);
    if (config.revision !== revision) throw error;
  }
  try {
    if (Capacitor.isNativePlatform())
      await Preferences.set({
        key: `${key}:selected-revision`,
        value: String(revision),
      });
    else localStorage.setItem(`${key}:selected-revision`, String(revision));
  } catch {}
  return config;
}
export async function currentStandardKit(): Promise<StandardKitConfig> {
  try {
    const selected = Capacitor.isNativePlatform()
      ? (await Preferences.get({ key: `${key}:selected-revision` })).value
      : localStorage.getItem(`${key}:selected-revision`);
    if (
      selected &&
      Number.isSafeInteger(Number(selected)) &&
      Number(selected) > 0
    )
      return await standardKitRevision(Number(selected));
  } catch {}
  let cached = structuredClone(DEFAULT_STANDARD_KIT);
  try {
    const raw = Capacitor.isNativePlatform()
      ? (await Preferences.get({ key })).value
      : localStorage.getItem(key);
    if (raw) {
      const c = JSON.parse(raw);
      standardProfiles(c);
      cached = c;
    }
  } catch {}
  try {
    const c = await customerApi.request<StandardKitConfig>("/kit-profiles");
    standardProfiles(c);
    try {
      if (Capacitor.isNativePlatform())
        await Preferences.set({ key, value: JSON.stringify(c) });
      else localStorage.setItem(key, JSON.stringify(c));
    } catch {}
    return c;
  } catch {
    return cached;
  }
}
