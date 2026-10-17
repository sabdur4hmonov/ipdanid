import { resolveBackendUrl } from "./backend-url";
export const NATIVE_SERVER_KEY = "iprasm.debug-server.v1";
export const nativeServerEditing =
  import.meta.env.DEV || import.meta.env.VITE_NATIVE_DEBUG_SETTINGS === "1";
export function nativeConfiguredBase(
  configured: string | undefined,
  debug: boolean,
  read: () => string | null = () => localStorage.getItem(NATIVE_SERVER_KEY),
) {
  if (debug) {
    try {
      const saved = read();
      if (saved && resolveBackendUrl(true, saved)) return saved;
    } catch {
      /* unavailable storage must not prevent offline artwork */
    }
  }
  return configured;
}
