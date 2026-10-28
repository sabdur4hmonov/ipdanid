import { resolveBackendUrl } from '../src/backend-url.ts';

/** Public build settings only. Owner/server secrets never enter this object. */
export function releaseClientConfig(apiBase) {
  const value = resolveBackendUrl(true, apiBase);
  if (!value || new URL(value).protocol !== 'https:')
    throw Error('A public HTTPS VITE_NATIVE_API_BASE is required for release');
  return {
    VITE_NATIVE_API_BASE: value,
    VITE_NATIVE_DEBUG_SETTINGS: '0',
    VITE_SERVER_GENERATION: '1',
  };
}
