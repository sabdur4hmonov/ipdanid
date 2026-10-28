/** Private handoff credentials are never development-server modules or assets. */
export function privateManualUrl(value: string) {
  try {
    const path = decodeURIComponent(
      new URL(value, "http://localhost").pathname,
    ).replaceAll("\\", "/");
    return /(?:^|\/)manual-testing[^/]*\.txt$/i.test(path);
  } catch {
    return false;
  }
}
