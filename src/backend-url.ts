// Invalid/unconfigured networking must never prevent local artwork startup.
export function resolveBackendUrl(
  native: boolean,
  configured?: string,
): string | undefined {
  if (!native) return "/api";
  if (!configured?.trim()) return undefined;
  try {
    const url = new URL(configured.trim());
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol === "http:" &&
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
      return undefined;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}
