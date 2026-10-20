import { claimOrigin } from "./kit-claim-link";
const tokenPattern =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.[a-f0-9]{64}$/;
export function giftClaimLink(origin: string, token: string) {
  if (!tokenPattern.test(token)) throw Error("Invalid gift claim");
  const url = claimOrigin(origin);
  url.hash = "gift=" + token;
  return url.href;
}
export function giftClaimCode(fragment: string) {
  const token = fragment.startsWith("#gift=") ? fragment.slice(6) : "";
  return tokenPattern.test(token) ? token : null;
}
export function takeGiftClaim() {
  if (!window.location.hash.startsWith("#gift=")) return null;
  const token = giftClaimCode(window.location.hash);
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  return token;
}
