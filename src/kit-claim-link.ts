export function kitClaimLink(origin: string, code: string) {
  if (!/^[-\w]{32}$/.test(code)) throw Error("Invalid kit claim");
  const url = new URL(origin),
    loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw Error("Invalid claim origin");
  url.hash = "kit=" + code;
  return url.href;
}
export function kitClaimCode(fragment: string) {
  return fragment.match(/^#kit=([-\w]{32})$/)?.[1] ?? null;
}
export function takeKitClaim() {
  if (!window.location.hash.startsWith("#kit=")) return null;
  const code = kitClaimCode(window.location.hash);
  // Strip even malformed claims; fragments must never become a saved request URL.
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  return code;
}
