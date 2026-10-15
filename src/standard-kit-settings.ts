import {
  DEFAULT_STANDARD_KIT,
  standardProfiles,
  type StandardKitConfig,
} from "./core/standard-kit";
import { customerApi, customerCacheNamespace } from "./customer-api";
import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";
const key = `${customerCacheNamespace}:standard-kit/1`;
export async function currentStandardKit(): Promise<StandardKitConfig> {
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
